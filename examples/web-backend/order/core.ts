import { Tug } from "../../../src/core";
import { Dependencies } from "../core";
import { OrderData } from "./types";

const OrderTug = Tug.depends(Dependencies.Db);

export const getOrdersByUserId = (userId: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Dependencies.Db).db();
    const orders = await db
      .collection<OrderData>("orders")
      .findMany({ userId });
    return orders;
  });

export const getAllOrders = () =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Dependencies.Db).db();
    const orders = await db.collection<OrderData>("orders").findMany();
    return orders;
  });

export const getOrderById = (id: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Dependencies.Db).db();
    const order = await db.collection<OrderData>("orders").findOne({ id });
    if (order == null) {
      throw new Error("order does not exist");
    }
    return order;
  });

export const insertOrder = (order: OrderData) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Dependencies.Db).db();
    const insertedOrder = await db
      .collection<OrderData>("orders")
      .insertOne(order);
    return insertedOrder;
  });

export const deleteOrder = (id: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Dependencies.Db).db();
    const deletedOrder = await db
      .collection<OrderData>("orders")
      .deleteOne({ id });
    return deletedOrder;
  });
