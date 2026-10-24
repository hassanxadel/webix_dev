import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Station, StationLights } from "./Station";
import { Train } from "./Train";
import { Signage } from "./Signage";
import { Lightboxes } from "./Lightboxes";
import { ProcessGates, TicketGates, VendingMachines } from "./Interactives";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { PostFX } from "./PostFX";
import { COLORS } from "./layout";
import { sceneStore, useSceneState } from "@/lib/scene-store";

/** Text drawn onto canvas textures — the fonts must be ready before we paint. */
const SIGN_GLYPHS = "ウェビックスデザイン出口作品自動販売機工程はじめよう発見設計構築出発通販開発印象番線ビルド";

async function loadSignFonts() {
  if (!document.fonts) return;
  await Promise.race([
    Promise.all([
      document.fonts.load(`900 64px "Noto Sans JP"`, SIGN_GLYPHS),
      document.fonts.load(`700 64px "Noto Sans JP"`, SIGN_GLYPHS),
      document.fonts.load(`700 64px "Poppins"`),
      document.fonts.load(`600 64px "Poppins"`),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

function World() {
  const lowPower = useSceneState((s) => s.lowPower);
  return (
    <>
      <color attach="background" args={[COLORS.night]} />
      <fogExp2 attach="fog" args={[COLORS.haze, lowPower ? 0.03 : 0.026]} />
      <StationLights lowPower={lowPower} />
      <Station lowPower={lowPower} />
      <Train />
      <Signage lowPower={lowPower} />
      <Lightboxes />
      <VendingMachines />
      <ProcessGates />
      <TicketGates />
      <Atmosphere lowPower={lowPower} />
      <CameraRig />
      <PostFX lowPower={lowPower} />
    </>
  );
}

/** Mounted once every texture inside Suspense has loaded; fades the canvas in after the first frames. */
function Ready() {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => sceneStore.set({ sceneReady: true })));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

export default function WebixScene() {
  const [fontsReady, setFontsReady] = useState(false);
  const lowPower = useSceneState((s) => s.lowPower);

  useEffect(() => {
    let alive = true;
    loadSignFonts().finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!fontsReady) return null;

  return (
    <Canvas
      shadows={!lowPower}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 140, position: [0.6, 1.7, 10] }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <World />
        <Ready />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
