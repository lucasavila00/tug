- [ ] throw instance method
- [ ] thenn (maybe map?)
- [ ] chainFirst (todo: verify fp-ts behaviour)

- [ ] callback tests
- [ ] JTD
- [ ] docs


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
