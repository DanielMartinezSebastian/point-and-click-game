"use client";

import { useEffect, useState } from "react";
import {
  createGameRuntime,
  type GameSceneConfig,
} from "./lib/engine/publicApi";
import { CRTEffectWrapper } from "./lib/components/CRTEffectWrapper";
import { SCENES } from "../demo-content/scenes/scenes";
import GameTouchCanvas from "./components/GameTouchCanvas";
import { useInventoryStore } from "./store/inventoryStore";
import { useDialogStore } from "./store/dialogStore";
import { IntroScene } from "./components/intro/IntroScene";

function Game() {
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

  return <GameTouchCanvas />;
}

export default function Home() {
  // El runtime del juego (y por tanto música, inventario y escena por defecto)
  // no se monta hasta que el intro termina — cumple "solo sonido de diálogo
  // en el intro" sin tener que silenciar nada manualmente.
  const [introDone, setIntroDone] = useState(false);

  return (
    <CRTEffectWrapper
      preset="atari"
      scanlineOpacity={0.1}
      // scanlineThickness={2}
      // scanlineGap={2}
      // enableGlow={true}
      // glowColor="rgba(0, 255, 100, 0.15)"
      // enableFlicker={true}
      // flickerIntensity={0.8}
      // enableSweep={true}
      // sweepDuration={12}
    >
      {introDone ? <Game /> : <IntroScene onComplete={() => setIntroDone(true)} />}
    </CRTEffectWrapper>
  );
}
