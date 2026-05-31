import { Mesh } from "three";
import type { SpriteAnimation } from "./clips";
type DavidSpriteProps = {
    animation: SpriteAnimation;
    preloadAnimations?: readonly SpriteAnimation[];
    meshRef?: React.RefObject<Mesh | null>;
    scale?: [number, number, number];
    isPaused?: boolean;
};
export type DavidSpriteHandle = {
    nextFrame: () => void;
};
declare const DavidSprite: import("react").ForwardRefExoticComponent<DavidSpriteProps & import("react").RefAttributes<DavidSpriteHandle>>;
export default DavidSprite;
//# sourceMappingURL=DavidSprite.d.ts.map