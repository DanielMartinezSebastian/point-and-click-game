"use client";

// Re-exports from renderer (stable public API)
export { useR3FGameLoop, WebKeyboardInput } from "@pointclick-engine/engine-renderer-r3f";

/**
 * Public API mínima del motor de juego.
 *
 * Este módulo expone contratos estables e independientes de demo/content.
 * Usa estos tipos y funciones para integrar el engine desde fuera sin
 * acoplar a imports internos de app/demo/content.
 */

import { useShallow } from "zustand/react/shallow";
import { createElement } from "react";
import type { ComponentType } from "react";

import {
  useSceneStore,
  setSceneStoreEmitter,
  EventBus,
  CommandHandler,
  findPath,
  type GameVec3,
  type GameSceneGround,
  type GameSceneWall,
  type GameSceneInteractionFull,
  type GameEvent,
  type GameEventType,
  type GameEventHandler,
  type GameCommand,
  type SceneMusicConfig,
} from "@pointclick-engine/engine-core";
import { GameCanvasCore } from "@pointclick-engine/engine-renderer-r3f";

// ---------------------------------------------------------------------------
// Tipos públicos reutilizables (importados o re-exportados de engine-core)
// ---------------------------------------------------------------------------

// Re-export key types from engine-core for API stability
export type { GameVec3, GameSceneGround, GameSceneWall } from "@pointclick-engine/engine-core";
// Re-export bidirectional API types
export type {
  GameEvent,
  GameEventType,
  GameEventHandler,
  GameCommand,
} from "@pointclick-engine/engine-core";

// Alias for public API compatibility
export type GameSceneInteraction = GameSceneInteractionFull;

/** Configuración de escena registrable via API pública. */
export type GameSceneConfig = {
  id: string;
  label: string;
  background: string;
  playerSpawn: GameVec3;
  ground: GameSceneGround;
  walls: GameSceneWall[];
  interactions: GameSceneInteraction[];
  music?: SceneMusicConfig;
};

export type GameItemDropOutcome =
  | "consume"
  | "place"
  | "return"
  | "rule-miss"
  | "unknown-item"
  | "on-player"
  | "pickup-blocked"
  | "pickup-success";

export type GameItemRule = {
  outcome: GameItemDropOutcome;
  hitDialogKey?: string;
  missDialogKey?: string;
  placeCanPickup?: boolean;
  placeHasCollision?: boolean;
  placeCollisionHalfSize?: GameVec3;
  pickupSuccessDialogKey?: string;
  pickupBlockedDialogKey?: string;
  dropSoundUrl?: string;
};

/** Configuración de ítem registrable via API pública. */
export type GameItemConfig = {
  id: string;
  name: string;
  spriteUrl: string;
  descriptionDialogKey?: string;
  pickupSoundUrl?: string;
  dropSoundUrl?: string;
  interactionRules: Record<string, GameItemRule>;
  defaultRule: GameItemRule;
};

/** Regla de texto/diálogo registrable via API pública. */
export type GameRuleConfig = {
  key: string;
  phrases: string[];
};

/** Props del punto de integración GameViewport (canvas + runtime). */
export type GameViewportProps = {
  debug?: boolean;
  onRuntimeEvent?: GameRuntimeEventHandler;
};

// ---------------------------------------------------------------------------
// Eventos de runtime (legacy — mantenidos por backwards compat)
// ---------------------------------------------------------------------------

export type GameRuntimeEvent =
  | {
      type: "onMove";
      position: GameVec3;
      action: "idle" | "north" | "south" | "west" | "east";
    }
  | { type: "onCollide"; reason: "boundary" | "stuck"; position: GameVec3 }
  | { type: "onDrop"; outcome: string; itemId: string; interactionId?: string }
  | { type: "onDialog"; text: string; dialogKey?: string; source: string };

export type GameRuntimeEventHandler = (event: GameRuntimeEvent) => void;

// ---------------------------------------------------------------------------
// Handle de runtime devuelto por createGameRuntime (Phase 4)
// ---------------------------------------------------------------------------

export type GameRuntime = {
  // Registro (existentes)
  getScenes: () => Record<string, GameSceneConfig>;
  getItems: () => Record<string, GameItemConfig>;
  getRules: () => Record<string, GameRuleConfig>;
  // Bidirectional API (Phase 4)
  /**
   * Envía un comando al motor. Sync, fire-and-forget.
   * Comandos sin executor registrado loguean warn y no hacen nada.
   * Ver ADR-0006 y docs/architecture/05-bidirectional-communication.md.
   */
  executeCommand: (cmd: GameCommand) => void;
  /**
   * Suscribe a un tipo de evento del motor.
   * @returns unsubscribe — llámalo para cancelar la suscripción (ej. en useEffect cleanup).
   */
  on: <T extends GameEventType>(type: T, handler: GameEventHandler<T>) => () => void;
  /**
   * Emite un evento al bus del runtime.
   * Útil para que el renderer envíe eventos sin conocer el store.
   */
  emit: (event: GameEvent) => void;
  /**
   * Libera el bus y desactiva las emisiones del store.
   * Llamar al desmontar la app / en tests cleanup.
   */
  dispose: () => void;
};

