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
 * Muestra a David en plano americano (recortado por overflow del contenedor),
 * recita un texto introductorio con efecto typewriter + sonido por letra, y
 * tras terminar revela un botón "Continuar con la demo". Mientras el intro
 * está activo el runtime del juego NO se monta — así no hay música, ni
 * inventario, ni escena cargada hasta que el usuario continúa.
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
      {/* Sprite — plano americano via overflow del contenedor.
          La imagen es más alta que su wrapper, así solo asoma la parte
          superior (cabeza + torso). */}
      <div style={spriteWrapStyle}>
        <img
          src={currentSprite}
          alt="David"
          draggable={false}
          style={spriteImgStyle}
        />
      </div>

      {/* Bubble — diálogo con efecto typewriter. */}
      <div style={bubbleStyle}>
        <p style={bubbleTextStyle}>
          {displayedText}
          {started && !typingDone && <span style={caretStyle}>▍</span>}
        </p>
      </div>

      {/* Start hint — sólo antes de que el usuario haga el primer click. */}
      {!started && (
        <p style={startHintStyle}>
          PULSA EN CUALQUIER LUGAR PARA EMPEZAR
        </p>
      )}

      {/* Continue — aparece cuando el typing termina (+ pequeña pausa). */}
      {continueVisible && (
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(16px, 3vh, 32px)",
    padding: "clamp(20px, 4vh, 48px)",
    fontFamily: "var(--font-pixel), 'Courier New', monospace",
    imageRendering: "pixelated",
    cursor: awaitingStart ? "pointer" : "default",
    userSelect: "none",
    overflow: "hidden",
  };
}

const spriteWrapStyle: CSSProperties = {
  width: "clamp(180px, 28vh, 320px)",
  // The sprite's aspect ratio is 93x255 ≈ 0.365. With width=W the natural
  // height would be ~2.74·W. We deliberately constrain height to ~1.6·W so
  // the bottom half (knees down) is clipped — a rough "plano americano".
  height: "clamp(290px, 45vh, 520px)",
  overflow: "hidden",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  filter: "drop-shadow(0 0 28px rgba(132,230,255,0.18))",
};

const spriteImgStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  imageRendering: "pixelated",
  pointerEvents: "none",
};

const bubbleStyle: CSSProperties = {
  position: "relative",
  maxWidth: "min(680px, 88vw)",
  background: "#ffffff",
  color: "#121212",
  borderRadius: "10px",
  padding: "18px 22px",
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
  margin: 0,
  fontSize: "0.92rem",
  color: "rgba(132,230,255,0.75)",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  animation: "intro-pulse 1.6s ease-in-out infinite",
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
  animation: "intro-fade-in 0.45s ease both",
};

const scanlinesStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  backgroundImage:
    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.10) 2px, rgba(0,0,0,0.10) 4px)",
};
