import { Tug } from "../../src/core";
import { Dependencies } from "./core";
import * as User from "./user";

const AuthTug = Tug.depends(Dependencies.UserContext);

const getLoggedInUserId = () =>
  AuthTug(async (ctx) => {
    const userId = await ctx.read(Dependencies.UserContext).currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

export const getLoggedInUser = () =>
  getLoggedInUserId().chain((it) => User.getUserById(it));
