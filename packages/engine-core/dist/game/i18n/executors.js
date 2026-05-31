import { getI18nStore } from "../state/i18nStore";
import { getDictionary, registerDictionary } from "./registry";
/**
 * Register i18n command executors against a {@link CommandHandler}. Returns
 * an unsubscribe that removes every executor installed by this call.
 *
 * `emit` is invoked when a dictionary changes; the locale change event is
 * emitted by the store itself (see `setI18nStoreEmitter`).
 */
export function registerI18nExecutors(commands, emit) {
    const unsubscribeFns = [];
    unsubscribeFns.push(commands.register("i18n:setLocale", (cmd) => {
        getI18nStore().setLocale(cmd.locale);
    }));
    unsubscribeFns.push(commands.register("i18n:registerDictionary", (cmd) => {
        const before = Object.keys(getDictionary(cmd.locale) ?? {}).length;
        registerDictionary(cmd.locale, cmd.dict);
        const after = Object.keys(getDictionary(cmd.locale) ?? {}).length;
        emit?.({
            type: "i18n:dictionaryUpdated",
            locale: cmd.locale,
            keysAdded: after - before,
        });
    }));
    return () => {
        for (const fn of unsubscribeFns)
            fn();
    };
}
//# sourceMappingURL=executors.js.map