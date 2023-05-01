import { Tug } from "../../src/core";
import { AuthDependency } from "./auth";
import { Capacities } from "./core";
import { OrderModule } from "./order";
import { UserModule } from "./user";

const AppTug = Tug.depends(Capacities.UserContext)
  .depends(Capacities.Db)
  .depends(Capacities.Logger)
  .depends(AuthDependency)
  .depends(UserModule)
  .depends(OrderModule);

const canCurrentUserEditOrder = (orderId: string) =>
  AppTug(async (ctx) => {
    const Order = ctx.read(OrderModule);
    const Auth = ctx.read(AuthDependency);

    const orderItem = await ctx.use(Order.getOrderById(orderId));
    const user = await ctx.use(Auth.getLoggedInUser());
    return orderItem.userId === user.id;
  });

export const deleteOrderHandler = (id: string) =>
  AppTug(async (ctx) => {
    const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

    if (!canUserEditOrder) {
      throw new Error("User is not owner");
    }
    const deletedData = await ctx.use(ctx.read(OrderModule).deleteOrder(id));

    ctx.read(Capacities.Logger).log(`Deleted order ${deletedData.id}`);
  });

export const app = AppTug(async (ctx) => {
  const deleteOrder = ctx.useCallback(deleteOrderHandler);
  return {
    deleteOrder,
  };
});
