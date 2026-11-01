import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { WebixPass } from "./WebixPass";
import { CameraRig } from "./CameraRig";
import { StarMap, Stars } from "./Stars";
import { Earth, Hubble, Moon, SunDisc, SunGlare, SunLights } from "./Space";
import { Effects } from "./Effects";
import { journeyStore, useJourney } from "@/lib/journey";

/** Canvas textures use these faces, so wait for them (briefly) before painting. */
async function loadFonts() {
  if (!document.fonts) return;
  await Promise.race([
    Promise.all([document.fonts.load('500 64px "JetBrains Mono"'), document.fonts.load('600 64px "Poppins"'), document.fonts.load('700 64px "Poppins"'), document.fonts.load('400 64px "Inter"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

// Asset progress for the loading screen.
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => journeyStore.set({ loadProgress: total ? loaded / total : 1 });

/**
 * Image-based lighting for the card's brushed metal (never shown as a
 * background): the CC0 night-city HDRI, the brand pink / yellow strips, and a
 * broad blue strip below so the metal carries a reflection of the Earth glow.
 */
function SceneEnvironment() {
  return (
    <Environment files="/hdri/shanghai_bund_1k.hdr" environmentIntensity={0.7} resolution={512}>
      <Lightformer form="rect" color="#ff007f" intensity={2.2} position={[-3, 2.5, 3]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#ffda24" intensity={3} position={[3.2, 0.5, 2.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#f4f1ea" intensity={1.4} position={[0, 4, 1]} scale={[6, 0.4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#3f7dff" intensity={2.6} position={[0, -3.5, 1.5]} scale={[9, 1.4, 1]} target={[0, 0, 0]} />
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

/** One fixed canvas for the whole site: NASA star sky, twinkling stars, the Earth's limb at sunrise, the Moon, Hubble, and the card. */
export default function Experience() {
  const [fonts, setFonts] = useState(false);
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const low = useJourney((s) => s.tier) === "low";

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
      dpr={[1, 1.75]}
      camera={{ fov: 45, near: 0.05, far: 1000, position: [0, 0, 0] }}
      // ACES + sRGB: the ToneMapping effect applies ACES when post-processing runs; the renderer setting covers the rest.
      gl={{ antialias: !low, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __webix: unknown }).__webix = state;
      }}
    >
      <PerformanceMonitor onDecline={() => journeyStore.set({ tier: "low" })} />
      <SunLights />
      <SunDisc ref={setSun} />
      <SunGlare />
      <Stars low={low} />
      <Suspense fallback={null}>
        <StarMap low={low} />
        <Earth low={low} />
        <Moon low={low} />
      </Suspense>
      {!low && (
        <Suspense fallback={null}>
          <Hubble />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <SceneEnvironment />
        <WebixPass />
        <CameraRig />
        <Ready />
      </Suspense>
      <Effects sun={sun} lite={low} />
    </Canvas>
  );
}
