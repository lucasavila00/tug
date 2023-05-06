import { TugBuilder } from "../../../src/core";
import { Capacities } from "../core";
import { UserModule } from "../user";

const AuthTug = TugBuilder.depends(Capacities.UserContext).depends(UserModule);

const getLoggedInUserId = () =>
    AuthTug.try(async (ctx) => {
        const userId = await ctx.deps.UserContext.currentUserId();
        if (userId == null) {
            throw new Error("User is not logged in");
        }
        return userId;
    });

const getLoggedInUser = () =>
    getLoggedInUserId().chain((userId, ctx) =>
        ctx.deps.UserModule.getUserById(userId)
    );

export const AuthModuleTug = {
    getLoggedInUser,
};
