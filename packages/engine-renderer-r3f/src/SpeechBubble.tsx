"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Group, type Mesh } from "three";

import { useSceneStore } from "@pointclick-engine/engine-core";

type SpeechBubbleProps = {
  text: string;
  visible: boolean;
  trigger: number;
  charsPerSecond?: number;
  onDismiss?: () => void;
  onLetterRevealed?: () => void;
};

const SPRITE_HALF_WIDTH_WORLD = 0.62;
const BUBBLE_GAP_WORLD = 0.22;
const DEPTH_FAR_Z = -16;
const DEPTH_NEAR_Z = 8;
const SPRITE_MIN_SCALE = 1.4;
const SPRITE_MAX_SCALE = 2.94;
const SPRITE_HALF_WIDTH_FACTOR = 0.36;
const BORDER_PADDING = 0.09;
const SPRITE_CENTER_Y_OFFSET = -0.95;
const BUBBLE_HEADROOM = -1;
const TEXT_PADDING_X = 0.2;
const TEXT_PADDING_Y = 0.16;
const FONT_SIZE = 0.2;
const LINE_HEIGHT = 1.18;
const AVG_CHAR_WIDTH_WORLD = 0.096;
const MIN_BUBBLE_WIDTH = 0.6;
const MAX_BUBBLE_WIDTH = 5.2;
const MIN_BUBBLE_HEIGHT = 0.45;
const MAX_BUBBLE_HEIGHT = 3.8;
const MS_PER_WORD_READ = 286;
const MIN_READ_MS = 2080;
const MAX_READ_MS = 10400;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function wrapParagraphByWords(paragraph: string, maxCharsPerLine: number) {
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[index];
    }
  }

  lines.push(currentLine);
  return lines;
}

