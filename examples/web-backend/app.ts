import { Tfx } from "../../src/core";
import { getLoggedInUser } from "./auth";
import { WebCtx } from "./core";
import * as Order from "./order";

const canCurrentUserEditOrder = (orderId: string) =>
  getLoggedInUser().chain((userId) => Order.canUserEditOrder(userId, orderId));

export const deleteOrderHandler = (id: string) =>
  Tfx(async (ctx: WebCtx) => {
    const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

    if (!canUserEditOrder) {
      throw new Error("User is not owner");
    }

    const deletedData = await ctx.use(Order.deleteOrder(id));

    ctx.logger.log(`Deleted order ${deletedData.id}`);
  });
