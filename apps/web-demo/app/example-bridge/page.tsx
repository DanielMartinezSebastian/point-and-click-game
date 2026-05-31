"use client";

import { useEffect } from "react";
import {
  createGameRuntime,
  type GameSceneConfig,
} from "../lib/engine/publicApi";
import { SCENES } from "../../demo-content/scenes/scenes";
import GameTouchCanvas from "../components/GameTouchCanvas";
import { useInventoryStore } from "../store/inventoryStore";
import { useDialogStore } from "../store/dialogStore";
import HtmlBridgePanel from "./HtmlBridgePanel";

/**
 * Página de ejemplo que demuestra la API bidireccional de Phase 4.
 *
 * El panel derecho (HTML puro) envía comandos al runtime y escucha eventos
 * del juego sin conocer React Three Fiber ni el store interno.
 *
 * Run: `npm run dev` → http://localhost:3000/example-bridge
 */
export default function ExampleBridgePage() {
  useEffect(() => {
    const runtime = createGameRuntime({
      scenes: Object.values(SCENES) as GameSceneConfig[],
      inventoryAdapter: {
        toggle: () => useInventoryStore.getState().toggle(),
        isOpen: () => useInventoryStore.getState().isOpen,
      },
      dialogAdapter: {
        show: (text, key) => useDialogStore.getState().show(text, key),
        hide: () => useDialogStore.getState().dismiss(),
      },
    });

    return () => {
      runtime.dispose();
    };
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative" }}>
        <GameTouchCanvas />
      </div>
      <HtmlBridgePanel />
    </div>
  );
}
