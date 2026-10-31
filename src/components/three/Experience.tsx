import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { WebixPass, cardState } from "./WebixPass";
import { CameraRig } from "./CameraRig";
import { Train } from "./Train";
import { CanopyLights, Near, Platform, ReflectiveFloor, TrackBed } from "./Platform";
import { LightShafts, SkyDome, Skyline, Tunnels, Viaduct } from "./Surroundings";
import { DepartureBoard, MicroStops, ServiceScreens, TerminalWall } from "./StationFeatures";
import { Effects } from "./Effects";
import { PLATFORMS } from "./world";
import { journey, journeyStore, useJourney } from "@/lib/journey";
import { WORLD_FADE } from "@/config/stations";

/** Canvas textures use these faces, so wait for them (briefly) before painting. */
async function loadFonts() {
  if (!document.fonts) return;
  await Promise.race([
    Promise.all([
      document.fonts.load('500 64px "JetBrains Mono"'),
      document.fonts.load('600 64px "Poppins"'),
      document.fonts.load('700 64px "Poppins"'),
      document.fonts.load('400 64px "Inter"'),
      document.fonts.load('700 64px "Noto Sans JP"', "ウェビックス線出発終点実績ビジョンサービスプロセス数値発見設計構築通販立体印象ウェブ発車案内"),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

// Asset progress for the Boarding screen.
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => journeyStore.set({ loadProgress: total ? loaded / total : 1 });

/**
 * Image-based lighting: the CC0 night-city HDRI for believable reflections,
 * plus pink and yellow light strips so neon highlights slide across metal.
 */
function SceneEnvironment() {
  return (
    <Environment files="/hdri/shanghai_bund_1k.hdr" environmentIntensity={0.5} resolution={512}>
      <Lightformer form="rect" color="#ff007f" intensity={2.2} position={[-3, 2.5, 3]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#ffda24" intensity={3} position={[3.2, 0.5, 2.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" color="#f4f1ea" intensity={1.4} position={[0, 4, 1]} scale={[6, 0.4, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Pink and yellow key lights that stay with the card (it is screen-anchored for most of the journey). */
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
  // Short reach: these light the card, not the walls around the camera.
  return (
    <>
      <pointLight ref={pink} color="#ff007f" distance={2.2} decay={2} />
      <pointLight ref={yellow} color="#ffda24" distance={2} decay={2} />
    </>
  );
}

/**
 * Fades the world in from black after the switch (drawn over the world, under the card).
 * A full-screen triangle-pair in clip space; opacity is a pure function of progress.
 */
function Dimmer() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const [a, b] = WORLD_FADE;
    const k = Math.min(1, Math.max(0, (journey.progress - a) / (b - a)));
    if (mat.current) mat.current.uniforms.uDim.value = 1 - k * k * (3 - 2 * k);
    if (mesh.current) mesh.current.visible = k < 1;
  });
  return (
    <mesh ref={mesh} renderOrder={18} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthTest={false}
        depthWrite={false}
        uniforms={{ uDim: { value: 1 } }}
        vertexShader="void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }"
        fragmentShader="uniform float uDim; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, uDim); }"
      />
    </mesh>
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

function World({ low }: { low: boolean }) {
  return (
    <>
      <SkyDome />
      <Skyline lowPower={low} />
      <TrackBed />
      <Viaduct />
      <Tunnels />
      {/* Later stations mount as the camera approaches; billboards stream their screenshots in. */}
      <Near zone={PLATFORMS.services}>
        <Platform zone={PLATFORMS.services} num="04" en="Services" jp="サービス" prev="About" next="Process">
          <ServiceScreens />
        </Platform>
      </Near>
      {/* Cheap enough to keep mounted: four short platforms and their signs. */}
      <MicroStops />
      <Near zone={PLATFORMS.results}>
        <Platform zone={PLATFORMS.results} num="06" en="Results" jp="実績数値" prev="Process" next="Terminal">
          <DepartureBoard />
        </Platform>
      </Near>
      <Near zone={PLATFORMS.terminal}>
        <Platform zone={PLATFORMS.terminal} num="07" en="Terminal" jp="終点" prev="Results">
          <TerminalWall />
        </Platform>
      </Near>
      {!low && <ReflectiveFloor />}
      {!low && <LightShafts />}
      <CanopyLights />
      <Train low={low} />
    </>
  );
}

export default function Experience() {
  const [fonts, setFonts] = useState(false);
  const tier = useJourney((s) => s.tier);
  const low = tier === "low";
  // Until About, only the card renders (transparent canvas) over the HTML background layer.
  // The world switches on while that layer is fully black, so the swap is never seen.
  const world = useJourney((s) => s.world);

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
      dpr={low ? [1, 1.25] : [1, 1.75]}
      shadows={false}
      camera={{ fov: 45, near: 0.05, far: 700, position: [-0.9, 1.62, 4.6] }}
      gl={{ antialias: !low, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      // The HTML layer sits above the canvas; listen on the body so billboards still get hover and clicks.
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
      // Dev-only handle for inspecting the scene from the browser console.
      onCreated={(state) => {
        if (import.meta.env.DEV) (window as unknown as { __webix: unknown }).__webix = state;
      }}
    >
      <PerformanceMonitor onDecline={() => journeyStore.set({ tier: "low" })} />
      {world && <color attach="background" args={["#070b14"]} />}
      <fog attach="fog" args={["#0c1222", low ? 18 : 26, low ? 200 : 300]} />
      <hemisphereLight args={["#27314d", "#0a0a10", 0.35]} />
      <Suspense fallback={null}>
        <SceneEnvironment />
        <group visible={world}>
          <World low={low} />
        </group>
        {world && <Dimmer />}
        <WebixPass />
        <CardLights />
        <CameraRig />
        <Ready />
      </Suspense>
      {!low && <Effects enabled={world} />}
    </Canvas>
  );
}
