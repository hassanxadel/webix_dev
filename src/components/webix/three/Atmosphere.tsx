import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WORLD } from "./layout";
import { glowSprite } from "./textures";
import { sceneStore } from "@/lib/scene-store";

/** Dust motes drifting through the light — gives the air a physical presence. */
function Dust({ count }: { count: number }) {
  const sprite = useMemo(() => glowSprite(), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = THREE.MathUtils.randFloat(WORLD.wallX + 0.3, WORLD.edgeX + 2);
      p[i * 3 + 1] = THREE.MathUtils.randFloat(0.2, WORLD.ceilingY - 0.3);
      p[i * 3 + 2] = THREE.MathUtils.randFloat(WORLD.endZ, WORLD.startZ);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  const points = useRef<THREE.Points>(null);

  useFrame(({ clock }, dt) => {
    if (sceneStore.get().reducedMotion || !points.current) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) + dt * 0.05;
      if (y > WORLD.ceilingY - 0.3) y = 0.2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.03);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geo}>
      <pointsMaterial
        map={sprite}
        size={0.045}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={new THREE.Color("#ffd9a8").multiplyScalar(1.4)}
        opacity={0.55}
        toneMapped={false}
      />
    </points>
  );
}

/** Soft cones under the ceiling lamps — cheap stand-ins for volumetric light. */
function LightShafts() {
  const zs = [6, -8, -22, -38, -54, -70, -86];
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color("#ffb45c") }, uStrength: { value: 0.06 } },
        vertexShader: /* glsl */ `
          varying float vY;
          varying vec3 vNormalV;
          varying vec3 vView;
          void main() {
            vY = uv.y;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalV = normalize(normalMatrix * normal);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          varying float vY;
          varying vec3 vNormalV;
          varying vec3 vView;
          void main() {
            float rim = pow(abs(dot(vNormalV, vView)), 1.6);
            float fade = smoothstep(0.0, 1.0, vY);
            gl_FragColor = vec4(uColor * uStrength * rim * fade, 1.0);
          }`,
      }),
    [],
  );
  return (
    <group>
      {zs.map((z) => (
        <mesh key={z} position={[-2.4, WORLD.ceilingY / 2, z]} material={material}>
          <cylinderGeometry args={[0.35, 2.4, WORLD.ceilingY, 32, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

export function Atmosphere({ lowPower }: { lowPower: boolean }) {
  return (
    <group>
      <Dust count={lowPower ? 300 : 900} />
      {!lowPower && <LightShafts />}
    </group>
  );
}
