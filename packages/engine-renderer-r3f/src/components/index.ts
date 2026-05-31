// Visual components barrel for @pointclick-engine/engine-renderer-r3f/components

// Canvas core
export { GameCanvasCore } from "./GameCanvasCore";
export type { GameCanvasCoreProps } from "./GameCanvasCore";

// Sprite
export { default as DavidSprite } from "../sprite/DavidSprite";
export type { DavidSpriteHandle } from "../sprite/DavidSprite";
export * from "../sprite/clips";
export { buildSpeakingAnimation } from "../sprite/speakingAnimation";

// Scene
export { SceneGround } from "../scene/SceneGround";
export { SceneWalls } from "../scene/SceneWalls";
export type { WallResizeHandle } from "../scene/SceneWalls";
export { SceneCollisionSphere } from "../scene/SceneCollisionSphere";
export { SceneWallPointPreview } from "../scene/SceneWallPointPreview";

// Runtime
export { GameTouchSpriteRuntime } from "../GameTouchSpriteRuntime";
export { default as SpeechBubble } from "../SpeechBubble";
