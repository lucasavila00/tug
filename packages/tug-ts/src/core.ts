import { chainRpe, TugRPE, TugRpe, unwrapEither } from "./fp";
import { StatefulTugBuilderC } from "./stateful";
import {
    CompileError,
    CompileErrorI,
    Dependency,
    Either,
    TugUncaughtException,
    UnionToIntersection,
} from "./types";

export type TryContext<out R> = {
    use: <R2 extends R, T>(
        it: [R2] extends [never]
            ? Tug<R2, T>
            : [R2] extends [R2]
            ? Tug<R2, T>
            : CompileError<
                  [
                      "not a tug, or child-tug uses dependency that was not annotated in parent-tug"
                  ]
              >
    ) => Promise<T>;
    deps: UnionToIntersection<R>;
};

export type TugCallback<R, A> = (ctx: TryContext<R>) => Promise<A> | A;

export class Tug<out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    private constructor(rpe: TugRPE<void, A>) {
        this.rpe = rpe;
    }

    public get exec(): TugExecutor<R, A> {
        return new TugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): Tug<Exclude<R, R2>, A> {
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

    public depends: <R2>(it: Dependency<R2>) => Tug<R2 | R, A> = (_it) => {
        return this as any;
    };

    public try<B>(f: (a: A, ctx: TryContext<R>) => B | Promise<B>): Tug<R, B> {
        return this.chain((a) => Tug.try((ctx) => f(a, ctx)));
    }

    public catch<B>(
        f: (e: TugUncaughtException, ctx: TryContext<R>) => B | Promise<B>
    ): Tug<R, B | A> {
        return this.fold(
            (e) => Tug.try((ctx) => f(e, ctx)),
            (it) => Tug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<R2, B>
    ): Tug<R2 | R, B> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) => f(a, { deps } as any).rpe as any)
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (a: A, ctx: { deps: UnionToIntersection<R3> }) => Tug<R2, B>
    ): Tug<R2 | R, A> {
        return new Tug(
            chainRpe(this.rpe, (a, deps) =>
                chainRpe(f(a, { deps } as any).rpe, () => Tug.right(a).rpe)
            )
        );
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => Tug<R, B>,
        onRight: (a: A) => Tug<R, B>
    ): Tug<R, B> {
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
        f: (a: A2) => Tug<R2, B>
    ): Tug<
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

    static try = <R, A>(cb: TugCallback<R, A>): Tug<R, A> =>
        new Tug(TugRpe(cb as any));

    static left = <R, E, A>(e: E): Tug<R, A> =>
        new Tug(async () => ({
            _tag: "Left",
            left: e as any,
        }));

    static right = <R, A>(a: A): Tug<R, A> =>
        new Tug(async (_deps, state) => ({
            _tag: "Right",
            right: [state, a],
        }));
}

export class TugExecutor<out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    constructor(rpe: TugRPE<void, A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? () => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() =>
        this.rpe({} as any, void 0)
            .then((it) => unwrapEither(it))
            .then((it) => it[1])) as any;

    public either: [R] extends [never]
        ? () => Promise<Either<TugUncaughtException, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() => {
        return this.rpe({} as any, void 0).then((either) => {
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
              onError: (e: TugUncaughtException) => A2
          ) => Promise<A2 | A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        onError: any
    ) =>
        (this.either as any)(void 0).then((e: Either<any, any>) => {
            if (e._tag === "Right") {
                return e.right;
            } else {
                return onError(e.left);
            }
        })) as any;
}

export class TugBuilderC<out R0> {
    public try = <A>(cb: TugCallback<R0, A>): Tug<R0, A> => Tug.try(cb);

    public right = <A, R2 = never>(it: A): Tug<R2 | R0, A> => Tug.right(it);
    public of = this.right;

    public left = <A, R2 = never>(it: TugUncaughtException): Tug<R2 | R0, A> =>
        Tug.left(it);

    public depends = <R>(_it: Dependency<R>): TugBuilderC<R | R0> =>
        this as any;

    public stateful = <S2>(): StatefulTugBuilderC<S2, R0> =>
        new StatefulTugBuilderC();

    public static newBuilder(): TugBuilderC<never> {
        return new TugBuilderC();
    }
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilderC<never> = TugBuilderC.newBuilder();
