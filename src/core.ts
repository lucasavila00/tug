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

/**
 * A reader function that reads R, and returns a Promise of Either<unknown, A>.
 * This is the core type of this library.
 */
export type TugRpe<R, E, A> = (r: R) => Promise<Either<E, A>>;

class TugTransportException {
    public content: any;

    constructor(content: any) {
        this.content = content;
    }
}

export class TugException {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    __tag: "TugException";

    public content: any;

    constructor(content: any) {
        this.content = content;
    }

    toString() {
        return `TugException(${this.content})`;
    }
}

export type Dependency<R> = {
    read: R;
};
export const Dependency = <R>(): Dependency<R> => null as any;

export type TubBuiltBy<
    T extends TugBuilder<any, any>,
    A
> = T extends TugBuilder<infer D, infer E> ? Tug<D, E, A> : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never;

/**
 * Adds the `use` function to the context.
 */
export type CreateContext<R, E> = UnionToIntersection<R> & {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2, T>(
        it: [R2] extends [never]
            ? Tug<R2, E, T>
            : [R2] extends [R]
            ? Tug<R2, E, T>
            : CompileError<
                  [
                      "child-tug uses dependency that was not annotated in parent-tug"
                  ]
              >
    ) => Promise<T>;
};

/**
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
 * If the callback returns a value or promise of a value, the `tug` value will be of that value.
 */
export type TugCallback<R, E, A> = (ctx: CreateContext<R, E>) => Promise<A> | A;

const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

const chainRpe =
    <R, E, A, B>(
        rpe: TugRpe<R, E, A>,
        f: (a: A) => TugRpe<R, E, B>
    ): TugRpe<R, E, B> =>
    async (deps: R) =>
        rpe(deps).then((e) => {
            if (e._tag === "Right") {
                return f(e.right)(deps);
            } else {
                return e;
            }
        });

export type tugReads<T extends Tug<any, any, any>> = T extends Tug<
    infer R,
    any,
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

type CheckOfKnownError = (it: any) => boolean;

/**
 * The `tug` instance.
 */
export class Tug<R, E, A> {
    private readonly rpe: TugRpe<R, E, A>;
    private readonly checksOfKnownErrors: CheckOfKnownError[];
    private constructor(
        rpe: TugRpe<R, E, A>,
        checksOfKnownErrors: CheckOfKnownError[]
    ) {
        this.rpe = rpe;
        this.checksOfKnownErrors = checksOfKnownErrors;

        if (false) {
            console.error("throws here");
        }
    }

    //// DI
    public execOrThrow: [R] extends [never]
        ? () => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() =>
        this.rpe({} as any).then(unwrapEither)) as any;

    public exec: [R] extends [never]
        ? [E] extends [never]
            ? () => Promise<A>
            : CompileErrorI<["error"], E, ["can be thrown"]>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = this
        .execOrThrow as any;

    public execEither: [R] extends [never]
        ? () => Promise<Either<E, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() => {
        return this.rpe({} as any);
    }) as any;

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<Exclude<R, R2>, E, A> {
        return new Tug(
            (deps) => this.rpe({ ...deps, ...it }),
            this.checksOfKnownErrors
        );
    }

    public depends: <R2>(
        it: Dependency<R2>
    ) => [Exclude<R2, R>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : Tug<R2 | R, E, A> = (_it) => {
        return this as any;
    };

    public or<A2 extends A>(_f: (e: E) => A2): Tug<R, never, A2> {
        if (false) {
            console.error("fold");
        }
        return this as any;
    }

    /// END DI

    //// COMPOSITION
    public thenn<B>(
        f: (a: A, ctx: CreateContext<R, E>) => B | Promise<B>
    ): Tug<R, E, B> {
        return new Tug(
            chainRpe(this.rpe, (a) =>
                Tug.TugRpe<R, E, B>(
                    (ctx) => f(a, ctx),
                    this.checksOfKnownErrors
                )
            ),
            this.checksOfKnownErrors
        );
    }

    public flatMap<B, R2>(f: (a: A) => Tug<R2, E, B>): Tug<R2 | R, E, B> {
        return new Tug(
            chainRpe(this.rpe, (a) => f(a).rpe as any),
            this.checksOfKnownErrors
        ) as any;
    }

    public chain = this.flatMap;

    /// END COMPOSITION

    //// CREATION
    private static TugRpe =
        <R, E, A>(
            cb: TugCallback<R, E, A>,
            checksOfKnownErrors: CheckOfKnownError[]
        ): TugRpe<R, E, A> =>
        async (dependencies: R) => {
            const context = {
                ...dependencies,
                use: <T>(it: Tug<any, E, T>): Promise<T> =>
                    it
                        .rpe(dependencies)
                        .then(unwrapEither)
                        .catch((e) => {
                            throw new TugTransportException(e);
                        }),
            };

            try {
                const right = await cb(context as any);
                return {
                    right,
                    _tag: "Right",
                };
            } catch (left) {
                if (left instanceof TugTransportException) {
                    return { _tag: "Left", left: left.content };
                }
                for (const check of checksOfKnownErrors) {
                    if (check(left)) {
                        return { _tag: "Left", left: left as any };
                    }
                }

                return {
                    _tag: "Left",
                    left: new TugException(left),
                };
            }
        };

    static newTug = <R, E, A>(
        cb: TugCallback<R, E, A>,
        checksOfKnownErrors: CheckOfKnownError[]
    ): Tug<R, E, A> =>
        new Tug(Tug.TugRpe(cb, checksOfKnownErrors), checksOfKnownErrors);

    static left = <R, E, A>(
        e: E,
        checksOfKnownErrors: CheckOfKnownError[]
    ): Tug<R, E, A> =>
        new Tug(
            async () => ({
                _tag: "Left",
                left: e,
            }),
            checksOfKnownErrors
        );
    /// END CREATION
}

export interface TugBuilder<R0, E> {
    /**
     * Constructs a new `tug` instance. The callback is executed when the `tug` is executed.
     *
     * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
     * If the callback returns a value or promise of a value, the `tug` value will be of that value.
     *
     * The callback is passed a context object, which contains the dependencies of the `tug`, and the `use` function.
     */
    <A>(cb: TugCallback<R0, E, A>): Tug<R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    of: <A, R2 = never>(it: A) => Tug<R2 | R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    right: <A>(it: A) => Tug<R0, E, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the error.
     */
    left: <E2 extends E, A>(it: E2) => Tug<R0, E | E2, A>;

    depends: <R>(
        it: Dependency<R>
    ) => [Exclude<R, R0>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : TugBuilder<R | R0, E>;

    throws: <E2>(cb: (it: any) => it is E2) => TugBuilder<R0, E | E2>;
}
const buildTugBuilder = (
    checksOfKnownErrors: CheckOfKnownError[]
): TugBuilder<any, any> =>
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

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilder<never, TugException> = buildTugBuilder([
    (it) => it instanceof TugException,
]) as any;
