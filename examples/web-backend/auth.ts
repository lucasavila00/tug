import { Tfx } from "../../src/core";
import * as User from "./user";

const getLoggedInUserId = () =>
  Tfx(async (ctx: { currentUserId: () => Promise<string | undefined> }) => {
    const userId = await ctx.currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

export const getLoggedInUser = () =>
  getLoggedInUserId().chain(User.getUserById);
