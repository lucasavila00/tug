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

type CheckOfKnownError = (it: any) => boolean;

/**
 * A reader function that reads R, and returns a Promise of Either<unknown, A>.
 * This is the core type of this library.
 */
export type TugRPE<in out S, _R, out E, out A> = (
    r: any,
    s: S
) => Promise<[Array<CheckOfKnownError>, Either<E, [S, A]>]>;

export class TugUncaughtException {
    public readonly content: any;

    constructor(content: any) {
        this.content = content;
    }
}

export const isTugUncaughtException = (it: any): it is TugUncaughtException =>
    it instanceof TugUncaughtException;

export type Dependency<R> = {
    read: () => R;
};
export const Dependency = <R>(): Dependency<R> => void 0 as any;

export type TugBuiltBy<
    T extends TugBuilderC<any, any, any>,
    A
> = T extends TugBuilderC<infer S, infer D, infer E> ? Tug<S, D, E, A> : never;

type UsedTug<E, R2, S2, T> = [R2] extends [never]
    ? Tug<S2, R2, E, T>
    : [R2] extends [R2]
    ? Tug<S2, R2, E, T>
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
export type TryContext<in out S, out R, out E> = {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2 extends R, E2 extends E, S2, T>(
        it: S2 extends void
            ? UsedTug<E2, R2, S2, T>
            : S2 extends S
            ? UsedTug<E2, R2, S2, T>
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
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
 * If the callback returns a value or promise of a value, the `tug` value will be of that value.
 */
export type TugCallback<S, R, E, A> = (
    ctx: TryContext<S, R, E>
) => Promise<A> | A;

const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

const mergeChecks = (
    checks: Array<CheckOfKnownError>,
    checks2: Array<CheckOfKnownError>
): Array<CheckOfKnownError> => {
    return [...checks, ...checks2].filter((value, index, array) => {
        return array.indexOf(value) === index;
    });
};

const chainRpe =
    <S, R, E, A, B>(
        rpe: TugRPE<S, R, E, A>,
        f: (a: A, checks: CheckOfKnownError[], deps: R) => TugRPE<S, R, E, B>
    ): TugRPE<S, R, E, B> =>
    async (deps: R, state: S) =>
        rpe(deps, state).then(async ([checks, e]) => {
            if (e._tag === "Right") {
                const res = await f(e.right[1], checks, deps)(deps, e.right[0]);
                return [mergeChecks(checks, res[0]), res[1]];
            } else {
                return [checks, e];
            }
        });

export type tugLefts<T extends Tug<any, any, any, any>> = T extends Tug<
    any,
    any,
    infer E,
    any
>
    ? E
    : never;

export type tugState<T extends Tug<any, any, any, any>> = T extends Tug<
    infer S,
    any,
    any,
    any
>
    ? S
    : never;

export type tugReads<T extends Tug<any, any, any, any>> = T extends Tug<
    any,
    infer R,
    any,
    any
>
    ? R
    : never;

export type tugReturns<T extends Tug<any, any, any, any>> = T extends Tug<
    any,
    any,
    any,
    infer A
>
    ? A
    : never;

export class TugExecutor<in out S, out R, out E, out A> {
    private readonly rpe: TugRPE<any, any, any, any>;
    constructor(rpe: TugRPE<S, R, E, A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? (state: S) => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) =>
        this.rpe({} as any, state)
            .then((it) => unwrapEither(it[1]))
            .then((it) => it[1])
            .catch((e) => {
                if (e instanceof TugUncaughtException) {
                    throw e.content;
                }
                throw e;
            })) as any;

    public safe: [R] extends [never]
        ? [E] extends [never]
            ? (state: S) => Promise<A>
            : CompileErrorI<["error"], E, ["can be thrown"]>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = this
        .orThrow as any;

    public either: [R] extends [never]
        ? (state: S) => Promise<Either<E, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) => {
        return this.rpe({} as any, state).then((it) => {
            const e = it[1];
            if (e._tag === "Right") {
                return {
                    _tag: "Right",
                    right: e.right[1],
                };
            } else {
                return e;
            }
        });
    }) as any;
}
/**
 * The `tug` instance.
 */
export class Tug<in out S, out R, out E, out A> {
    private readonly rpe: TugRPE<any, any, any, any>;
    private constructor(rpe: TugRPE<S, R, E, A>) {
        this.rpe = rpe;
    }

