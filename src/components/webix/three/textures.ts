import * as THREE from "three";

/**
 * Procedural textures drawn on 2D canvases. Everything in the environment —
 * signage, tiles, train windows, vending machine panels — is generated here
 * instead of being loaded from modelling software.
 */

const JP = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
const LATIN = '"Poppins", "Open Sans", sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  return t;
}

/** Glowing neon lettering on a transparent background, horizontal or vertical. */
export function neonText(text: string, color: string, opts: { vertical?: boolean; size?: number; latin?: boolean } = {}) {
  const size = opts.size ?? 160;
  const chars = [...text];
  const pad = size * 0.5;
  const w = opts.vertical ? size + pad * 2 : Math.ceil(chars.length * size * (opts.latin ? 0.68 : 1.02)) + pad * 2;
  const h = opts.vertical ? chars.length * size * 1.05 + pad * 2 : size + pad * 2;
  const [c, g] = canvas(w, h);
  g.font = `900 ${size}px ${opts.latin ? LATIN : JP}`;
  g.textAlign = "center";
  g.textBaseline = "middle";

  const draw = (blur: number, stroke: string, alpha: number) => {
    g.save();
    g.globalAlpha = alpha;
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.fillStyle = stroke;
    if (opts.vertical) chars.forEach((ch, i) => g.fillText(ch, w / 2, pad + size * 0.55 + i * size * 1.05));
    else g.fillText(text, w / 2, h / 2);
    g.restore();
  };
  draw(size * 0.45, color, 0.9);
  draw(size * 0.18, color, 1);
  draw(size * 0.04, "#ffffff", 0.9); // hot white core of the tube
  return { texture: toTexture(c), aspect: w / h };
}

