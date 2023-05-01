import { app } from "./app";
import { AuthDependency } from "./auth";
import { Capacities } from "./core";
import { OrderModule } from "./order";
import * as OrderCore from "./order/core";
import * as AuthCore from "./auth/core";
import * as UserCore from "./user/core";
import { UserModule } from "./user";

const connectedApp = app
  .provide(OrderModule, OrderCore)
  .provide(AuthDependency, AuthCore)
  .provide(UserModule, UserCore);

export const start = async () => {
  const handlers = await connectedApp
    .provide(Capacities.Logger, null as any)
    .provide(Capacities.Db, null as any)
    .provide(Capacities.UserContext, null as any)
    .exec();

  const deleteOrder = handlers.deleteOrder;

  console.log(deleteOrder);
};
