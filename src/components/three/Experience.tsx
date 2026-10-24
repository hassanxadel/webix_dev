import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { WebixPass } from "./WebixPass";
import { HeroFraming } from "./HeroFraming";
import { journeyStore, useJourney } from "@/lib/journey";

/** Canvas textures use these faces, so wait for them (briefly) before painting. */
async function loadFonts() {
  if (!document.fonts) return;
  await Promise.race([
    Promise.all([
      document.fonts.load('500 64px "JetBrains Mono"'),
      document.fonts.load('600 64px "Poppins"'),
      document.fonts.load('700 64px "Noto Sans JP"', "ウェビックス線出発終点実績"),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

// Asset progress for the Boarding screen.
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => journeyStore.set({ loadProgress: total ? loaded / total : 1 });

/**
 * Image-based lighting: the CC0 night-city HDRI for believable reflections,
 * plus pink and yellow light strips baked into the same environment so neon
 * highlights slide across the card's metal as it turns.
 */
function SceneEnvironment() {
  return (
    <Environment files="/hdri/shanghai_bund_1k.hdr" environmentIntensity={0.55} resolution={512}>
      <Lightformer form="rect" color="#ff007f" intensity={2.2} position={[-3, 2.5, 3]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#ffda24" intensity={3} position={[3.2, 0.5, 2.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#f4f1ea" intensity={1.4} position={[0, 4, 1]} scale={[6, 0.4, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Mounted once everything inside Suspense has loaded: tells the page the scene is live. */
function Ready() {
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        journeyStore.set({ sceneReady: true, loadProgress: 1 });
        document.documentElement.dataset.scene = "ready";
      }),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

export default function Experience() {
  const [fonts, setFonts] = useState(false);
  const tier = useJourney((s) => s.tier);

  useEffect(() => {
    let alive = true;
    loadFonts().finally(() => alive && setFonts(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!fonts) return null;

  return (
    <Canvas
      dpr={tier === "low" ? [1, 1.25] : [1, 1.75]}
      camera={{ fov: 38, near: 0.05, far: 400, position: [0, 1.5, 2.6] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.5, 0)}
    >
      {/* Drop to the low tier (no reflector / heavy effects) if the device can't hold the frame rate. */}
      <PerformanceMonitor onDecline={() => journeyStore.set({ tier: "low" })} />
      <color attach="background" args={["#070b14"]} />
      <Suspense fallback={null}>
        <SceneEnvironment />
        <pointLight position={[-1.4, 2.4, 1.4]} color="#ff007f" intensity={2.5} distance={6} decay={2} />
        <pointLight position={[1.5, 0.8, 1.2]} color="#ffda24" intensity={3.5} distance={6} decay={2} />
        <WebixPass />
        <HeroFraming />
        <Ready />
      </Suspense>
    </Canvas>
  );
}
