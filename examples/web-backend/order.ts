import { Tug } from "./core";
import { OrderData, UserData } from "./dto";

export const getOrdersByUserId = (userId: string) =>
  Tug(async (ctx) => {
    const db = await ctx.db();
    const orders = await db
      .collection<OrderData>("orders")
      .findMany({ userId });
    return orders;
  });

export const getAllOrders = () =>
  Tug(async (ctx) => {
    const db = await ctx.db();
    const orders = await db.collection<OrderData>("orders").findMany();
    return orders;
  });

export const getOrderById = (id: string) =>
  Tug(async (ctx) => {
    const db = await ctx.db();
    const order = await db.collection<OrderData>("orders").findOne({ id });
    if (order == null) {
      throw new Error("order does not exist");
    }
    return order;
  });

export const insertOrder = (order: OrderData) =>
  Tug(async (ctx) => {
    const db = await ctx.db();
    const insertedOrder = await db
      .collection<OrderData>("orders")
      .insertOne(order);
    return insertedOrder;
  });

export const deleteOrder = (id: string) =>
  Tug(async (ctx) => {
    const db = await ctx.db();
    const deletedOrder = await db
      .collection<OrderData>("orders")
      .deleteOne({ id });
    return deletedOrder;
  });

export const canUserEditOrder = (user: UserData, orderId: string) =>
  Tug(async (ctx) => {
    if (user.isAdmin) {
      return true;
    }
    const order = await ctx.use(getOrderById(orderId));
    return order.userId === user.id;
  });
