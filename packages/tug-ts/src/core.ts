interface CompileError<_ErrorMessageT extends any[]> {
    /**
     * There should never be a value of this type
     */
    readonly __compileError: never;
}

interface CompileErrorI<
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

type TugUncaughtException = unknown;
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

const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

const chainRpe =
    <S, R, A, B>(
        rpe: TugRPE<S, A>,
        f: (a: A, deps: R) => TugRPE<S, B>
    ): TugRPE<S, B> =>
    async (deps: R, state: S) =>
        rpe(deps, state).then(async (e) => {
            if (e._tag === "Right") {
                const res = await f(e.right[1], deps)(deps, e.right[0]);
                return res;
            } else {
                return e;
            }
        });

const TugRpe =
    <R, A>(cb: StatefulTugCallback<any, R, A>): TugRPE<any, A> =>
    async (dependencies: R, state: any) => {
        let newState = state;
        const context = {
            deps: dependencies,
            use: <T>(it: { rpe: TugRPE<any, any> }): Promise<T> =>
                it
                    .rpe(dependencies, newState)
                    .then(unwrapEither)
                    .then((it) => {
                        newState = it[0];
                        return it[1];
                    }),
            readState: () => newState,
            setState: (it: any) => {
                newState = it;
            },
            modifyState: (f: (it: any) => any) => {
                newState = f(newState);
            },
        };

        try {
            const right = await cb(context as any);
            return {
                right: [newState, right],
                _tag: "Right",
            };
        } catch (left) {
            return {
                _tag: "Left",
                left: left,
            };
        }
    };

/**
 * The `tug` instance.
 */
export class StatefulTug<in out S, out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    private constructor(rpe: TugRPE<S, A>) {
        this.rpe = rpe;
    }

    public get exec(): StatefulTugExecutor<S, R, A> {
        return new StatefulTugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): StatefulTug<S, Exclude<R, R2>, A> {
        return new StatefulTug((deps, state) =>
            this.rpe(
                {
                    ...deps,
                    ...it,
                },
                state
            )
        );
    }

    public provideState<S2 extends S>(
        providedState: S2
    ): StatefulTug<void, R, A> {
        return new StatefulTug((deps, originalState) =>
            this.rpe(deps, providedState).then((either) => {
                if (either._tag === "Right") {
                    return {
                        _tag: "Right",
                        right: [originalState, either.right[1]],
                    };
                }
                return either;
            })
        );
    }

    public depends: <R2>(it: Dependency<R2>) => StatefulTug<S, R2 | R, A> = (
        _it
    ) => {
        return this as any;
    };

    public try<B>(
        f: (a: A, ctx: StatefulTryContext<S, R>) => B | Promise<B>
    ): StatefulTug<S, R, B> {
        return this.chain((a) => StatefulTug.try((ctx) => f(a, ctx)));
    }

    public catch<B>(
        f: (
            e: TugUncaughtException,
            ctx: StatefulTryContext<S, R>
        ) => B | Promise<B>
    ): StatefulTug<S, R, B | A> {
        return this.fold(
            (e) => StatefulTug.try((ctx) => f(e, ctx)),
            (it) => StatefulTug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (
            a: A,
            ctx: { deps: UnionToIntersection<R3> }
        ) => StatefulTug<S, R2, B>
    ): StatefulTug<S, R2 | R, B> {
        return new StatefulTug(
            chainRpe(this.rpe, (a, deps) => f(a, { deps } as any).rpe as any)
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (
            a: A,
            ctx: { deps: UnionToIntersection<R3> }
        ) => StatefulTug<S, R2, B>
    ): StatefulTug<S, R2 | R, A> {
        return new StatefulTug(
            chainRpe(this.rpe, (a, deps) =>
                chainRpe(
                    f(a, { deps } as any).rpe,
                    () => StatefulTug.right(a).rpe
                )
            )
        );
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => StatefulTug<S, R, B>,
        onRight: (a: A) => StatefulTug<S, R, B>
    ): StatefulTug<S, R, B> {
        return new StatefulTug((deps, state) =>
            this.rpe(deps, state).then((either) => {
                if (either._tag === "Right") {
                    return onRight(either.right[1]).rpe(deps, either.right[0]);
                } else {
                    return onLeft(either.left as any).rpe(deps, state);
                }
            })
        );
    }

    public bind<N extends string, R2, B, A2 extends A>(
        name: Exclude<N, keyof A2>,
        f: (a: A2) => StatefulTug<S, R2, B>
    ): StatefulTug<
        S,
        R2 | R,
        {
            [K in keyof A2 | N]: K extends keyof A2 ? A2[K] : B;
        }
    > {
        return this.chain((a) =>
            f(a as any).try((res) => ({ ...a, [name]: res } as any))
        ) as any;
    }

    public addProp = this.bind;

    //// CREATION

    static try = <S, R, A>(
        cb: StatefulTugCallback<S, R, A>
    ): StatefulTug<S, R, A> => new StatefulTug(TugRpe(cb));

    static left = <S, R, E, A>(e: E): StatefulTug<S, R, A> =>
        new StatefulTug(async () => ({
            _tag: "Left",
            left: e as any,
        }));

    static right = <S, R, A>(a: A): StatefulTug<S, R, A> =>
        new StatefulTug(async (_deps, state) => ({
            _tag: "Right",
            right: [state, a],
        }));
    /// END CREATION
}

export class StatefulTugExecutor<in out S, out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    constructor(rpe: TugRPE<S, A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? (state: S) => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) =>
        this.rpe({} as any, state)
            .then((it) => unwrapEither(it))
            .then((it) => it[1])) as any;

    public either: [R] extends [never]
        ? (state: S) => Promise<Either<TugUncaughtException, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) => {
        return this.rpe({} as any, state).then((either) => {
            if (either._tag === "Right") {
                return {
                    _tag: "Right",
                    right: either.right[1],
                };
            } else {
                return either;
            }
        });
    }) as any;

    public safe: [R] extends [never]
        ? <A2 extends A>(
              onError: (e: TugUncaughtException) => A2,
              state: S
          ) => Promise<A2 | A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        onError: any,
        state: any
    ) =>
        (this.either as any)(state).then((e: Either<any, any>) => {
            if (e._tag === "Right") {
                return e.right;
            } else {
                return onError(e.left);
            }
        })) as any;
}

