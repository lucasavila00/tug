import { expect, test } from "@jest/globals";
import { CreateContext, Dependency, Tug } from "../src/core";

test("resolves", async () => {
  const v1 = await Tug(() => 1).exec();
  expect(v1).toBe(1);

  const v2 = await Tug(async () => 2).exec();
  expect(v2).toBe(2);

  const v3 = await Tug.of(3).exec();
  expect(v3).toBe(3);

  const v4 = await Tug.right(4).exec();
  expect(v4).toBe(4);
});

test("catches", async () => {
  const v1 = await Tug(() => {
    throw new Error("...");
  }).execEither();
  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v2 = await Tug(() => {
    return Promise.reject(new Error("..."));
  }).execEither();
  expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v3 = await Tug.left(new Error("...")).execEither();
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
    }).exec();
    expect(1).toBe(2);
  } catch (e) {
    expect(e).toMatchInlineSnapshot(`[Error: ...]`);
  }

  const v2 = await Tug(async () => 2).exec();
  expect(v2).toBe(2);
});

test("execEither", async () => {
  const v1 = await Tug(() => {
    throw new Error("...");
  }).execEither();

  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Left",
  "left": [Error: ...],
}
`);

  const v2 = await Tug(async () => 2).execEither();
  expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 2,
}
`);
});

test("use", async () => {
  type D = {
    count: number;
  };
  const DDep = Dependency<D>();
  const y = Tug(() => 1);
  const z = Tug(() => 2);

  const x = Tug.depends(DDep)(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b + ctx.read(DDep).count;
  }).provide(DDep, { count: 1 });

  expect(await x.exec()).toBe(4);
});

test("same ctx", async () => {
  type D = {
    count: number;
  };
  const DDep = Dependency<D>();

  const DTug = Tug.depends(DDep);

  const y = DTug((ctx) => ctx.read(DDep).count * 1);

  const z = DTug(async (ctx) => ctx.read(DDep).count * 2);

  const x = DTug(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  if (1 < 0) {
    //@ts-expect-error
    x.exec();
  }

  expect(
    await x
      .provide(DDep, {
        count: 1,
      })
      .exec()
  ).toBe(3);
});

test("missing ctx", async () => {
  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const z = Tug.depends(D2Dep)(async (ctx) => ctx.read(D2Dep).count2 * 2);

  Tug(async (ctx) => {
    //@ts-expect-error
    await ctx.use(z);
  });
});

test("different ctx, same tug", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const x = Tug.depends(D1Dep).depends(D2Dep)(async (ctx) => {
    const a = ctx.read(D1Dep).count;
    const b = ctx.read(D2Dep).count2;
    return a + b;
  });

  expect(
    await x
      .provide(D1Dep, {
        count: 1,
      })
      .provide(D2Dep, {
        count2: 2,
      })
      .exec()
  ).toBe(3);
});

test("different ctx, same tug err", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  Tug.depends(D1Dep)(async (ctx) => {
    const a = ctx.read(D1Dep).count;
    //@ts-expect-error
    const b = ctx.read(D2Dep).count2;
    return a + b;
  });
});

test("different ctx", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const y = Tug.depends(D1Dep)((ctx) => ctx.read(D1Dep).count * 1);

  const z = Tug.depends(D2Dep)(async (ctx) => ctx.read(D2Dep).count2 * 2);

  const x = Tug.depends(D1Dep).depends(D2Dep)(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  expect(
    await x
      .provide(D1Dep, {
        count: 1,
      })
      .provide(D2Dep, {
        count2: 2,
      })
      .exec()
  ).toBe(5);
});

test("different ctx chain", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const y = Tug.depends(D1Dep)((ctx) => ctx.read(D1Dep).count * 1);

  const z = Tug.depends(D2Dep)(async (ctx) => ctx.read(D2Dep).count2 * 2);

  const x = y.chain((a) => z.map((b) => a + b));

  expect(
    await x
      .provide(D1Dep, {
        count: 1,
      })
      .provide(D2Dep, {
        count2: 2,
      })
      .exec()
  ).toBe(5);
});

test("different ctx chain provided", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const y = Tug.depends(D1Dep)((ctx) => ctx.read(D1Dep).count * 1).provide(
    D1Dep,
    {
      count: 1,
    }
  );

  const z = Tug.depends(D2Dep)(async (ctx) => ctx.read(D2Dep).count2 * 2);

  const x = y.chain((a) => z.map((b) => a + b));

  expect(
    await x
      .provide(D1Dep, {
        count: 100,
      })
      .provide(D2Dep, {
        count2: 2,
      })
      .exec()
  ).toBe(5);
});

test("collision err", async () => {
  type D1 = {
    count: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count: number;
  };
  const D2Dep = Dependency<D2>();

  const y = Tug.depends(D1Dep)((ctx) => ctx.read(D1Dep).count * 1);

  const z = Tug.depends(D2Dep)(async (ctx) => ctx.read(D2Dep).count * 2);

  //@ts-expect-error
  Tug.depends(D1Dep).depends(D2Dep)(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });
});

test("different ctx + provide", async () => {
  type D1 = {
    count1: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();

  const y = Tug.depends(D1Dep)((ctx) => {
    return ctx.read(D1Dep).count1 * 1;
  }).provide(D1Dep, {
    count1: 1,
  });

  const z = Tug.depends(D2Dep)(
    async (ctx) => ctx.read(D2Dep).count2 * 2
  ).provide(D2Dep, {
    count2: 2,
  });

  const x = Tug(async (ctx) => {
    const a = await ctx.use(y);
    const b = await ctx.use(z);
    return a + b;
  });

  expect(await x.exec()).toBe(5);
});

test("map", async () => {
  const v1 = await Tug(() => 1)
    .map((it) => it + 1)
    .exec();
  expect(v1).toBe(2);
});

test("flatMap", async () => {
  const v1 = await Tug(() => 1)
    .flatMap((it) => Tug.of(String(it)))
    .exec();
  expect(v1).toBe("1");
});

test("tug transform", async () => {
  const v0 = Tug.of(3);
  const v1 = await Tug(() => 1)
    .tug(async (it, ctx) => it + (await ctx.use(v0)))
    .exec();
  expect(v1).toBe(4);
});

test("chain", async () => {
  const v1 = await Tug(() => 1)
    .chain((it) => Tug.of(String(it)))
    .exec();
  expect(v1).toBe("1");
});

test("as rte", async () => {
  const v1 = await Tug(() => 1).asRte({})();
  expect(v1).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 1,
}
`);
  type D1 = {
    count1: number;
  };
  const D1Dep = Dependency<D1>();

  type D2 = {
    count2: number;
  };
  const D2Dep = Dependency<D2>();
  const v2 = await Tug.depends(D1Dep)
    .depends(D2Dep)((ctx) => ctx.read(D1Dep).count1 + ctx.read(D2Dep).count2)
    .asRte({
      [D1Dep.id]: {
        count1: 1,
      },
      [D2Dep.id]: {
        count2: 2,
      },
    })();
  expect(v2).toMatchInlineSnapshot(`
{
  "_tag": "Right",
  "right": 3,
}
`);
});

// test("fromRte", async () => {
//   const rte = (_deps: {}) => async () => ({ _tag: "Right" as const, right: 1 });
//   const v1 = await Tug.fromRte(rte).exec();
//   expect(v1).toBe(1);
// });

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
