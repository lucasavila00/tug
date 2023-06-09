import { expect, test } from "@jest/globals";
import { Dependency, TugBuilder, TugBuiltBy } from "../src";
import { Tug } from "../src/core";

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const FALSE: boolean = false;

test("resolves", async () => {
    const v1 = await TugBuilder.try(() => 1).exec.orThrow();
    expect(v1).toBe(1);

    const v2 = await TugBuilder.try(async () => 2).exec.orThrow();
    expect(v2).toBe(2);

    const v3 = await TugBuilder.of(3).exec.orThrow();
    expect(v3).toBe(3);

    type D = {
        count: number;
    };
    const DDep = Dependency<D>();
    const tug31: Tug<D, number> = TugBuilder.of(3);
    const v31 = await tug31.provide(DDep, { count: 1 }).exec.orThrow();
    expect(v31).toBe(3);

    const v4 = await TugBuilder.right(4).exec.orThrow();
    expect(v4).toBe(4);
});

test("catches", async () => {
    const v0 = await TugBuilder.try(() => {
        throw new Error("...");
    }).exec.either();
    expect(v0).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);

    const v1 = await TugBuilder.try(() => {
        throw new Error("...");
    }).exec.either();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);

    const v2 = await TugBuilder.try(() => {
        return Promise.reject(new Error("..."));
    }).exec.either();
    expect(v2).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);

    const v3 = await TugBuilder.left(new Error("...")).exec.either();
    expect(v3).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);
});

test("exec", async () => {
    try {
        await TugBuilder.try(() => {
            throw new Error("...");
        }).exec.orThrow();
        expect(1).toBe(2);
    } catch (e) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(e).toMatchInlineSnapshot(`[Error: ...]`);
    }

    const v2 = await TugBuilder.try(async () => 2).exec.orThrow();
    expect(v2).toBe(2);
});

