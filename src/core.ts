/**
 * Left side of the `Either` type.
 */
export type Left<E> = {
  readonly _tag: "Left";
  readonly left: E;
};

/**
 * Right side of the `Either` type.
 */
export type Right<A> = {
  readonly _tag: "Right";
  readonly right: A;
};

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
 * A reader function that reads R, and returns a task that returns A.
 * This is the core type of this library.
 */
export type TugRte<R extends object, A> = Reader<R, Task<Either<TugError, A>>>;

/**
 * Adds the `use` function to the context.
 */
export type CreateContext<R extends object> = R & {
  /**
   * Transforms a `tug` into a plain promise.
   * Returns a successful promise if the `tug` succeeds,
   * or a rejected promise if the `tug` fails.
   */
  use: <T>(it: tug<R, T>) => Promise<T>;
};

/**
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
 * If the callback returns a value or promise of a value, the `tug` value will be of that value.
 */
export type TugCallback<R extends object, A> = (
  ctx: CreateContext<R>
) => Promise<A> | A;

const unwrapEither = <E, A>(e: Either<E, A>): A => {
  if (e._tag === "Right") {
    return e.right;
  } else {
    throw e.left;
  }
};

const chainRte =
  <R extends object, A, B>(
    rte: TugRte<R, A>,
    f: (a: A) => TugRte<R, B>
  ): TugRte<R, B> =>
  (deps: R) =>
  async () =>
    rte(deps)().then((e) => {
      if (e._tag === "Right") {
        return f(e.right)(deps)();
      } else {
        return e;
      }
    });

/**
 * The `tug` instance.
 */
export class tug<R extends object, A> {
  rte: TugRte<R, A>;
  constructor(rte: TugRte<R, A>) {
    this.rte = rte;
  }

  /**
   * Executes the `tug` instance and returns a promise of the result.
   * If the `tug` fails, the promise will be rejected.
   */
  exec(deps: R): Promise<A> {
    return this.execEither(deps).then(unwrapEither);
  }

  /**
   * Executes the `tug` instance and returns a promise of an `Either`.
   * If the `tug` fails, the promise will be resolved with a `Left`.
   * If the `tug` succeeds, the promise will be resolved with a `Right`.
   */
  execEither(deps: R): Promise<Either<TugError, A>> {
    return this.rte(deps)();
  }

  /**
   * Takes a function `f` and applies it to the value of `this` `tug`.
   */
  map<B, R2 extends R>(f: (a: A) => B): tug<R2, B> {
    return this.tug(f);
  }

  /**
   * Takes a function `f` that receives the value of `this` can resolve to a value or reject a promise.
   * If `this` `tug` succeeded, the returned `tug` will succeed with the value returned by `f`.
   * If `this` `tug` failed, the returned `tug` will fail with the same error.
   * If `f` throws an error or returns a rejected promise, the returned `tug` will fail with that error.
   */
  tug<B, R2 extends R>(
    f: (a: A, ctx: CreateContext<R2>) => B | Promise<B>
  ): tug<R2, B> {
    return new tug(
      chainRte(this.rte, (a) => TugRte<R2, B>((ctx) => f(a, ctx)))
    );
  }

  /**
   * Takes a function `f` that returns another `tug` instance.
   * If `this` `tug` failed, the returned `tug` will fail with the same error.
   * If `this` `tug` succeeded, the returned `tug` will be the result of `f` applied to the value of `this`.
   */
  flatMap<B, R2 extends R>(f: (a: A) => tug<R2, B>): tug<R2, B> {
    return new tug(chainRte(this.rte, (a) => f(a).rte));
  }

  /**
   * Alias for `flatMap`.
   */
  chain<B, R2 extends R>(f: (a: A) => tug<R2, B>): tug<R2, B> {
    return new tug(chainRte(this.rte, (a) => f(a).rte));
  }
}

const TugRte =
  <R extends object, A>(cb: TugCallback<R, A>): TugRte<R, A> =>
  (ctx: R) =>
  async () => {
    const newCtx = {
      ...ctx,
      use: <T>(it: tug<any, T>): Promise<T> =>
        it.rte(newCtx)().then(unwrapEither),
    };

    try {
      return await Promise.resolve(cb(newCtx)).then((right) => ({
        right,
        _tag: "Right",
      }));
    } catch (left) {
      return { _tag: "Left", left };
    }
  };

const newTug = <R extends object, A>(cb: TugCallback<R, A>): tug<R, A> =>
  new tug(TugRte(cb));

type TugBuilder = {
  /**
   * Constructs a new `tug` instance. The callback is executed when the `tug` is executed.
   *
   * If the callback throws an error or returns a rejected promise, the `tug` value will be an error.
   * If the callback returns a value or promise of a value, the `tug` value will be of that value.
   *
   * The callback is passed a context object, which contains the dependencies of the `tug`, and the `use` function.
   */
  <R extends object, A>(cb: TugCallback<R, A>): tug<R, A>;
  /**
   * Constructs a new `tug` instance, with the given value as the result.
   */
  of: <R extends object, A>(it: A) => tug<R, A>;
  /**
   * Constructs a new `tug` instance, with the given value as the result.
   */
  right: <R extends object, A>(it: A) => tug<R, A>;
  /**
   * Constructs a new `tug` instance, with the given value as the error.
   */
  left: <R extends object, A>(it: any) => tug<R, A>;
};

/**
 * Constructs a new `tug` instance.
 */
export const Tug: TugBuilder = new Proxy(newTug, {
  get: (_target, prop, _receiver) => {
    if (prop == "of" || prop == "right") {
      return <T>(it: T) => newTug(() => it);
    }
    if (prop == "left") {
      return <T>(it: T) =>
        newTug(() => {
          throw it;
        });
    }
    throw new Error(
      'Tug does not have a property named "' + String(prop) + '"'
    );
  },
}) as any;
