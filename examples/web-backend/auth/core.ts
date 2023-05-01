import { Tug } from "../../../src/core";
import { Capacities } from "../core";
import { UserModule } from "../user";

const AuthTug = Tug.depends(Capacities.UserContext).depends(UserModule);

const getLoggedInUserId = () =>
  AuthTug(async (ctx) => {
    const userId = await ctx.read(Capacities.UserContext).currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

const getLoggedInUser = () =>
  getLoggedInUserId().tug((it, ctx) => ctx.read(UserModule).getUserById(it));

export const AuthModuleTug = AuthTug((ctx) => ({
  getLoggedInUser: ctx.useCallback(getLoggedInUser),
}));
