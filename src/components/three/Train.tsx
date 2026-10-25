import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { LINE } from "./world";
import { BRAND, trainWindows } from "./worldArt";

/** Live train state, written by the camera rig each frame. */
export const trainState = { head: 95, door: 0, riding: false };

const CAR = 20;
const GAP = 0.5;
const W = 3.2;
const H = 3.45;
const FLOOR_Y = 0.05;
const BODY_Y = FLOOR_Y - 0.95 + H / 2;
const SIDE = LINE.trackX - W / 2; // platform-side face x
const NOSE = 9;

/** Duck-bill nose: a lathed profile, flattened to the body section and dropped toward the tip. */
function noseGeometry(segments: number) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40; // 0 = tip, 1 = joint with the body
    pts.push(new THREE.Vector2(Math.pow(t, 0.62) * 1, -t * NOSE));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateX(-Math.PI / 2); // axis along +Z, tip at z = 0 pointing −Z after placement
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i); // 0 (tip) .. NOSE (joint)
    const t = z / NOSE;
    p.setX(i, p.getX(i) * (W / 2));
    // Flattened top, lowered tip — the shinkansen silhouette.
    const y = p.getY(i) * (H / 2);
    p.setY(i, (y > 0 ? y * (0.55 + 0.45 * t) : y) - (1 - t) * 0.75);
  }
  g.computeVertexNormals();
  return g;
}

function Interior() {
  const seats = useRef<THREE.InstancedMesh>(null);
  const backs = useRef<THREE.InstancedMesh>(null);
  const rows = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = -9; z <= 9; z += 1.05) if (Math.abs(z) > 1.3) [LINE.trackX - 1.05, LINE.trackX - 0.55, LINE.trackX + 0.6, LINE.trackX + 1.1].forEach((x) => out.push([x, z]));
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    rows.forEach(([x, z], i) => {
      m.setPosition(x, FLOOR_Y + 0.42, z);
      seats.current!.setMatrixAt(i, m);
      m.setPosition(x, FLOOR_Y + 0.82, z + 0.32);
      backs.current!.setMatrixAt(i, m);
    });
    seats.current!.instanceMatrix.needsUpdate = true;
    backs.current!.instanceMatrix.needsUpdate = true;
  }, [rows]);

  // Warm grey laminate — light enough to read as a cabin, dark enough not to glow.
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8f8a82", roughness: 0.55, metalness: 0.05 }), []);
  const sealMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.7 }), []);
  const bays = Array.from({ length: 16 }, (_, i) => -9.4 + i * 1.25);
  return (
    <group>
      <mesh position={[LINE.trackX, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.3, CAR - 0.4]} />
        <meshStandardMaterial color="#2a3142" roughness={0.8} />
      </mesh>
      <mesh position={[LINE.trackX, FLOOR_Y + 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.3, CAR - 0.4]} />
        <meshStandardMaterial color="#a39e95" roughness={0.7} />
      </mesh>
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[LINE.trackX + dx, FLOOR_Y + 2.26, 0]}>
          <boxGeometry args={[0.16, 0.03, CAR - 1]} />
          <meshBasicMaterial color={new THREE.Color("#fff6e6").multiplyScalar(1.8)} toneMapped={false} />
        </mesh>
      ))}
      {/* Side walls with window bays: low wall, header, pillars between glazing. */}
      {[-1, 1].map((side) => {
        const x = LINE.trackX + side * (W / 2 - 0.12);
        return (
          <group key={side}>
            <mesh position={[x, FLOOR_Y + 0.36, 0]} material={wallMat}>
              <boxGeometry args={[0.08, 0.72, CAR - 0.4]} />
            </mesh>
            <mesh position={[x, FLOOR_Y + 2.08, 0]} material={wallMat}>
              <boxGeometry args={[0.08, 0.44, CAR - 0.4]} />
            </mesh>
            {/* Slim pillars between large window bays, with dark rubber seals. */}
            {bays.map((z) =>
              Math.abs(z) < 1 && side < 0 ? null : (
                <mesh key={z} position={[x, FLOOR_Y + 1.29, z]} material={sealMat}>
                  <boxGeometry args={[0.1, 1.14, 0.2]} />
                </mesh>
              ),
            )}
          </group>
        );
      })}
      {[-CAR / 2 + 0.25, CAR / 2 - 0.25].map((z) => (
        <mesh key={z} position={[LINE.trackX, FLOOR_Y + 1.15, z]} material={wallMat}>
          <boxGeometry args={[W - 0.2, 2.3, 0.08]} />
        </mesh>
      ))}
      <instancedMesh ref={seats} args={[undefined, undefined, rows.length]}>
        <boxGeometry args={[0.46, 0.14, 0.48]} />
        <meshStandardMaterial color="#1a253a" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={backs} args={[undefined, undefined, rows.length]}>
        <boxGeometry args={[0.46, 0.72, 0.12]} />
        <meshStandardMaterial color="#1a253a" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

