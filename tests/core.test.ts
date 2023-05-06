import { expect, test } from "@jest/globals";
import { Dependency, TugBuilder, Tug, TugUncaughtException } from "../src/core";

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const FALSE: boolean = false;

test("resolves", async () => {
    const v1 = await TugBuilder(() => 1).execOrThrow();
    expect(v1).toBe(1);

    const v2 = await TugBuilder(async () => 2).execOrThrow();
    expect(v2).toBe(2);

    const v3 = await TugBuilder.of(3).execOrThrow();
    expect(v3).toBe(3);

    type D = {
        count: number;
    };
    const DDep = Dependency<D>();
    const tug31: Tug<void, D, TugUncaughtException, number> = TugBuilder.of(3);
    const v31 = await tug31.provide(DDep, { count: 1 }).execOrThrow();
    expect(v31).toBe(3);

    const v4 = await TugBuilder.right(4).execOrThrow();
    expect(v4).toBe(4);
});

test("catches", async () => {
    const v0 = await TugBuilder(() => {
        throw new Error("...");
    }).execEither();
    expect(v0).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": [Error: ...],
          },
        }
    `);

    const v1 = await TugBuilder(() => {
        throw new Error("...");
    }).execEither();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": [Error: ...],
          },
        }
    `);

    const v2 = await TugBuilder(() => {
        return Promise.reject(new Error("..."));
    }).execEither();
    expect(v2).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": [Error: ...],
          },
        }
    `);

    const v3 = await TugBuilder.throws((it): it is Error => it instanceof Error)
        .left(new Error("..."))
        .execEither();
    expect(v3).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": [Error: ...],
        }
    `);
});

test("exec", async () => {
    try {
        await TugBuilder(() => {
            throw new Error("...");
        }).execOrThrow();
        expect(1).toBe(2);
    } catch (e) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(e).toMatchInlineSnapshot(`[Error: ...]`);
    }

    const v2 = await TugBuilder(async () => 2).execOrThrow();
    expect(v2).toBe(2);
});

test("invalid tug builder", async () => {
    try {
        //@ts-expect-error
        TugBuilder.invalid;
        expect(1).toBe(2);
    } catch (e) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(e).toMatchInlineSnapshot(
            `[Error: TugBuilder does not have a property named "invalid"]`
        );
    }

    const v2 = await TugBuilder(async () => 2).execOrThrow();
    expect(v2).toBe(2);
});

