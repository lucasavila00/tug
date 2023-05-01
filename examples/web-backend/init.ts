import { app } from "./app";
import { AuthDependency } from "./auth";
import { Capacities } from "./core";
import { OrderDependency } from "./order";
import * as OrderModule from "./order/core";
import * as AuthModule from "./auth/core";
import * as UserModule from "./user/core";
import { UserDependency } from "./user";

const connectedApp = app
  .provide(OrderDependency, OrderModule)
  .provide(AuthDependency, AuthModule)
  .provide(UserDependency, UserModule);

export const start = async () => {
  const handlers = await connectedApp
    .provide(Capacities.Logger, null as any)
    .provide(Capacities.Db, null as any)
    .provide(Capacities.UserContext, null as any)
    .exec();

  const deleteOrder = handlers.deleteOrder;

  console.log(deleteOrder);
};
