"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { webAudioAdapter } from "../../lib/platform-web-audio";

const SPEAKING_FRAMES = Array.from(
  { length: 8 },
  (_, i) => `/assets/sprites/david/david_speaking_${String(i + 1).padStart(4, "0")}.png`,
);
const IDLE_FRAME = "/assets/sprites/david/david_idle.png";

const INTRO_TEXT =
  "¡Hola! Soy David. Esto es una demo del Point & Click Engine: " +
  "una librería para juegos 2D y 2.5D agnóstica al framework, con " +
  "su primera implementación en React Three Fiber. Diálogos, " +
  "inventario, transiciones entre escenas, pathfinding... todo lo " +
  "que necesitas para una pequeña aventura. Cuando quieras, " +
  "continúa para empezar.";

const CHARS_PER_SECOND = 30;
const SPRITE_FPS = 8;
// Pause typing a beat at sentence boundaries — gives the sprite room to breathe.
const PUNCTUATION_PAUSE_MS: Record<string, number> = {
  ".": 280,
  "!": 280,
  "?": 280,
  ",": 110,
  ";": 110,
  ":": 110,
};

function playLetterSound() {
  const n = Math.floor(Math.random() * 4) + 1;
  const url = `/assets/audio/sfx/speak (${n}).mp3`;
  webAudioAdapter.playSound({ id: url, url, category: "sfx" }, { volume: 0.35 });
}

function playClickSound() {
  webAudioAdapter.playSound(
    { id: "/assets/audio/sfx/click.ogg", url: "/assets/audio/sfx/click.ogg", category: "ui" },
  );
}

type IntroSceneProps = {
  onComplete: () => void;
};

/**
 * IntroScene — overlay DOM-only mostrado antes de inicializar el juego.
 *
 * Layout — fixed full-screen, el sprite es el ÚNICO hijo en flujo y todo
 * lo demás (bocadillo, botón, hint) se posiciona en absolute para que el
 * sprite no se desplace en ningún momento durante el typewriter o cuando
 * aparece/desaparece el botón continuar.
 *
 * Mientras el intro está activo el runtime del juego NO se monta — así no
 * hay música, ni inventario, ni escena cargada hasta que el usuario
 * continúa.
 *
 * Gate inicial: el typewriter no arranca hasta que el usuario hace click.
 * Esto desbloquea el AudioContext (autoplay policy) antes de que se intenten
 * reproducir los sonidos por letra, evitando que la cola interna del adapter
 * los acumule y los dispare todos juntos más adelante.
 */
