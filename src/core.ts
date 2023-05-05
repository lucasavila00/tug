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
 * Reader type. Represents a function that takes a parameter and returns a value.
 */
export type Reader<R, A> = (r: R) => A;

type TugError = unknown;

/**
 * A reader function that reads R, and returns a Promise of Either<unknown, A>.
 * This is the core type of this library.
 */
export type TugRpe<R, A> = Reader<R, Promise<Either<TugError, A>>>;

export type Dependency<R> = {
    read: R;
};
export const Dependency = <R>(): Dependency<R> => null as any;

export type TugBuilderOf<T extends TugBuilder<any>, A> = T extends TugBuilder<
    infer D
>
    ? Tug<D, A>
    : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
    k: infer I
) => void
    ? I
    : never;
/**
 * Adds the `use` function to the context.
 */
export type CreateContext<R> = UnionToIntersection<R> & {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2, T>(
        it: [R2] extends [never]
            ? Tug<R2, T>
            : [R2] extends [R]
            ? Tug<R2, T>
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
export type TugCallback<R, A> = (ctx: CreateContext<R>) => Promise<A> | A;

const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

const chainRpe =
    <R, A, B>(rte: TugRpe<R, A>, f: (a: A) => TugRpe<R, B>): TugRpe<R, B> =>
    async (deps: R) =>
        rte(deps).then((e) => {
            if (e._tag === "Right") {
                return f(e.right)(deps);
            } else {
                return e;
            }
        });

export type tugReads<T extends Tug<any, any>> = T extends Tug<infer R, any>
    ? R
    : never;

export type tugReturns<T extends Tug<any, any>> = T extends Tug<any, infer A>
    ? A
    : never;

/**
 * The `tug` instance.
 */
export class Tug<R, A> {
    private readonly rpe: TugRpe<R, A>;
    private constructor(rpe: TugRpe<R, A>) {
        this.rpe = rpe;
    }

    /**
     * Executes the `tug` instance and returns a promise of the result.
     * If the `tug` fails, the promise will be rejected.
     */
    public exec: [R] extends [never]
        ? () => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() => {
        return this.execEither().then(unwrapEither);
    }) as any;

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<Exclude<R, R2>, A> {
        return new Tug((deps) => this.rpe({ ...deps, ...it }));
    }

    /**
     * Executes the `tug` instance and returns a promise of an `Either`.
     * If the `tug` fails, the promise will be resolved with a `Left`.
     * If the `tug` succeeds, the promise will be resolved with a `Right`.
     */
    public execEither(): Promise<Either<TugError, A>> {
        return this.rpe({} as any);
    }

    public depends: <R2>(
        it: Dependency<R2>
    ) => [Exclude<R2, R>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : Tug<R2 | R, A> = (_it) => {
        return this as any;
    };

    /**
     * Takes a function `f` that receives the value of `this` can resolve to a value or reject a promise.
     * If `this` `tug` succeeded, the returned `tug` will succeed with the value returned by `f`.
     * If `this` `tug` failed, the returned `tug` will fail with the same error.
     * If `f` throws an error or returns a rejected promise, the returned `tug` will fail with that error.
     */
    public thenn<B, R2 extends R>(
        f: (a: A, ctx: CreateContext<R2>) => B | Promise<B>
    ): Tug<R2, B> {
        return new Tug(
            chainRpe(this.rpe, (a) => Tug.TugRpe<R2, B>((ctx) => f(a, ctx)))
        );
    }

    public flatten: A extends Tug<infer R2, infer A2>
        ? () => Tug<R | R2, A2>
        : CompileError<["not nested tugs"]> = (() => {
        return this.chain((it) => it as any);
    }) as any;

    /**
     * Takes a function `f` that returns another `tug` instance.
     * If `this` `tug` failed, the returned `tug` will fail with the same error.
     * If `this` `tug` succeeded, the returned `tug` will be the result of `f` applied to the value of `this`.
     */
    public flatMap<B, R2>(f: (a: A) => Tug<R2, B>): Tug<R2 | R, B> {
        return this.chain(f);
    }

    /**
     * Alias for `flatMap`.
     */
    public chain<B, R2>(f: (a: A) => Tug<R2, B>): Tug<R2 | R, B> {
        return new Tug(chainRpe(this.rpe, (a) => f(a).rpe as any)) as any;
    }

    private static TugRpe =
        <R, A>(cb: TugCallback<R, A>): TugRpe<R, A> =>
        async (dependencies: R) => {
            const context = {
                ...dependencies,
                use: <T>(it: Tug<any, T>): Promise<T> =>
                    it.rpe(dependencies).then(unwrapEither),
            };

            try {
                return await Promise.resolve(cb(context as any)).then(
                    (right) => ({
                        right,
                        _tag: "Right",
                    })
                );
            } catch (left) {
                return { _tag: "Left", left };
            }
        };

    static newTug = <R, A>(cb: TugCallback<R, A>): Tug<R, A> =>
        new Tug(Tug.TugRpe(cb));
}

export interface TugBuilder<R0> {
    /**
     * Constructs a new `tug` instance. The callback is executed when the `tug` is executed.
     *
     * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
     * If the callback returns a value or promise of a value, the `tug` value will be of that value.
     *
     * The callback is passed a context object, which contains the dependencies of the `tug`, and the `use` function.
     */
    <A>(cb: TugCallback<R0, A>): Tug<R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    of: <A, R2 = never>(it: A) => Tug<R2 | R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    right: <A>(it: A) => Tug<R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the error.
     */
    left: <A>(it: any) => Tug<R0, A>;

    flat: <R, A>(it: TugCallback<R0, Tug<R, A>>) => Tug<R | R0, A>;

    depends: <R>(
        it: Dependency<R>
    ) => [Exclude<R, R0>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : TugBuilder<R | R0>;
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilder<never> = new Proxy(Tug.newTug, {
    get: (_target, prop, _receiver) => {
        if (prop == "of" || prop == "right") {
            return <T>(it: T) => Tug.newTug(() => it);
        }
        if (prop == "left") {
            return <T>(it: T) =>
                Tug.newTug(() => {
                    throw it;
                });
        }

        if (prop === "depends") {
            return () => TugBuilder;
        }
        throw new Error(
            'TugBuilder does not have a property named "' + String(prop) + '"'
        );
    },
}) as any;
