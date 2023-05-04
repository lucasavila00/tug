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
 * Task type, or lazy promise. Represents a parameter-less function that returns a promise.
 */
export type Task<A> = () => Promise<A>;

/**
 * Reader type. Represents a function that takes a parameter and returns a value.
 */
export type Reader<R, A> = (r: R) => A;

type TugError = unknown;

/**
 * A reader function that reads R, and returns a task that returns Either<unknown, A>.
 */
export type TugRte<R, A> = Reader<R, Task<Either<TugError, A>>>;

/**
 * A reader function that reads R, and returns a Promise of Either<unknown, A>.
 * This is the core type of this library.
 */
export type TugRpe<R, A> = Reader<R, Promise<Either<TugError, A>>>;

export type Dependency<R> = {
    read: (it: any) => R;
    id: number;
};
let idCounter = 0;
export const Dependency = <R>(): Dependency<R> => {
    idCounter++;
    return {
        read: (it) => it,
        id: idCounter,
    };
};

/**
 * Adds the `use` function to the context.
 */
export type CreateContext<R> = {
    /**
     * Transforms a `tug` into a plain promise.
     * Returns a successful promise if the `tug` succeeds,
     * or a rejected promise if the `tug` fails.
     */
    use: <R2, T>(
        it: [R2] extends [never]
            ? tug<R2, T>
            : [R2] extends [R]
            ? tug<R2, T>
            : CompileError<
                  [
                      "child-tug uses dependency that was not annotated in parent-tug"
                  ]
              >
    ) => Promise<T>;

    read: <R2>(
        dependency: Dependency<R2>
    ) => [R2] extends [R]
        ? R2
        : CompileError<["used dependency was not annotated as dependency"]>;
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

export type tugReads<T extends tug<any, any>> = T extends tug<infer R, any>
    ? R
    : never;

export type tugReturns<T extends tug<any, any>> = T extends tug<any, infer A>
    ? A
    : never;

/**
 * The `tug` instance.
 */
export class tug<R, A> {
    private readonly rpe: TugRpe<R, A>;
    private constructor(rpe: TugRpe<R, A>) {
        this.rpe = rpe;
    }

    /**
     * Creates a ReaderTaskEither from a `tug` instance.
     */
    public asRte(dependencyTag: Dependency<any>): TugRte<R, A> {
        return (dependencies: R) => async () =>
            this.rpe({ [dependencyTag.id]: dependencies } as any);
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
        tag: Dependency<R2>,
        it: O
    ): tug<Exclude<R, R2>, A> {
        return new tug((deps) => this.rpe({ ...deps, [tag.id]: it }));
    }

    /**
     * Executes the `tug` instance and returns a promise of an `Either`.
     * If the `tug` fails, the promise will be resolved with a `Left`.
     * If the `tug` succeeds, the promise will be resolved with a `Right`.
     */
    public execEither(): Promise<Either<TugError, A>> {
        return this.rpe({} as any);
    }

    /**
     * Takes a function `f` and applies it to the value of `this` `tug`.
     */
    public map<B, R2 extends R>(f: (a: A) => B): tug<R2, B> {
        return this.tug(f);
    }

    public depends: <R2>(
        it: Dependency<R2>
    ) => [Exclude<R2, R>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : tug<R2 | R, A> = (_it) => {
        return this as any;
    };

    /**
     * Takes a function `f` that receives the value of `this` can resolve to a value or reject a promise.
     * If `this` `tug` succeeded, the returned `tug` will succeed with the value returned by `f`.
     * If `this` `tug` failed, the returned `tug` will fail with the same error.
     * If `f` throws an error or returns a rejected promise, the returned `tug` will fail with that error.
     */
    public tug<B, R2 extends R>(
        f: (a: A, ctx: CreateContext<R2>) => B | Promise<B>
    ): tug<R2, B> {
        return new tug(
            chainRpe(this.rpe, (a) => tug.TugRpe<R2, B>((ctx) => f(a, ctx)))
        );
    }

    public flatten: A extends tug<infer R2, infer A2>
        ? () => tug<R | R2, A2>
        : CompileError<["not nested tugs"]> = (() => {
        return this.chain((it) => it as any);
    }) as any;

    /**
     * Takes a function `f` that returns another `tug` instance.
     * If `this` `tug` failed, the returned `tug` will fail with the same error.
     * If `this` `tug` succeeded, the returned `tug` will be the result of `f` applied to the value of `this`.
     */
    public flatMap<B, R2>(f: (a: A) => tug<R2, B>): tug<R2 | R, B> {
        return this.chain(f);
    }

    /**
     * Alias for `flatMap`.
     */
    public chain<B, R2>(f: (a: A) => tug<R2, B>): tug<R2 | R, B> {
        return new tug(chainRpe(this.rpe, (a) => f(a).rpe as any)) as any;
    }

    private static TugRpe =
        <R, A>(cb: TugCallback<R, A>): TugRpe<R, A> =>
        async (dependencies: R) => {
            const context = {
                read: (tag: Dependency<any>) => (dependencies as any)[tag.id],
                use: <T>(it: tug<any, T>): Promise<T> =>
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

    static newTug = <R, A>(cb: TugCallback<R, A>): tug<R, A> =>
        new tug(tug.TugRpe(cb));
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
    <A>(cb: TugCallback<R0, A>): tug<R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    of: <A, R2 = never>(it: A) => tug<R2 | R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the result.
     */
    right: <A>(it: A) => tug<R0, A>;

    /**
     * Constructs a new `tug` instance, with the given value as the error.
     */
    left: <A>(it: any) => tug<R0, A>;

    flat: <R, A>(it: TugCallback<R0, tug<R, A>>) => tug<R | R0, A>;

    depends: <R>(
        it: Dependency<R>
    ) => [Exclude<R, R0>] extends [never]
        ? CompileError<["dependency collides with others"]>
        : TugBuilder<R | R0>;
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilder<never> = new Proxy(tug.newTug, {
    get: (_target, prop, _receiver) => {
        if (prop == "of" || prop == "right") {
            return <T>(it: T) => tug.newTug(() => it);
        }
        if (prop == "left") {
            return <T>(it: T) =>
                tug.newTug(() => {
                    throw it;
                });
        }

        if (prop === "depends") {
            return () => TugBuilder;
        }
        throw new Error(
            'Tug does not have a property named "' + String(prop) + '"'
        );
    },
}) as any;
