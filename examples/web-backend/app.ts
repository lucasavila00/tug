import { Tug } from "../../src/core";
import { AuthModule } from "./auth";
import { OrderModule } from "./order";

const AppTug = Tug.depends(AuthModule).depends(OrderModule);

const canCurrentUserEditOrder = (orderId: string) =>
  AppTug(async (ctx) => {
    const orderItem = await ctx.read(OrderModule).getOrderById(orderId);
    const user = await ctx.read(AuthModule).getLoggedInUser();
    return orderItem.userId === user.id;
  });

export const deleteOrderHandler = (id: string) =>
  AppTug(async (ctx) => {
    const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

    if (!canUserEditOrder) {
      throw new Error("User is not owner");
    }
    await ctx.read(OrderModule).deleteOrder(id);
  });

export const app = AppTug(async (ctx) => {
  const deleteOrder = ctx.useCallback(deleteOrderHandler);
  return {
    deleteOrder,
  };
});
