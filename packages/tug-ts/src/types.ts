export interface CompileError<_ErrorMessageT extends any[]> {
    /**
     * There should never be a value of this type
     */
    readonly __compileError: never;
}

export interface CompileErrorI<
    _ErrorMessageT extends any[],
    _R,
    _ErrorMessageT2 extends any[]
> {
    /**
     * There should never be a value of this type
     */
    readonly __compileError: never;
}
/**
 * Left side of the `Either` type.
 */
export interface Left<E> {
    readonly _tag: "Left";
    readonly left: E;
}

/**
 * Right side of the `Either` type.
 */
export interface Right<A> {
    readonly _tag: "Right";
    readonly right: A;
}

/**
 * Either type. Represents a value that can be either `Left` or `Right`.
 */
export type Either<E, A> = Left<E> | Right<A>;

export type TugUncaughtException = unknown;

/**
 * A reader function that reads R, and returns a Promise of Either<unknown, A>.
 * This is the core type of this library.
 */
export type TugRPE<in out S, out A> = (
    r: any,
    s: S
) => Promise<Either<TugUncaughtException, [S, A]>>;

export type Dependency<R> = {
    read: () => R;
};
export const Dependency = <R>(): Dependency<R> => void 0 as any;

export type UnionToIntersection<T> = (
    T extends any ? (x: T) => any : never
) extends (x: infer R) => any
    ? R
    : never;
