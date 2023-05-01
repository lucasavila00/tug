import { Tug } from "../../../src/core";
import { Capacities } from "../core";
import { UserDependency } from "../user";

const AuthTug = Tug.depends(Capacities.UserContext)
  .depends(Capacities.Db)
  .depends(UserDependency);

const getLoggedInUserId = () =>
  AuthTug(async (ctx) => {
    const userId = await ctx.read(Capacities.UserContext).currentUserId();
    if (userId == null) {
      throw new Error("User is not logged in");
    }
    return userId;
  });

export const getLoggedInUser = () =>
  getLoggedInUserId().tug(async (it, ctx) => {
    const UserModule = ctx.read(UserDependency);
    return await ctx.use(UserModule.getUserById(it));
  });