    public get exec(): TugExecutor<S, R, E, A> {
        return new TugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<S, Exclude<R, R2>, E, A> {
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

    public provideState<S2 extends S>(providedState: S2): Tug<void, R, E, A> {
        return new Tug((deps, originalState) =>
            this.rpe(deps, providedState).then(([checks, either]) => {
                if (either._tag === "Right") {
                    return [
                        checks,
                        {
                            _tag: "Right",
                            right: [originalState, either.right[1]],
                        },
                    ];
                }
                return [checks, either];
            })
        );
    }

    public depends: <R2>(it: Dependency<R2>) => Tug<S, R2 | R, E, A> = (
        _it
    ) => {
        return this as any;
    };

    public try<B>(
        f: (a: A, ctx: TryContext<S, R, E>) => B | Promise<B>
    ): Tug<S, R, E | TugUncaughtException, B> {
        return new Tug(
            chainRpe(this.rpe, (a, checks) =>
                Tug.TugRpe<S, R, E, B>((ctx) => f(a, ctx as any), checks)
            )
        ) as any;
    }

    public flatMap<B, R2, E2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<S, R2, E2, B>
    ): Tug<S, R2 | R, E2 | E, B> {
        return new Tug(
            chainRpe(
                this.rpe,
                (a, _checks, deps) => f(a, { deps } as any).rpe as any
            )
        ) as any;
    }

    public chain = this.flatMap;

    public or<A>(f: (e: E) => A): Tug<S, R, never, A> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then(([_checks, either]) => {
                if (either._tag === "Right") {
                    return [[], either] as any;
                } else {
                    return [
                        [],
                        {
                            _tag: "Right",
                            right: [state, f(either.left as any)],
                        },
                    ];
                }
            })
        );
    }

    // public catch<E2 extends E>(
    //     _itIs: (e: E) => e is E2,
    //     _cb: (e: E2) => Tug<S, R, Exclude<E, E2>, A>
    // ): Tug<S, R, Exclude<E, E2>, A> {
    //     // new Tug((deps, state) =>
    //     //     this.rpe(deps, state).then(async ([_checks, either]) => {
    //     //         if (either._tag === "Right") {
    //     //             return [[], either] as any;
    //     //         } else {
    //     //             const r = await cb(either.left as any).rpe(deps, state);
    //     //             return [[cb], either];
    //     //         }
    //     //     })
    //     // );
    //     return null as any;
    // }

    public fold<B>(
        onLeft: (e: E) => Tug<S, R, E, B>,
        onRight: (a: A) => Tug<S, R, E, B>
    ): Tug<S, R, E, B> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then(([checks, either]) => {
                if (either._tag === "Right") {
                    return onRight(either.right[1])
                        .rpe(deps, either.right[0])
                        .then((it) => [mergeChecks(checks, it[0]), it[1]]);
                } else {
                    return onLeft(either.left as any)
                        .rpe(deps, state)
                        .then((it) => [mergeChecks(checks, it[0]), it[1]]);
                }
            })
        );
    }

    public bind<N extends string, R2, E2, B>(
        name: Exclude<N, keyof A>,
        f: (a: A) => Tug<S, R2, E2, B>
    ): Tug<
        S,
        R2 | R,
        E2 | E,
        A & {
            [K in N]: B;
        }
    > {
        return this.chain((a) =>
            f(a).try((res) => ({ ...a, [name]: res } as any))
        ) as any;
    }

    public addProp = this.bind;

    public throws<E2>(cb: (it: any) => it is E2): Tug<S, R, E | E2, A> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then(
                ([checks, either]) => [mergeChecks(checks, [cb]), either] as any
            )
        );
    }

    //// CREATION

    private static TugRpe =
        <S, R, E, A>(
            cb: TugCallback<S, R, E, A>,
            checksOfKnownErrors: CheckOfKnownError[]
        ): TugRPE<S, R, E, A> =>
        async (dependencies: R, state: S) => {
            let newState = state;
            let checks = [...checksOfKnownErrors];
            const context = {
                deps: dependencies,
                use: <T>(it: Tug<any, any, E, T>): Promise<T> =>
                    it
                        .rpe(dependencies, newState)
                        .then((it) => {
                            checks = mergeChecks(checks, it[0]);
                            return it[1];
                        })
                        .then(unwrapEither)
                        .then((it) => {
                            newState = it[0];
                            return it[1];
                        }),
                readState: () => newState,
                setState: (it: S) => {
                    newState = it;
                },
            };

            try {
                const right = await cb(context as any);
                return [
                    checks,
                    {
                        right: [newState, right],
                        _tag: "Right",
                    },
                ];
            } catch (left) {
                for (const check of checks) {
                    if (check(left)) {
                        return [checks, { _tag: "Left", left: left as any }];
                    }
                }

                return [
                    checks,
                    {
                        _tag: "Left",
                        left: new TugUncaughtException(left),
                    },
                ];
            }
        };

    static newTug = <S, R, E, A>(
        cb: TugCallback<S, R, E, A>,
        checksOfKnownErrors: CheckOfKnownError[]
    ): Tug<S, R, E, A> => new Tug(Tug.TugRpe(cb, checksOfKnownErrors));

    static left = <S, R, E, A>(
        e: E,
        checksOfKnownErrors: CheckOfKnownError[]
    ): Tug<S, R, E, A> =>
        new Tug(async () => [
            checksOfKnownErrors,
            {
                _tag: "Left",
                left: e,
            },
        ]);
    /// END CREATION
}

export class TugBuilderC<in out S, out R0, out E> {
    private readonly checksOfKnownErrors: CheckOfKnownError[];

    private constructor(checksOfKnownErrors: CheckOfKnownError[]) {
        this.checksOfKnownErrors = checksOfKnownErrors;
    }

    public try = <A>(cb: TugCallback<S, R0, E, A>): Tug<S, R0, E, A> =>
        Tug.newTug(cb, this.checksOfKnownErrors);

    public of = <A, R2 = never>(it: A): Tug<S, R2 | R0, E, A> =>
        Tug.newTug(() => it, this.checksOfKnownErrors);

    public right = <A>(it: A): Tug<S, R0, E, A> =>
        Tug.newTug(() => it, this.checksOfKnownErrors);

    public left = <E2 extends E, A>(it: E2): Tug<S, R0, E | E2, A> =>
        Tug.left(it, this.checksOfKnownErrors);

    public depends = <R>(_it: Dependency<R>): TugBuilderC<S, R | R0, E> =>
        new TugBuilderC(this.checksOfKnownErrors);

    public throws = <E2>(
        cb: (it: any) => it is E2
    ): TugBuilderC<S, R0, E | E2> =>
        new TugBuilderC([...this.checksOfKnownErrors, cb]);

    public stateful = <S2>(): TugBuilderC<S2, R0, E> =>
        new TugBuilderC(this.checksOfKnownErrors);

    public static newBuilder(): TugBuilderC<void, never, TugUncaughtException> {
        return new TugBuilderC([isTugUncaughtException]);
    }
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilderC<void, never, TugUncaughtException> =
    TugBuilderC.newBuilder();
