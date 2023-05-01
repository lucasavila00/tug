import { Tug } from "../../../src/core";
import { Capacities } from "../core";
import { UserData } from "./types";

const UserTug = Tug.depends(Capacities.Db);

export const getUserById = (id: string) =>
  UserTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const user = await db.collection<UserData>("users").findOne({ id });
    if (user == null) {
      throw new Error("user does not exist");
    }
    return user;
  });

export const getAllUsers = () =>
  UserTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const users = await db.collection<UserData>("users").findMany();
    return users;
  });

export const insertUser = (user: UserData) =>
  UserTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const insertedUser = await db.collection<UserData>("users").insertOne(user);
    return insertedUser;
  });