test("execEither", async () => {
    const v1 = await TugBuilder(() => {
        throw new Error("...");
    }).execEither();

    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": [Error: ...],
          },
        }
    `);

    const v2 = await TugBuilder(async () => 2).execEither();
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
    const y = TugBuilder(() => 1);
    const z = TugBuilder(() => 2);

    const x = TugBuilder.depends(DDep)(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b + ctx.count;
    }).provide(DDep, { count: 1 });

    expect(await x.execOrThrow()).toBe(4);
});

test("same ctx", async () => {
    type D = {
        count: number;
    };
    const DDep = Dependency<D>();

    const DTug = TugBuilder.depends(DDep);

    const y = DTug((ctx) => ctx.count * 1);

    const z = DTug(async (ctx) => ctx.count * 2);

    const x = DTug(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b;
    });

    if (FALSE) {
        //@ts-expect-error

        x.execOrThrow();
    }

    expect(
        await x
            .provide(DDep, {
                count: 1,
            })
            .execOrThrow()
    ).toBe(3);
});

test("missing ctx", async () => {
    type D2 = {
        count2: number;
    };
    const D2Dep = Dependency<D2>();

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count2 * 2);

    TugBuilder(async (ctx) => {
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
        .depends(D2Dep)(async (ctx) => {
            const a = ctx.count;
            const b = ctx.count2;
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
            .execOrThrow()
    ).toBe(3);
});

test("different ctx, same tug err", async () => {
    type D1 = {
        count: number;
    };
    const D1Dep = Dependency<D1>();

    TugBuilder.depends(D1Dep)(async (ctx) => {
        const a = ctx.count;
        //@ts-expect-error
        const b = ctx.count2;
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

    const y = TugBuilder.depends(D1Dep)((ctx) => ctx.count * 1);

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count2 * 2);

    const x = TugBuilder.depends(D1Dep).depends(D2Dep)(async (ctx) => {
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
            .execOrThrow()
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

    const y = TugBuilder.depends(D1Dep)((ctx) => ctx.count * 1);

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count2 * 2);

    const x = y.chain((a) => z.thenn((b) => a + b));

    expect(
        await x
            .provide(D1Dep, {
                count: 1,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .execOrThrow()
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

    const y = TugBuilder.depends(D1Dep)((ctx) => ctx.count * 1).provide(D1Dep, {
        count: 1,
    });

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count2 * 2);

    const x = y.chain((a) => z.thenn((b) => a + b));

    expect(
        await x
            .provide(D1Dep, {
                count: 100,
            })
            .provide(D2Dep, {
                count2: 2,
            })
            .execOrThrow()
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

    const y = TugBuilder.depends(D1Dep)((ctx) => ctx.count * 1);

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count * 2);

    //@ts-expect-error
    TugBuilder.depends(D1Dep).depends(D2Dep)(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b;
    });
    expect(1).toBe(1);
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

    const y = TugBuilder.depends(D1Dep)((ctx) => {
        return ctx.count1 * 1;
    }).provide(D1Dep, {
        count1: 1,
    });

    const z = TugBuilder.depends(D2Dep)(async (ctx) => ctx.count2 * 2).provide(
        D2Dep,
        {
            count2: 2,
        }
    );

    const x = TugBuilder(async (ctx) => {
        const a = await ctx.use(y);
        const b = await ctx.use(z);
        return a + b;
    });

    expect(await x.execOrThrow()).toBe(5);
});

test("map", async () => {
    const v1 = await TugBuilder(() => 1)
        .thenn((it) => it + 1)
        .execOrThrow();
    expect(v1).toBe(2);
});

test("flatMap", async () => {
    const v1 = await TugBuilder(() => 1)
        .flatMap((it) => TugBuilder.of(String(it)))
        .execOrThrow();
    expect(v1).toBe("1");
});

test("tug transform", async () => {
    const v0 = TugBuilder.of(3);
    const v1 = await TugBuilder(() => 1)
        .thenn(async (it, ctx) => it + (await ctx.use(v0)))
        .execOrThrow();
    expect(v1).toBe(4);
});

test("chain", async () => {
    const v1 = await TugBuilder(() => 1)
        .chain((it) => TugBuilder.of(String(it)))
        .execOrThrow();
    expect(v1).toBe("1");
});

test("stateful", async () => {
    const v0 = TugBuilder.stateful<string>()((ctx) => ctx.readState())
        .chain((it) => TugBuilder.of(String(it)))
        .provideState("asd");

    expect(await v0.execOrThrow()).toBe("asd");

    const v01 = await TugBuilder.stateful<string>()((ctx) => ctx.readState())
        .thenn(async (it, ctx) => it + (await ctx.use(v0)))
        .provideState("def")
        .execOrThrow();
    expect(v01).toBe("defasd");

    const v10 = TugBuilder.stateful<string>()((ctx) => ctx.readState()).chain(
        (it) => TugBuilder.of(String(it))
    );

    expect(await v10.execOrThrow("asd")).toBe("asd");

    const v101 = await TugBuilder.stateful<string>()((ctx) => ctx.readState())
        .thenn(async (it, ctx) => it + (await ctx.use(v10)))
        .provideState("xx")
        .execOrThrow();
    expect(v101).toBe("xxxx");

    const v1 = await TugBuilder.stateful<string>()(() => 1)
        .chain((it) => TugBuilder.of(String(it)))
        .execOrThrow("asd");
    expect(v1).toBe("1");

    const v2 = await TugBuilder.stateful<string>()(() => 1)
        .chain((it) => TugBuilder.stateful<string>().of(String(it)))
        .execOrThrow("asd");
    expect(v2).toBe("1");

    TugBuilder.stateful<string>()(() => 1)
        .chain((it) => TugBuilder.stateful<number>().of(String(it)))
        //@ts-expect-error
        .execOrThrow("asd");
});

test("stateful2", async () => {
    const v1 = await TugBuilder.stateful<string>()((ctx) =>
        ctx.readState()
    ).execOrThrow("asd");
    expect(v1).toBe("asd");

    const v2 = await TugBuilder.stateful<string>()((ctx) => ctx.setState("def"))
        .thenn((_it, ctx) => ctx.readState())
        .execOrThrow("asd");
    expect(v2).toBe("def");
});

test("exec safe", async () => {
    const v1 = await TugBuilder(() => 1)
        .chain((it) => TugBuilder.of(String(it)))
        .or((_err) => {
            return "";
        })
        .exec();
    expect(v1).toBe("1");
});

test("map left", async () => {
    const v1 = await TugBuilder.throws((it): it is "a" => it === "a")
        .of("x")
        .thenn(() => {
            throw "a";
        })
        .mapLeft((_it) => "b" as const)
        .execEither();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "right": "b",
        }
    `);
});

