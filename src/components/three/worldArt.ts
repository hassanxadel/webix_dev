import * as THREE from "three";
import type { Service } from "@/lib/webix-data";

/** Canvas-painted textures for the line: no image downloads beyond the project screenshots and the HDRI. */

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = '"Poppins", "Inter", sans-serif';
const BODY = '"Inter", sans-serif';
const JP = '"Noto Sans JP", sans-serif';

export const BRAND = { night: "#070b14", indigo: "#1a253a", yellow: "#ffda24", pink: "#ff007f", red: "#e81a2e", text: "#f4f1ea" } as const;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  return t;
}

/** Dark stone floor tiles with slight variation and grout lines. */
export function stoneTiles(repeat: [number, number]) {
  const [c, g] = canvas(512, 512);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const l = 22 + Math.random() * 9;
      g.fillStyle = `rgb(${l},${l + 2},${l + 7})`;
      g.fillRect(x * 128, y * 128, 128, 128);
      for (let k = 0; k < 220; k++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
        g.fillRect(x * 128 + Math.random() * 128, y * 128 + Math.random() * 128, 2, 2);
      }
    }
  g.strokeStyle = "rgba(0,0,0,0.75)";
  g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  return tex(c, { repeat });
}

/** Roughness for the wet floor: puddles (dark = glossy) on honed stone. */
export function wetRoughness(repeat: [number, number]) {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#8c8c8c";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 18 + Math.random() * 80;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    // Puddles stay glossy but never mirror-perfect: near-zero roughness under a close
    // point light sends the specular term to infinity, which bloom turns into black holes.
    grad.addColorStop(0, "rgba(70,70,70,0.75)");
    grad.addColorStop(1, "rgba(70,70,70,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, { srgb: false, repeat });
}

/** Japanese tactile paving (点字ブロック): bright yellow, raised dots. */
export function tactile(repeat: [number, number]) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = "#e8c210";
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const cx = 16 + x * 32;
      const cy = 16 + y * 32;
      const grad = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 10);
      grad.addColorStop(0, "#fff3a6");
      grad.addColorStop(1, "#b38f00");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, 9, 0, Math.PI * 2);
      g.fill();
    }
  return tex(c, { repeat });
}

/** Station name board (駅名標): Japanese name, English name, line band with prev / next, number badge. */
export function nameBoard(num: string, en: string, jp: string, prev?: string, next?: string) {
  const [c, g] = canvas(1600, 480);
  g.fillStyle = "#f4f1ea";
  g.fillRect(0, 0, 1600, 480);
  g.fillStyle = BRAND.indigo;
  g.textAlign = "center";
  g.font = `700 130px ${JP}`;
  g.fillText(jp, 800, 165);
  g.font = `600 78px ${SANS}`;
  g.fillText(en, 800, 280);
  g.fillStyle = BRAND.yellow;
  g.fillRect(0, 340, 1600, 70);
  g.fillStyle = BRAND.pink;
  g.fillRect(0, 410, 1600, 10);
  g.fillStyle = BRAND.indigo;
  g.font = `500 38px ${MONO}`;
  g.textAlign = "left";
  g.fillText(prev ? `← ${prev.toUpperCase()}` : "WEBIX LINE", 50, 388);
  g.textAlign = "right";
  g.fillText(next ? `${next.toUpperCase()} →` : "TERMINUS", 1550, 388);
  // Number badge.
  g.strokeStyle = BRAND.indigo;
  g.lineWidth = 9;
  g.beginPath();
  g.roundRect(60, 60, 170, 170, 22);
  g.stroke();
  g.textAlign = "center";
  g.font = `500 44px ${MONO}`;
  g.fillText("WX", 145, 125);
  g.font = `500 72px ${MONO}`;
  g.fillText(num, 145, 200);
  return tex(c);
}

