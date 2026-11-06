import * as THREE from "three";
import { SITE_CONFIG } from "@/lib/site-config";

/**
 * Printed art for the About badge, as canvas textures (crisp at 2048 px):
 * the card face (W + wordmark from the logo files — never set in a font — pass
 * number, CREW PASS line, photo, FOUNDER tag, name, title, email, barcode,
 * ADMIT ONE, city), its back, and the lanyard's woven strap.
 */
export const BADGE = { width: 0.5, height: 0.75 };
const W = 1365, H = 2048;
const NAVY = "#1a253a", DEEP = "#070b14", PAPER = "#f4f1ea", YELLOW = "#ffda24", PINK = "#ff007f", RED = "#e81a2e";

const img = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Plastic / paper grain: faint speckle over everything. */
function grain(x: CanvasRenderingContext2D, w: number, h: number, n: number, alpha: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < n; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.6})`;
    x.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
}

function rounded(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, r: number) {
  x.beginPath();
  x.roundRect(l, t, w, h, r);
}

/** The card face. Images (W, wordmark, photo) are painted when they arrive. */
export function badgeFront() {
  const [c, x] = canvas(W, H);
  const tex = texture(c);
  const L = 96;

  const paint = (w: HTMLImageElement | null, mark: HTMLImageElement | null, photo: HTMLImageElement | null) => {
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1f2c45");
    bg.addColorStop(1, NAVY);
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    // Thin pink frame and a yellow tab at the top (where the strap clips on).
    x.strokeStyle = PINK;
    x.lineWidth = 6;
    rounded(x, 36, 36, W - 72, H - 72, 44);
    x.stroke();
    x.fillStyle = DEEP;
    rounded(x, W / 2 - 150, 70, 300, 40, 20);
    x.fill();

    // Header: W, wordmark, pass number.
    if (w) x.drawImage(w, L, 150, 190, (190 * w.height) / w.width);
    if (mark) {
      const h = 120;
      x.drawImage(mark, L + 220, 170, (h * mark.width) / mark.height, h);
    }
    x.textBaseline = "alphabetic";
    x.textAlign = "right";
    x.fillStyle = YELLOW;
    x.font = '500 46px "JetBrains Mono", monospace';
    x.fillText("NO 00001", W - L, 215);
    x.fillStyle = "rgba(244,241,234,0.45)";
    x.font = '500 30px "JetBrains Mono", monospace';
    x.fillText("PASS", W - L, 260);

    // CREW PASS line between a yellow and a pink rule.
    x.textAlign = "left";
    x.fillStyle = YELLOW;
    x.fillRect(L, 380, 120, 8);
    x.fillStyle = PINK;
    x.fillRect(L + 132, 380, 40, 8);
    x.fillStyle = PAPER;
    x.font = '500 44px "JetBrains Mono", monospace';
    x.fillText("CREW PASS · MISSION 26", L, 460);

    // Photo slot: the cutout cover-fitted (bottom-aligned, so the head sits high), clipped to the slot's corners.
    const px = L, py = 520, pw = 560, ph = 680;
    x.save();
    rounded(x, px, py, pw, ph, 32);
    x.clip();
    x.fillStyle = "#0a1430";
    x.fillRect(px, py, pw, ph);
    if (photo) {
      const s = Math.max(pw / photo.width, ph / photo.height);
      x.drawImage(photo, px + (pw - photo.width * s) / 2, py + ph - photo.height * s, photo.width * s, photo.height * s);
    }
    x.restore();
    x.strokeStyle = YELLOW;
    x.lineWidth = 6;
    rounded(x, px, py, pw, ph, 32);
    x.stroke();

    // Right of the photo: FOUNDER tag and decorative pass stripes.
    const rx = px + pw + 60;
    x.strokeStyle = PAPER;
    x.lineWidth = 5;
    x.strokeRect(rx, py + 10, 330, 92);
    x.fillStyle = PAPER;
    x.font = '700 50px "JetBrains Mono", monospace';
    x.fillText("FOUNDER", rx + 34, py + 74);
    [YELLOW, PINK, RED].forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(rx, py + 170 + i * 46, 330 - i * 70, 22);
    });

    // Role, name, title, email.
    x.fillStyle = YELLOW;
    x.font = '700 46px "JetBrains Mono", monospace';
    x.letterSpacing = "10px";
    x.fillText("SOFTWARE ENGINEER", L, 1262);
    x.letterSpacing = "0px";
    x.fillStyle = PAPER;
    x.font = '400 150px "Lilita One", "Poppins", sans-serif';
    x.fillText(SITE_CONFIG.owner, L, 1390, W - L * 2);
    x.fillStyle = YELLOW;
    x.font = '600 50px "Poppins", sans-serif';
    x.fillText(SITE_CONFIG.ownerTitle, L, 1470, W - L * 2);
    x.fillStyle = "rgba(244,241,234,0.78)";
    x.font = '500 44px "JetBrains Mono", monospace';
    x.fillText(SITE_CONFIG.email, L, 1550, W - L * 2);

    // Barcode + ADMIT ONE.
    x.fillStyle = "rgba(244,241,234,0.14)";
    x.fillRect(L, 1610, W - L * 2, 3);
    let seed = 26;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    x.fillStyle = PAPER;
    for (let bx = L; bx < 860; ) {
      const bw = 4 + Math.floor(rnd() * 4) * 4;
      x.fillRect(bx, 1660, bw, 180);
      bx += bw + 6 + Math.floor(rnd() * 3) * 5;
    }
    x.fillStyle = YELLOW;
    x.font = '700 54px "JetBrains Mono", monospace';
    x.fillText("ADMIT", 920, 1730);
    x.fillText("ONE", 920, 1796);
    x.fillStyle = PINK;
    x.font = '500 40px "JetBrains Mono", monospace';
    x.fillText(`${SITE_CONFIG.city.toUpperCase()} · WEBIX`, L, 1930);

    grain(x, W, H, 26000, 0.035);
    tex.needsUpdate = true;
  };

  paint(null, null, null);
  Promise.all([img("/brand/webix-w.svg"), img("/brand/webix-wordmark-trim.webp"), SITE_CONFIG.ownerPhoto ? img(SITE_CONFIG.ownerPhoto) : Promise.resolve(null)]).then(([w, m, p]) =>
    paint(w, m, p),
  );
  return tex;
}

/** The back: navy with the wordmark. */
export function badgeBack() {
  const [c, x] = canvas(683, 1024);
  const tex = texture(c);
  x.fillStyle = NAVY;
  x.fillRect(0, 0, 683, 1024);
  grain(x, 683, 1024, 6000, 0.03);
  tex.needsUpdate = true;
  img("/brand/webix-wordmark-trim.webp").then((m) => {
    if (!m) return;
    const w = 460;
    x.drawImage(m, (683 - w) / 2, 1024 / 2 - (w * m.height) / m.width / 2, w, (w * m.height) / m.width);
    tex.needsUpdate = true;
  });
  return tex;
}

/** Strap: Deep Indigo webbing with a woven texture and "WEBIX" repeating in Sunny Yellow. */
export function strap() {
  const [c, x] = canvas(1024, 96);
  x.fillStyle = NAVY;
  x.fillRect(0, 0, 1024, 96);
  // Woven look: fine diagonal threads and darker edges.
  x.strokeStyle = "rgba(255,255,255,0.05)";
  x.lineWidth = 2;
  for (let i = -96; i < 1024; i += 7) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 96, 96);
    x.stroke();
  }
  x.fillStyle = "rgba(0,0,0,0.35)";
  x.fillRect(0, 0, 1024, 8);
  x.fillRect(0, 88, 1024, 8);
  x.fillStyle = YELLOW;
  x.font = '700 50px "JetBrains Mono", monospace';
  x.textBaseline = "middle";
  for (let i = 0; i < 4; i++) x.fillText("WEBIX", 40 + i * 256, 50);
  x.fillStyle = PINK;
  for (let i = 0; i < 4; i++) x.fillRect(222 + i * 256, 44, 12, 12);
  const t = texture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}
