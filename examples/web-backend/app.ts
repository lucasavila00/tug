import { Dependency, Tug } from "../../src/core";
import { Dependencies } from "./core";
import * as AuthModule from "./auth";
import * as OrderModule from "./order/core";

export const OrderDependency = Dependency<typeof OrderModule>();
export const AuthDependency = Dependency<typeof AuthModule>();

const AppTug = Tug.depends(Dependencies.UserContext)
  .depends(Dependencies.Db)
  .depends(Dependencies.Logger)
  .depends(AuthDependency)
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

    ctx.read(Dependencies.Logger).log(`Deleted order ${deletedData.id}`);
  })
    .provide(OrderDependency, OrderModule)
    .provide(AuthDependency, AuthModule);
