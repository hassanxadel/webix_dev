import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { WebixPass, cardState } from "./WebixPass";
import { CameraRig } from "./CameraRig";
import { Stars } from "./Stars";
import { Dust, HORIZON, Planet, SkyDome, SunLights, Terrain } from "./Space";
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
 * Image-based lighting for the card only (never shown as a background): the
 * CC0 night-city HDRI for believable reflections, plus pink and yellow strips
 * so neon highlights slide across the metal.
 */
function SceneEnvironment() {
  return (
    <Environment files="/hdri/shanghai_bund_1k.hdr" environmentIntensity={0.7} resolution={512}>
      <Lightformer form="rect" color="#ff007f" intensity={2.2} position={[-3, 2.5, 3]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#ffda24" intensity={3} position={[3.2, 0.5, 2.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#f4f1ea" intensity={1.4} position={[0, 4, 1]} scale={[6, 0.4, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Pink and yellow key lights that stay with the card. */
function CardLights() {
  const pink = useRef<THREE.PointLight>(null);
  const yellow = useRef<THREE.PointLight>(null);
  const { camera } = useThree();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  useFrame(() => {
    camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    const s = cardState.scale;
    pink.current?.position.copy(cardState.position).addScaledVector(right, 1.5 * s).addScaledVector(up, 0.35 * s).add(camera.position.clone().sub(cardState.position).setLength(0.5 * s));
    yellow.current?.position.copy(cardState.position).addScaledVector(right, -1.3 * s).addScaledVector(up, -0.9 * s).add(camera.position.clone().sub(cardState.position).setLength(1.0 * s));
    if (pink.current) pink.current.intensity = 2.4 * s;
    if (yellow.current) yellow.current.intensity = 2 * s;
  });
  // Short reach: these light the card only.
  return (
    <>
      <pointLight ref={pink} color="#ff007f" distance={2.2} decay={2} />
      <pointLight ref={yellow} color="#ffda24" distance={2} decay={2} />
    </>
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

/** One fixed canvas for the whole site: sky, stars, moon surface, horizon planet, dust, and the card in front. */
export default function Experience() {
  const [fonts, setFonts] = useState(false);
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
      shadows="soft"
      camera={{ fov: 45, near: 0.05, far: 1000, position: [0, 0, 0] }}
      // ACES: applied by the renderer on the low tier, by the ToneMapping effect when post-processing runs.
      gl={{ antialias: !low, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __webix: unknown }).__webix = state;
      }}
    >
      <PerformanceMonitor onDecline={() => journeyStore.set({ tier: "low" })} />
      <fogExp2 attach="fog" args={[HORIZON, 0.014]} />
      <hemisphereLight args={["#27314d", "#0a0a10", 0.35]} />
      <SunLights low={low} />
      <SkyDome />
      <Stars low={low} />
      <Terrain low={low} />
      <Dust low={low} />
      <Suspense fallback={null}>
        <Planet low={low} />
      </Suspense>
      <Suspense fallback={null}>
        <SceneEnvironment />
        <WebixPass />
        <CardLights />
        <CameraRig />
        <Ready />
      </Suspense>
      {/* Weak GPUs (PerformanceMonitor → tier "low") drop bloom and depth of field. */}
      {!low && <Effects />}
    </Canvas>
  );
}
