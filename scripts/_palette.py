#!/usr/bin/env python3
"""Dominant color palette + light/dark classification from sampled frames.

Usage: _palette.py <frames_dir>
Samples up to 24 frames evenly, quantizes to 5 colors, prints JSON:
  {"palette": ["#rrggbb", ...], "lightDark": "light"|"dark"|"mixed"}
"""
import json
import os
import sys
from PIL import Image

frames_dir = sys.argv[1]
frames = sorted(f for f in os.listdir(frames_dir) if f.endswith(".jpg"))
if not frames:
    print(json.dumps({"palette": [], "lightDark": "dark"}))
    sys.exit(0)

step = max(1, len(frames) // 24)
sampled = frames[::step][:24]

# stack thumbnails into one strip so quantize sees the whole video at once
thumbs = []
for f in sampled:
    with Image.open(os.path.join(frames_dir, f)) as im:
        thumbs.append(im.convert("RGB").resize((80, 45)))
strip = Image.new("RGB", (80, 45 * len(thumbs)))
for i, t in enumerate(thumbs):
    strip.paste(t, (0, i * 45))

q = strip.quantize(colors=5, method=Image.MEDIANCUT)
counts = sorted(q.getcolors(), reverse=True)
pal = q.getpalette()
palette = []
for _, idx in counts[:5]:
    r, g, b = pal[idx * 3 : idx * 3 + 3]
    palette.append(f"#{r:02x}{g:02x}{b:02x}")

# per-frame luminance -> light/dark/mixed
lums = []
for t in thumbs:
    px = list(t.getdata())
    lum = sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in px) / len(px)
    lums.append(lum)
light_share = sum(1 for l in lums if l > 128) / len(lums)
if light_share > 0.7:
    mode = "light"
elif light_share < 0.3:
    mode = "dark"
else:
    mode = "mixed"

print(json.dumps({"palette": palette, "lightDark": mode}))
