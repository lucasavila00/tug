/**
 * @category model
 * @since 2.0.0
 */
export interface None {
    readonly _tag: "None";
}

const none: None = {
    _tag: "None",
};
/**
 * @category model
 * @since 2.0.0
 */
export interface Some<A> {
    readonly _tag: "Some";
    readonly value: A;
}

const some = <A>(value: A): Some<A> => ({
    _tag: "Some",
    value,
});

/**
 * @category model
 * @since 2.0.0
 */
export type Option<A> = None | Some<A>;

const getOrElse = <A>(ma: Option<A>, onNone: () => A): A =>
    ma._tag === "None" ? onNone() : ma.value;

const filter = <A>(ma: Option<A>, f: (it: A) => boolean): Option<A> =>
    ma._tag === "None" ? ma : f(ma.value) ? ma : none;

const map = <A, B>(ma: Option<A>, f: (it: A) => B): Option<B> =>
    ma._tag === "None" ? ma : some(f(ma.value));

// Adapted from https://github.com/Unisay/purescript-aff-retry

/**
 * @since 0.1.0
 */
export interface RetryStatus {
    /** Iteration number, where `0` is the first try */
    iterNumber: number;
    /** Delay incurred so far from retries */
    cumulativeDelay: number;
    /** Latest attempt's delay. Will always be `none` on first run. */
    previousDelay: Option<number>;
}

/**
 * A `RetryPolicy` is a function that takes an `RetryStatus` and
 * possibly returns a delay in milliseconds. Iteration numbers start
 * at zero and increase by one on each retry. A *None* return value from
 * the function implies we have reached the retry limit.
 *
 * @since 0.1.0
 */
export class RetryPolicy {
    public fn: (status: RetryStatus) => Option<number>;
    private constructor(fn: (status: RetryStatus) => Option<number>) {
        this.fn = fn;
    }

    /**
     * Add an upperbound to a policy such that once the given time-delay
     * amount *per try* has been reached or exceeded, the policy will stop
     * retrying and fail.
     *
     */
    public limitRetriesByDelay(maxDelay: number): RetryPolicy {
        return new RetryPolicy((status: RetryStatus) =>
            filter(this.fn(status), (delay) => delay < maxDelay)
        );
    }

    /**
     * Set a time-upperbound for any delays that may be directed by the
     * given policy. This function does not terminate the retrying. The policy
     * capDelay(maxDelay, exponentialBackoff(n))` will never stop retrying. It
     * will reach a state where it retries forever with a delay of `maxDelay`
     * between each one. To get termination you need to use one of the
     * 'limitRetries' function variants.
     *
     */
    public capDelay(maxDelay: number): RetryPolicy {
        return new RetryPolicy((status: RetryStatus) =>
            map(this.fn(status), (delay) => Math.min(maxDelay, delay))
        );
    }

    /**
     * Apply policy on status to see what the decision would be.
     *
     */
    public applyPolicy(status: RetryStatus): RetryStatus {
        const previousDelay = this.fn(status);
        return {
            iterNumber: status.iterNumber + 1,
            cumulativeDelay:
                status.cumulativeDelay + getOrElse(previousDelay, () => 0),
            previousDelay,
        };
    }

    // * 'RetryPolicy' is a 'Monoid'. You can collapse multiple strategies into one using 'concat'.
    // * The semantics of this combination are as follows:
    // *
    // * 1. If either policy returns 'None', the combined policy returns
    // * 'None'. This can be used to inhibit after a number of retries,
    // * for example.
    // *
    // * 2. If both policies return a delay, the larger delay will be used.
    // * This is quite natural when combining multiple policies to achieve a
    // * certain effect.
    // *
    static concat(...it: RetryPolicy[]): RetryPolicy {
        return new RetryPolicy((status) => {
            if (it.length === 0) {
                return some(0);
            }
            const rs = it.map((it) => it.fn(status));
            return rs.some((it) => it._tag === "None")
                ? none
                : some(Math.max(...rs.map((it) => (it as any).value)));
        });
    }
    /**
     * Constant delay with unlimited retries
     *
     */
    static constantDelay(delay: number): RetryPolicy {
        return new RetryPolicy(() => some(delay));
    }

    /**
     * Retry immediately, but only up to `i` times.
     *
     */
    static limitRetries(i: number): RetryPolicy {
        return new RetryPolicy((status) =>
            status.iterNumber >= i ? none : some(0)
        );
    }
    static exponentialBackoff(delay: number): RetryPolicy {
        return new RetryPolicy((status) =>
            some(delay * Math.pow(2, status.iterNumber))
        );
    }
    /**
     * Grow delay exponentially each iteration.
     * Each delay will increase by a factor of two.
     *
     */
    static defaultRetryStatus: RetryStatus = {
        iterNumber: 0,
        cumulativeDelay: 0,
        previousDelay: none,
    };
}
export function applyAndDelay(
    policy: RetryPolicy,
    status: RetryStatus
): Promise<RetryStatus> {
    const newStatus = policy.applyPolicy(status);
    const x = newStatus.previousDelay;
    if (x._tag === "None") {
        return Promise.resolve(newStatus);
    } else {
        const milis = x.value;
        return new Promise((resolve) => setTimeout(resolve, milis, newStatus));
    }
}
