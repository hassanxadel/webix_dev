"""Earth textures for the hero, from NASA public-domain sources.

Sources:
  day     Blue Marble Next Generation, December, topography + bathymetry (Visible Earth 73909):
          world.topo.bathy.200412.3x21600x10800.jpg
  night   Black Marble 2016, 3 km (NASA Earth Observatory): BlackMarble_2016_3km.jpg
  clouds  cloud_combined_8192.tif (Visible Earth)
  elev    GEBCO topography (Visible Earth 73934): gebco_08_rev_elev_21600x10800.jpg

usage: python -I scripts/earth-textures.py <day> <night> <clouds> <elev> <public/space> <work_dir> <basisu_st.wasm>
  (basisu_st.wasm: https://github.com/BinomialLLC/basis_universal bin/, run through scripts/basisu-wasi.mjs)

Writes into public/space:
  earth-{day,night,clouds,normal}-2k.webp, earth-land-2k.webp   first paint (and the low tier)
  earth-{day,night,clouds,normal}-{4k,8k}.ktx2                  ETC1S + mipmaps, flipped vertically
                                                                (compressed textures can't be flipped on upload)
Normal maps: R = east, G = north (OpenGL convention). Clouds, normals and the mask are linear data.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
day_src, night_src, clouds_src, elev_src, out, work, wasm = sys.argv[1:8]
STRENGTH_4K = 10.0  # relief exaggeration at 4096 px wide; scales with resolution so the slopes stay the same
RUNNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "basisu-wasi.mjs")
os.makedirs(work, exist_ok=True)


def load(path, mode, w):
    im = Image.open(path)
    im.draft(mode, (w, w // 2))  # JPEG: decode at a reduced scale when the source is much larger
    return im.convert(mode).resize((w, w // 2), Image.LANCZOS)


def normals(elev, w):
    sized = elev.resize((w, w // 2), Image.LANCZOS)
    h = np.asarray(sized.filter(ImageFilter.GaussianBlur(0.8 * w / 4096)), dtype=np.float32) / 255.0
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    hp = np.pad(h, ((1, 1), (0, 0)), mode="edge")
    dy = (hp[2:, :] - hp[:-2, :]) * 0.5  # + toward the south (image down)
    lat = (0.5 - (np.arange(h.shape[0]) + 0.5) / h.shape[0]) * np.pi
    dx /= np.maximum(np.cos(lat), 0.1)[:, None]  # pixels shrink toward the poles
    k = STRENGTH_4K * w / 4096
    n = np.stack([-k * dx, k * dy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    rgb = np.clip((n * 0.5 + 0.5) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    assert rgb.shape == (w // 2, w, 3)
    return Image.fromarray(rgb), sized


def encode(png, ktx2, linear):
    # WASI sees work_dir as /work.
    args = ["-etc1s", "-quality", "92", "-effort", "4", "-mipmap", "-linear" if linear else "-srgb", "-file", f"/work/{png}", "-output_file", f"/work/{ktx2}"]
    subprocess.run(["node", "--no-warnings", RUNNER, wasm, work, *args], check=True)
    os.replace(os.path.join(work, ktx2), os.path.join(out, ktx2))


elev = Image.open(elev_src).convert("L")

# First paint: 2K WebP (flipY on upload, so not flipped) and the land mask.
for name, src, mode in (("day", day_src, "RGB"), ("night", night_src, "RGB"), ("clouds", clouds_src, "L")):
    load(src, mode, 2048).save(f"{out}/earth-{name}-2k.webp", "WEBP", quality=88, method=6)
normal_2k, elev_2k = normals(elev, 2048)
normal_2k.save(f"{out}/earth-normal-2k.webp", "WEBP", quality=88, method=6)
raw = np.asarray(elev_2k.filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32)
land = np.clip((raw - 0.4) / 1.6, 0, 1)  # GEBCO land elevation is 0 at sea level; soft 1-px coastline
H, W = land.shape
px = lambda la, lo: land[int((90 - la) / 180 * H), int((lo + 180) / 360 * W)]
assert px(0, -150) < 0.1 and px(-30, -20) < 0.1 and px(25, 15) > 0.9 and px(32, 88) > 0.9  # Pacific, Atlantic / Sahara, Tibet
Image.fromarray((land * 255.0 + 0.5).astype(np.uint8), "L").save(f"{out}/earth-land-2k.webp", "WEBP", lossless=True, method=6)

# Desktop 8K and mobile 4K: KTX2.
for size, w in (("4k", 4096), ("8k", 8192)):
    for name, make, linear in (
        ("day", lambda: load(day_src, "RGB", w), False),
        ("night", lambda: load(night_src, "RGB", w), False),
        ("clouds", lambda: load(clouds_src, "L", w), True),
        ("normal", lambda: normals(elev, w)[0], True),
    ):
        png = f"earth-{name}-{size}.png"
        make().transpose(Image.FLIP_TOP_BOTTOM).save(os.path.join(work, png), compress_level=1)
        encode(png, f"earth-{name}-{size}.ktx2", linear)
        print(size, name, os.path.getsize(os.path.join(out, f"earth-{name}-{size}.ktx2")) // 1024, "KB", flush=True)
