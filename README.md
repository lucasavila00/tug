# tug

Write testable code.

TODO

## Install

TODO

## Getting started

Define the dependencies

```ts
import { CreateContext } from "tug";

type WebAppDependencies = {
  db: () => Promise<Database>;
  currentUserId: () => Promise<string | undefined>;
};
type WebAppCtx = CreateContext<WebAppDependencies>;
```

Construct `tug`s

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

## Examples

TODO

## API Overview

### Types

TODO

```ts
type WebAppDependencies = {
  db: () => Promise<Database>;
  currentUserId: () => Promise<string | undefined>;
};
type WebAppTug<A> = tug<WebAppDependencies, A>;
type WebAppCtx = CreateContext<WebAppDependencies>;
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

#### `tug` transform

Applies a function `f` to the current `tug` value, if the current value is successful. `f` works like the `Tug` constructor.

`f` can use the `tug` context and it returns a value or promise.
Rejections and errors make the `tug` fail.

```ts
const getLoggedInUserId = () =>
  Tug(async (ctx: WebAppCtx) => {
    const userId = await ctx.currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

const getLoggedInUser = () =>
  getLoggedInUserId().tug(async (id, ctx) => {
    const db = await ctx.db();
    const user = await db.collection<UserData>("users").findOne({ id });
    if (user == null) {
      throw new Error("user does not exist");
    }
    return user;
  });
```

#### Map

Returns a new `tug` with the contents of the current one applied to function `f`, if the current one is successful.

```ts
const v0 = Tug.of(0);
const v1 = v0.map((it) => it + 1);
console.log(v1.exec({})); // 2
```

#### Flat Map & Chain

Returns a new `tug` with the contents of the current one applied to function `f`, if the current one is successful.

`f` must return a `tug` which will be flattened out with the current result.

```ts
const v0 = Tug.of(0);
const v1 = v0.flatMap((it) => Tug.of(it + 1)); // or v0.chain((it) => Tug.of(it + 1));
console.log(v1.exec({})); // 2
```

### Value-Based Exceptions

Use `execEither` to execute the `tug` and get the result as an `Either`.

```ts
// returns an Either<any, T> where T is the tug value
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

## Why use tug?

- Typed Dependency Injection
- Value-Based Exceptions
- Retryable Promises
- 0 dependencies
- Less than 2kb (minified & gzipped)

### Alternatives

`tug` is inspired by `fp-ts` ReaderTaskEither and `effect-ts`, but focuses on:

- a simpler API that's easier to learn
- fluent API inspired by `zio`
- simpler Typescript compile errors
- no focus on pure functional programming and HKT


### Fp-ts compatibility

TODO: The internal state of `tug` is a ReaderTaskEither and can be accessed with the `.rte` accessor.
TODO make it method