export class StatefulTugBuilderC<in out S, out R0> {
    public try = <A>(
        cb: StatefulTugCallback<S, R0, A>
    ): StatefulTug<S, R0, A> => StatefulTug.try(cb);

    public right = <A, R2 = never>(it: A): StatefulTug<S, R2 | R0, A> =>
        StatefulTug.right(it);
    public of = this.right;

    public left = <A, R2 = never>(
        it: TugUncaughtException
    ): StatefulTug<S, R2 | R0, A> => StatefulTug.left(it);

    public depends = <R>(_it: Dependency<R>): StatefulTugBuilderC<S, R | R0> =>
        this as any;

    public stateful = <S2>(): StatefulTugBuilderC<S2, R0> => this as any;

    public static newBuilder(): StatefulTugBuilderC<void, never> {
        return new StatefulTugBuilderC();
    }
}

export class Tug<out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    private constructor(rpe: TugRPE<void, A>) {
        this.rpe = rpe;
    }

    public get exec(): TugExecutor<R, A> {
        return new TugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<Exclude<R, R2>, A> {
        return new Tug((deps, state) =>
            this.rpe(
                {
                    ...deps,
                    ...it,
                },
                state
            )
        );
    }

    public depends: <R2>(it: Dependency<R2>) => Tug<R2 | R, A> = (_it) => {
        return this as any;
    };

    public try<B>(f: (a: A, ctx: TryContext<R>) => B | Promise<B>): Tug<R, B> {
        return this.chain((a) => Tug.try((ctx) => f(a, ctx)));
    }

    public catch<B>(
        f: (e: TugUncaughtException, ctx: TryContext<R>) => B | Promise<B>
    ): Tug<R, B | A> {
        return this.fold(
            (e) => Tug.try((ctx) => f(e, ctx)),
            (it) => Tug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<R2, B>
    ): Tug<R2 | R, B> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) => f(a, { deps } as any).rpe as any)
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<R2, B>
    ): Tug<R2 | R, A> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) =>
                chainRpe(f(a, { deps } as any).rpe, () => Tug.right(a).rpe)
            )
        );
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => Tug<R, B>,
        onRight: (a: A) => Tug<R, B>
    ): Tug<R, B> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then((either) => {
                if (either._tag === "Right") {
                    return onRight(either.right[1]).rpe(deps, either.right[0]);
                } else {
                    return onLeft(either.left as any).rpe(deps, state);
                }
            })
        );
    }

    public bind<N extends string, R2, B, A2 extends A>(
        name: Exclude<N, keyof A2>,
        f: (a: A2) => Tug<R2, B>
    ): Tug<
        R2 | R,
        {
            [K in keyof A2 | N]: K extends keyof A2 ? A2[K] : B;
        }
    > {
        return this.chain((a) =>
            f(a as any).try((res) => ({ ...a, [name]: res } as any))
        ) as any;
    }

    public addProp = this.bind;

    static try = <R, A>(cb: TugCallback<R, A>): Tug<R, A> =>
        new Tug(TugRpe(cb as any));

    static left = <R, E, A>(e: E): Tug<R, A> =>
        new Tug(async () => ({
            _tag: "Left",
            left: e as any,
        }));

    static right = <R, A>(a: A): Tug<R, A> =>
        new Tug(async (_deps, state) => ({
            _tag: "Right",
            right: [state, a],
        }));
}

