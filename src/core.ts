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

/**
 * A reader function that reads R, and returns a task that returns A.
 * This is the core type of this library.
 */
export type TfxRte<R extends object, A> = Reader<R, Task<Either<any, A>>>;

/**
 * Adds the `use` function to the context.
 */
export type AddUse<R extends object> = R & {
  /**
   * Transforms a `tfx` into a plain promise.
   * Returns a successful promise if the `tfx` succeeds,
   * or a rejected promise if the `tfx` fails.
   */
  use: <T>(it: tfx<R, T>) => Promise<T>;
};

/**
 * A callback that takes a context and returns a value or promise of a value.
 * The context contains the `use` function.
 *
 * If the callback throws an error or returns a rejected promise, the `tfx` value will be an error.
 * If the callback returns a value or promise of a value, the `tfx` value will be of that value.
 */
export type TfxCallback<R extends object, A> = (
  ctx: AddUse<R>
) => Promise<A> | A;

const unwrapEither = <E, A>(e: Either<E, A>): A => {
  if (e._tag === "Right") {
    return e.right;
  } else {
    throw e.left;
  }
};

const mapEither = <E, A, B>(e: Either<E, A>, f: (a: A) => B): Either<E, B> => {
  if (e._tag === "Right") {
    return { _tag: "Right", right: f(e.right) };
  } else {
    return e;
  }
};

const mapRte =
  <R extends object, A, B>(rte: TfxRte<R, A>, f: (a: A) => B): TfxRte<R, B> =>
  (deps: R) =>
  async () =>
    rte(deps)().then((e) => mapEither(e, f));

const chainRte =
  <R extends object, A, B>(
    rte: TfxRte<R, A>,
    f: (a: A) => TfxRte<R, B>
  ): TfxRte<R, B> =>
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
 * The `tfx` instance.
 */
export class tfx<R extends object, A> {
  rte: TfxRte<R, A>;
  constructor(rte: TfxRte<R, A>) {
    this.rte = rte;
  }

  /**
   * Executes the `tfx` instance and returns a promise of the result.
   * If the `tfx` fails, the promise will be rejected.
   */
  exec(deps: R): Promise<A> {
    return this.rte(deps)().then(unwrapEither);
  }

  /**
   * Executes the `tfx` instance and returns a promise of an `Either`.
   * If the `tfx` fails, the promise will be resolved with a `Left`.
   * If the `tfx` succeeds, the promise will be resolved with a `Right`.
   */
  execEither(deps: R): Promise<Either<any, A>> {
    return this.rte(deps)();
  }

  /**
   * Takes a function `f` and applies it to the value of `this` `tfx`.
   */
  map<B, R2 extends R>(f: (a: A) => B): tfx<R2, B> {
    return new tfx(mapRte(this.rte, f));
  }

  /**
   * Takes a function `f` that receives the value of `this` can resolve to a value or reject a promise.
   * If `this` `tfx` succeeded, the returned `tfx` will succeed with the value returned by `f`.
   * If `this` `tfx` failed, the returned `tfx` will fail with the same error.
   * If `f` throws an error or returns a rejected promise, the returned `tfx` will fail with that error.
   */
  tfx<B, R2 extends R>(
    f: (a: A, ctx: AddUse<R2>) => B | Promise<B>
  ): tfx<R2, B> {
    return new tfx(
      chainRte(this.rte, (a) => TfxRte<R2, B>((ctx) => f(a, ctx)))
    );
  }

  /**
   * Takes a function `f` that returns another `tfx` instance.
   * If `this` `tfx` failed, the returned `tfx` will fail with the same error.
   * If `this` `tfx` succeeded, the returned `tfx` will be the result of `f` applied to the value of `this`.
   */
  flatMap<B, R2 extends R>(f: (a: A) => tfx<R2, B>): tfx<R2, B> {
    return new tfx(chainRte(this.rte, (a) => f(a).rte));
  }

  /**
   * Alias for `flatMap`.
   */
  chain<B, R2 extends R>(f: (a: A) => tfx<R2, B>): tfx<R2, B> {
    return new tfx(chainRte(this.rte, (a) => f(a).rte));
  }
}

const TfxRte =
  <R extends object, A>(cb: TfxCallback<R, A>): TfxRte<R, A> =>
  (ctx: R) =>
  async () => {
    const newCtx = {
      ...ctx,
      use: <T>(it: tfx<any, T>): Promise<T> =>
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

const BuildTfx = <R extends object, A>(cb: TfxCallback<R, A>): tfx<R, A> =>
  new tfx(TfxRte(cb));

type TfxBuilder = {
  /**
   * Constructs a new `tfx` instance. The callback is executed when the `tfx` is executed.
   *
   * If the callback throws an error or returns a rejected promise, the `tfx` value will be an error.
   * If the callback returns a value or promise of a value, the `tfx` value will be of that value.
   *
   * The callback is passed a context object, which contains the dependencies of the `tfx`, and the `use` function.
   */
  <R extends object, A>(cb: TfxCallback<R, A>): tfx<R, A>;
  /**
   * Constructs a new `tfx` instance, with the given value as the result.
   */
  of: <R extends object, A>(it: A) => tfx<R, A>;
  /**
   * Constructs a new `tfx` instance, with the given value as the result.
   */
  right: <R extends object, A>(it: A) => tfx<R, A>;
  /**
   * Constructs a new `tfx` instance, with the given value as the error.
   */
  left: <R extends object, A>(it: any) => tfx<R, A>;
};

/**
 * Constructs a new `tfx` instance.
 */
export const Tfx: TfxBuilder = new Proxy(BuildTfx, {
  get: (_target, prop, _receiver) => {
    if (prop == "of" || prop == "right") {
      return <T>(it: T) => BuildTfx(() => it);
    }
    if (prop == "left") {
      return <T>(it: T) =>
        BuildTfx(() => {
          throw it;
        });
    }
    throw new Error(
      'Tfx does not have a property named "' + String(prop) + '"'
    );
  },
}) as any;
