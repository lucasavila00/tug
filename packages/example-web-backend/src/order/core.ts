import { TugBuilder } from "tug-ts";
import { Capacities } from "../core";
import { OrderData } from "./types";

const getOrdersByUserId = (userId: string) =>
    TugBuilder.depends(Capacities.Database).try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const orders = await db
            .collection<OrderData>("orders")
            .findMany({ userId });
        return orders;
    });

const getAllOrders = () =>
    TugBuilder.depends(Capacities.Database).try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const orders = await db.collection<OrderData>("orders").findMany();
        return orders;
    });

const getOrderById = (id: string) =>
    TugBuilder.depends(Capacities.Database).try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const order = await db.collection<OrderData>("orders").findOne({ id });
        if (order == null) {
            throw new Error("order does not exist");
        }
        return order;
    });

const insertOrder = (order: OrderData) =>
    TugBuilder.depends(Capacities.Database).try(async (ctx) => {
        const db = await ctx.deps.Database.getInstance();
        const insertedOrder = await db
            .collection<OrderData>("orders")
            .insertOne(order);
        return insertedOrder;
    });

const deleteOrder = (id: string) =>
    TugBuilder.depends(Capacities.Database)
        .depends(Capacities.Logger)
        .try(async (ctx) => {
            const db = await ctx.deps.Database.getInstance();
            const deletedOrder = await db
                .collection<OrderData>("orders")
                .deleteOne({ id });

            ctx.deps.Logger.log("Order deleted: " + id);
            return deletedOrder;
        });

export const OrderModuleTugs = {
    getOrdersByUserId,
    getAllOrders,
    getOrderById,
    insertOrder,
    deleteOrder,
};