export function IntroScene({ onComplete }: IntroSceneProps) {
  const [started, setStarted] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [continueVisible, setContinueVisible] = useState(false);
  // Cursor is a ref (not state) so React StrictMode / Fast Refresh re-runs of
  // the typewriter effect resume from the current position instead of restarting
  // from 0 and visibly rewinding the text.
  const indexRef = useRef(0);

  const handleStart = useCallback(() => {
    if (started) return;
    playClickSound();
    setStarted(true);
  }, [started]);

  // Typewriter ──────────────────────────────────────────────────────────────
  // Char-by-char reveal with a small extra pause at sentence boundaries.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const baseStepMs = Math.max(14, Math.floor(1000 / CHARS_PER_SECOND));

    const tick = () => {
      if (cancelled) return;
      indexRef.current += 1;
      const i = indexRef.current;
      const newChar = INTRO_TEXT[i - 1];
      const nextSlice = INTRO_TEXT.slice(0, i);
      setDisplayedText((prev) => (nextSlice.length > prev.length ? nextSlice : prev));

      if (newChar && newChar !== " " && newChar !== "\n") {
        playLetterSound();
      }

      if (i >= INTRO_TEXT.length) {
        setTypingDone(true);
        return;
      }

      const extraPause = PUNCTUATION_PAUSE_MS[newChar ?? ""] ?? 0;
      timer = setTimeout(tick, baseStepMs + extraPause);
    };

    // If a previous effect run already finished the text, don't restart.
    if (indexRef.current >= INTRO_TEXT.length) {
      setTypingDone(true);
      return;
    }

    timer = setTimeout(tick, baseStepMs);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [started]);

  // Sprite frame cycler ─────────────────────────────────────────────────────
  // Cycles through the 8 speaking frames while typing. Once typing stops the
  // sprite freezes on the idle frame to match the static dialog.
  useEffect(() => {
    if (!started || typingDone) return;
    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPEAKING_FRAMES.length);
    }, 1000 / SPRITE_FPS);
    return () => clearInterval(id);
  }, [started, typingDone]);

  // Reveal continue button after a short beat so the user can finish reading.
  useEffect(() => {
    if (!typingDone) return;
    const t = setTimeout(() => setContinueVisible(true), 400);
    return () => clearTimeout(t);
  }, [typingDone]);

  const handleContinue = useCallback(() => {
    playClickSound();
    onComplete();
  }, [onComplete]);

  const currentSprite = useMemo(() => {
    if (!started || typingDone) return IDLE_FRAME;
    return SPEAKING_FRAMES[frameIndex];
  }, [started, typingDone, frameIndex]);

  // Preload speaking frames in the background so the cycle doesn't flicker
  // on first reveal. Mount once on first start.
  useEffect(() => {
    if (!started) return;
    SPEAKING_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [started]);

  return (
    <div
      onPointerDown={!started ? handleStart : undefined}
      style={containerStyle(!started)}
      aria-label="Introducción"
    >
      {/* Sprite — único hijo en flujo. El bocadillo se ancla en absolute a
          su contenedor (position:relative) y el sprite NO se mueve cuando
          el bocadillo aparece o crece. */}
      <div style={spriteWrapStyle}>
        <img
          src={currentSprite}
          alt="David"
          draggable={false}
          style={spriteImgStyle}
        />

        {/* Bocadillo — sólo visible tras el primer click. Anclado al sprite
            (top:58%) para que quede sobre la parte inferior del torso. Su
            ancho es mayor que el sprite y se centra horizontalmente; al
            crecer verticalmente lo hace hacia abajo, sin desplazar nada.
            El wrapper hace la posición + fade-in (su animation termina en
            translateY(0) y machacaría el translateX(-50%) si lo mezcláramos
            en el mismo elemento que el bubble). */}
        {started && (
          <div style={bubbleWrapStyle}>
            <div style={bubbleStyle}>
              <p style={bubbleTextStyle}>
                {displayedText}
                {!typingDone && <span style={caretStyle}>▍</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Start hint — sólo antes del primer click. */}
      {!started && (
        <p style={startHintStyle}>
          PULSA EN CUALQUIER LUGAR PARA EMPEZAR
        </p>
      )}

      {/* Continuar — aparece cuando el typing termina (+ pequeña pausa).
          El wrapper se posiciona en absolute para que el botón no empuje al
          sprite cuando se monta. El botón interior gestiona libremente su
          propia transform para el hover. */}
      {continueVisible && (
        <div style={continueWrapStyle}>
          <button
            type="button"
            onClick={handleContinue}
            style={continueButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            CONTINUAR CON LA DEMO
          </button>
        </div>
      )}

      {/* Scanlines — sutil, para ligar visualmente con el resto de la demo. */}
      <div style={scanlinesStyle} />
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

function containerStyle(awaitingStart: boolean): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "#070d1f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-pixel), 'Courier New', monospace",
    imageRendering: "pixelated",
    cursor: awaitingStart ? "pointer" : "default",
    userSelect: "none",
    overflow: "hidden",
  };
}

// Sprite aspect ratio is 93x255 ≈ 0.365 → natural height = width · 2.74.
// We size width via vh so the natural height stays in viewport on common
// aspect ratios (22vh × 2.74 ≈ 60vh tall).
const spriteWrapStyle: CSSProperties = {
  position: "relative",
  width: "clamp(140px, 22vh, 260px)",
  filter: "drop-shadow(0 0 28px rgba(132,230,255,0.18))",
};

const spriteImgStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  imageRendering: "pixelated",
  pointerEvents: "none",
};

// Wrapper — handles absolute positioning + fade-in. Anchored to spriteWrap.
// top:58% places the bubble's top edge over the lower torso (sprite is
// 93x255, lower torso ≈ y=148/255 = 58%).
const bubbleWrapStyle: CSSProperties = {
  position: "absolute",
  top: "58%",
  left: "50%",
  transform: "translateX(-50%)",
  width: "min(560px, 86vw)",
  zIndex: 2,
  animation: "intro-fade-in 0.25s ease both",
};

// Inner — visual chrome only. Sized to 100% of the wrapper so the wrapper's
// width drives the bubble width.
const bubbleStyle: CSSProperties = {
  width: "100%",
  background: "#ffffff",
  color: "#121212",
  borderRadius: "10px",
  padding: "16px 20px",
  boxSizing: "border-box",
  boxShadow: [
    "inset 0 0 0 3px rgba(132,230,255,0.85)",
    "0 6px 0 rgba(0,0,0,0.55)",
    "0 0 24px rgba(132,230,255,0.18)",
  ].join(","),
  minHeight: "5.5em",
};

const bubbleTextStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.05rem, 2.4vw, 1.45rem)",
  lineHeight: 1.35,
  letterSpacing: "0.02em",
  whiteSpace: "pre-wrap",
};

const caretStyle: CSSProperties = {
  display: "inline-block",
  marginLeft: 2,
  color: "#84e6ff",
  animation: "intro-caret 0.9s steps(2, end) infinite",
};

const startHintStyle: CSSProperties = {
  position: "absolute",
  bottom: "clamp(20px, 4vh, 40px)",
  left: "50%",
  transform: "translateX(-50%)",
  margin: 0,
  fontSize: "0.92rem",
  color: "rgba(132,230,255,0.75)",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  animation: "intro-pulse 1.6s ease-in-out infinite",
};

const continueWrapStyle: CSSProperties = {
  position: "absolute",
  bottom: "clamp(28px, 6vh, 64px)",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 3,
  animation: "intro-fade-in 0.45s ease both",
};

const continueButtonStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgb(32 108 160) 0%, rgb(16 56 90) 100%)",
  color: "#ffffff",
  border: "3px solid rgba(132,230,255,0.85)",
  borderRadius: "6px",
  padding: "12px 28px",
  fontFamily: "var(--font-pixel), 'Courier New', monospace",
  fontSize: "1.15rem",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: [
    "inset 0 2px 0 rgba(255,255,255,0.18)",
    "inset 0 -2px 0 rgba(0,0,0,0.35)",
    "0 4px 0 rgba(0,0,0,0.55)",
    "0 0 18px rgba(132,230,255,0.25)",
  ].join(","),
  transition: "transform 0.15s ease",
};

const scanlinesStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage:
    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 4px)",
};
