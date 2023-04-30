import { describe, expect, test } from "@jest/globals";
import { Tfx, tfx } from "../src/core";

describe("Tfx constructor", () => {
  test("resolves", async () => {
    const v1 = await Tfx(() => 1).exec({});
    expect(v1).toBe(1);

    const v2 = await Tfx(async () => 2).exec({});
    expect(v2).toBe(2);
  });

  test("catches", async () => {
    const v1 = await Tfx(() => {
      throw new Error("...");
    }).execEither({});
    expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

    const v2 = await Tfx(() => {
      return Promise.reject(new Error("..."));
    }).execEither({});
    expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);
  });

  test("exec", async () => {
    try {
      await Tfx(() => {
        throw new Error("...");
      }).exec({});
      expect(1).toBe(2);
    } catch (e) {
      expect(e).toMatchInlineSnapshot(`[Error: ...]`);
    }

    const v2 = await Tfx(async () => 2).exec({});
    expect(v2).toBe(2);
  });

  test("execEither", async () => {
    const v1 = await Tfx(() => {
      throw new Error("...");
    }).execEither({});

    expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

    const v2 = await Tfx(async () => 2).execEither({});
    expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 2,
}
`);
  });
});

test("as rte", async () => {
  const v1 = await Tfx(() => 1)({})();
  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 1,
}
`);
});

test("use", async () => {
  const y = Tfx(() => 1);
  const z = Tfx(() => 2);

  const x = Tfx(async (ctx) => {
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
  const y: tfx<D, number> = Tfx((d) => d.count * 1);
  const z: tfx<D, number> = Tfx(async (d) => d.count * 2);

  const x: tfx<D, number> = Tfx(async (ctx) => {
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
  type D2 = {
    count2: number;
  };
  const y: tfx<D1, number> = Tfx((d) => d.count1 * 1);
  const z: tfx<D2, number> = Tfx(async (d) => d.count2 * 2);

  const x: tfx<D1 & D2, number> = Tfx(async (ctx) => {
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
