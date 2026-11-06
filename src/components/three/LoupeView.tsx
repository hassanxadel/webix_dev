import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { loupe, MAG, starPass } from "@/lib/loupe";
import { CARD_LAYER } from "./WebixPass";

/**
 * The magnifier's view: the same scene from the same camera with a narrower
 * FOV (×MAG), aimed down the ray under the lens, into a small square render
 * target; drawn back as a screen-space disc inside the main scene, so bloom,
 * ACES and grain treat it like everything else; stars enlarge with it (`starPass`)
 * on the same twinkle clock. Glass: rim darkening and a
 * colour fringe toward the edge (the dome highlights are CSS, over it).
 * Runs only while the lens is on screen; ~30 fps unless the lens moves.
 */
export function LoupeView() {
  const quad = useRef<THREE.Mesh>(null);
  const st = useRef({ last: -1, moved: -1, cam: new THREE.PerspectiveCamera(10, 1, 0.05, 1000), ray: new THREE.Vector3(), up: new THREE.Vector3() }).current;
  const target = useMemo(() => new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, depthBuffer: true }), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: target.texture }, uCentre: { value: new THREE.Vector2() }, uRadius: { value: new THREE.Vector2() } },
        vertexShader: /* glsl */ `
          uniform vec2 uCentre, uRadius; varying vec2 vP;
          void main() { vP = position.xy; gl_Position = vec4(uCentre + position.xy * uRadius, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; varying vec2 vP;
          void main() {
            float r = length(vP);
            if (r > 1.0) discard;
            vec2 uv = vP * 0.5 + 0.5;
            // Colour fringe: red and blue sampled a little apart toward the rim.
            vec2 f = vP * 0.012 * smoothstep(0.45, 1.0, r);
            vec3 c = vec3(texture2D(uMap, uv + f).r, texture2D(uMap, uv).g, texture2D(uMap, uv - f).b);
            // Rim darkening, like thick glass seen at an angle.
            c *= mix(1.0, 0.35, smoothstep(0.7, 1.0, r));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        depthTest: false,
        depthWrite: false,
      }),
    [target],
  );
  useEffect(() => () => target.dispose(), [target]);
  useEffect(() => st.cam.layers.enable(CARD_LAYER), [st]);

  useFrame(({ gl, scene, camera, size, clock }) => {
    const q = quad.current;
    if (!q) return;
    q.visible = false;
    if (!loupe.visible) return;
    const cam = camera as THREE.PerspectiveCamera;
    const t = clock.elapsedTime;
    const res = Math.min(512, Math.round(loupe.r * 2 * gl.getPixelRatio()));
    if (target.width !== res) target.setSize(res, res);

    // Aim: the ray through the lens centre; FOV so the lens shows 1/MAG of the area it covers.
    const nx = (loupe.x / size.width) * 2 - 1, ny = 1 - (loupe.y / size.height) * 2;
    st.ray.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    const zoom = st.cam;
    zoom.position.copy(cam.position);
    zoom.up.copy(st.up.set(0, 1, 0).applyQuaternion(cam.quaternion));
    zoom.lookAt(st.ray.add(cam.position));
    zoom.fov = THREE.MathUtils.radToDeg(2 * Math.atan(((loupe.r * 2) / MAG / size.height) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))));
    zoom.updateProjectionMatrix();

    if (t - st.last > 1 / 30 || loupe.moved !== st.moved) {
      st.last = t;
      st.moved = loupe.moved;
      starPass.zoom.value = MAG;
      starPass.res.value[0] = starPass.res.value[1] = loupe.r * 2;
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, zoom);
      gl.setRenderTarget(null);
      starPass.zoom.value = 1;
      starPass.res.value[0] = size.width;
      starPass.res.value[1] = size.height;
    }
    mat.uniforms.uCentre.value.set(nx, ny);
    mat.uniforms.uRadius.value.set((loupe.r / size.width) * 2, (loupe.r / size.height) * 2);
    q.visible = true;
  });

  return (
    <mesh ref={quad} material={mat} frustumCulled={false} renderOrder={999} visible={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
