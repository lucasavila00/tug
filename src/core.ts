export type Left<E> = {
  readonly _tag: "Left";
  readonly left: E;
};

export type Right<A> = {
  readonly _tag: "Right";
  readonly right: A;
};

export type Either<E, A> = Left<E> | Right<A>;

export type Task<A> = () => Promise<A>;

export type Reader<R, A> = (r: R) => A;

type TfxRte<R extends object, A> = Reader<R, Task<Either<any, A>>>;

export type tfx<R extends object, A> = TfxRte<R, A> & {
  exec: (deps: R) => Promise<A>;
  execEither: (deps: R) => Promise<Either<any, A>>;
};

const unwrapEither = <E, A>(e: Either<E, A>): A => {
  if (e._tag === "Right") {
    return e.right;
  } else {
    throw e.left;
  }
};

const TfxRte =
  <R extends object, A>(
    cb: (
      ctx: R & { use: <T>(it: TfxRte<R, T>) => Promise<T> }
    ) => Promise<A> | A
  ): TfxRte<R, A> =>
  (ctx: R) =>
  async () => {
    const newCtx = {
      ...ctx,
      use: <T>(it: TfxRte<any, T>): Promise<T> =>
        it(newCtx)().then(unwrapEither),
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

export const Tfx = <R extends object, A>(
  cb: (ctx: R & { use: <T>(it: tfx<R, T>) => Promise<T> }) => Promise<A> | A
): tfx<R, A> =>
  new Proxy(TfxRte(cb) as any, {
    get(target, prop, _receiver) {
      if (prop == "exec") {
        return (deps: R) => target(deps)().then(unwrapEither);
      }
      if (prop == "execEither") {
        return (deps: R) => target(deps)();
      }
      throw new Error(`Unknown property ${String(prop)}`);
    },
  });