export class TugExecutor<out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    constructor(rpe: TugRPE<void, A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? () => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() =>
        this.rpe({} as any, void 0)
            .then((it) => unwrapEither(it))
            .then((it) => it[1])) as any;

    public either: [R] extends [never]
        ? () => Promise<Either<TugUncaughtException, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() => {
        return this.rpe({} as any, void 0).then((either) => {
            if (either._tag === "Right") {
                return {
                    _tag: "Right",
                    right: either.right[1],
                };
            } else {
                return either;
            }
        });
    }) as any;

    public safe: [R] extends [never]
        ? <A2 extends A>(
              onError: (e: TugUncaughtException) => A2
          ) => Promise<A2 | A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        onError: any
    ) =>
        (this.either as any)(void 0).then((e: Either<any, any>) => {
            if (e._tag === "Right") {
                return e.right;
            } else {
                return onError(e.left);
            }
        })) as any;
}

export class TugBuilderC<out R0> {
    public try = <A>(cb: TugCallback<R0, A>): Tug<R0, A> => Tug.try(cb);

    public right = <A, R2 = never>(it: A): Tug<R2 | R0, A> => Tug.right(it);
    public of = this.right;

    public left = <A, R2 = never>(it: TugUncaughtException): Tug<R2 | R0, A> =>
        Tug.left(it);

    public depends = <R>(_it: Dependency<R>): TugBuilderC<R | R0> =>
        this as any;

    public stateful = <S2>(): StatefulTugBuilderC<S2, R0> =>
        new StatefulTugBuilderC();

    public static newBuilder(): TugBuilderC<never> {
        return new TugBuilderC();
    }
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilderC<never> = TugBuilderC.newBuilder();

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

/**
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
 * If the callback returns a value or promise of a value, the `tug` value will be of that value.
 */
export type StatefulTugCallback<S, R, A> = (
    ctx: StatefulTryContext<S, R>
) => Promise<A> | A;

export type TugCallback<R, A> = (ctx: TryContext<R>) => Promise<A> | A;

type UsedTug<R2, S2, T> = [R2] extends [never]
    ? StatefulTug<S2, R2, T>
    : [R2] extends [R2]
    ? StatefulTug<S2, R2, T>
    : CompileError<
          [
              "not a tug, or child-tug uses dependency that was not annotated in parent-tug"
          ]
      >;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
    x: infer R
) => any
    ? R
    : never;

/**
 * Adds the `use` function to the context.
 */
export type StatefulTryContext<in out S, out R> = {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2 extends R, S2, T>(
        it: S2 extends void
            ? UsedTug<R2, S2, T>
            : S2 extends S
            ? UsedTug<R2, S2, T>
            : CompileError<["invalid state"]>
    ) => Promise<T>;
    deps: UnionToIntersection<R>;
    readState: S extends void ? CompileError<["not stateful"]> : () => S;
    setState: S extends void ? CompileError<["not stateful"]> : (it: S) => void;
    modifyState: S extends void
        ? CompileError<["not stateful"]>
        : (cb: (old: S) => S) => void;
};

/**
 * Adds the `use` function to the context.
 */
export type TryContext<out R> = {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2 extends R, T>(
        it: [R2] extends [never]
            ? Tug<R2, T>
            : [R2] extends [R2]
            ? Tug<R2, T>
            : CompileError<
                  [
                      "not a tug, or child-tug uses dependency that was not annotated in parent-tug"
                  ]
              >
    ) => Promise<T>;
    deps: UnionToIntersection<R>;
};

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
