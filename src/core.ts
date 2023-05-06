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
export type TugSRPE<S, R, E, A> = (
    r: R,
    s: S
) => Promise<[Array<CheckOfKnownError>, Either<E, [S, A]>]>;

export class TugUncaughtException {
    public content: any;

    constructor(content: any) {
        this.content = content;
    }
}

export type Dependency<R> = {
    read: R;
};
export const Dependency = <R>(): Dependency<R> => null as any;

export type TubBuiltBy<
    T extends TugBuilder<any, any, any>,
    A
> = T extends TugBuilder<infer S, infer D, infer E> ? Tug<S, D, E, A> : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never;

type UsedTug<R, E, R2, S2, T> = [R2] extends [never]
    ? Tug<S2, R2, E, T>
    : [R2] extends [R]
    ? Tug<S2, R2, E, T>
    : CompileError<
          [
              "not a tug, or child-tug uses dependency that was not annotated in parent-tug"
          ]
      >;

/**
 * Adds the `use` function to the context.
 */
export type CreateContext<S, R, E> = UnionToIntersection<R> & {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2, S2, T>(
        it: S2 extends void
            ? UsedTug<R, E, R2, S2, T>
            : S2 extends S
            ? UsedTug<R, E, R2, S2, T>
            : CompileError<["invalid state"]>
    ) => Promise<T>;

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
    ctx: CreateContext<S, R, E>
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
        rpe: TugSRPE<S, R, E, A>,
        f: (a: A, checks: CheckOfKnownError[]) => TugSRPE<S, R, E, B>
    ): TugSRPE<S, R, E, B> =>
    async (deps: R, state: S) =>
        rpe(deps, state).then(async ([checks, e]) => {
            if (e._tag === "Right") {
                const res = await f(e.right[1], checks)(deps, e.right[0]);
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

/**
 * The `tug` instance.
 */
export class Tug<S, R, E, A> {
    private readonly rpe: TugSRPE<S, R, E, A>;
    private constructor(rpe: TugSRPE<S, R, E, A>) {
        this.rpe = rpe;
    }

    //// DI
    public execOrThrow: [R] extends [never]
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

    public exec: [R] extends [never]
        ? [E] extends [never]
            ? (state: S) => Promise<A>
            : CompileErrorI<["error"], E, ["can be thrown"]>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = this
        .execOrThrow as any;

    public execEither: [R] extends [never]
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

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<S, Exclude<R, R2>, E, A> {
        return new Tug((deps, state) => this.rpe({ ...deps, ...it }, state));
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

    public depends: <R2>(
        it: Dependency<R2>
    ) => [Exclude<R2, R>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : Tug<S, R2 | R, E, A> = (_it) => {
        return this as any;
    };

    /// END DI

    //// COMPOSITION
    public thenn<B>(
        f: (a: A, ctx: CreateContext<S, R, E>) => B | Promise<B>
    ): Tug<S, R, E, B> {
        return new Tug(
            chainRpe(this.rpe, (a, checks) =>
                Tug.TugRpe<S, R, E, B>((ctx) => f(a, ctx), checks)
            )
        );
    }

    public flatMap<B, R2, E2, S2>(
        f: (a: A) => Tug<S2, R2, E2, B>
    ): S2 extends void
        ? Tug<S, R2 | R, E | E2, B>
        : S2 extends S
        ? Tug<S, R2 | R, E | E2, B>
        : CompileError<["state type mismatch"]> {
        return new Tug(chainRpe(this.rpe, (a) => f(a).rpe as any)) as any;
    }

    public chain = this.flatMap;

    public or<A>(f: (e: E) => A): Tug<S, R, never, A> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then(([checks, either]) => {
                if (either._tag === "Right") {
                    return [checks, either] as any;
                } else {
                    return [
                        checks,
                        {
                            _tag: "Right",
                            right: [state, f(either.left)],
                        },
                    ];
                }
            })
        );
    }

    public mapLeft<E2>(f: (e: E) => E2): Tug<S, R, E2, A> {
        return new Tug((deps, state) =>
            this.rpe(deps, state).then(([checks, either]) => {
                if (either._tag === "Right") {
                    return [checks, either] as any;
                } else {
                    return [
                        checks,
                        {
                            _tag: "Left",
                            right: f(either.left),
                        },
                    ];
                }
            })
        );
    }

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
                    return onLeft(either.left)
                        .rpe(deps, state)
                        .then((it) => [mergeChecks(checks, it[0]), it[1]]);
                }
            })
        );
    }

    /// END COMPOSITION

    //// CREATION

    private static TugRpe =
        <S, R, E, A>(
            cb: TugCallback<S, R, E, A>,
            checksOfKnownErrors: CheckOfKnownError[]
        ): TugSRPE<S, R, E, A> =>
        async (dependencies: R, state: S) => {
            let newState = state;
            let checks = [...checksOfKnownErrors];
            const context = {
                ...dependencies,
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

export interface TugBuilder<S, R0, E> {
    /**
     * Constructs a new `tug` instance. The callback is executed when the `tug` is executed.
     *
     * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
     * If the callback returns a value or promise of a value, the `tug` value will be of that value.
     *
     * The callback is passed a context object, which contains the dependencies of the `tug`, and the `use` function.
     */
    <A>(cb: TugCallback<S, R0, E, A>): Tug<S, R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    of: <A, R2 = never>(it: A) => Tug<S, R2 | R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    right: <A>(it: A) => Tug<S, R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the error.
     */
    left: <E2 extends E, A>(it: E2) => Tug<S, R0, E | E2, A>;

    depends: <R>(
        it: Dependency<R>
    ) => [Exclude<R, R0>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : TugBuilder<S, R | R0, E>;

    throws: <E2>(cb: (it: any) => it is E2) => TugBuilder<S, R0, E | E2>;

    stateful: <S2>() => TugBuilder<S2, R0, E>;
}
const buildTugBuilder = (
    checksOfKnownErrors: CheckOfKnownError[]
): TugBuilder<any, any, any> =>
    new Proxy((cb: any) => Tug.newTug(cb, checksOfKnownErrors), {
        get: (_target, prop, _receiver) => {
            if (prop == "of" || prop == "right") {
                return <T>(it: T) => Tug.newTug(() => it, checksOfKnownErrors);
            }
            if (prop == "left") {
                return <T>(it: T) => Tug.left(it, checksOfKnownErrors);
            }
            if (prop === "depends") {
                return () => buildTugBuilder(checksOfKnownErrors);
            }
            if (prop === "stateful") {
                return () => buildTugBuilder(checksOfKnownErrors);
            }
            if (prop === "throws") {
                return (cb: any) =>
                    buildTugBuilder([...checksOfKnownErrors, cb]);
            }
            throw new Error(
                'TugBuilder does not have a property named "' +
                    String(prop) +
                    '"'
            );
        },
    }) as any;

const tugExceptionCheck = (it: any) => it instanceof TugUncaughtException;
/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilder<void, never, TugUncaughtException> =
    buildTugBuilder([tugExceptionCheck]) as any;
