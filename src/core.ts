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

export type TfxRte<R extends object, A> = Reader<R, Task<Either<any, A>>>;

export type AddUse<R extends object> = R & {
  use: <T>(it: tfx<R, T>) => Promise<T>;
};
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

export class tfx<R extends object, A> {
  rte: TfxRte<R, A>;
  constructor(rte: TfxRte<R, A>) {
    this.rte = rte;
  }

  exec(deps: R): Promise<A> {
    return this.rte(deps)().then(unwrapEither);
  }

  execEither(deps: R): Promise<Either<any, A>> {
    return this.rte(deps)();
  }

  map<B>(f: (a: A) => B): tfx<R, B> {
    return new tfx(mapRte(this.rte, f));
  }

  flatMap<B>(f: (a: A) => tfx<R, B>): tfx<R, B> {
    return new tfx(chainRte(this.rte, (a) => f(a).rte));
  }

  chain<B>(f: (a: A) => tfx<R, B>): tfx<R, B> {
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
  <R extends object, A>(cb: TfxCallback<R, A>): tfx<R, A>;
  of: <R extends object, A>(it: A) => tfx<R, A>;
  right: <R extends object, A>(it: A) => tfx<R, A>;
  left: <R extends object, A>(it: any) => tfx<R, A>;
};

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
