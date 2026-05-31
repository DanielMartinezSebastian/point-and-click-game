export const RENDERER_VERSION = "0.4.0";

// Canvas core
export { GameCanvasCore } from "./components/GameCanvasCore";
export type { GameCanvasCoreProps } from "./components/GameCanvasCore";

// Adapters
export { useR3FGameLoop } from "./adapters/gameLoopR3F";
export { WebKeyboardInput } from "./adapters/keyboardInput";

// Sprite
export { default as DavidSprite } from "./sprite/DavidSprite";
export type { DavidSpriteHandle } from "./sprite/DavidSprite";
export * from "./sprite/clips";
export { buildSpeakingAnimation } from "./sprite/speakingAnimation";

// Scene
export { SceneGround } from "./scene/SceneGround";
export { SceneWalls } from "./scene/SceneWalls";
export type { WallResizeHandle } from "./scene/SceneWalls";
export { SceneWallPlane } from "./scene/SceneWallPlane";
export { computeWallSegments } from "./scene/wallSegments";
export type { WallSegment } from "./scene/wallSegments";
export { SceneCollisionSphere } from "./scene/SceneCollisionSphere";
export { SceneWallPointPreview } from "./scene/SceneWallPointPreview";
export { SceneTransitions } from "./scene/SceneTransitions";

// Runtime
export { GameTouchSpriteRuntime } from "./GameTouchSpriteRuntime";
export { default as SpeechBubble } from "./SpeechBubble";

// Hooks
export { usePlayerWalkAnimation } from "./hooks/usePlayerWalkAnimation";
export { useAudioSystem } from "./hooks/useAudioSystem";
export { useClickToMoveController } from "./hooks/useClickToMoveController";
export { useKeyboardMovementInput } from "./adapters/useKeyboardMovementInput";
export type { KeyboardMovementState } from "./adapters/useKeyboardMovementInput";

// i18n
export { useI18n, type UseI18nResult } from "./hooks/useI18n";
export {
  useLocaleDetection,
  type UseLocaleDetectionOptions,
} from "./hooks/useLocaleDetection";
export { I18nProvider, type I18nProviderProps } from "./components/I18nProvider";
export {
  LocaleSwitcher,
  type LocaleSwitcherProps,
  type LocaleSwitcherRenderOption,
} from "./components/LocaleSwitcher";
