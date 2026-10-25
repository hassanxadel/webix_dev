"""
Vectorise the Webix W (src/assets/logo-w.png) into three layers:
  navy face, gold rim (ring around the face), pink side (the extruded depth).

Colour-segment each layer, trace its outer boundary (Moore neighbour), simplify
with Douglas-Peucker into crisp straight edges, and write:
  public/brand/webix-w.svg       — three <path> layers, normalised viewBox
  <preview>                       — PNG rendered from the same points
Usage: python scripts/trace-w.py <preview.png>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = "src/assets/logo-w.png"
SVG_OUT = "public/brand/webix-w.svg"
preview_out = sys.argv[1] if len(sys.argv) > 1 else "webix-w-preview.png"

img = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
r, g, b = img[..., 0], img[..., 1], img[..., 2]

navy = (b > r + 25) & (r < 90) & (g < 110) & (b > 55)
gold = (r > 190) & (g > 120) & (b < 90)
pink = (r > 170) & (g < 130) & (b > 50) & (r > b + 40)


def clean(mask, close=5, open_=3):
    """Morphological close then open: bridge the thin black outline, drop specks."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(close)).filter(ImageFilter.MinFilter(close))
    im = im.filter(ImageFilter.MinFilter(open_)).filter(ImageFilter.MaxFilter(open_))
    return np.asarray(im) > 127


def largest_component(mask):
    """Keep the largest 4-connected component (flood fill, iterative)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best = None
    best_n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys[::997], xs[::997]):  # sample seeds; components are large
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        comp = []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(comp) > best_n:
            best_n = len(comp)
            best = comp
    out = np.zeros_like(mask, dtype=bool)
    if best:
        yy, xx = zip(*best)
        out[list(yy), list(xx)] = True
    return out


def fill_holes(mask):
    """Fill everything not reachable from the border (keeps the outer silhouette solid)."""
    inv = ~mask
    h, w = mask.shape
    reach = np.zeros_like(mask, dtype=bool)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if inv[y, x]] + [(y, x) for y in range(h) for x in (0, w - 1) if inv[y, x]]
    for y, x in stack:
        reach[y, x] = True
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and inv[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True
                stack.append((ny, nx))
    return ~reach


def trace(mask):
    """Moore-neighbour boundary trace of a single solid region; returns [(x, y), ...]."""
    ys, xs = np.nonzero(mask)
    i = np.lexsort((xs, ys))[0]
    start = (xs[i], ys[i])
    dirs = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]
    h, w = mask.shape
    inside = lambda x, y: 0 <= x < w and 0 <= y < h and mask[y, x]
    pts = [start]
    cur = start
    d = 6
    for _ in range(200000):
        for k in range(8):
            nd = (d + 6 + k) % 8  # start searching back-left of the last move
            nx, ny = cur[0] + dirs[nd][0], cur[1] + dirs[nd][1]
            if inside(nx, ny):
                cur = (nx, ny)
                d = nd
                break
        if cur == start:
            break
        pts.append(cur)
    return pts


def rdp(points, eps):
    """Douglas-Peucker simplification (iterative)."""
    pts = np.asarray(points, dtype=float)
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        p, q = pts[a], pts[b]
        seg = q - p
        n = np.hypot(*seg) or 1.0
        d = np.abs(np.cross(seg, pts[a + 1 : b] - p)) / n
        k = int(np.argmax(d))
        if d[k] > eps:
            m = a + 1 + k
            keep[m] = True
            stack += [(a, m), (m, b)]
    return [tuple(x) for x in pts[keep]]


navy_m = fill_holes(largest_component(clean(navy)))
face_rim = fill_holes(largest_component(clean(navy | gold, close=9)))
silhouette = fill_holes(largest_component(clean(navy | gold | pink, close=11)))

layers = {
    "face": rdp(trace(navy_m), 3.5),
    "rim": rdp(trace(face_rim), 3.5),
    "side": rdp(trace(silhouette), 3.5),
}

# Normalise to a viewBox anchored at the silhouette's bounding box.
allp = np.array(layers["side"])
x0, y0 = allp.min(axis=0)
x1, y1 = allp.max(axis=0)
S = 1000.0 / (x1 - x0)
norm = {k: [((x - x0) * S, (y - y0) * S) for x, y in v] for k, v in layers.items()}
W, H = 1000, (y1 - y0) * S

def d(points):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in points) + " Z"

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">
  <!-- Webix W, traced from src/assets/logo-w.png. Layers bottom to top. -->
  <path id="side" fill="#E81A2E" d="{d(norm['side'])}"/>
  <path id="rim" fill="#FFDA24" fill-rule="evenodd" d="{d(norm['rim'])} {d(norm['face'])}"/>
  <path id="face" fill="#1A253A" d="{d(norm['face'])}"/>
</svg>
'''
open(SVG_OUT, "w", encoding="utf-8").write(svg)

# Preview: render the same polygons, 2x, with a thin dark gap between layers like the inlay will have.
scale = 1.2
pad = 60
pw, ph = int(W * scale + pad * 2), int(H * scale + pad * 2)
prev = Image.new("RGB", (pw * 2 + pad, ph), (14, 18, 28))
dr = ImageDraw.Draw(prev)
tp = lambda pts, ox=0: [(pad + ox + x * scale, pad + y * scale) for x, y in pts]
# Left: flat SVG layers.
dr.polygon(tp(norm["side"]), fill=(232, 26, 46), outline=(8, 10, 16), width=4)
dr.polygon(tp(norm["rim"]), fill=(255, 218, 36), outline=(8, 10, 16), width=4)
dr.polygon(tp(norm["face"]), fill=(26, 37, 58), outline=(8, 10, 16), width=4)
# Right: each layer on its own, outlined, so the traced shapes are easy to inspect.
ox = pw + pad
for k, col in (("side", (232, 26, 46)), ("rim", (255, 218, 36)), ("face", (120, 150, 210))):
    dr.line(tp(norm[k], ox) + [tp(norm[k], ox)[0]], fill=col, width=3)
prev.save(preview_out)
print({k: len(v) for k, v in layers.items()}, f"viewBox 0 0 {W:.0f} {H:.0f}")
