import { Tug, TugBuilderC } from "./core";
import { StatefulTug, StatefulTugBuilderC } from "./stateful";

export type StatefulTugState<T extends StatefulTug<any, any, any>> =
    T extends StatefulTug<infer S, any, any> ? S : never;

export type StatefulTugReads<T extends StatefulTug<any, any, any>> =
    T extends StatefulTug<any, infer R, any> ? R : never;

export type StatefulTugReturns<T extends StatefulTug<any, any, any>> =
    T extends StatefulTug<any, any, infer A> ? A : never;

export type TugReads<T extends Tug<any, any>> = T extends Tug<infer R, any>
    ? R
    : never;

export type TugReturns<T extends Tug<any, any>> = T extends Tug<any, infer A>
    ? A
    : never;

export type StatefulTugBuiltBy<
    T extends StatefulTugBuilderC<any, any>,
    A
> = T extends StatefulTugBuilderC<infer S, infer D>
    ? StatefulTug<S, D, A>
    : never;

export type TugBuiltBy<T extends TugBuilderC<any>, A> = T extends TugBuilderC<
    infer D
>
    ? Tug<D, A>
    : never;
