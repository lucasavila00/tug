import { Tug } from "./core";
import { chainRpe, TugRPE, TugRpe, unwrapEither } from "./fp";
import {
    CompileError,
    CompileErrorI,
    Dependency,
    Either,
    TugUncaughtException,
    UnionToIntersection,
} from "./types";

export type StatefulTugCallback<S, R, A> = (
    ctx: StatefulTryContext<S, R>
) => Promise<A> | A;

type UsedTug<R2, S2, T> = [R2] extends [never]
    ? StatefulTug<S2, R2, T>
    : [R2] extends [R2]
    ? StatefulTug<S2, R2, T>
    : CompileError<
          [
              "not a tug, or child-tug uses dependency that was not annotated in parent-tug"
          ]
      >;

export type StatefulTryContext<in out S, out R> = {
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

    unsafeUseStateful: <R2 extends R, S2, T>(
        it: S2 extends void
            ? UsedTug<R2, S2, T>
            : S2 extends S
            ? UsedTug<R2, S2, T>
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
 * The `tug` instance.
 */
export class StatefulTug<in out S, out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    private constructor(rpe: TugRPE<S, A>) {
        this.rpe = rpe;
    }

    public get exec(): StatefulTugExecutor<S, R, A> {
        return new StatefulTugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        _tag: Dependency<R2>,
        it: O
    ): StatefulTug<S, Exclude<R, R2>, A> {
        return new StatefulTug((deps, state) =>
            this.rpe(
                {
                    ...deps,
                    ...it,
                },
                state
            )
        );
    }

    public provideState<S2 extends S>(providedState: S2): Tug<R, A> {
        return Tug.try<R, A>((ctx) =>
            this.rpe(ctx.deps, providedState)
                .then(unwrapEither)
                .then((it) => it[1])
        );
    }

    public depends: <R2>(it: Dependency<R2>) => StatefulTug<S, R2 | R, A> = (
        _it
    ) => {
        return this as any;
    };

    public try<B>(
        f: (a: A, ctx: StatefulTryContext<S, R>) => B | Promise<B>
    ): StatefulTug<S, R, B> {
        return this.chain((a) => StatefulTug.try((ctx) => f(a, ctx)));
    }

    public catch<B>(
        f: (
            e: TugUncaughtException,
            ctx: StatefulTryContext<S, R>
        ) => B | Promise<B>
    ): StatefulTug<S, R, B | A> {
        return this.fold(
            (e) => StatefulTug.try((ctx) => f(e, ctx)),
            (it) => StatefulTug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (
            a: A,
            ctx: { deps: UnionToIntersection<R3> }
        ) => StatefulTug<S, R2, B>
    ): StatefulTug<S, R2 | R, B> {
        return new StatefulTug(
            chainRpe(this.rpe, (a, deps) => f(a, { deps } as any).rpe as any)
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (
            a: A,
            ctx: { deps: UnionToIntersection<R3> }
        ) => StatefulTug<S, R2, B>
    ): StatefulTug<S, R2 | R, A> {
        return new StatefulTug(
            chainRpe(this.rpe, (a, deps) =>
                chainRpe(
                    f(a, { deps } as any).rpe,
                    () => StatefulTug.right(a).rpe
                )
            )
        );
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => StatefulTug<S, R, B>,
        onRight: (a: A) => StatefulTug<S, R, B>
    ): StatefulTug<S, R, B> {
        return new StatefulTug((deps, state) =>
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
        f: (a: A2) => StatefulTug<S, R2, B>
    ): StatefulTug<
        S,
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

    //// CREATION

    static try = <S, R, A>(
        cb: StatefulTugCallback<S, R, A>
    ): StatefulTug<S, R, A> => new StatefulTug(TugRpe(cb));

    static left = <S, R, E, A>(e: E): StatefulTug<S, R, A> =>
        new StatefulTug(async () => ({
            _tag: "Left",
            left: e as any,
        }));

    static right = <S, R, A>(a: A): StatefulTug<S, R, A> =>
        new StatefulTug(async (_deps, state) => ({
            _tag: "Right",
            right: [state, a],
        }));
    /// END CREATION
}

export class StatefulTugExecutor<in out S, out R, out A> {
    private readonly rpe: TugRPE<any, any>;
    constructor(rpe: TugRPE<S, A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? (state: S) => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) =>
        this.rpe({} as any, state)
            .then((it) => unwrapEither(it))
            .then((it) => it[1])) as any;

    public either: [R] extends [never]
        ? (state: S) => Promise<Either<TugUncaughtException, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        state: S
    ) => {
        return this.rpe({} as any, state).then((either) => {
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
              onError: (e: TugUncaughtException) => A2,
              state: S
          ) => Promise<A2 | A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = ((
        onError: any,
        state: any
    ) =>
        (this.either as any)(state).then((e: Either<any, any>) => {
            if (e._tag === "Right") {
                return e.right;
            } else {
                return onError(e.left);
            }
        })) as any;
}

export class StatefulTugBuilderC<in out S, out R0> {
    public try = <A>(
        cb: StatefulTugCallback<S, R0, A>
    ): StatefulTug<S, R0, A> => StatefulTug.try(cb);

    public right = <A, R2 = never>(it: A): StatefulTug<S, R2 | R0, A> =>
        StatefulTug.right(it);
    public of = this.right;

    public left = <A, R2 = never>(
        it: TugUncaughtException
    ): StatefulTug<S, R2 | R0, A> => StatefulTug.left(it);

    public depends = <R>(_it: Dependency<R>): StatefulTugBuilderC<S, R | R0> =>
        this as any;

    public stateful = <S2>(): StatefulTugBuilderC<S2, R0> => this as any;

    public static newBuilder(): StatefulTugBuilderC<void, never> {
        return new StatefulTugBuilderC();
    }
}
