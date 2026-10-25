import * as THREE from "three";
import { STATIONS } from "@/config/stations";

/**
 * Artwork for the Webix Pass, generated in code: the W mark (traced from the
 * brand icon), the printed front and the line-map back.
 */

export const CARD = {
  /** ISO/IEC 7810 ID-1: 85.6 × 54 mm, scaled up for the scene. */
  width: 1.2,
  height: 1.2 / 1.5852,
  thickness: 0.0125,
  radius: 0.045,
} as const;

/** Station circles on the back's line map, in card UV space. */
export const BACK_SLOTS = STATIONS.map((_, i) => ({ u: 0.1 + i * (0.8 / (STATIONS.length - 1)), v: 0.47 }));

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Planar UVs normalised to the card rectangle, so printed textures map 1:1. */
export function normaliseUVs(g: THREE.BufferGeometry, w: number, h: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = '"Poppins", "Inter", sans-serif';
const JP = '"Noto Sans JP", sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

/** Brushed-metal streaks: long horizontal lines of varying brightness. */
function brush(g: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
  for (let y = 0; y < h; y += 1) {
    if (Math.random() < 0.55) continue;
    const l = Math.random();
    g.fillStyle = `rgba(${l > 0.5 ? "255,255,255" : "0,0,0"},${alpha * Math.random()})`;
    const x = Math.random() * w * 0.4;
    g.fillRect(x, y, w * (0.4 + Math.random() * 0.6), 1);
  }
}

/** Front: brushed navy with a single tiny mark — the W inlay carries the face. */
export function frontPrint() {
  const W = 2048;
  const H = Math.round(W / 1.5852);
  const [c, g] = canvas(W, H);
  const base = g.createLinearGradient(0, 0, W, H);
  // Lifted navy: as polished metal it reflects a dark night, so the base must read navy, not black.
  base.addColorStop(0, "#344a78");
  base.addColorStop(0.55, "#283a60");
  base.addColorStop(1, "#1f2e4d");
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  brush(g, W, H, 0.03);

  g.fillStyle = "rgba(236,232,224,0.7)";
  g.font = `500 44px ${MONO}`;
  g.textBaseline = "alphabetic";
  g.fillText("WEBIX PASS", 110, 150);
  return tex(c);
}

/** Roughness for the front: brushed streaks so highlights stretch along the grain. */
export function frontRoughness() {
  const [c, g] = canvas(1024, 646);
  g.fillStyle = "#7a7a7a";
  g.fillRect(0, 0, 1024, 646);
  brush(g, 1024, 646, 0.35);
  return tex(c, false);
}

/** Back: matte navy with the printed Webix Line map and seven stamp circles. */
export function backPrint() {
  const W = 2048;
  const H = Math.round(W / 1.5852);
  const [c, g] = canvas(W, H);
  g.fillStyle = "#172236";
  g.fillRect(0, 0, W, H);
  brush(g, W, H, 0.03);

  g.fillStyle = "rgba(236,232,224,0.9)";
  g.font = `600 70px ${SANS}`;
  g.fillText("Webix Line", 140, 200);
  g.fillStyle = "rgba(236,232,224,0.5)";
  g.font = `500 32px ${MONO}`;
  g.fillText("7 STATIONS  ·  STAMP EACH STOP", 142, 256);

  const y = (1 - BACK_SLOTS[0].v) * H;
  const x0 = BACK_SLOTS[0].u * W;
  const x1 = BACK_SLOTS[BACK_SLOTS.length - 1].u * W;
  g.fillStyle = "#ffda24";
  g.fillRect(x0, y - 7, x1 - x0, 14);
  g.fillStyle = "#ff007f";
  g.fillRect(x0, y + 12, x1 - x0, 4);

  STATIONS.forEach((s, i) => {
    const x = BACK_SLOTS[i].u * W;
    g.fillStyle = "#172236";
    g.beginPath();
    g.arc(x, y, 64, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(236,232,224,0.85)";
    g.lineWidth = 6;
    g.stroke();
    g.textAlign = "center";
    g.fillStyle = "rgba(236,232,224,0.85)";
    g.font = `500 30px ${MONO}`;
    g.fillText(s.num, x, y + 140);
    g.font = `600 30px ${SANS}`;
    g.fillText(s.en, x, y + 186);
    g.fillStyle = "rgba(236,232,224,0.5)";
    g.font = `500 28px ${JP}`;
    g.fillText(s.jp, x, y - 96);
    g.textAlign = "left";
  });

  g.fillStyle = "rgba(236,232,224,0.75)";
  g.font = `500 46px ${MONO}`;
  g.fillText("WBX · 0001 · 2026", 142, H - 150);
  g.fillStyle = "rgba(236,232,224,0.4)";
  g.font = `500 28px ${MONO}`;
  g.fillText("LINE 01  ·  TAP TO START A PROJECT", 144, H - 98);
  // Contactless mark.
  g.strokeStyle = "rgba(236,232,224,0.6)";
  g.lineWidth = 9;
  g.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(W - 230, 170, 30 + i * 24, -0.75, 0.75);
    g.stroke();
  }
  return tex(c);
}
