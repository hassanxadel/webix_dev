// Screenshot the journey at the hero and at each station, desktop + mobile.
// Usage: node scripts/shoot.mjs <outDir> [baseUrl] [--only=desktop|mobile] [--at=0.5,0.62]
// Uses the locally installed Chrome (no browser download) with software WebGL.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "shots";
const base = process.argv[3]?.startsWith("http") ? process.argv[3] : "http://localhost:5173/";
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const at = process.argv.find((a) => a.startsWith("--at="))?.split("=")[1];
mkdirSync(outDir, { recursive: true });

// Hero + each station's anchor (kept in sync with src/config/stations.ts by hand).
const POINTS = at
  ? at.split(",").map((p) => ({ name: `p${p}`, p: Number(p) }))
  : [
      { name: "01-departure", p: 0 },
      { name: "02-vision", p: 0.235 },
      { name: "03-services", p: 0.4 },
      { name: "04-work", p: 0.53 },
      { name: "05-process", p: 0.665 },
      { name: "06-results", p: 0.8 },
      { name: "07-terminal", p: 1 },
    ];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
].filter((v) => !only || v.name === only);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor ?? 1 });
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`[${vp.name}] ${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`));
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  // Wait for the 3D scene to report ready (or give up after 60 s and shoot the fallback).
  await page.waitForFunction(() => document.documentElement.dataset.scene === "ready", null, { timeout: 60000 }).catch(() => errors.push(`[${vp.name}] scene not ready in 60s`));
  for (const pt of POINTS) {
    await page.evaluate((p) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, p * max);
    }, pt.p);
    // Let the camera damping settle (software rendering is slow).
    await page.waitForTimeout(4500);
    const fps = await page.evaluate(
      () =>
        new Promise((res) => {
          let n = 0;
          const t0 = performance.now();
          const f = () => (++n, performance.now() - t0 < 1000 ? requestAnimationFrame(f) : res(n));
          requestAnimationFrame(f);
        }),
    );
    // Software rendering can take a while to produce a frame on the heavier shots.
    await page.screenshot({ path: join(outDir, `${vp.name}-${pt.name}.png`), timeout: 180000 });
    console.log(`${vp.name} ${pt.name} p=${pt.p} ~${fps}fps (software GL)`);
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? `\nConsole issues:\n${errors.join("\n")}` : "\nNo console errors or warnings.");
