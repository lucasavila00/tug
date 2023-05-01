import { app } from "./app";
import { AuthModule } from "./auth";
import { Capacities, CapacitiesTug } from "./core";
import { OrderModule } from "./order";
import { OrderModuleTug } from "./order/core";
import { UserModuleTug } from "./user/core";
import { UserModule } from "./user";
import { AuthModuleTug } from "./auth/core";

export const connectedApp = CapacitiesTug.flat(async (ctx) => {
  const userModule = await ctx.use(UserModuleTug);
  const authModule = await ctx.use(
    AuthModuleTug.provide(UserModule, userModule)
  );
  const orderModule = await ctx.use(OrderModuleTug);
  return app.provide(OrderModule, orderModule).provide(AuthModule, authModule);
});

export const start = async () => {
  const handlers = await connectedApp
    .provide(Capacities.Logger, null as any)
    .provide(Capacities.Db, null as any)
    .provide(Capacities.UserContext, null as any)
    .exec();

  const deleteOrder = handlers.deleteOrder;

  console.log(deleteOrder);
};
