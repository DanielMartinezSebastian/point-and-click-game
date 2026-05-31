"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Canvas } from "@react-three/fiber";
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
export function GameCanvasCore({ children, className, }) {
    return (_jsx("div", { style: { position: "relative", width: "100%", height: "100%" }, className: className, children: _jsx(Canvas, { gl: { alpha: false, antialias: true, preserveDrawingBuffer: false }, style: {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
            }, children: children }) }));
}
//# sourceMappingURL=GameCanvasCore.js.map