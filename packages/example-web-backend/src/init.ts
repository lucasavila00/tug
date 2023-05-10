import { app } from "./app";
import { AuthModule } from "./auth";
import { Capacities } from "./core";
import { OrderModule } from "./order";
import { OrderModuleTugs } from "./order/core";
import { UserModuleTugs } from "./user/core";
import { UserModule } from "./user";
import { AuthModuleTugs } from "./auth/core";
import { callbacks } from "tug-ts/dist/callbacks";

export const start = async () => {
    const connectedApp = callbacks(app)
        .provide(OrderModule, { OrderModule: OrderModuleTugs })
        .provide(UserModule, { UserModule: UserModuleTugs })
        .provide(AuthModule, { AuthModule: AuthModuleTugs })
        .provide(Capacities.Logger, null as any)
        .provide(Capacities.Database, null as any);

    const handled = await connectedApp
        .deleteOrder("123")
        .provide(Capacities.UserContext, null as any)
        .exec.orThrow();

    // eslint-disable-next-line no-console
    console.log(handled.id);
};
