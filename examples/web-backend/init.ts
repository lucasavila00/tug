import { app } from "./app";
import { AuthModule } from "./auth";
import { Capacities } from "./core";
import { OrderModule } from "./order";
import { OrderModuleTug } from "./order/core";
import { UserModuleTug } from "./user/core";
import { UserModule } from "./user";
import { AuthModuleTug } from "./auth/core";
import { callbacks } from "../../src/callbacks";

export const start = async () => {
    const connectedApp = callbacks(app)
        .provide(OrderModule, OrderModuleTug)
        .provide(UserModule, UserModuleTug)
        .provide(AuthModule, AuthModuleTug)
        .provide(Capacities.Logger, null as any)
        .provide(Capacities.Database, null as any);

    const handled = await connectedApp
        .deleteOrder("123")
        .provide(Capacities.UserContext, null as any)
        .exec();

    // const deleteOrder = handlers.deleteOrder;

    console.log(handled);
};
