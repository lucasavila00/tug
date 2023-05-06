import { TugBuilder } from "../../../src/core";
import { Capacities } from "../core";
import { UserData } from "./types";

const UserTug = TugBuilder.depends(Capacities.Database);

const getUserById = (id: string) =>
    UserTug.try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const user = await db.collection<UserData>("users").findOne({ id });
        if (user == null) {
            throw new Error("user does not exist");
        }
        return user;
    });

const getAllUsers = () =>
    UserTug.try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const users = await db.collection<UserData>("users").findMany();
        return users;
    });

const insertUser = (user: UserData) =>
    UserTug.try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const insertedUser = await db
            .collection<UserData>("users")
            .insertOne(user);
        return insertedUser;
    });

export const UserModuleTug = {
    getUserById,
    getAllUsers,
    insertUser,
};
