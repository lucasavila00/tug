# tug

Write testable code.

- Typed Dependency Injection
- Value-Based Exceptions
- Retryable Promises
- 0 dependencies
- Less than 2kb (minified & gzipped)

## Install

TODO

## Getting started

Define your dependencies

```ts
import { CreateContext } from "tug";

type WebAppDependencies = {
  db: () => Promise<Database>;
};
type WebAppCtx = CreateContext<WebAppDependencies>;
```

Construct `tug` instances

```ts
import { Tug } from "tug";

const getOrderById = (id: string) =>
  Tug(async (ctx: WebAppCtx) => {
    const db = await ctx.db();
    const order = await db.collection<OrderData>("orders").findOne({ id });
    if (order == null) {
      throw new Error("order does not exist");
    }
    return order;
  });

const getUserById = (id: string) =>
  Tug(async (ctx: WebAppCtx) => {
    const db = await ctx.db();
    const user = await db.collection<UserData>("users").findOne({ id });
    if (user == null) {
      throw new Error("user does not exist");
    }
    return user;
  });

const canUserEditOrder = (userId: string, orderId: string) =>
  Tug(async (ctx: WebAppCtx) => {
    const user = await ctx.use(getUserById(userId));
    if (user.isAdmin) {
      return true;
    }
    const order = await ctx.use(getOrderById(orderId));
    return order.userId === user.id;
  });
```

Execute the `tug`

```ts
const deps = { db: databaseGetter };
const userId = "user-123";
const orderId = "order-123";

// returns the `tug` value if the computation succeeds or throws if it fails
const result = await canUserEditOrder(userId, orderId).exec(deps);
```

## API Overview

### Types

TODO

```ts
export type WebTug<A> = tug<ContextInput, A>;
export type WebCtx = CreateContext<ContextInput>;
```

### Context & `use` function

The `tug` context object contains the dependencies provided at execution time, and the `use` function.

TODO

```ts
TODO;
```

TIP: `use` react promise server TODO

### Constructors

```ts
const ok1 = Tug.of(1);
const ok2 = Tug(async (_ctx) => 2);
const ok3 = Tug(() => 3);
const ok4 = Tug.right(4);

const fail1 = Tug.left(new Error("it failed"));
const fail2 = Tug(async () => {
  throw new Error("it failed");
});
const fail3 = Tug(() => Promise.reject(new Error("it failed")));
```

### Transform

#### Map

TODO

```ts
TODO;
```

#### Flat Map & Chain

TODO

```ts
TODO;
```

#### TFX transform

TODO

```ts
TODO;
```

### Value-Based Exceptions

Use `execEither` to execute the `tug` and get the result as an `Either`.

```ts
// returns an Either of an error and the `tug` value
const either = await canUserEditOrder(userId, orderId).execEither(deps);
expect(either).toEqual({ _tag: "Right", right: true });
```

An `Either` is defined as

```ts
type Left<E> = {
  readonly _tag: "Left";
  readonly left: E;
};
type Right<A> = {
  readonly _tag: "Right";
  readonly right: A;
};
type Either<E, A> = Left<E> | Right<A>;
```

## Alternatives

`tug` is inspired by `fp-ts` ReaderTaskEither and `effect-ts`, but focuses on:

- a simpler API that's easier to learn
- fluent API inspired by `zio`
- simpler Typescript compile errors
- no focus on pure functional programming and HKT

TIP: The internal state of `tug` is a ReaderTaskEither and can be accessed with the `.rte` accessor.

## Fp-ts compatibility

TODO