export default function SpeechBubble({
  text,
  visible,
  trigger,
  charsPerSecond = 30,
  onDismiss,
  onLetterRevealed,
}: SpeechBubbleProps) {
  const playerPosition = useSceneStore((state) => state.playerPosition);
  const ground = useSceneStore((state) => state.scene.ground);
  const normalizedText = useMemo(() => text.trim(), [text]);
  const [displayedText, setDisplayedText] = useState("");
  const dismissTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const skipTypingRef = useRef<(() => void) | null>(null);

  // ── Layout estático: calculado UNA vez por diálogo (dep: normalizedText) ──
  const { bubbleWidth, textMaxWidth, fullBubbleHeight, wrappedText } = useMemo(() => {
    const fullText = normalizedText.length > 0 ? normalizedText : " ";
    const totalChars = Math.max(1, fullText.length);
    const targetCPL = clamp(Math.round(Math.sqrt(totalChars) * 2.4), 18, 36);
    const paragraphs = fullText.split("\n");
    const wrappedFull = paragraphs.flatMap((p) =>
      p.trim().length === 0 ? [""] : wrapParagraphByWords(p, targetCPL),
    );
    const longestChars = Math.max(1, ...wrappedFull.map((l) => l.length));
    const rawTextWidth = clamp(
      longestChars * AVG_CHAR_WIDTH_WORLD,
      MIN_BUBBLE_WIDTH - TEXT_PADDING_X * 2,
      MAX_BUBBLE_WIDTH - TEXT_PADDING_X * 2,
    );
    const bw = clamp(rawTextWidth + TEXT_PADDING_X * 2, MIN_BUBBLE_WIDTH, MAX_BUBBLE_WIDTH);
    const fullLineCount = Math.max(1, wrappedFull.length);
    const fbh = clamp(
      fullLineCount * FONT_SIZE * LINE_HEIGHT + TEXT_PADDING_Y * 2,
      MIN_BUBBLE_HEIGHT,
      MAX_BUBBLE_HEIGHT,
    );
    return {
      bubbleWidth: bw,
      textMaxWidth: bw - TEXT_PADDING_X * 2,
      fullBubbleHeight: fbh,
      wrappedText: wrappedFull.join("\n"),
    };
  }, [normalizedText]);

  // ── Efecto de tipeo ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || wrappedText.length === 0) return;

    let index = 0;
    let charsSinceLastSound = 0;
    const msPerChar = Math.max(14, Math.floor(1000 / Math.max(1, charsPerSecond)));
    const charsPerSound = Math.max(1, Math.round(charsPerSecond / 8));
    const timerHolder: { current: ReturnType<typeof globalThis.setInterval> | null } = { current: null };

    const startDismissTimer = () => {
      if (onDismiss) {
        const wordCount = normalizedText.trim().split(/\s+/).filter(Boolean).length;
        const readMs = clamp(wordCount * MS_PER_WORD_READ, MIN_READ_MS, MAX_READ_MS);
        dismissTimerRef.current = globalThis.setTimeout(onDismiss, readMs);
      }
    };

    skipTypingRef.current = () => {
      if (timerHolder.current !== null) {
        globalThis.clearInterval(timerHolder.current);
        timerHolder.current = null;
      }
      setDisplayedText(wrappedText);
      skipTypingRef.current = null;
      startDismissTimer();
    };

    timerHolder.current = globalThis.setInterval(() => {
      index += 1;
      const newChar = wrappedText[index - 1];
      setDisplayedText(wrappedText.slice(0, index));

      if (onLetterRevealed && newChar && newChar !== " " && newChar !== "\n") {
        charsSinceLastSound += 1;
        if (charsSinceLastSound >= charsPerSound) {
          charsSinceLastSound = 0;
          onLetterRevealed();
        }
      }

      if (index >= wrappedText.length) {
        globalThis.clearInterval(timerHolder.current!);
        timerHolder.current = null;
        skipTypingRef.current = null;
        startDismissTimer();
      }
    }, msPerChar);

    return () => {
      if (timerHolder.current !== null) {
        globalThis.clearInterval(timerHolder.current);
        timerHolder.current = null;
      }
      skipTypingRef.current = null;
      if (dismissTimerRef.current !== null) {
        globalThis.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [charsPerSecond, wrappedText, normalizedText, onDismiss, onLetterRevealed, trigger, visible]);

  const shouldShowLeft = useMemo(() => {
    const worldEdgePadding = 0.9;
    const spaceLeft = playerPosition[0] - ground.minX - worldEdgePadding;
    const spaceRight = ground.maxX - playerPosition[0] - worldEdgePadding;
    return spaceLeft > spaceRight;
  }, [ground.maxX, ground.minX, playerPosition]);

  const depthFactor = useMemo(() => {
    return clamp((playerPosition[2] - DEPTH_FAR_Z) / (DEPTH_NEAR_Z - DEPTH_FAR_Z), 0, 1);
  }, [playerPosition]);

  const spriteScale = useMemo(() => {
    return lerp(SPRITE_MIN_SCALE, SPRITE_MAX_SCALE, depthFactor);
  }, [depthFactor]);

  // ── Alto dinámico: displayedText ya tiene \n → solo contar líneas ─────────
  const bubbleHeight = useMemo(() => {
    const lineCount = Math.max(1, displayedText.split("\n").length);
    const textHeight = lineCount * FONT_SIZE * LINE_HEIGHT;
    return clamp(textHeight + TEXT_PADDING_Y * 2, MIN_BUBBLE_HEIGHT, MAX_BUBBLE_HEIGHT);
  }, [displayedText]);

  // Belt-and-braces guarantee for "dialog must always be readable, even when
  // a wall texture would otherwise cover it":
  // - drei's RoundedBox / Text wrap their own meshes and may not always
  //   forward `renderOrder` / material depth flags through JSX shorthand.
  // - We traverse the bubble group on every render where the bubble is
  //   visible and force every Mesh + material to use a very late render
  //   order with depth tests disabled.
  //
  // NOTE: useRef and useEffect MUST live above any early `return null` so
  // React always counts the same number of hooks per render.
  const BUBBLE_RENDER_ORDER = 20000;
  const bubbleGroupRef = useRef<Group | null>(null);
  useEffect(() => {
    if (!visible) return;
    const root = bubbleGroupRef.current;
    if (!root) return;
    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.renderOrder = BUBBLE_RENDER_ORDER;
      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const m of material) {
          m.depthTest = false;
          m.depthWrite = false;
          m.transparent = true;
          m.needsUpdate = true;
        }
      } else if (material) {
        material.depthTest = false;
        material.depthWrite = false;
        material.transparent = true;
        material.needsUpdate = true;
      }
    });
  }, [visible, displayedText, bubbleWidth, bubbleHeight]);

  if (!visible || normalizedText.length === 0) {
    return null;
  }

  const spriteHalfWidthWorld = Math.max(SPRITE_HALF_WIDTH_WORLD, spriteScale * SPRITE_HALF_WIDTH_FACTOR);
  const sideOffset = spriteHalfWidthWorld + BUBBLE_GAP_WORLD;
  const offsetX = shouldShowLeft ? -sideOffset : sideOffset;
  const offsetY = (2 * spriteScale) + SPRITE_CENTER_Y_OFFSET + BUBBLE_HEADROOM;
  const bubbleCenterX = shouldShowLeft
    ? offsetX - bubbleWidth / 2
    : offsetX + bubbleWidth / 2;
  const arrowBaseX = shouldShowLeft ? offsetX + 0.07 : offsetX - 0.07;
  const arrowRotationZ = shouldShowLeft ? -Math.PI / 2 : Math.PI / 2;

  return (
    <group
      ref={bubbleGroupRef}
      position={[0, offsetY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        skipTypingRef.current?.();
      }}
    >
      <group position={[bubbleCenterX, -bubbleHeight / 2, 0.03]}>
        <RoundedBox
          args={[1, 1, 0.02]}
          scale={[bubbleWidth + BORDER_PADDING, bubbleHeight + BORDER_PADDING, 1]}
          radius={0.14}
          smoothness={4}
          position={[0, 0, -0.003]}
          renderOrder={BUBBLE_RENDER_ORDER}
        >
          <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
        </RoundedBox>
        <RoundedBox
          args={[1, 1, 0.018]}
          scale={[bubbleWidth, bubbleHeight, 1]}
          radius={0.12}
          smoothness={4}
          position={[0, 0, 0]}
          renderOrder={BUBBLE_RENDER_ORDER + 1}
        >
          <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
        </RoundedBox>
        <Text
          position={[-(bubbleWidth / 2) + TEXT_PADDING_X, 0, 0.012]}
          color="#121212"
          anchorX="left"
          anchorY="middle"
          maxWidth={textMaxWidth}
          lineHeight={LINE_HEIGHT}
          fontSize={FONT_SIZE}
          textAlign="left"
          outlineWidth={0.005}
          outlineColor="#ffffff"
          renderOrder={BUBBLE_RENDER_ORDER + 2}
          material-depthTest={false}
        >
          {displayedText}
        </Text>
      </group>

      <mesh
        position={[arrowBaseX, -fullBubbleHeight * 0.3, 0.027]}
        rotation={[0, 0, arrowRotationZ]}
        renderOrder={BUBBLE_RENDER_ORDER}
      >
        <coneGeometry args={[0.16, 0.27, 3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
      </mesh>
      <mesh
        position={[arrowBaseX, -fullBubbleHeight * 0.3, 0.028]}
        rotation={[0, 0, arrowRotationZ]}
        renderOrder={BUBBLE_RENDER_ORDER + 1}
      >
        <coneGeometry args={[0.13, 0.22, 3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
      </mesh>
    </group>
  );
}
