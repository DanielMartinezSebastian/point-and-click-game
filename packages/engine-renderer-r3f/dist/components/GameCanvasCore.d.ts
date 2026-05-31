import type { ReactNode } from "react";
export type GameCanvasCoreProps = {
    /** Enable debug overlay. */
    debug?: boolean;
    /** Callback for legacy runtime events (optional). */
    onRuntimeEvent?: (event: unknown) => void;
    /** Content to render inside the R3F Canvas (game objects, lights, etc.). */
    children?: ReactNode;
    /** Extra CSS class for the outer container div. */
    className?: string;
};
/**
 * Minimal R3F canvas shell for the engine.
 *
 * Provides the bare <Canvas> setup (gl config, sizing) without any
 * demo-specific content. Library consumers use this as a starting point
 * and inject their own game objects as children.
 *
 * The demo uses GameTouchCanvas (which has all demo content wired in).
 * External consumers build their own canvas that composes GameCanvasCore.
 */
export declare function GameCanvasCore({ children, className, }: GameCanvasCoreProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GameCanvasCore.d.ts.map