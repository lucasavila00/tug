import { Tfx } from "../../src/core";
import { WebTfx } from "./core";
import { UserData } from "./dto";

export const getUserById = (id: string): WebTfx<UserData> =>
  Tfx(async (ctx) => {
    const db = await ctx.db();
    const user = await db.collection<UserData>("users").findOne({ id });
    if (user == null) {
      throw new Error("user does not exist");
    }
    return user;
  });

export const getAllUsers = (): WebTfx<UserData[]> =>
  Tfx(async (ctx) => {
    const db = await ctx.db();
    const users = await db.collection<UserData>("users").findMany();
    return users;
  });

export const insertUser = (user: UserData): WebTfx<UserData> =>
  Tfx(async (ctx) => {
    const db = await ctx.db();
    const insertedUser = await db.collection<UserData>("users").insertOne(user);
    return insertedUser;
  });