type SceneStoreSnapshot = ReturnType<typeof useSceneStore.getState>;

export type GameState = Pick<
  SceneStoreSnapshot,
  "sceneId" | "scene" | "playerPosition" | "respawnSignal"
>;

export type GameActions = Pick<
  SceneStoreSnapshot,
  "setScene" | "setPlayerPosition" | "requestRespawn"
>;

function toGameState(state: SceneStoreSnapshot): GameState {
  return {
    sceneId: state.sceneId,
    scene: state.scene,
    playerPosition: state.playerPosition,
    respawnSignal: state.respawnSignal,
  };
}

// ---------------------------------------------------------------------------
// Configuración de createGameRuntime
// ---------------------------------------------------------------------------

/** Adapter para conectar el engine con la UI de inventario del host. */
export interface InventoryUIAdapter {
  toggle(): void;
  isOpen(): boolean;
}

/** Adapter para conectar el engine con el sistema de diálogos del host. */
export interface DialogUIAdapter {
  show(text: string, dialogKey?: string): void;
  hide(): void;
}

export type GameRuntimeConfig = {
  scenes?: GameSceneConfig[];
  items?: GameItemConfig[];
  rules?: GameRuleConfig[];
  /** Adapter de UI para inventory. Si no se pasa, inventory:toggle es no-op. */
  inventoryAdapter?: InventoryUIAdapter;
  /** Adapter de UI para diálogos. Si no se pasa, dialog:trigger es no-op. */
  dialogAdapter?: DialogUIAdapter;
};

// ---------------------------------------------------------------------------
// Registros internos (singleton de módulo)
// ---------------------------------------------------------------------------

const _sceneRegistry = new Map<string, GameSceneConfig>();
const _itemRegistry = new Map<string, GameItemConfig>();
const _ruleRegistry = new Map<string, GameRuleConfig>();

/** Singleton del runtime activo. Accesible vía getGameRuntime(). */
let _runtimeHandle: GameRuntime | null = null;

/**
 * Registra una escena en el motor.
 * Idempotente: registrar la misma id sobreescribe la anterior.
 */
export function registerScene(config: GameSceneConfig): void {
  _sceneRegistry.set(config.id, config);
}

/**
 * Registra un ítem en el motor.
 * Idempotente: registrar el mismo id sobreescribe el anterior.
 */
export function registerItem(config: GameItemConfig): void {
  _itemRegistry.set(config.id, config);
}

/**
 * Registra una regla de diálogo en el motor.
 * Idempotente: registrar la misma key sobreescribe la anterior.
 */
export function registerRule(config: GameRuleConfig): void {
  _ruleRegistry.set(config.key, config);
}

// ---------------------------------------------------------------------------
// Factory principal
// ---------------------------------------------------------------------------

/**
 * Inicializa el runtime con las escenas, ítems y reglas proporcionadas.
 *
 * Registra cada config en el registry global, crea el EventBus y el
 * CommandHandler, y devuelve un handle con acceso completo a la API
 * bidireccional (`executeCommand`, `on`, `emit`, `dispose`).
 *
 * El handle se almacena como singleton accesible vía `getGameRuntime()`.
 *
 * @example
 * ```ts
 * const runtime = createGameRuntime({ scenes: [myScene], items: [myItem] });
 * runtime.on("scene:changed", (e) => console.log("now in:", e.sceneId));
 * runtime.executeCommand({ type: "scene:set", sceneId: myScene.id });
 * ```
 */
