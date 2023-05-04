import { TugBuilder } from "../../../src/core";
import { Capacities } from "../core";
import { OrderData } from "./types";

const OrderTug = TugBuilder.depends(Capacities.Database);

const getOrdersByUserId = (userId: string) =>
    OrderTug(async (ctx) => {
        const db = await ctx.read(Capacities.Database).db();
        const orders = await db
            .collection<OrderData>("orders")
            .findMany({ userId });
        return orders;
    });

const getAllOrders = () =>
    OrderTug(async (ctx) => {
        const db = await ctx.read(Capacities.Database).db();
        const orders = await db.collection<OrderData>("orders").findMany();
        return orders;
    });

const getOrderById = (id: string) =>
    OrderTug(async (ctx) => {
        const db = await ctx.read(Capacities.Database).db();
        const order = await db.collection<OrderData>("orders").findOne({ id });
        if (order == null) {
            throw new Error("order does not exist");
        }
        return order;
    });

const insertOrder = (order: OrderData) =>
    OrderTug(async (ctx) => {
        const db = await ctx.read(Capacities.Database).db();
        const insertedOrder = await db
            .collection<OrderData>("orders")
            .insertOne(order);
        return insertedOrder;
    });

const deleteOrder = (id: string) =>
    OrderTug(async (ctx) => {
        const db = await ctx.read(Capacities.Database).db();
        const deletedOrder = await db
            .collection<OrderData>("orders")
            .deleteOne({ id });
        return deletedOrder;
    });

export const OrderModuleTug = {
    getOrdersByUserId,
    getAllOrders,
    getOrderById,
    insertOrder,
    deleteOrder,
};
