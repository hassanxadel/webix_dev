import { useFrame, useThree } from "@react-three/fiber";
import { cardState } from "./WebixPass";

/**
 * Phase-2 framing: the card floats right of the headline on wide screens and
 * above the copy on phones. Replaced by the scroll camera rig in phase 4.
 */
export function HeroFraming() {
  const { camera, size } = useThree();
  useFrame(() => {
    const wide = size.width / size.height > 1;
    cardState.position.set(wide ? 0.62 : 0, wide ? 1.5 : 2.15, 0);
    cardState.scale = wide ? 1 : 0.72;
    camera.position.set(0, 1.5, wide ? 3.3 : 3.7);
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}
