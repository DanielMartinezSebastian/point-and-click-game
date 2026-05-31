import type { CommandHandler } from "../commands/CommandHandler";
import type { GameEvent } from "../events/types";
type EmitFn = (event: GameEvent) => void;
/**
 * Register i18n command executors against a {@link CommandHandler}. Returns
 * an unsubscribe that removes every executor installed by this call.
 *
 * `emit` is invoked when a dictionary changes; the locale change event is
 * emitted by the store itself (see `setI18nStoreEmitter`).
 */
export declare function registerI18nExecutors(commands: CommandHandler, emit?: EmitFn): () => void;
export {};
//# sourceMappingURL=executors.d.ts.map