/** Station name board (駅名標) — the hero's wayfinding sign. */
export function stationSign() {
  const [c, g] = canvas(2048, 640);
  const bg = g.createLinearGradient(0, 0, 0, 640);
  bg.addColorStop(0, "#f4f6fb");
  bg.addColorStop(1, "#dfe3ee");
  g.fillStyle = bg;
  g.fillRect(0, 0, 2048, 640);

  g.fillStyle = "#1A253A";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 210px ${JP}`;
  g.fillText("ウェビックス", 1024, 200);
  g.font = `700 92px ${LATIN}`;
  g.fillText("W E B I X", 1024, 370);

  // Line colour band with the neighbouring "stations".
  g.fillStyle = "#FFDA24";
  g.fillRect(0, 450, 2048, 74);
  g.fillStyle = "#E81A2E";
  g.fillRect(0, 524, 2048, 14);
  g.fillStyle = "#1A253A";
  g.font = `700 50px ${LATIN}`;
  g.textAlign = "left";
  g.fillText("◀  DESIGN  デザイン", 60, 488);
  g.textAlign = "right";
  g.fillText("ビルド  BUILD  ▶", 1988, 488);
  g.textAlign = "center";
  g.font = `600 44px ${LATIN}`;
  g.fillStyle = "#3a4560";
  g.fillText("Platform 8  ·  8番線", 1024, 590);

  // Station number badge.
  g.strokeStyle = "#1A253A";
  g.lineWidth = 12;
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(80, 90, 200, 200, 30);
  g.fill();
  g.stroke();
  g.fillStyle = "#1A253A";
  g.font = `800 66px ${LATIN}`;
  g.fillText("WX", 180, 160);
  g.font = `800 84px ${LATIN}`;
  g.fillText("08", 180, 240);
  return toTexture(c);
}

/** Glazed wall tiles with grout and slight per-tile variation. */
export function wallTiles() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#0b0d16";
  g.fillRect(0, 0, 512, 512);
  const tw = 64;
  const th = 32;
  for (let y = 0; y < 512; y += th) {
    for (let x = 0; x < 512; x += tw) {
      const l = 22 + Math.random() * 10;
      g.fillStyle = `rgb(${l * 0.8}, ${l * 0.85}, ${l * 1.25})`;
      g.fillRect(x + 2, y + 2, tw - 4, th - 4);
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(x + 2, y + 2, tw - 4, 3);
    }
  }
  return toTexture(c, { repeat: [40, 3] });
}

/** Roughness variation for the polished floor — wetter patches reflect more. */
export function floorRoughness() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = "#9a9a9a";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 20 + Math.random() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(10,10,10,0.55)");
    grad.addColorStop(1, "rgba(10,10,10,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Large stone slab joints.
  g.strokeStyle = "rgba(230,230,230,0.6)";
  g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  return toTexture(c, { repeat: [4, 40], srgb: false });
}

/** Japanese tactile paving (点字ブロック) along the platform edge. */
export function tactilePaving() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#e8b818";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cx = 32 + x * 64;
      const cy = 32 + y * 64;
      const grad = g.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 18);
      grad.addColorStop(0, "#fff2a0");
      grad.addColorStop(1, "#b58a00");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, 16, 0, Math.PI * 2);
      g.fill();
    }
  }
  return toTexture(c, { repeat: [1, 110] });
}

/** Train side: lit cabin windows with silhouettes of seats, a band of livery below. */
export function trainWindows() {
  const [c, g] = canvas(1024, 256);
  g.fillStyle = "#0d1220";
  g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 4; i++) {
    const x = 30 + i * 250;
    const warm = i % 3 === 1 ? "#ff5fa8" : "#ffc96b";
    const grad = g.createLinearGradient(0, 40, 0, 200);
    grad.addColorStop(0, warm);
    grad.addColorStop(1, "#ffeccc");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(x, 46, 200, 140, 26);
    g.fill();
    // Seat backs.
    g.fillStyle = "rgba(20,24,40,0.75)";
    for (let s = 0; s < 3; s++) {
      g.beginPath();
      g.roundRect(x + 18 + s * 62, 120, 46, 66, 12);
      g.fill();
    }
    // Glass reflection streak.
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.beginPath();
    g.moveTo(x + 30, 46);
    g.lineTo(x + 80, 46);
    g.lineTo(x + 20, 186);
    g.lineTo(x - 10, 186);
    g.fill();
  }
  return toTexture(c, { repeat: [42, 1] });
}

/** Vending machine front: a grid of illuminated "products" and the service name. */
export function vendingFront(title: string, jp: string, color: string) {
  const [c, g] = canvas(512, 1024);
  g.fillStyle = "#0e1220";
  g.fillRect(0, 0, 512, 1024);

  // Top lit header.
  const head = g.createLinearGradient(0, 0, 0, 150);
  head.addColorStop(0, color);
  head.addColorStop(1, "#0e1220");
  g.fillStyle = head;
  g.fillRect(0, 0, 512, 150);
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.font = `900 92px ${JP}`;
  g.fillText(jp, 256, 105);

  // Display window with rows of products.
  g.fillStyle = "#f6f2e8";
  g.fillRect(30, 180, 452, 520);
  const palette = [color, "#1A253A", "#FFDA24", "#FF007F", "#E81A2E", "#ffffff"];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 52 + col * 86;
      const y = 200 + row * 126;
      g.fillStyle = palette[(row * 5 + col) % palette.length];
      g.beginPath();
      g.roundRect(x, y, 56, 92, 14);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x + 8, y + 8, 8, 70);
      g.fillStyle = "#1A253A";
      g.fillRect(x - 6, y + 100, 68, 6);
    }
  }

  g.fillStyle = color;
  g.font = `700 40px ${LATIN}`;
  g.fillText(title.toUpperCase(), 256, 770);
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.font = `500 26px ${LATIN}`;
  g.fillText("WEBIX SERVICE", 256, 812);
  // Coin slot + dispenser.
  g.fillStyle = "#1b2133";
  g.fillRect(60, 860, 392, 120);
  g.fillStyle = "#05060a";
  g.fillRect(90, 890, 332, 60);
  return toTexture(c);
}

/** Soft radial sprite used for haze cards and light pools. */
export function glowSprite() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return toTexture(c);
}
