"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { webAudioAdapter } from "../../lib/platform-web-audio";

const SPEAKING_FRAMES = Array.from(
  { length: 8 },
  (_, i) => `/assets/sprites/david/david_speaking_${String(i + 1).padStart(4, "0")}.png`,
);
const IDLE_FRAME = "/assets/sprites/david/david_idle.png";

const NPM_PACKAGE_URL = "https://www.npmjs.com/package/@pointclick-engine/engine-core";

const INTRO_TEXT =
  "¡Hola! Soy David, un personaje inspirado en el hijo del " +
  "desarrollador. Esto es una demo del Point & Click Engine: una " +
  "librería para juegos 2D y 2.5D agnóstica al framework, con su " +
  "primera implementación en React Three Fiber. Diálogos, " +
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
      {/* Header — título de la librería + enlace externo a npm. */}
      <header style={headerStyle}>
        <span style={titleStyle}>POINT &amp; CLICK ENGINE</span>
        <a
          href={NPM_PACKAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver paquete en npm"
          title="Ver paquete en npm"
          style={npmLinkStyle}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ExternalLinkIcon />
        </a>
      </header>

      {/* Sprite — el bocadillo se ancla en absolute a su contenedor (relative)
          y el sprite NO se mueve cuando el bocadillo aparece o crece. */}
      <div style={spriteWrapStyle}>
        <img
          src={currentSprite}
          alt="David"
          draggable={false}
          style={spriteImgStyle}
        />

        {/* Bocadillo — sólo visible tras el primer click. Anclado al sprite
            (top:62%) sobre la parte inferior del torso / cintura. Su ancho es
            mayor que el sprite y se centra horizontalmente. Al crecer
            verticalmente lo hace hacia abajo, sin desplazar nada.
            El wrapper hace la posición + fade-in (su animation terminaría en
            translateY(0) y machacaría el translateX(-50%) si lo mezcláramos
            con el bubble — la keyframe se simplificó a opacity-only). */}
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

      {/* Footer — reserva una banda inferior fija para que el start-hint y el
          botón de continuar se intercambien SIN desplazar al sprite y dejen
          espacios equilibrados respecto al header de arriba. */}
      <footer style={footerStyle}>
        {!started && (
          <p style={startHintStyle}>
            PULSA EN CUALQUIER LUGAR PARA EMPEZAR
          </p>
        )}
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
      </footer>

      {/* Scanlines — sutil, para ligar visualmente con el resto de la demo. */}
      <div style={scanlinesStyle} />
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d="M14 4h6v6" />
      <path d="M20 4L10 14" />
      <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
    </svg>
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
    // header → sprite → footer, evenly distributing the free vertical space
    // so the three blocks land at roughly the same distance from each other
    // regardless of viewport height. No layout shift: header is constant,
    // sprite is constant (bubble is absolute over it), footer has a reserved
    // min-height so swapping start-hint → continue button doesn't resize it.
    justifyContent: "space-between",
    paddingTop: "clamp(12px, 2vh, 28px)",
    paddingBottom: "clamp(12px, 2vh, 28px)",
    fontFamily: "var(--font-pixel), 'Courier New', monospace",
    imageRendering: "pixelated",
    cursor: awaitingStart ? "pointer" : "default",
    userSelect: "none",
    overflow: "hidden",
  };
}

// Header — title + npm link icon. Horizontal pill at the top.
const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "6px 10px",
  color: "#84e6ff",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontSize: "clamp(0.85rem, 2.6vw, 1.1rem)",
  textShadow: "0 0 24px rgba(132,230,255,0.55), 0 0 48px rgba(132,230,255,0.18)",
};

const titleStyle: CSSProperties = {
  whiteSpace: "nowrap",
};

const npmLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  color: "rgba(132,230,255,0.75)",
  border: "2px solid rgba(132,230,255,0.55)",
  borderRadius: "4px",
  textDecoration: "none",
  transition: "color 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
  cursor: "pointer",
};

// Footer reserves vertical space so the start-hint → continue-button swap
// doesn't shrink/grow the footer block — keeps the spacing equilibrated.
const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "clamp(56px, 9vh, 80px)",
};

// Sprite aspect ratio is 93x255 ≈ 0.365 → natural height = width · 2.74.
// Sized via vh so the natural height stays inside the viewport on common
// aspect ratios. Slightly smaller than the previous 22vh because the
// header + footer now consume vertical real-estate.
const spriteWrapStyle: CSSProperties = {
  position: "relative",
  width: "clamp(130px, 20vh, 240px)",
  flexShrink: 0,
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
// top:62% places the bubble's top edge over the waist / lower torso (sprite
// is 93x255; 62% ≈ y=158/255, just below the printed hoodie area). Slightly
// lower than the earlier 58% so the bubble's vertical mass sits in the
// lower half of the character, leaving the face/upper body visible.
const bubbleWrapStyle: CSSProperties = {
  position: "absolute",
  top: "62%",
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
  margin: 0,
  fontSize: "0.92rem",
  color: "rgba(132,230,255,0.75)",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  animation: "intro-pulse 1.6s ease-in-out infinite",
};

const continueButtonStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgb(32 108 160) 0%, rgb(16 56 90) 100%)",
  color: "#ffffff",
  border: "3px solid rgba(132,230,255,0.85)",
  borderRadius: "6px",
  padding: "12px 28px",
  fontFamily: "var(--font-pixel), 'Courier New', monospace",
  // clamp so the label always fits on a single line on narrow viewports —
  // the wrapper is sized to content (no width constraint) so reducing the
  // font scales the whole pill down rather than wrapping the text.
  fontSize: "clamp(0.85rem, 3vw, 1.15rem)",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
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