export function createGameRuntime(config: GameRuntimeConfig = {}): GameRuntime {
  // Register content
  for (const scene of config.scenes ?? []) {
    registerScene(scene);
  }
  for (const item of config.items ?? []) {
    registerItem(item);
  }
  for (const rule of config.rules ?? []) {
    registerRule(rule);
  }

  // Create bus and command handler
  const bus = new EventBus();
  const commands = new CommandHandler();

  // Wire store → bus
  setSceneStoreEmitter((event) => bus.emit(event.type, event));

  // Register executors: scene commands
  commands.register("scene:set", (cmd) => {
    const sceneConfig = _sceneRegistry.get(cmd.sceneId);
    if (!sceneConfig) {
      console.warn(`[runtime] scene:set — scene not registered: ${cmd.sceneId}`);
      return;
    }
    useSceneStore.getState().setScene(sceneConfig.id, {
      id: sceneConfig.id,
      label: sceneConfig.label,
      background: sceneConfig.background,
      playerSpawn: sceneConfig.playerSpawn,
      ground: sceneConfig.ground,
      walls: sceneConfig.walls,
      interactions: sceneConfig.interactions,
    });
  });

  commands.register("scene:respawn", () => {
    useSceneStore.getState().requestRespawn();
  });

  commands.register("player:move", (cmd) => {
    useSceneStore.getState().setPlayerPosition(cmd.position);
  });

  commands.register("player:walkTo", (cmd) => {
    const state = useSceneStore.getState();
    const from: [number, number, number] = [
      state.playerPosition[0],
      state.playerPosition[1],
      state.playerPosition[2],
    ];
    const to: [number, number, number] = [
      cmd.position[0],
      cmd.position[1],
      cmd.position[2],
    ];

    // console.log(`[walkTo] from ${JSON.stringify(from)} to ${JSON.stringify(to)}`);

    // Calculate path using existing pathfinding
    const pathResult = findPath({
      start: { x: from[0], z: from[2] },
      goal: { x: to[0], z: to[2] },
      bounds: {
        minX: state.scene.ground.minX,
        maxX: state.scene.ground.maxX,
        minZ: state.scene.ground.minZ,
        maxZ: state.scene.ground.maxZ,
      },
      walls: state.scene.walls,
      interactions: state.scene.interactions,
    });

    // console.log(`[walkTo] pathResult length:`, pathResult?.length ?? 0);

    if (pathResult && pathResult.length > 0) {
      // Convert path points back to GameVec3 format
      // Always include start point + pathfinding results to ensure ≥2 points for interpolation
      const pathPoints: typeof cmd.position[] = [
        from, // Start position
        ...pathResult.map((point) => [
          point.x,
          state.scene.ground.y,
          point.z,
        ] as typeof cmd.position),
      ];

      // console.log(`[walkTo] setting walk state with ${pathPoints.length} points`);

      // Create walk state and activate animation
      state.setPlayerWalkingState({
        targetPosition: cmd.position,
        pathPoints,
        progress: 0,
        isActive: true,
      });

      // Emit event for listeners
      bus.emit("player:walkStarted", {
        type: "player:walkStarted",
        targetPosition: cmd.position,
      });
    } else {
      console.log(`[walkTo] no path found - aborting`);
      // Path not found
      bus.emit("player:walkAborted", {
        type: "player:walkAborted",
        reason: "unreachable",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Wired executors (Phase 5)
  // ---------------------------------------------------------------------------

  commands.register("inventory:toggle", () => {
    config.inventoryAdapter?.toggle();
  });

  // Track the active dialog key so dialog:dismiss can include it in the event
  let _activeDialogKey: string | undefined;

  commands.register("dialog:trigger", (cmd) => {
    const entry = _ruleRegistry.get(cmd.dialogKey);
    const phrases = entry?.phrases ?? [];
    const text =
      phrases.length > 0
        ? phrases[Math.floor(Math.random() * phrases.length)]!
        : cmd.dialogKey;
    _activeDialogKey = cmd.dialogKey;
    config.dialogAdapter?.show(text, cmd.dialogKey);
    bus.emit("dialog:triggered", {
      type: "dialog:triggered",
      text,
      dialogKey: cmd.dialogKey,
      source: "command",
    });
  });

  commands.register("dialog:dismiss", () => {
    const key = _activeDialogKey;
    _activeDialogKey = undefined;
    config.dialogAdapter?.hide();
    bus.emit("dialog:dismissed", {
      type: "dialog:dismissed",
      dialogKey: key,
    });
  });

  // ---------------------------------------------------------------------------
  // Transition executors (Phase 8)
  // ---------------------------------------------------------------------------

  commands.register("transition:activate", (cmd) => {
    const state = useSceneStore.getState();
    const transition = state.scene.transitions?.find(
      (t) => t.id === cmd.transitionId,
    );
    if (!transition) {
      console.warn(`[runtime] transition:activate — unknown transition: ${cmd.transitionId}`);
      return;
    }
    const fromSceneId = state.sceneId;
    bus.emit("transition:started", {
      type: "transition:started",
      transitionId: cmd.transitionId,
    });
    const sceneConfig = _sceneRegistry.get(transition.targetSceneId);
    if (!sceneConfig) {
      console.warn(`[runtime] transition:activate — target scene not registered: ${transition.targetSceneId}`);
      return;
    }
    useSceneStore.getState().setScene(sceneConfig.id, {
      id: sceneConfig.id,
      label: sceneConfig.label,
      background: sceneConfig.background,
      playerSpawn: sceneConfig.playerSpawn,
      ground: sceneConfig.ground,
      walls: sceneConfig.walls,
      interactions: sceneConfig.interactions,
    });
    bus.emit("transition:completed", {
      type: "transition:completed",
      fromSceneId,
      toSceneId: transition.targetSceneId,
    });
  });

  commands.register("transition:cancel", (cmd) => {
    useSceneStore.getState().setTransitionItemOccupying(cmd.transitionId, undefined);
  });

  // ---------------------------------------------------------------------------
  // Formally deferred executors (v0.2.0)
  // ---------------------------------------------------------------------------

  commands.register("player:stop", (cmd) =>
    console.warn(
      `[runtime] executor deferred to v0.2.0: ${cmd.type} — requires renderer-r3f DI prop for cancelTarget. See docs/phases/phase-5-publish/tasks/02-wire-pending-commands.md#aplazados`,
    ),
  );

  commands.register("inventory:pickup", (cmd) =>
    console.warn(
      `[runtime] executor deferred to v0.2.0: ${cmd.type} — requires UI context (which interaction was clicked). See docs/phases/phase-9-placed-items-agnóstic/README.md#phase-d`,
    ),
  );

  commands.register("inventory:drop", (cmd) =>
    console.warn(
      `[runtime] executor deferred to v0.2.0: ${cmd.type} — requires UI context (drag coordinates, target interaction). See docs/phases/phase-9-placed-items-agnóstic/README.md#phase-d`,
    ),
  );

  const runtime: GameRuntime = {
    getScenes: () => Object.fromEntries(_sceneRegistry),
    getItems: () => Object.fromEntries(_itemRegistry),
    getRules: () => Object.fromEntries(_ruleRegistry),
    executeCommand: (cmd) => commands.execute(cmd),
    on: <T extends GameEventType>(type: T, handler: GameEventHandler<T>) =>
      bus.on(type, handler as (data: unknown) => void),
    emit: (event: GameEvent) => bus.emit(event.type, event),
    dispose: () => {
      bus.clear();
      commands.clear();
      setSceneStoreEmitter(null);
      if (_runtimeHandle === runtime) _runtimeHandle = null;
    },
  };

  _runtimeHandle = runtime;
  return runtime;
}

/**
 * Devuelve el handle del runtime activo (creado por `createGameRuntime`).
 * Retorna `null` si no se ha inicializado o tras llamar a `dispose()`.
 *
 * Útil para acceder al runtime desde componentes o callbacks que no
 * tienen acceso directo al handle (ej. GameTouchCanvas).
 */
export function getGameRuntime(): GameRuntime | null {
  return _runtimeHandle;
}

/** Lee snapshot del estado público del runtime sin usar hooks React. */
export function getGameState(): GameState {
  return toGameState(useSceneStore.getState());
}

/** Lee acciones públicas del runtime sin usar hooks React. */
export function getGameActions(): GameActions {
  const state = useSceneStore.getState();
  return {
    setScene: (id: string) => {
      const sceneConfig = _sceneRegistry.get(id);
      if (!sceneConfig) {
        console.warn(`Scene not registered: ${id}`);
        return;
      }
      state.setScene(id, {
        id: sceneConfig.id,
        label: sceneConfig.label,
        background: sceneConfig.background,
        playerSpawn: sceneConfig.playerSpawn,
        ground: sceneConfig.ground,
        walls: sceneConfig.walls,
        interactions: sceneConfig.interactions,
      });
    },
    setPlayerPosition: state.setPlayerPosition,
    requestRespawn: state.requestRespawn,
  };
}

/** Hook para seleccionar estado de juego desde la API pública. */
export function useGameState<T>(selector: (state: GameState) => T): T {
  return useSceneStore((state) => selector(toGameState(state)));
}

/** Hook para obtener acciones públicas con referencia estable. */
export function useGameActions(): GameActions {
  return useSceneStore(
    useShallow((state) => ({
      setScene: (id: string) => {
        const sceneConfig = _sceneRegistry.get(id);
        if (!sceneConfig) {
          console.warn(`Scene not registered: ${id}`);
          return;
        }
        state.setScene(id, {
          id: sceneConfig.id,
          label: sceneConfig.label,
          background: sceneConfig.background,
          playerSpawn: sceneConfig.playerSpawn,
          ground: sceneConfig.ground,
          walls: sceneConfig.walls,
          interactions: sceneConfig.interactions,
        });
      },
      setPlayerPosition: state.setPlayerPosition,
      requestRespawn: state.requestRespawn,
    })),
  );
}

/** Integración pública de viewport/canvas para consumir el runtime. */
export function GameViewport({ debug, onRuntimeEvent }: GameViewportProps) {
  return createElement(GameCanvasCore as ComponentType<GameViewportProps>, {
    debug,
    onRuntimeEvent,
  });
}
