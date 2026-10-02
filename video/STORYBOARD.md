# Cykla launch video — storyboard

1920×1080 · 30 fps · 38.9 s · two cuts: music and sound design, and the same
with a narrator. Typography still carries the story; a quiet music bed keeps it
continuous and the effects mark the moments that change meaning (see
[Music](#music), [Sound](#sound) and [Narration](#narration)).

## Concept: filled and dashed

Cykla's calendar already has a visual grammar, and the whole video is built
from it:

| Mark | In the app | In the video |
| --- | --- | --- |
| **Filled circle** | a period day you recorded | something that happened — upright type |
| **Dashed ring** | the prediction window | something Cykla estimates — *italic* type with a dashed underline |
| **Soft wash** | the possible fertile window | a possibility, never a promise |

The story follows one real interaction: on day 5 of a period the Today card
still says **ESTIMATE**, because Cykla never assumes a day it was not told
about. The user logs *Light* bleeding, and the same card flips to
**RECORDED**. From there the video shows how the recorded starts become a
range (with a confidence level), how the app explains that range, and that
all of it stays on the device.

The film moves from day to night: light paper and light UI first, then the
apricot crescent of the Cykla mark wipes the frame into dark mode (the mark is
a moon), and a final reverse wipe returns to light for the end card — one full
cycle.

Positioning stays cautious: "possible window", "estimate", "range, not an
exact day", "not a method of contraception". No claim of exact ovulation,
safe days or medical certainty.

## Visual direction

- **Ground:** the app's own off-white `#F8F4EF` with a faint paper grain; at
  night the app's aubergine `#1E1420`. No gradients beyond a soft vignette.
- **Colour:** plum `#5A284F` for type, period `#9D3F56` for recorded marks,
  fertile teal `#2A9D8F` for the soft wash, apricot `#F3A97E` as the only warm
  highlight. Dark variants come straight from `src/theme/theme.ts`.
- **Type:** Instrument Serif for statements (italic = estimated), DM Sans for
  small labels and annotations. The app UI itself keeps its system font.
- **Device:** a quiet, generic phone body (no brand) around the 390×844 pt
  capture. No fake status bar: the app's own top padding is kept as captured.
- **Motion:** slow eased push-ins and pull-backs on the real footage, dashed
  strokes that draw themselves, touch ripples for taps. One signature
  transition: the crescent wipe. No bounces, no whip pans.
- **Footage:** real Cykla web build, captured frame by frame with a frozen
  virtual clock (no dropped frames, identical on every run), synthetic data
  seeded through the app's own UI.

## Shots

| # | Time | Scene | On screen | Type |
|---|------|-------|-----------|------|
| 1 | 0:00–0:04.5 | **Grammar** | On paper: a filled period-red dot appears, then a dashed ring draws itself beside it. Both glide together and resolve into the Cykla mark; wordmark rises. | "Recorded." · *"Estimated."* · "Two different things. Cykla keeps them apart." |
| 2 | 0:04.1–0:07.7 | **First run** | Phone rises with the real onboarding welcome ("A calm place for your cycle"); tap *Continue without an account*. | "No account." / "Your cycle data stays on this device. Nothing to sign up for." |
| 3 | 0:07.4–0:17.4 | **You record** | Today, Oct 5: card says ESTIMATE · Medium confidence · "in about 25 days". Tap *Log day* → daily editor ("Recorded, not calculated") → *Light*, pain 2, *Calm* → *Save entry* → back on Today, the card now reads RECORDED · Day 5. Push-in on the card flip. | "You record." / "Nothing becomes a record until you enter it. Until then, Cykla calls it an estimate." → *"From estimate to record."* |
| 4 | 0:17.1–0:23.7 | **Cykla estimates** | Calendar, October: filled days 1–5, teal wash 11–17, dashed ring 27 Oct–2 Nov. Halos drawn on the real cells (positions exported by the capture), with a legend beside the phone. | "Cykla estimates." / "A range with a confidence level — never a promised day." Footnote: "Calendar data cannot determine fertility." |
| 5 | 0:22.5–0:30.8 | **Night · explains itself** | Crescent wipe turns the same calendar dark, then the real explanation screen scrolls; on the left the recorded period days become a timeline: 29 · 27 · 30 · 28 · 29 days → dashed projection ≈ 29 → dashed range Oct 27 – Nov 2. | "Every *estimate* explains itself." / "6 recorded starts · 5 complete cycles" · "Medium confidence" |
| 6 | 0:30.5–0:35.1 | **Yours** | Dark "You & privacy", scrolled to *Your data*: Export JSON / CSV, *Delete all local data*. | "Yours to export. Yours to delete." / "No account, no ads, no analytics SDK. Health data is not transmitted." |
| 7 | 0:33.9–0:38.9 | **End card** | Reverse crescent wipe back to paper. Mark, wordmark, tagline. | "Cykla" · "A calm place for your cycle." · "Offline-first · No account · Open source · AGPL-3.0" · fine print: "Cykla records data and calculates estimates. Not a diagnosis. Not a method of contraception." |

## Music

One procedural score (`scripts/music.mjs`), the same file in both cuts. D major,
like the effects, so every effect lands inside the harmony. A soft pad (detuned
sine voices, slow drift), a muted pulse at 72 bpm that is felt more than heard,
a felt-piano note every few seconds (chord tones only, no melody) and a faint
room tone. Almost nothing above 2 kHz, which leaves the consonant range to the
narrator.

| Time | Picture | Music |
| --- | --- | --- |
| 0:00 | Recorded / *Estimated* | D(add9) rises out of silence, dark, no pulse |
| 0:04.1 | First run | Dmaj9 opens, the pulse fades in |
| 0:07.4 | You record | Bm7 → Gmaj7 → Asus4, held as tension |
| 0:14.7 | Card reads RECORDED | resolves to D on the flip, with the confirmation; a pulse beat lands on the same frame |
| 0:17.1 | Calendar | Bm7 → Gmaj7, steady pulse |
| 0:22.5 | Crescent into night | the pad draws back for the sweep, returns as Em9 voiced low, overtones pulled in, pulse in half time |
| 0:25.5 | Explanation, Yours | Bm7 → Gmaj7 → Em7 → Asus, restrained |
| 0:33.9 | Crescent back to day | draws back again, returns as a high G(add9) with its overtones open; the pulse leaves |
| 0:34.7 | End card | resolves to D with the closing chord and rings out |

Mix: the sound design cut plays the bed a little forward; the narrated cut
starts lower, dips about 5 dB more under each line (from 0.4 s before it to
0.8 s after) and comes back between phrases. Music sits about 20 dB under the
voice while it speaks.

## Sound

Procedural, generated by `scripts/sound.mjs` (no third-party audio). Two
timbres mirror the visual grammar: a soft **felt** tone (mallet-like, quick
decay) for things that were recorded, and a **breath** tone (filtered air
around a slow, slightly beating sine) for estimates. Everything is in D major
pentatonic, low in level, with silence between cues. There is no music bed.

| Time | Cue | Sound |
| --- | --- | --- |
| 0:00.2 | Filled dot | felt D4 |
| 0:00.9 | Dashed ring draws | breath A4, swelling with the stroke |
| 0:03.0 | Dot and ring become the mark | felt D4 + A4, a little air |
| 0:06.3 | *Continue without an account* | soft tap |
| 0:08.9 | *Log day* | soft tap |
| 0:14.7 | *Save entry*, then the card reads RECORDED | soft tap, then a rising fourth (A4 → D5, felt) |
| 0:18.2 / 0:19.5 | Recorded days / prediction window halos | felt F♯4 / breath B4 |
| 0:22.5 | Crescent wipe into night | air sweeping right → left, low D under it |
| 0:25.7 | Recorded starts land on the timeline | six muted felt notes, one per start |
| 0:28.2 | Dashed projection and range | air rising along the arc, landing on breath E5 |
| 0:33.9 | Crescent wipe back to day | air sweeping left → right |
| 0:34.7 | End card resolves | open D chord, rings out; all audio fades over the last 0.8 s |

The editor taps (Light, pain, mood) and "Yours" have no effects; the music
carries those stretches.

## Narration

Female narrator, generated locally (see the README). Lines sit between the key
moments: nothing is spoken over the mark resolving, the flip to RECORDED, the
two crescent wipes or the end card's mark. Effects duck by about 6 dB and the
music by about 5 dB more under the voice. Cue points live in `src/sound/script.json`; times below are line starts.

| Time | Line | On screen |
| --- | --- | --- |
| 0:00.1 | "Some things you know, others you can only estimate." | Recorded. / *Estimated.* |
| 0:04.6 | "Cykla keeps the difference visible." | first run |
| 0:07.7 | "Until you record a day, it stays an estimate." | Today card says ESTIMATE |
| 0:11.0 | "Record what actually happened, when it happened." | daily editor |
| — | *(silence: save, the card flips to RECORDED)* | 0:13.6–0:17.2 |
| 0:17.2 | "Over time, your records help Cykla calculate a range, and show its confidence." | calendar halos |
| — | *(silence: crescent wipe)* | |
| 0:23.7 | "And every estimate can be explained." | Every *estimate* explains itself. |
| — | *(silence: timeline, projection, range)* | 0:25.8–0:30.2 |
| 0:30.2 | "Your data stays on your device, yours to export or delete." | Yours |
| — | *(silence: crescent back to day, mark)* | |
| 0:35.2 | "Cykla. A calm place for your cycle." | end card tagline |

## Capture plan

All shots are captured from the exported web build at 390×844 CSS px,
device scale 3 (1170×2532 frames), `en-US`, frozen date 2026-10-05 09:30.

| Shot | Profile | Theme | Action |
|------|---------|-------|--------|
| `onboarding` | empty | light | Welcome screen, tap *Continue without an account* |
| `record` | seeded (before) | light | Today → *Log day* → Light · Pain 2 · Calm → *Save entry* → Today |
| `calendar` | seeded (after) | light | Calendar, still; cell positions exported for callouts |
| `calendarDark` | seeded (after) | dark | Same calendar in dark mode (wipe target) |
| `explain` | seeded (after) | dark | Prediction explanation, slow scroll |
| `privacy` | seeded (after) | dark | You & privacy, starting below the language picker (its options include "Deutsch"), scroll to *Your data* |
