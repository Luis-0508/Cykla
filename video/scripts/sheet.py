# Dev helper: tiles review frames (out/frames) into labelled contact sheets.
# Requires Python with Pillow. Usage: python scripts/sheet.py
import glob
import os

from PIL import Image, ImageDraw

files = sorted(glob.glob('out/frames/*.jpg'))
cols, w = 3, 640
h = int(w * 9 / 16)
for page in range(0, len(files), 9):
    chunk = files[page:page + 9]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * (h + 24)), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(chunk):
        x, y = (i % cols) * w, (i // cols) * (h + 24)
        sheet.paste(Image.open(name).resize((w, h)), (x, y + 24))
        draw.text((x + 6, y + 6), os.path.basename(name), fill='black')
    sheet.save(f'out/sheet-{page // 9}.jpg', quality=88)
