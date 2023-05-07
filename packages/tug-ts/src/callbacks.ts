import { Tug } from "./core";
import { TugReads, TugReturns } from "./infer";
import { Dependency } from "./types";

type CallbackProvider<
    RS extends Record<string, (...args: any) => Tug<any, any>>
> = RS & {
    provide: <PROVIDING, PROVIDED_ARG extends PROVIDING>(
        tag: Dependency<PROVIDING>,
        it: PROVIDED_ARG
    ) => CallbackProvider<{
        [KEY in keyof RS]: (
            ...args: Parameters<RS[KEY]>
        ) => Tug<
            Exclude<TugReads<ReturnType<RS[KEY]>>, PROVIDING>,
            TugReturns<ReturnType<RS[KEY]>>
        >;
    }>;
};

export const callbacks = <
    R extends Record<string, (...args: any) => Tug<any, any>>
>(
    cbs: R
): CallbackProvider<R> => ({
    ...cbs,
    provide: (tag, val) => {
        const ret: any = {};
        for (const key in val) {
            ret[key] = (...args: any[]) => cbs[key](...args).provide(tag, val);
        }
        return callbacks(ret);
    },
});
