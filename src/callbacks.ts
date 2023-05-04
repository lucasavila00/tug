import { Dependency, Tug, tugReads, tugReturns } from "./core";

type CallbackProvider<
    RS extends Record<string, (...args: any) => Tug<any, any>>
> = RS & {
    provide: <PROVIDING extends [any, any], PROVIDED_ARG extends PROVIDING[1]>(
        tag: Dependency<PROVIDING>,
        it: PROVIDED_ARG
    ) => CallbackProvider<{
        [KEY in keyof RS]: (
            ...args: Parameters<RS[KEY]>
        ) => Tug<
            Exclude<tugReads<ReturnType<RS[KEY]>>, PROVIDING>,
            tugReturns<ReturnType<RS[KEY]>>
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
