import { RetryStatus } from "retry-ts";
import { chainRpe, RPE, unwrapEither } from "./fp";
import { applyAndDelay, RetryPolicy } from "./retry";
import {
    CompileError,
    CompileErrorI,
    Dependency,
    Either,
    TugUncaughtException,
    UnionToIntersection,
} from "./types";

export interface TryContext<out R> extends TugContext<R> {
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
}

export type TugContext<out R> = {
    deps: UnionToIntersection<R>;
    retryStatus: RetryStatus | undefined;
};

export type TugCallback<R, A> = (ctx: TryContext<R>) => Promise<A> | A;

export class Tug<out R, out A> {
    private readonly rpe: RPE<any>;
    private constructor(rpe: RPE<A>) {
        this.rpe = rpe;
    }

    public get exec(): TugExecutor<R, A> {
        return new TugExecutor(this.rpe as any);
    }

    public provide<R2, O extends R2>(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        d: Dependency<R2>,
        value: O
    ): Tug<Exclude<R, R2>, A> {
        return new Tug((deps) =>
            this.rpe({
                ...deps,
                ...value,
            })
        );
    }

    public retry(f: (ctx: TugContext<R>) => RetryPolicy): Tug<R, A> {
        const go = (status: RetryStatus): Tug<R, A> =>
            this.provide(null as any, { __retryStatus: status }).fold(
                (e) =>
                    TugBuilder.try((ctx) =>
                        applyAndDelay(f(ctx as any), status)
                    ).chain((status) => {
                        if (status.previousDelay._tag === "None") {
                            return TugBuilder.left(e);
                        } else {
                            return go(status);
                        }
                    }) as any,
                (a) => TugBuilder.of<R, A>(a) as any
            );

        return go(RetryPolicy.defaultRetryStatus);
    }

    public depends: <R2>(d: Dependency<R2>) => Tug<R2 | R, A> = (_it) => {
        return this as any;
    };

    public try<B>(f: (a: A, ctx: TryContext<R>) => B | Promise<B>): Tug<R, B> {
        return this.chain((a) => Tug.try((ctx) => f(a, ctx)));
    }

    public map = this.try;

    public catch<B>(
        f: (e: TugUncaughtException, ctx: TryContext<R>) => B | Promise<B>
    ): Tug<R, B | A> {
        return this.fold(
            (e) => Tug.try((ctx) => f(e, ctx)),
            (it) => Tug.right(it) as any
        );
    }

    public flatMap<B, R2, R3 extends R>(
        f: (a: A, ctx: TugContext<R3>) => Tug<R2, B>
    ): Tug<R2 | R, B> {
        return new Tug(
            chainRpe(
                this.rpe,
                (a, deps) => f(a, Tug.makeContext(deps)).rpe as any
            )
        ) as any;
    }

    public chain = this.flatMap;

    public chainFirst<B, R2, R3 extends R>(
        f: (a: A, ctx: TugContext<R3>) => Tug<R2, B>
    ): Tug<R2 | R, A> {
        return this.chain((a, ctx) => f(a, ctx as any).map(() => a));
    }

    public sideEffect = this.chainFirst;

    public fold<B>(
        onLeft: (e: TugUncaughtException) => Tug<R, B>,
        onRight: (a: A) => Tug<R, B>
    ): Tug<R, B> {
        return new Tug((deps) =>
            this.rpe(deps).then((either) => {
                if (either._tag === "Right") {
                    return onRight(either.right).rpe(deps);
                } else {
                    return onLeft(either.left).rpe(deps);
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

    static try = <A, R = never>(f: TugCallback<R, A>): Tug<R, A> =>
        new Tug(Tug.RpeTry(f as any));

    static left = <R = never, A = never>(l: unknown): Tug<R, A> =>
        new Tug(async () => ({
            _tag: "Left",
            left: l as any,
        }));

    static right = <R = never, A = never>(r: A): Tug<R, A> =>
        new Tug(async (_deps) => ({
            _tag: "Right",
            right: r,
        }));

    private static makeContext = (dependencies: any): TryContext<any> => {
        const use = <T>(it: any): Promise<T> =>
            it.rpe(dependencies).then(unwrapEither);
        const context = {
            deps: dependencies,
            use,
            retryStatus: dependencies.__retryStatus,
        };
        return context;
    };

    private static RpeTry =
        <R, A>(cb: TugCallback<R, A>): RPE<A> =>
        async (dependencies: R) => {
            try {
                const right = await cb(Tug.makeContext(dependencies));
                return {
                    right: right,
                    _tag: "Right",
                };
            } catch (left) {
                return {
                    _tag: "Left",
                    left: left,
                };
            }
        };
}

export class TugExecutor<out R, out A> {
    private readonly rpe: RPE<any>;
    constructor(rpe: RPE<A>) {
        this.rpe = rpe;
    }

    public orThrow: [R] extends [never]
        ? () => Promise<A>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() =>
        this.rpe({} as any).then((it) => unwrapEither(it))) as any;

    public either: [R] extends [never]
        ? () => Promise<Either<TugUncaughtException, A>>
        : CompileErrorI<["dependency"], R, ["should be provided"]> = (() => {
        return this.rpe({} as any);
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
    public try = <A>(f: TugCallback<R0, A>): Tug<R0, A> => Tug.try(f);

    public right = <R2 = never, A = never>(r: A): Tug<R2 | R0, A> =>
        Tug.right(r);
    public of = this.right;

    public left = <R2 = never, A = never>(
        l: TugUncaughtException
    ): Tug<R2 | R0, A> => Tug.left(l);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    public depends = <R>(d: Dependency<R>): TugBuilderC<R | R0> => this as any;

    public ofDeps = (): Tug<R0, { deps: UnionToIntersection<R0> }> =>
        Tug.try((ctx) => ({ deps: ctx.deps })) as any;

    public static newBuilder(): TugBuilderC<never> {
        return new TugBuilderC();
    }
}

/**
 * Constructs a new `tug` instance.
 */
export const TugBuilder: TugBuilderC<never> = TugBuilderC.newBuilder();