test("catch", async () => {
    const v1 = await TugBuilder.of(123)
        .try(() => {
            throw new Error("...");
            return 123;
        })
        .catch(() => 456)
        .exec.either();

    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Right",
          "right": 456,
        }
    `);
});
test("execEither", async () => {
    const v1 = await TugBuilder.try(() => {
        throw new Error("...");
    }).exec.either();

    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);

    const v2 = await TugBuilder.try(async () => 2).exec.either();
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
    const y = TugBuilder.try(() => 1);
    const z = TugBuilder.try(() => 2);

    const x = TugBuilder.depends(DDep)
        .try(async (ctx) => {
            const a = await ctx.use(y);
            const b = await ctx.use(z);
            return a + b + ctx.deps.count;
        })
        .provide(DDep, { count: 1 });

    expect(await x.exec.orThrow()).toBe(4);
});

test("deps object", async () => {
    type D = {
        count: number;
    };
    const DDep = Dependency<D>();

    const DTug = TugBuilder.depends(DDep);

    const y = DTug.try((ctx) => ctx.deps.count * 1);

    const z = DTug.try(async (ctx) => ctx.deps.count * 2);
    const x = DTug.try(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b;
    });

    expect(
        await x
            .provide(DDep, {
                count: 1,
            })
            .exec.orThrow()
    ).toBe(3);
});

test("same ctx", async () => {
    type D = {
        count: number;
    };
    const DDep = Dependency<D>();

    const DTug = TugBuilder.depends(DDep);

    const y = DTug.try((ctx) => ctx.deps.count * 1);

    const z = DTug.try(async (ctx) => ctx.deps.count * 2);

    type E = {
        count2: number;
    };
    const EDep = Dependency<E>();

    const ETug = DTug.depends(EDep);

    type ETugItem<T> = TugBuiltBy<typeof ETug, T>;

    const w: ETugItem<number> = DTug.try(async (_ctx) => 1);

    type F = {
        count2: number;
    };
    const FDep = Dependency<F>();

    const FTug = ETug.depends(FDep);

    type FTugItem<T> = TugBuiltBy<typeof FTug, T>;

    const printF = (it: FTugItem<number>) => {
        return it;
    };

    printF(y);

    const x = ETug.try(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        const c = await ctx.use(w);
        return a + b + c;
    });

    if (FALSE) {
        //@ts-expect-error

        x.exec.orThrow();
    }

    expect(
        await x
            .provide(DDep, {
                count: 1,
            })
            .provide(EDep, {
                count2: 1,
            })
            .exec.orThrow()
    ).toBe(4);
});

test("missing ctx", async () => {
    type D2 = {
        count2: number;
    };
    const D2Dep = Dependency<D2>();

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count2 * 2);

    TugBuilder.try(async (ctx) => {
        //@ts-expect-error
        await ctx.use(z);
    });
    expect(1).toBe(1);
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

    type D3 = {
        count3: number;
    };
    const D3Dep = Dependency<D3>();

    const x = TugBuilder.depends(D1Dep)
        .depends(D2Dep)
        .try(async (ctx) => {
            const a = ctx.deps.count;
            const b = ctx.deps.count2;
            return a + b;
        })
        .depends(D3Dep);

    expect(
        await x
            .provide(D1Dep, {
                count: 1,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .provide(D3Dep, { count3: 3 })
            .exec.orThrow()
    ).toBe(3);
});

test("different ctx, same tug err", async () => {
    type D1 = {
        count: number;
    };
    const D1Dep = Dependency<D1>();

    TugBuilder.depends(D1Dep).try(async (ctx) => {
        const a = ctx.deps.count;
        //@ts-expect-error
        const b = ctx.deps.count2;
        return a + b;
    });
    expect(1).toBe(1);
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

    const y = TugBuilder.depends(D1Dep).try((ctx) => ctx.deps.count * 1);

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count2 * 2);

    const x = TugBuilder.depends(D1Dep)
        .depends(D2Dep)
        .try(async (ctx) => {
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
            .exec.orThrow()
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

    const y = TugBuilder.depends(D1Dep).try((ctx) => ctx.deps.count * 1);

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count2 * 2);

    const x = y.chain((a) => z.try((b) => a + b));

    expect(
        await x
            .provide(D1Dep, {
                count: 1,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .exec.orThrow()
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

    const y = TugBuilder.depends(D1Dep)
        .try((ctx) => ctx.deps.count * 1)
        .provide(D1Dep, {
            count: 1,
        });

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count2 * 2);

    const x = y.chain((a) => z.try((b) => a + b));

    expect(
        await x
            .provide(D1Dep, {
                count: 100,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .exec.orThrow()
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

    const y = TugBuilder.depends(D1Dep).try((ctx) => ctx.deps.count * 1);

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count * 2);

    TugBuilder.depends(D1Dep)
        .depends(D2Dep)
        .try(async (ctx) => {
            const a = await ctx.use(y);
            const b = await ctx.use(z);
            return a + b;
        });
    expect(1).toBe(1);
});
test("chain widening deps", async () => {
    type D1 = {
        count1: number;
    };
    const D1Dep = Dependency<D1>();

    type D2 = {
        count2: number;
    };
    const D2Dep = Dependency<D2>();

    const y = TugBuilder.depends(D1Dep).try((ctx) => {
        return ctx.deps.count1 * 1;
    });

    const z = TugBuilder.depends(D2Dep).try(async (ctx) => ctx.deps.count2 * 2);

    const ab = y.chain((_it) => z);

    expect(
        await ab
            .provide(D1Dep, {
                count1: 1,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .exec.orThrow()
    ).toBe(4);
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

    const y = TugBuilder.depends(D1Dep)
        .try((ctx) => {
            return ctx.deps.count1 * 1;
        })
        .provide(D1Dep, {
            count1: 1,
        });

    const z = TugBuilder.depends(D2Dep)
        .try(async (ctx) => ctx.deps.count2 * 2)
        .provide(D2Dep, {
            count2: 2,
        });

    const x = TugBuilder.try(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b;
    });

    expect(await x.exec.orThrow()).toBe(5);
});

test("map", async () => {
    const v1 = await TugBuilder.try(() => 1)
        .try((it) => it + 1)
        .exec.orThrow();
    expect(v1).toBe(2);
});

test("flatMap", async () => {
    const v1 = await TugBuilder.try(() => 1)
        .flatMap((it) => TugBuilder.of(String(it)))
        .exec.orThrow();
    expect(v1).toBe("1");
});

test("tug transform", async () => {
    const v0 = TugBuilder.of(3);
    const v1 = await TugBuilder.try(() => 1)
        .try(async (it, ctx) => it + (await ctx.use(v0)))
        .exec.orThrow();
    expect(v1).toBe(4);
});

test("chain", async () => {
    const v1 = await TugBuilder.try(() => 1)
        .chain((it) => TugBuilder.of(String(it)))
        .exec.orThrow();
    expect(v1).toBe("1");
});

test("exec safe", async () => {
    const v1 = await TugBuilder.try(() => 1)
        .chain((it) => TugBuilder.of(String(it)))
        .exec.safe((_err) => {
            return "a" as const;
        });
    expect(v1).toBe("1");

    const v2 = await TugBuilder.of("a")
        .try(() => {
            // eslint-disable-next-line no-constant-condition
            if (true) {
                throw 1;
            }
            return "a";
        })
        .exec.safe((_err) => {
            return "a" as const;
        });
    expect(v2).toBe("a");
});

test("add property", async () => {
    const v2 = await TugBuilder.of({})
        .bind("a", () => TugBuilder.of(1))
        .bind("b", (acc) => TugBuilder.of(acc.a + 1))
        .exec.either();
    expect(v2).toMatchInlineSnapshot(`
        {
          "_tag": "Right",
          "right": {
            "a": 1,
            "b": 2,
          },
        }
    `);
});
test("chain first", async () => {
    const it = await TugBuilder.of(123)
        .chainFirst(() => TugBuilder.left(1))
        .exec.either();
    expect(it).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": 1,
        }
    `);
    const it2 = await TugBuilder.left(2)
        .chainFirst(() => TugBuilder.left(1))
        .exec.either();
    expect(it2).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": 2,
        }
    `);
    const it3 = await TugBuilder.of(2)
        .chainFirst(() => TugBuilder.of(1))
        .exec.either();
    expect(it3).toMatchInlineSnapshot(`
        {
          "_tag": "Right",
          "right": 2,
        }
    `);
});
