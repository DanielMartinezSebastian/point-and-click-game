"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useLocaleDetection } from "@pointclick-engine/engine-renderer-r3f";
import { createWebI18nAdapter } from "./lib/platform-web";
import { registerDemoDictionaries } from "../demo-content/dialogs";

// Register once at module load — synchronous, safe to run outside a component.
registerDemoDictionaries();

const DEMO_AVAILABLE_LOCALES = ["es", "en"];

// Shared adapter instance so both Home and Game use the same port.
const i18nPort = createWebI18nAdapter({ availableLocales: DEMO_AVAILABLE_LOCALES });

const I18N_CONFIG = {
  // English is the safe default: it's the lingua franca of the web.
  // The browser's navigator.language will upgrade it to "es" automatically
  // for Spanish-speaking users; localStorage persists the manual choice.
  defaultLocale: "en",
  fallbackLocale: "en",
  availableLocales: DEMO_AVAILABLE_LOCALES,
};

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
  const [introDone, setIntroDone] = useState(false);

  // Boot i18n at the Home level so both the intro and the game share the same
  // locale. Detection runs once on mount (bindPort → detectLocale), then
  // persists on every change.
  useLocaleDetection({ port: i18nPort, config: I18N_CONFIG });

  return (
    <CRTEffectWrapper
      preset="atari"
      scanlineOpacity={0.1}
    >
      {introDone ? <Game /> : <IntroScene onComplete={() => setIntroDone(true)} />}
    </CRTEffectWrapper>
  );
}