test("map left 2", async () => {
    const v1 = await TugBuilder.of("x")
        .mapLeft((_it) => "b" as const)
        .execEither();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Right",
          "right": "x",
        }
    `);
});
test("fold", async () => {
    const v1 = await TugBuilder.throws((it): it is "a" => it === "a")
        .of("x")
        .thenn(() => {
            throw "a";
        })
        .fold(
            (_it) => TugBuilder.of(1),
            (_it) => TugBuilder.of(123)
        )
        .thenn(() => {
            throw "b";
        })
        .execEither();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": "b",
          },
        }
    `);
});
test("thenn throws", async () => {
    const v1 = await TugBuilder.throws((it): it is "a" => it === "a")
        .of("x")
        .thenn(async (_it, ctx) => {
            ctx.use(
                //@ts-expect-error
                TugBuilder.throws((it): it is "b" => it === "b").left("b")
            );
            throw "a";
        })
        .execEither();
    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": "a",
        }
    `);
});
test("chain left 2", async () => {
    const v2 = await TugBuilder.throws((it): it is "a" => it === "a")
        .of("x")
        .thenn((_it) => {
            throw "b";
        })
        .execEither();
    expect(v2).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": TugUncaughtException {
            "content": "b",
          },
        }
    `);
});
test("chain left", async () => {
    class MyError {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        __tag: "MyError";
    }

    const v1 = await TugBuilder.throws((it): it is "a" => it === "a")
        .of("a")
        .chain((_it) =>
            TugBuilder.throws((it): it is "b" => it === "b").left("b")
        )
        .execEither();

    expect(v1).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": "b",
        }
    `);

    class OtherError {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        __tag: "OtherError";
    }

    // @ts-expect-error
    TugBuilder.throws(MyError).left(new OtherError("a"));

    const v2 = await TugBuilder
        //@ts-expect-error
        .left(new MyError("a"))
        .chain((it) => TugBuilder.of(String(it)))
        .execEither();

    expect(v2).toMatchInlineSnapshot(`
        {
          "_tag": "Left",
          "left": MyError {},
        }
    `);
});

test("or", async () => {
    const v1 = await TugBuilder.of(1)
        .or(() => 2)
        .execOrThrow();
    expect(v1).toBe(1);

    const v2 = await TugBuilder(() => {
        throw 1;
    })
        .or((_e) => 2)
        .execOrThrow();
    expect(v2).toBe(2);
});
