import { Tug } from "../../src/core";
import { AuthDependency } from "./auth";
import { Capacities } from "./core";
import { OrderDependency } from "./order";
import { UserDependency } from "./user";

const AppTug = Tug.depends(Capacities.UserContext)
  .depends(Capacities.Db)
  .depends(Capacities.Logger)
  .depends(AuthDependency)
  .depends(UserDependency)
  .depends(OrderDependency);

const canCurrentUserEditOrder = (orderId: string) =>
  AppTug(async (ctx) => {
    const OrderModule = ctx.read(OrderDependency);
    const AuthModule = ctx.read(AuthDependency);

    const orderItem = await ctx.use(OrderModule.getOrderById(orderId));
    const user = await ctx.use(AuthModule.getLoggedInUser());
    return orderItem.userId === user.id;
  });

export const deleteOrderHandler = (id: string) =>
  AppTug(async (ctx) => {
    const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

    if (!canUserEditOrder) {
      throw new Error("User is not owner");
    }
    const OrderModule = ctx.read(OrderDependency);
    const deletedData = await ctx.use(OrderModule.deleteOrder(id));

    ctx.read(Capacities.Logger).log(`Deleted order ${deletedData.id}`);
  });

export const app = AppTug(async (ctx) => {
  const deleteOrder = ctx.useCallback(deleteOrderHandler);
  return {
    deleteOrder,
  };
});
