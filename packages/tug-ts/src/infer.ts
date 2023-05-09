import { Tug, TugBuilderC } from "./core";

export type TugReads<T extends Tug<any, any>> = T extends Tug<infer R, any>
    ? R
    : never;

export type TugReturns<T extends Tug<any, any>> = T extends Tug<any, infer A>
    ? A
    : never;

export type TugBuiltBy<T extends TugBuilderC<any>, A> = T extends TugBuilderC<
    infer D
>
    ? Tug<D, A>
    : never;