/** `low`: fewer segments on the rounded body and nose for the mobile / low tier. */
export function Train({ low = false }: { low?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const shell1 = useRef<THREE.Group>(null);
  const interior = useRef<THREE.Group>(null);
  const doors = useRef<THREE.Mesh[]>([]);
  const doorway = useRef<THREE.MeshBasicMaterial>(null);
  const cabinLight = useRef<THREE.PointLight>(null);

  const mats = useMemo(
    () => ({
      // White pearl paint under a deep clearcoat.
      paint: new THREE.MeshPhysicalMaterial({ color: "#eef0f3", metalness: 0.25, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 }),
      navy: new THREE.MeshPhysicalMaterial({ color: BRAND.indigo, metalness: 0.5, roughness: 0.3, clearcoat: 1 }),
      windows: new THREE.MeshBasicMaterial({ map: trainWindows(), toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) }),
      stripe: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.pink).multiplyScalar(2.4), toneMapped: false }),
      skirt: new THREE.MeshStandardMaterial({ color: "#16191f", roughness: 0.8, metalness: 0.3 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#0a0d14", metalness: 0.9, roughness: 0.05, clearcoat: 1 }),
      door: new THREE.MeshPhysicalMaterial({ color: "#a4a9b2", metalness: 0.3, roughness: 0.35, clearcoat: 1 }),
      head: new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6e0").multiplyScalar(5), toneMapped: false }),
    }),
    [],
  );
  const nose = useMemo(() => noseGeometry(low ? 24 : 64), [low]);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.z = trainState.head;
    if (shell1.current) shell1.current.visible = !trainState.riding;
    if (interior.current) interior.current.visible = trainState.riding;
    if (cabinLight.current) cabinLight.current.intensity = trainState.riding ? 1.6 : 0;
    const open = trainState.door;
    doors.current.forEach((d, i) => d && (d.position.z = LINE.doorFromHead + (i ? 1 : -1) * (0.3 + open * 0.58)));
    // Warm, but under the bloom threshold: the wet floor mirrors it right in front of the camera.
    if (doorway.current) doorway.current.color.setScalar(open * 0.75);
  });

  // Car i is centred CAR/2 behind its start; car 1 starts at the nose joint and its door sits at its centre (doorFromHead).
  const carZ = (i: number) => NOSE + i * (CAR + GAP) + CAR / 2;

  return (
    <group ref={group}>
      {/* Nose. */}
      <mesh geometry={nose} material={mats.paint} position={[LINE.trackX, BODY_Y, 0]} castShadow />
      <mesh position={[LINE.trackX, BODY_Y + 0.55, 4.6]} rotation={[-0.32, 0, 0]} scale={[1.15, 0.36, 2.2]} material={mats.glass}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {[-0.85, 0.85].map((dx) => (
        <mesh key={dx} position={[LINE.trackX + dx, BODY_Y - 0.62, 2.1]} scale={[0.32, 0.1, 0.4]} material={mats.head}>
          <sphereGeometry args={[1, 16, 8]} />
        </mesh>
      ))}
      {/* Pink light stripe running down the nose onto the cars. */}
      <mesh position={[SIDE + 0.02, BODY_Y - 0.48, NOSE / 2 + 1]} rotation={[0, -Math.PI / 2, 0]} material={mats.stripe}>
        <planeGeometry args={[NOSE - 2, 0.05]} />
      </mesh>

      {[0, 1, 2].map((i) => {
        const shell = (
          <>
            <RoundedBox args={[W, H, CAR]} radius={0.55} smoothness={low ? 2 : 4} position={[LINE.trackX, BODY_Y, carZ(i)]} material={mats.paint} castShadow />
            <group position={[SIDE - 0.01, BODY_Y + 0.38, carZ(i)]} rotation={[0, -Math.PI / 2, 0]}>
              <mesh material={mats.navy} position={[0, 0, -0.002]}>
                <planeGeometry args={[CAR - 1.2, 0.95]} />
              </mesh>
              <mesh material={mats.windows}>
                <planeGeometry args={[CAR - 1.6, 0.62]} />
              </mesh>
              <mesh material={mats.stripe} position={[0, -0.86, 0]}>
                <planeGeometry args={[CAR - 0.6, 0.05]} />
              </mesh>
            </group>
          </>
        );
        return i === 0 ? (
          <group key={i} ref={shell1}>
            {shell}
            {/* Lit doorway seen from the platform when the doors open. */}
            <mesh position={[SIDE - 0.015, FLOOR_Y + 1.02, LINE.doorFromHead]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.16, 2.02]} />
              <meshBasicMaterial ref={doorway} color="#fff1d8" toneMapped={false} />
            </mesh>
          </group>
        ) : (
          <group key={i}>{shell}</group>
        );
      })}
      {/* Sliding door leaves (car 1, platform side). */}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => void (doors.current[i] = m!)} position={[SIDE - 0.03, FLOOR_Y + 1.02, LINE.doorFromHead]} material={mats.door}>
          <boxGeometry args={[0.05, 2.0, 0.58]} />
        </mesh>
      ))}
      <mesh position={[LINE.trackX, LINE.trackY + 0.45, carZ(1)]} material={mats.skirt}>
        <boxGeometry args={[W - 0.5, 0.6, 3 * CAR + NOSE]} />
      </mesh>

      <group ref={interior} position={[0, 0, LINE.doorFromHead]} visible={false}>
        <Interior />
      </group>
      <pointLight ref={cabinLight} position={[LINE.trackX, FLOOR_Y + 2, LINE.doorFromHead]} color="#fff2dc" intensity={0} distance={9} decay={1.8} />
    </group>
  );
}
