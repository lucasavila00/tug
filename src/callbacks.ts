import { Dependency, tug, tugReads, tugReturns } from "./core";

type CallbackProvider<
    RS extends Record<string, (...args: any) => tug<any, any>>
> = RS & {
    provide: <PROVIDING, PROVIDED_OBJECT extends PROVIDING>(
        tag: Dependency<PROVIDING>,
        it: PROVIDED_OBJECT
    ) => CallbackProvider<{
        [KEY in keyof RS]: (
            ...args: Parameters<RS[KEY]>
        ) => tug<
            Exclude<tugReads<ReturnType<RS[KEY]>>, PROVIDING>,
            tugReturns<ReturnType<RS[KEY]>>
        >;
    }>;
};

export const callbacks = <
    R extends Record<string, (...args: any) => tug<any, any>>
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
