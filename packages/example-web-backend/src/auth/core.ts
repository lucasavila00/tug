import { TugBuilder } from "tug-ts";
import { Capacities } from "../core";
import { UserModule } from "../user";

const getLoggedInUserId = () =>
    TugBuilder.depends(Capacities.UserContext).try(async (ctx) => {
        const userId = await ctx.deps.UserContext.currentUserId();
        if (userId == null) {
            throw new Error("User is not logged in");
        }
        return userId;
    });

const getLoggedInUser = () =>
    getLoggedInUserId()
        .depends(UserModule)
        .flatMap((userId, ctx) => ctx.deps.UserModule.getUserById(userId));

export const AuthModuleTugs = {
    getLoggedInUser,
};
