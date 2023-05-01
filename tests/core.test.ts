import { expect, test } from "@jest/globals";
import { tugBuilders } from "../src/core";

type TestCtx = {};
export const { Tug } = tugBuilders<TestCtx>();

test("resolves", async () => {
  const v1 = await Tug(() => 1).exec({});
  expect(v1).toBe(1);

  const v2 = await Tug(async () => 2).exec({});
  expect(v2).toBe(2);

  const v3 = await Tug.of(3).exec({});
  expect(v3).toBe(3);

  const v4 = await Tug.right(4).exec({});
  expect(v4).toBe(4);
});

test("catches", async () => {
  const v1 = await Tug(() => {
    throw new Error("...");
  }).execEither({});
  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v2 = await Tug(() => {
    return Promise.reject(new Error("..."));
  }).execEither({});
  expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v3 = await Tug.left(new Error("...")).execEither({});
  expect(v3).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);
});

test("exec", async () => {
  try {
    await Tug(() => {
      throw new Error("...");
    }).exec({});
    expect(1).toBe(2);
  } catch (e) {
    expect(e).toMatchInlineSnapshot(`[Error: ...]`);
  }

  const v2 = await Tug(async () => 2).exec({});
  expect(v2).toBe(2);
});

test("execEither", async () => {
  const v1 = await Tug(() => {
    throw new Error("...");
  }).execEither({});

  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v2 = await Tug(async () => 2).execEither({});
  expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 2,
}
`);
});

test("as rte", async () => {
  const v1 = await Tug(() => 1).rte({})();
  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 1,
}
`);
});

test("use", async () => {
  const y = Tug(() => 1);
  const z = Tug(() => 2);

  const x = Tug(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  expect(await x.exec({})).toBe(3);
});

test("same ctx", async () => {
  type D = {
    count: number;
  };
  const { Tug } = tugBuilders<D>();
  const y = Tug((d) => d.count * 1);
  const z = Tug(async (d) => d.count * 2);

  const x = Tug(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  expect(
    await x.exec({
      count: 3,
    })
  ).toBe(9);
});

test("different ctx", async () => {
  type D1 = {
    count1: number;
  };
  const { Tug: Tug1 } = tugBuilders<D1>();
  type D2 = {
    count2: number;
  };
  const { Tug: Tug2 } = tugBuilders<D2>();

  const y = Tug1((d: D1) => d.count1 * 1);
  const z = Tug2(async (d) => d.count2 * 2);

  const { Tug: Tug3 } = tugBuilders<D1 & D2>();

  const x = Tug3(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  expect(
    await x.exec({
      count1: 1,
      count2: 2,
    })
  ).toBe(5);
});

test("map", async () => {
  const v1 = await Tug(() => 1)
    .map((it) => it + 1)
    .exec({});
  expect(v1).toBe(2);
});

test("flatMap", async () => {
  const v1 = await Tug(() => 1)
    .flatMap((it) => Tug.of(String(it)))
    .exec({});
  expect(v1).toBe("1");
});

test("tug transform", async () => {
  const v0 = Tug.of(3);
  const v1 = await Tug(() => 1)
    .tug(async (it, ctx) => it + (await ctx.use(v0)))
    .exec({});
  expect(v1).toBe(4);
});

test("chain", async () => {
  const v1 = await Tug(() => 1)
    .chain((it) => Tug.of(String(it)))
    .exec({});
  expect(v1).toBe("1");
});

test("fromRte", async () => {
  const rte = (_deps: {}) => async () => ({ _tag: "Right" as const, right: 1 });
  const v1 = await Tug.fromRte(rte).exec({});
  expect(v1).toBe(1);
});

// TODO: widening
// import { Tug } from "./core";
// import * as User from "./user";

// const getLoggedInUserId = () =>
//   Tug(async (ctx: { currentUserId: () => Promise<string | undefined> }) => {
//     const userId = await ctx.currentUserId();
//     if (userId == null) {
//       throw new Error("User is not logged in");
//     }
//     return userId;
//   });

// export const getLoggedInUser = () =>
//   getLoggedInUserId().chain(User.getUserById);
