# Generates the narrator for the narrated cut, one WAV per line, with
# Kokoro-82M (Apache-2.0 weights) running locally through kokoro-onnx.
# Nothing is sent over the network once the model files are present.
#
#   Setup (once, in video/):
#     python -m venv .voice/venv
#     .voice/venv/Scripts/python -m pip install kokoro-onnx soundfile   (Windows)
#     download kokoro-v1.0.onnx and voices-v1.0.bin from
#     https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
#     into .voice/
#
#   Run:
#     .voice/venv/Scripts/python scripts/voice.py
#
# Reads src/sound/script.json, writes public/voice/<id>.wav and the measured
# line lengths to src/sound/voice.json (used for ducking the effects).
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

VIDEO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(VIDEO_DIR, '.voice', 'kokoro-v1.0.onnx')
VOICES = os.path.join(VIDEO_DIR, '.voice', 'voices-v1.0.bin')
SCRIPT = os.path.join(VIDEO_DIR, 'src', 'sound', 'script.json')
DURATIONS = os.path.join(VIDEO_DIR, 'src', 'sound', 'voice.json')
OUT = os.path.join(VIDEO_DIR, 'public', 'voice')

# A warm, unhurried American English female voice, slightly slower than default.
VOICE = os.environ.get('CYKLA_VOICE', 'af_heart')
SPEED = float(os.environ.get('CYKLA_VOICE_SPEED', '0.9'))
LANG = 'en-us'
TARGET_RMS_DB = -18.0  # per-line loudness, so the voice sits evenly
PEAK_LIMIT_DB = -3.0


def trim(audio, sr, threshold_db=-50.0, pad=0.04):
    """Cuts leading and trailing silence, keeping a short natural pad."""
    level = 10 ** (threshold_db / 20)
    loud = np.where(np.abs(audio) > level)[0]
    if len(loud) == 0:
        return audio
    start = max(0, loud[0] - int(pad * sr))
    end = min(len(audio), loud[-1] + int(pad * 2 * sr))
    return audio[start:end]


def highpass(audio, sr, cutoff=70.0):
    """One-pole high-pass to clear sub-bass rumble."""
    a = np.exp(-2 * np.pi * cutoff / sr)
    out = np.empty_like(audio)
    prev_x = prev_y = 0.0
    for i, x in enumerate(audio):
        prev_y = a * (prev_y + x - prev_x)
        prev_x = x
        out[i] = prev_y
    return out


def level(audio, sr):
    rms = np.sqrt(np.mean(audio**2)) + 1e-9
    audio = audio * (10 ** (TARGET_RMS_DB / 20) / rms)
    peak = np.abs(audio).max()
    limit = 10 ** (PEAK_LIMIT_DB / 20)
    if peak > limit:
        audio = audio * (limit / peak)
    fade = int(0.03 * sr)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    return audio


def main():
    for path in (MODEL, VOICES):
        if not os.path.exists(path):
            sys.exit(f'Missing {path}. See the setup notes at the top of this script.')
    with open(SCRIPT, encoding='utf-8') as f:
        lines = json.load(f)
    kokoro = Kokoro(MODEL, VOICES)
    os.makedirs(OUT, exist_ok=True)
    durations = {}
    for line in lines:
        audio, sr = kokoro.create(line['text'], voice=VOICE, speed=SPEED, lang=LANG)
        audio = level(highpass(trim(np.asarray(audio, dtype=np.float64), sr), sr), sr)
        # Two identical channels: Remotion plays a mono file at -3 dB per channel.
        stereo = np.stack([audio, audio], axis=1).astype(np.float32)
        sf.write(os.path.join(OUT, f"{line['id']}.wav"), stereo, sr, subtype='PCM_16')
        durations[line['id']] = round(len(audio) / sr, 3)
        print(f"{line['id']:14s} {durations[line['id']]:5.2f}s  {line['text']}")
    with open(DURATIONS, 'w', encoding='utf-8') as f:
        json.dump(durations, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
