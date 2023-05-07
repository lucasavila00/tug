import { StatefulTugCallback } from "./core";
import { Either, TugRPE } from "./types";

export const unwrapEither = <E, A>(e: Either<E, A>): A => {
    if (e._tag === "Right") {
        return e.right;
    } else {
        throw e.left;
    }
};

export const chainRpe =
    <S, R, A, B>(
        rpe: TugRPE<S, A>,
        f: (a: A, deps: R) => TugRPE<S, B>
    ): TugRPE<S, B> =>
    async (deps: R, state: S) =>
        rpe(deps, state).then(async (e) => {
            if (e._tag === "Right") {
                const res = await f(e.right[1], deps)(deps, e.right[0]);
                return res;
            } else {
                return e;
            }
        });

export const TugRpe =
    <R, A>(cb: StatefulTugCallback<any, R, A>): TugRPE<any, A> =>
    async (dependencies: R, state: any) => {
        let newState = state;
        const context = {
            deps: dependencies,
            use: <T>(it: { rpe: TugRPE<any, any> }): Promise<T> =>
                it
                    .rpe(dependencies, newState)
                    .then(unwrapEither)
                    .then((it) => {
                        newState = it[0];
                        return it[1];
                    }),
            readState: () => newState,
            setState: (it: any) => {
                newState = it;
            },
            modifyState: (f: (it: any) => any) => {
                newState = f(newState);
            },
        };

        try {
            const right = await cb(context as any);
            return {
                right: [newState, right],
                _tag: "Right",
            };
        } catch (left) {
            return {
                _tag: "Left",
                left: left,
            };
        }
    };
