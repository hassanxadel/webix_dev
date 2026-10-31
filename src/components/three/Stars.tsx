import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";

/**
 * The star field: one THREE.Points, one draw call. Stars live in screen space
 * (clip coords), in three parallax layers that drift with scroll and the
 * cursor (max ~20 px) and wrap vertically, so the sky never ends. Each star
 * twinkles from ~0.1 to full brightness at its own speed and phase; ~20 hero
 * stars are bigger, glow and carry a soft 4-point flare.
 */
const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aLayer;
  attribute vec3 aColor;
  attribute vec3 aTwinkle; // phase, speed (rad/s), hero flag
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uScroll;
  uniform vec2 uPointer;
  uniform vec2 uPx; // 1 / viewport in pixels
  uniform float uDpr;
  varying vec3 vColor;
  varying float vBright;
  varying float vHero;
  void main() {
    float depth = 0.35 + aLayer * 0.4; // far layer moves least
    vec2 p = position.xy;
    p.y = mod(p.y + uScroll * depth * 0.6 + 1.1, 2.2) - 1.1;
    p += uPointer * uPx * 20.0 * depth;
    gl_Position = vec4(p, 0.999, 1.0);
    float tw = 0.5 + 0.5 * sin(uTime * aTwinkle.y + aTwinkle.x);
    float still = fract(aTwinkle.x * 7.31) * 0.7 + 0.3;
    vBright = mix(still, mix(0.1, 1.0, tw * tw), uTwinkle);
    vHero = aTwinkle.z;
    vColor = aColor;
    gl_PointSize = aSize * uDpr * (aTwinkle.z > 0.5 ? 0.75 + 0.25 * vBright : 1.0);
  }
`;
const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vBright;
  varying float vHero;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float core = smoothstep(0.5, 0.0, r);
    float a = core * core;
    if (vHero > 0.5) {
      float glow = exp(-r * 9.0) * 0.9;
      float flare = (exp(-abs(d.x) * 60.0) + exp(-abs(d.y) * 60.0)) * smoothstep(0.5, 0.05, r) * 0.55;
      a = exp(-r * 22.0) + glow * 0.5 + flare;
    }
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * vBright * a, 1.0);
    #include <colorspace_fragment>
  }
`;

function build(count: number) {
  const rnd = (() => {
    let s = 1234567;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  })();
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const layer = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const tw = new Float32Array(count * 3);
  const white = new THREE.Color("#f4f1ea");
  const yellow = new THREE.Color("#ffe58a");
  const pink = new THREE.Color("#ff8fc4");
  const heroes = Math.round(count * 0.022);
  for (let i = 0; i < count; i++) {
    const hero = i < heroes;
    pos.set([rnd() * 2.2 - 1.1, rnd() * 2.2 - 1.1, 0], i * 3);
    layer[i] = hero ? 1.5 : Math.floor(rnd() * 3) / 2; // 0, 0.5, 1 (near)
    size[i] = hero ? 14 + rnd() * 10 : 1.4 + rnd() * rnd() * 3.2 + layer[i];
    const c = rnd();
    color.set((c < 0.05 ? pink : c < 0.15 ? yellow : white).toArray(), i * 3);
    // 2–6 s per cycle; hero stars breathe slower.
    const period = hero ? 5 + rnd() * 4 : 2 + rnd() * 4;
    tw.set([rnd() * Math.PI * 2, (Math.PI * 2) / period, hero ? 1 : 0], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aLayer", new THREE.BufferAttribute(layer, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  g.setAttribute("aTwinkle", new THREE.BufferAttribute(tw, 3));
  return g;
}

export function Stars({ low }: { low: boolean }) {
  const { size, viewport } = useThree();
  const geo = useMemo(() => build(low ? 500 : 1000), [low]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uTwinkle: { value: 1 },
          uScroll: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uPx: { value: new THREE.Vector2() },
          uDpr: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const pointer = useRef(new THREE.Vector2());

  useFrame(({ clock }, dt) => {
    const reduced = journeyStore.get().reducedMotion;
    const u = mat.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uTwinkle.value = reduced ? 0 : 1;
    u.uScroll.value = journey.progress * 2.4;
    const k = 1 - Math.exp(-dt * 2.5);
    pointer.current.x += ((reduced ? 0 : -journey.pointerX) - pointer.current.x) * k;
    pointer.current.y += ((reduced ? 0 : journey.pointerY) - pointer.current.y) * k;
    u.uPointer.value.copy(pointer.current);
    u.uPx.value.set(2 / size.width, 2 / size.height);
    u.uDpr.value = viewport.dpr;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />;
}

/** A thin shooting star every ~8–15 s, drawn in clip space. */
export function ShootingStar() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uA: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2() }, uFade: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform vec2 uA; uniform vec2 uB; varying float vT;
          void main() {
            vT = position.x; // 0 tail → 1 head
            vec2 dir = normalize(uB - uA);
            vec2 n = vec2(-dir.y, dir.x) * 0.0018 * vT;
            gl_Position = vec4(mix(uA, uB, vT) + n * position.y, 0.998, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uFade; varying float vT;
          void main() { gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * vT * vT * uFade, 1.0); }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0]), 3));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }, []);
  const s = useRef({ next: 6, t: -1, from: new THREE.Vector2(), dir: new THREE.Vector2() });

  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    const st = s.current;
    const now = clock.elapsedTime;
    if (st.t < 0) {
      m.visible = false;
      if (now < st.next || journeyStore.get().reducedMotion) return;
      st.t = 0;
      st.from.set(Math.random() * 1.4 - 0.2, 0.55 + Math.random() * 0.4);
      st.dir.set(-0.9 - Math.random() * 0.3, -0.35 - Math.random() * 0.25);
    }
    st.t += dt / 0.9;
    const head = st.from.clone().addScaledVector(st.dir, st.t);
    const tail = st.from.clone().addScaledVector(st.dir, Math.max(0, st.t - 0.22));
    mat.uniforms.uA.value.copy(tail);
    mat.uniforms.uB.value.copy(head);
    mat.uniforms.uFade.value = Math.sin(Math.min(1, st.t) * Math.PI) * 0.8;
    m.visible = true;
    if (st.t >= 1) {
      st.t = -1;
      st.next = now + 8 + Math.random() * 7;
    }
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={-9} />;
}
