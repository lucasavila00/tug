import { Tug } from "../../../src/core";
import { Capacities } from "../core";
import { OrderData } from "./types";

const OrderTug = Tug.depends(Capacities.Db);

const getOrdersByUserId = (userId: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const orders = await db
      .collection<OrderData>("orders")
      .findMany({ userId });
    return orders;
  });

const getAllOrders = () =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const orders = await db.collection<OrderData>("orders").findMany();
    return orders;
  });

const getOrderById = (id: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const order = await db.collection<OrderData>("orders").findOne({ id });
    if (order == null) {
      throw new Error("order does not exist");
    }
    return order;
  });

const insertOrder = (order: OrderData) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const insertedOrder = await db
      .collection<OrderData>("orders")
      .insertOne(order);
    return insertedOrder;
  });

const deleteOrder = (id: string) =>
  OrderTug(async (ctx) => {
    const db = await ctx.read(Capacities.Db).db();
    const deletedOrder = await db
      .collection<OrderData>("orders")
      .deleteOne({ id });
    return deletedOrder;
  });

export const OrderModuleTug = OrderTug((ctx) => ({
  getOrdersByUserId: ctx.useCallback(getOrdersByUserId),
  getAllOrders: ctx.useCallback(getAllOrders),
  getOrderById: ctx.useCallback(getOrderById),
  insertOrder: ctx.useCallback(insertOrder),
  deleteOrder: ctx.useCallback(deleteOrder),
}));
