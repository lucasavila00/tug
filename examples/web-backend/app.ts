import { Tug } from "./core";
import { getLoggedInUser } from "./auth";

import * as Order from "./order";

const canCurrentUserEditOrder = (orderId: string) =>
  getLoggedInUser().chain((userId) => Order.canUserEditOrder(userId, orderId));

export const deleteOrderHandler = (id: string) =>
  Tug(async (ctx) => {
    const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

    if (!canUserEditOrder) {
      throw new Error("User is not owner");
    }

    const deletedData = await ctx.use(Order.deleteOrder(id));

    ctx.logger.log(`Deleted order ${deletedData.id}`);
  });
