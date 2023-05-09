import { Either, TugUncaughtException } from "./types";

export const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

export const chainRpe =
    <R, A, B>(rpe: RPE<A>, f: (a: A, deps: R) => RPE<B>): RPE<B> =>
    async (deps: R) =>
        rpe(deps).then(async (e) => {
            if (e._tag === "Right") {
                const res = await f(e.right, deps)(deps);
                return res;
            } else {
                return e;
            }
        });

export type RPE<out A> = (r: any) => Promise<Either<TugUncaughtException, A>>;