/** Vertical neon lettering (transparent background, glow baked in). */
export function neonVertical(text: string, color: string) {
  const chars = [...text];
  const size = 150;
  const [c, g] = canvas(size * 1.8, chars.length * size * 1.08 + size * 0.8);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${size}px ${JP}`;
  const pass = (blur: number, col: string, a: number) => {
    g.save();
    g.globalAlpha = a;
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.fillStyle = col;
    chars.forEach((ch, i) => g.fillText(ch, c.width / 2, size * 0.9 + i * size * 1.08));
    g.restore();
  };
  pass(60, color, 0.9);
  pass(18, color, 1);
  pass(3, "#ffe3f1", 0.95);
  return { texture: tex(c), aspect: c.width / c.height };
}

/** Horizontal neon text for the terminal wall. */
export function neonLine(text: string, color: string, font: string, size: number) {
  const [m] = canvas(10, 10);
  const mg = m.getContext("2d")!;
  mg.font = `${font} ${size}px ${text.match(/[぀-ヿ一-鿿]/) ? JP : SANS}`;
  const w = Math.ceil(mg.measureText(text).width + size * 1.2);
  const [c, g] = canvas(w, Math.ceil(size * 1.8));
  g.font = mg.font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  [
    [size * 0.45, color, 0.9],
    [size * 0.14, color, 1],
    [size * 0.02, "#fff7ea", 0.9],
  ].forEach(([blur, col, a]) => {
    g.save();
    g.globalAlpha = a as number;
    g.shadowColor = color;
    g.shadowBlur = blur as number;
    g.fillStyle = col as string;
    g.fillText(text, w / 2, c.height / 2);
    g.restore();
  });
  return { texture: tex(c), aspect: w / c.height };
}

function icon(g: CanvasRenderingContext2D, kind: Service["icon"], x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = BRAND.yellow;
  g.lineWidth = s * 0.06;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.beginPath();
  if (kind === "monitor") {
    g.roundRect(-s * 0.5, -s * 0.38, s, s * 0.62, s * 0.05);
    g.moveTo(-s * 0.18, s * 0.42);
    g.lineTo(s * 0.18, s * 0.42);
    g.moveTo(0, s * 0.24);
    g.lineTo(0, s * 0.42);
  } else if (kind === "bag") {
    g.roundRect(-s * 0.4, -s * 0.18, s * 0.8, s * 0.62, s * 0.06);
    g.moveTo(-s * 0.18, -s * 0.18);
    g.arc(0, -s * 0.18, s * 0.18, Math.PI, 0);
  } else if (kind === "cube") {
    const p = (a: number, b: number) => [a * s, b * s] as const;
    const pts = [p(0, -0.45), p(0.42, -0.22), p(0.42, 0.26), p(0, 0.48), p(-0.42, 0.26), p(-0.42, -0.22)];
    pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
    g.closePath();
    g.moveTo(-s * 0.42, -s * 0.22);
    g.lineTo(0, 0);
    g.lineTo(s * 0.42, -s * 0.22);
    g.moveTo(0, 0);
    g.lineTo(0, s * 0.48);
  } else {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      g.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12);
      g.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46);
    }
    g.moveTo(s * 0.12, 0);
    g.arc(0, 0, s * 0.12, 0, Math.PI * 2);
  }
  g.stroke();
  g.restore();
}

/** Platform screen for one service: number, icon, title and one line. */
export function serviceScreen(svc: Service, index: number) {
  const [c, g] = canvas(1024, 640);
  const bg = g.createLinearGradient(0, 0, 0, 640);
  bg.addColorStop(0, "#152036");
  bg.addColorStop(1, "#0a1020");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 640);
  g.fillStyle = "rgba(255,255,255,0.03)";
  for (let y = 0; y < 640; y += 4) g.fillRect(0, y, 1024, 1);
  g.fillStyle = "rgba(244,241,234,0.55)";
  g.font = `500 30px ${MONO}`;
  g.fillText(`SERVICE ${String(index + 1).padStart(2, "0")}`, 70, 96);
  g.textAlign = "right";
  g.font = `500 34px ${JP}`;
  g.fillText(svc.jp, 954, 98);
  g.textAlign = "left";
  icon(g, svc.icon, 150, 270, 150);
  g.fillStyle = BRAND.text;
  g.font = `700 76px ${SANS}`;
  g.fillText(svc.name, 70, 452);
  g.fillStyle = "rgba(244,241,234,0.7)";
  g.font = `400 34px ${BODY}`;
  const words = svc.line.split(" ");
  let line = "";
  let y = 520;
  words.forEach((w) => {
    if (g.measureText(line + w).width > 860) {
      g.fillText(line, 70, y);
      line = "";
      y += 46;
    }
    line += w + " ";
  });
  g.fillText(line, 70, y);
  g.fillStyle = BRAND.yellow;
  g.fillRect(70, 132, 60, 6);
  return tex(c);
}

/** Express micro-stop sign: step number, English and Japanese name. */
export function stopSign(n: number, name: string, jp: string) {
  const [c, g] = canvas(1200, 420);
  g.fillStyle = "#0d1424";
  g.fillRect(0, 0, 1200, 420);
  g.fillStyle = BRAND.yellow;
  g.fillRect(0, 0, 22, 420);
  g.fillStyle = BRAND.yellow;
  g.font = `500 46px ${MONO}`;
  g.fillText(`STEP ${String(n).padStart(2, "0")} / 04`, 80, 100);
  g.fillStyle = BRAND.text;
  g.font = `700 150px ${SANS}`;
  g.fillText(name, 74, 280);
  g.fillStyle = "rgba(244,241,234,0.55)";
  g.font = `700 70px ${JP}`;
  g.textAlign = "right";
  g.fillText(jp, 1130, 280);
  g.textAlign = "left";
  g.fillStyle = "rgba(244,241,234,0.45)";
  g.font = `500 34px ${MONO}`;
  g.fillText("EXPRESS · DOES NOT STOP", 80, 360);
  return tex(c);
}

/** City windows for skyline silhouettes: sparse warm and cool lit windows on black. */
export function cityWindows() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = "#04060c";
  g.fillRect(0, 0, 256, 512);
  for (let y = 8; y < 512; y += 14)
    for (let x = 8; x < 256; x += 12) {
      const r = Math.random();
      if (r > 0.82) {
        g.fillStyle = r > 0.97 ? "#ff5aa8" : r > 0.9 ? "#ffd98a" : "#9fb4ff";
        g.globalAlpha = 0.5 + Math.random() * 0.5;
        g.fillRect(x, y, 6, 8);
      }
    }
  g.globalAlpha = 1;
  return tex(c, { repeat: [1, 1] });
}

/** Train side window band: lit cabin, seat silhouettes, tinted glass. */
export function trainWindows() {
  const [c, g] = canvas(1024, 192);
  g.fillStyle = "#0b1020";
  g.fillRect(0, 0, 1024, 192);
  for (let i = 0; i < 4; i++) {
    const x = 22 + i * 252;
    const grad = g.createLinearGradient(0, 30, 0, 160);
    grad.addColorStop(0, "#fff1d6");
    grad.addColorStop(1, "#c9a978");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(x, 34, 210, 124, 26);
    g.fill();
    g.fillStyle = "rgba(26,37,58,0.85)";
    for (let s = 0; s < 4; s++) {
      g.beginPath();
      g.roundRect(x + 14 + s * 50, 92, 36, 66, 10);
      g.fill();
    }
    g.fillStyle = "rgba(10,14,28,0.35)";
    g.beginPath();
    g.roundRect(x, 34, 210, 124, 26);
    g.fill();
  }
  return tex(c, { repeat: [12, 1] });
}

/**
 * Split-flap departure board, redrawn as its rows flip. Each cell shows the
 * top and bottom flap with the split line; `flip` (0..1 per row) cycles random
 * glyphs before landing on the target text.
 */
export function makeDepartureBoard(rows: { label: string; value: string }[]) {
  const W = 1600;
  const H = 120 + rows.length * 130;
  const [c, g] = canvas(W, H);
  const texture = tex(c);
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const cols = 22;
  const cw = (W - 120) / cols;

  const draw = (progress: number[]) => {
    g.fillStyle = "#05070d";
    g.fillRect(0, 0, W, H);
    g.fillStyle = BRAND.yellow;
    g.font = `500 40px ${MONO}`;
    g.fillText("DEPARTURES  ·  発車案内  ·  RESULTS", 60, 72);
    rows.forEach((r, ri) => {
      const text = (r.label.toUpperCase().padEnd(18, " ") + r.value.padStart(4, " ")).slice(0, cols);
      const y = 110 + ri * 130;
      for (let i = 0; i < cols; i++) {
        const x = 60 + i * cw;
        // Each cell settles a little after the one before it, like a real board; all are settled at progress 1.
        const settle = Math.min(1, Math.max(0, progress[ri] * (1 + cols * 0.03) - i * 0.03));
        const ch = settle >= 1 ? text[i] : settle <= 0 ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        g.fillStyle = "#121722";
        g.fillRect(x + 3, y, cw - 6, 104);
        g.fillStyle = "#0b0f18";
        g.fillRect(x + 3, y + 51, cw - 6, 2);
        g.fillStyle = i >= 18 ? BRAND.yellow : "#ece8de";
        g.font = `500 72px ${MONO}`;
        g.textAlign = "center";
        g.fillText(ch, x + cw / 2, y + 78);
        g.textAlign = "left";
      }
    });
    texture.needsUpdate = true;
  };
  draw(rows.map(() => 0));
  return { texture, draw, aspect: W / H };
}
