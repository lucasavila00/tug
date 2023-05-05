import { TugBuilder } from "../../../src/core";
import { Capacities } from "../core";
import { UserModule } from "../user";

const AuthTug = TugBuilder.depends(Capacities.UserContext).depends(UserModule);

const getLoggedInUserId = () =>
    AuthTug(async (ctx) => {
        const userId = await ctx.UserContext.currentUserId();
        if (userId == null) {
            throw new Error("User is not logged in");
        }
        return userId;
    });

const getLoggedInUser = () =>
    getLoggedInUserId()
        .thenn((userId, ctx) => ctx.UserModule.getUserById(userId))
        .chain((it) => it);

export const AuthModuleTug = {
    getLoggedInUser,
};
