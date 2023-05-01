import { Tug } from "../../src/core";
import * as User from "./user";

const getLoggedInUserId = () =>
  Tug(async (ctx: { currentUserId: () => Promise<string | undefined> }) => {
    const userId = await ctx.currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

export const getLoggedInUser = () =>
  getLoggedInUserId().chain(User.getUserById);
