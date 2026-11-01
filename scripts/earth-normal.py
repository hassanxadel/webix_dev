"""Tangent-space normal maps for the Earth from NASA GEBCO elevation (land only).

Source: NASA Visible Earth "Topography" (73934), gebco_08_rev_elev_5400x2700.jpg (public domain).
usage: python -I scripts/earth-normal.py <gebco.jpg> <out_dir>
Writes earth-normal-{4k,2k}.webp (R = east, G = north, OpenGL convention) and earth-land-2k.webp (1 = land).
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
STRENGTH_4K = 10.0  # relief exaggeration at 4096 px wide; halved per halving of resolution

elev = Image.open(src).convert("L")

for name, w, k in (("4k", 4096, STRENGTH_4K), ("2k", 2048, STRENGTH_4K / 2)):
    sized = elev.resize((w, w // 2), Image.LANCZOS)
    # Land mask (alpha): GEBCO land elevation is 0 at sea level; soft 1-px coastline.
    raw = np.asarray(sized.filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32)
    land = np.clip((raw - 0.4) / 1.6, 0, 1)
    h = np.asarray(sized.filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255.0
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    hp = np.pad(h, ((1, 1), (0, 0)), mode="edge")
    dy = (hp[2:, :] - hp[:-2, :]) * 0.5  # + toward the south (image down)
    lat = (0.5 - (np.arange(h.shape[0]) + 0.5) / h.shape[0]) * np.pi
    dx = dx / np.maximum(np.cos(lat), 0.1)[:, None]  # pixels shrink toward the poles
    n = np.stack([-k * dx, k * dy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    rgb = np.clip((n * 0.5 + 0.5) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    assert rgb.shape == (w // 2, w, 3)
    # Flat ocean must encode straight up.
    assert abs(int(rgb[h.shape[0] // 2, 0, 2]) - 255) <= 1 or h[h.shape[0] // 2, 0] > 0
    path = f"{out}/earth-normal-{name}.webp"
    Image.fromarray(rgb).save(path, "WEBP", quality=88, method=6)
    if name == "2k":
        # Separate file: lossy WebP rewrites RGB under alpha 0, so the mask can't ride in the normal map's alpha.
        Image.fromarray((land * 255.0 + 0.5).astype(np.uint8), "L").save(f"{out}/earth-land-2k.webp", "WEBP", lossless=True, method=6)
    tilt = np.degrees(np.arccos(n[..., 2]))
    H, W = land.shape
    px = lambda lat, lon: land[int((90 - lat) / 180 * H), int((lon + 180) / 360 * W)]
    # Pacific, Atlantic = ocean; Sahara, Tibet = land.
    assert px(0, -150) < 0.1 and px(-30, -20) < 0.1 and px(25, 15) > 0.9 and px(32, 88) > 0.9, (px(0, -150), px(-30, -20), px(25, 15), px(32, 88))
    print(name, path, "max tilt", round(float(tilt.max()), 1), "p99", round(float(np.percentile(tilt, 99)), 1), "land share (equirect)", round(float(land.mean()), 3))
