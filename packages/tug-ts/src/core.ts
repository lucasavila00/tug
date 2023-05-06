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

export type TugBuiltBy<
    T extends TugBuilderC<any, any>,
    A
> = T extends TugBuilderC<infer S, infer D> ? Tug<S, D, A> : never;

/**
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
 * If the callback returns a value or promise of a value, the `tug` value will be of that value.
 */
export type TugCallback<S, R, A> = (ctx: TryContext<S, R>) => Promise<A> | A;

type UsedTug<R2, S2, T> = [R2] extends [never]
    ? Tug<S2, R2, T>
    : [R2] extends [R2]
    ? Tug<S2, R2, T>
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
export type TryContext<in out S, out R> = {
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

/**
 * The `tug` instance.
 */
export class Tug<in out S, out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    private constructor(rpe: TugRPE<S, A>) {
        this.rpe = rpe;
    }

    public get exec(): TugExecutor<S, R, A> {
        return new TugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<S, Exclude<R, R2>, A> {
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

    public provideState<S2 extends S>(providedState: S2): Tug<void, R, A> {
        return new Tug((deps, originalState) =>
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

    public depends: <R2>(it: Dependency<R2>) => Tug<S, R2 | R, A> = (_it) => {
        return this as any;
    };

    public try<B>(
        f: (a: A, ctx: TryContext<S, R>) => B | Promise<B>
    ): Tug<S, R, B> {
        return this.chain((a) => Tug.try((ctx) => f(a, ctx)));
    }

    public catch<B>(
        f: (e: TugUncaughtException, ctx: TryContext<S, R>) => B | Promise<B>
    ): Tug<S, R, B | A> {
        return this.fold(
            (e) => Tug.try((ctx) => f(e, ctx)),
            (it) => Tug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<S, R2, B>
    ): Tug<S, R2 | R, B> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) => f(a, { deps } as any).rpe as any)
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<S, R2, B>
    ): Tug<S, R2 | R, A> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) =>
                chainRpe(f(a, { deps } as any).rpe, () => Tug.right(a).rpe)
            )
        );
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => Tug<S, R, B>,
        onRight: (a: A) => Tug<S, R, B>
    ): Tug<S, R, B> {
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
        f: (a: A2) => Tug<S, R2, B>
    ): Tug<
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

    private static TugRpe =
        <S, R, A>(cb: TugCallback<S, R, A>): TugRPE<S, A> =>
        async (dependencies: R, state: S) => {
            let newState = state;
            const context = {
                deps: dependencies,
                use: <T>(it: Tug<any, any, T>): Promise<T> =>
                    it
                        .rpe(dependencies, newState)
                        .then(unwrapEither)
                        .then((it) => {
                            newState = it[0];
                            return it[1];
                        }),
                readState: () => newState,
                setState: (it: S) => {
                    newState = it;
                },
                modifyState: (f: (it: S) => S) => {
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

    static try = <S, R, A>(cb: TugCallback<S, R, A>): Tug<S, R, A> =>
        new Tug(Tug.TugRpe(cb));

    static left = <S, R, E, A>(e: E): Tug<S, R, A> =>
        new Tug(async () => ({
            _tag: "Left",
            left: e as any,
        }));

    static right = <S, R, A>(a: A): Tug<S, R, A> =>
        new Tug(async (_deps, state) => ({
            _tag: "Right",
            right: [state, a],
        }));
    /// END CREATION
}
export type tugState<T extends Tug<any, any, any>> = T extends Tug<
    infer S,
    any,
    any
>
    ? S
    : never;

export type tugReads<T extends Tug<any, any, any>> = T extends Tug<
    any,
    infer R,
    any
>
    ? R
    : never;

export type tugReturns<T extends Tug<any, any, any>> = T extends Tug<
    any,
    any,
    infer A
>
    ? A
    : never;

export class TugExecutor<in out S, out R, out A> {
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
export class TugBuilderC<in out S, out R0> {
    public try = <A>(cb: TugCallback<S, R0, A>): Tug<S, R0, A> => Tug.try(cb);

    public right = <A, R2 = never>(it: A): Tug<S, R2 | R0, A> => Tug.right(it);
    public of = this.right;

    public left = <A, R2 = never>(
        it: TugUncaughtException
    ): Tug<S, R2 | R0, A> => Tug.left(it);

    public depends = <R>(_it: Dependency<R>): TugBuilderC<S, R | R0> =>
        this as any;

    public stateful = <S2>(): TugBuilderC<S2, R0> => this as any;

    public static newBuilder(): TugBuilderC<void, never> {
        return new TugBuilderC();
    }
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilderC<void, never> = TugBuilderC.newBuilder();
