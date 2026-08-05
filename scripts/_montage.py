#!/usr/bin/env python3
"""Tile timestamped frames into contact sheets. Called by chapterize.mjs.

ffmpeg on this machine lacks libfreetype (no drawtext filter), so the labels
are drawn here with Pillow. Each frame's timecode is computed exactly from its
index and the sampling fps, then burned into the cell corner.

Usage: _montage.py <frames_dir> <out_dir> <fps> <cols> <rows> <cell_w>
Frames must be named so lexical sort == chronological (ffmpeg %05d does this).
Frame i (0-based) is at t = i / fps seconds.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

frames_dir, out_dir, fps, cols, rows, cell_w = (
    sys.argv[1], sys.argv[2], float(sys.argv[3]),
    int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]),
)

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf"
PAD = 4
LABEL_H = 16

frames = sorted(f for f in os.listdir(frames_dir) if f.endswith(".jpg"))
if not frames:
    print("0")
    sys.exit(0)

# derive cell height from the first frame's aspect ratio
with Image.open(os.path.join(frames_dir, frames[0])) as im0:
    ar = im0.height / im0.width
cell_h = round(cell_w * ar)

try:
    font = ImageFont.truetype(FONT_PATH, 13)
except OSError:
    font = ImageFont.load_default()

per_sheet = cols * rows
sheets = 0

def tc(seconds):
    m, s = divmod(int(round(seconds)), 60)
    return f"{m}:{s:02d}"

for sheet_idx in range(0, len(frames), per_sheet):
    batch = frames[sheet_idx:sheet_idx + per_sheet]
    grid_w = cols * cell_w + (cols + 1) * PAD
    grid_h = rows * cell_h + (rows + 1) * PAD
    sheet = Image.new("RGB", (grid_w, grid_h), (10, 10, 10))
    draw = ImageDraw.Draw(sheet)

    for j, fname in enumerate(batch):
        r, c = divmod(j, cols)
        x = PAD + c * (cell_w + PAD)
        y = PAD + r * (cell_h + PAD)
        with Image.open(os.path.join(frames_dir, fname)) as im:
            im = im.resize((cell_w, cell_h))
            sheet.paste(im, (x, y))
        frame_i = sheet_idx + j
        label = tc(frame_i / fps)
        tw = draw.textlength(label, font=font)
        draw.rectangle([x, y, x + tw + 6, y + LABEL_H], fill=(0, 0, 0))
        draw.text((x + 3, y + 1), label, fill=(255, 220, 0), font=font)

    out = os.path.join(out_dir, f"montage_{sheets:03d}.jpg")
    sheet.save(out, quality=82)
    sheets += 1

print(str(sheets))
