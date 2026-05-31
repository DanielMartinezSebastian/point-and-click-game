"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSceneStore } from "@pointclick-engine/engine-core";
import { resolveTransitionFromItemDrop, resolveTransitionFromItemInteraction } from "@pointclick-engine/engine-core";
import { getGameRuntime } from "../publicApi";
import { useDialogStore } from "../../../store/dialogStore";
import { usePlacedItemsStore } from "../../../store/placedItemsStore";
import { getRandomPhrase } from "../../../../demo-content/dialogs/getRandomPhrase";
import { preloadSceneBackground } from "../../../components/scene/SceneBackgroundPlane";
import type { RuntimeEvent, GameScene } from "@pointclick-engine/engine-core";

/**
 * Wires scene transitions into the demo.
 *
 * Handles:
 * - Collision-based transitions (via `handleTransitionTriggered` callback)
 * - Item-drop-based transitions (by watching `item:dropped` events)
 *
 * Scene changes are applied directly via sceneStore for demo compatibility
 * (scenes are defined in SCENES, not registered via createGameRuntime).
 */
export interface UseTransitionSystemOpts {
  onBeforeChange?: () => void;
  /** Resuelve el objeto de escena completo por ID. Usado para validación y precarga de fondo. */
  resolveScene?: (sceneId: string) => GameScene | null;
}

export function useTransitionSystem(opts?: UseTransitionSystemOpts) {
  const storeSetScene = useSceneStore((s) => s.setScene);
  const placedItems = usePlacedItemsStore((s) => s.items);
  const isTransitioningRef = useRef(false);
  const showDialog = useDialogStore((s) => s.show);
  const dialogVisible = useDialogStore((s) => s.visible);
  const pendingTransitionRef = useRef<{ id: string; targetSceneId: string } | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  const changeScene = useCallback(
    (targetSceneId: string, transitionId: string) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      // Emit transition:started via runtime bus (if runtime is active)
      getGameRuntime()?.emit({
        type: "transition:started",
        transitionId,
      });

      // Notify caller synchronously so it can show the curtain overlay before
      // any state update causes a re-render with the new (backgroundless) scene.
      optsRef.current?.onBeforeChange?.();

      const fromSceneId = useSceneStore.getState().sceneId;
      const fromScene = useSceneStore.getState().scene;

      // Find the transition that was used to trigger this scene change
      const usedTransition = fromScene.transitions?.find((t) => t.id === transitionId);

      // Change scene first with optional custom spawn position
      const spawnPos = usedTransition && "spawnPosition" in usedTransition ? usedTransition.spawnPosition : undefined;
      const resolvedScene = optsRef.current?.resolveScene?.(targetSceneId) ?? null;
      storeSetScene(targetSceneId, resolvedScene as Parameters<typeof storeSetScene>[1], spawnPos);

      // Then emit walk command in the new scene with correct pathfinding context
      if (usedTransition && "targetPosition" in usedTransition && usedTransition.targetPosition) {
        const targetPos = usedTransition.targetPosition;
        // console.log(`[useTransitionSystem] Emitting walkTo to ${JSON.stringify(targetPos)}`);
        // Emit walk command via runtime
        getGameRuntime()?.executeCommand({
          type: "player:walkTo",
          position: targetPos,
        });
      } else {
        // console.log(`[useTransitionSystem] No targetPosition found on transition`, usedTransition);
      }

      getGameRuntime()?.emit({
        type: "transition:completed",
        fromSceneId,
        toSceneId: targetSceneId,
      });

      // Reset guard after a brief delay so re-entering the same zone works
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 800);
    },
    [storeSetScene],
  );

  /** Called by SceneTransitions renderer when player enters a collision zone. */
  const handleTransitionTriggered = useCallback(
    (transitionId: string, targetSceneId: string) => {
      const currentSceneId = useSceneStore.getState().sceneId;
      const currentScene = useSceneStore.getState().scene;
      const transition = currentScene.transitions?.find((t) => t.id === transitionId);

      if (!transition) {
        console.warn(`[transition] transition not found: ${transitionId}`);
        return;
      }

      // Special case: leaving personalRoom requires having taken the trophy
      // The trophy must not be placed in personalRoom (can be in inventory or another room)
      if (currentSceneId === "personalRoom" && targetSceneId === "dungeon") {
        const trophyStillInRoom = placedItems.some(
          (item) => item.itemId === "trophy" && item.sceneId === "personalRoom",
        );

        console.log("[transition-debug] personalRoom exit check:", {
          allPlacedItems: placedItems.map((i) => ({ id: i.id, itemId: i.itemId, sceneId: i.sceneId })),
          trophyStillInRoom,
        });

        if (trophyStillInRoom) {
          showDialog(
            "Sería mejor recoger todo lo que pueda del cuarto antes de irme...",
            "interaction.trophy-pedestal.empty",
          );
          return;
        }
      }

      // Preload the target scene background so it's in browser cache when we switch.
      const targetBg = optsRef.current?.resolveScene?.(targetSceneId)?.background;
      if (targetBg) preloadSceneBackground(targetBg);

      getGameRuntime()?.emit({
        type: "transition:triggered",
        transitionId,
        targetSceneId,
      });
      changeScene(targetSceneId, transitionId);
    },
    [changeScene, showDialog, placedItems],
  );

  /**
   * Handles item-drop and item-interact events from the inventory system.
   * Returns a passthrough handler that checks if the drop/interact matches a transition.
   * Defers the scene change until the dialog is dismissed.
   */
  const wrapRuntimeEventForTransitions = useCallback(
    (passthrough: (event: RuntimeEvent) => void) =>
      (event: RuntimeEvent) => {
        const scene = useSceneStore.getState().scene;

        if (event.type === "onDrop" && (event.outcome === "consume" || event.outcome === "place") && event.interactionId) {
          const gameEvent = {
            type: "item:dropped" as const,
            itemId: event.itemId,
            outcome: event.outcome as "consume" | "place",
            interactionId: event.interactionId,
          };
          const matching = resolveTransitionFromItemDrop(scene, gameEvent);
          if (matching) {
            getGameRuntime()?.emit({
              type: "transition:triggered",
              transitionId: matching.id,
              targetSceneId: matching.targetSceneId,
            });
            // Store transition to trigger after dialog closes
            pendingTransitionRef.current = { id: matching.id, targetSceneId: matching.targetSceneId };
          }
        }

        if (event.type === "onDrop" && event.outcome === "item-interact" && event.interactionId) {
          const matching = resolveTransitionFromItemInteraction(scene, event.itemId, event.interactionId);
          if (matching) {
            getGameRuntime()?.emit({
              type: "transition:triggered",
              transitionId: matching.id,
              targetSceneId: (matching as any).targetSceneId,
            });
            // Store transition to trigger after dialog closes
            pendingTransitionRef.current = { id: matching.id, targetSceneId: (matching as any).targetSceneId };
          }
        }

        passthrough(event);
      },
    [],
  );

  // Execute pending transition after dialog is dismissed
  useEffect(() => {
    if (!dialogVisible && pendingTransitionRef.current) {
      const t = pendingTransitionRef.current;
      pendingTransitionRef.current = null;
      changeScene(t.targetSceneId, t.id);
    }
  }, [dialogVisible, changeScene]);

  return { handleTransitionTriggered, wrapRuntimeEventForTransitions };
}
