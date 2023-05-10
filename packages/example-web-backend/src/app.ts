import { Tug, TugBuilder } from "tug-ts";
import { AuthModule } from "./auth";
import { OrderModule } from "./order";
import { Capacities } from "./core";
import { UserModule } from "./user";

const canCurrentUserEditOrder = (orderId: string) =>
    TugBuilder.depends(AuthModule)
        .depends(OrderModule)
        .ofDeps()
        .bind("orderItem", (acc) => acc.deps.OrderModule.getOrderById(orderId))
        .bind("currentUser", (acc) => acc.deps.AuthModule.getLoggedInUser())
        .try(
            (acc) => acc.orderItem.userId === acc.currentUser.id
        ) satisfies Tug<any, boolean>;

export const deleteOrderHandler = (id: string) =>
    canCurrentUserEditOrder(id).flatMap((canUserEditOrder, ctx) => {
        if (canUserEditOrder) {
            return ctx.deps.OrderModule.deleteOrder(id);
        }
        return TugBuilder.left(new Error("User is not owner"));
    });

// Try can't widen the dependency types, so we need to do it manually
export const deleteOrderHandlerTry = (id: string) =>
    TugBuilder.depends(OrderModule)
        .depends(AuthModule)
        .depends(UserModule)
        .depends(Capacities.Database)
        .depends(Capacities.Logger)
        .depends(Capacities.UserContext)
        .try(async (ctx) => {
            const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));
            if (!canUserEditOrder) {
                throw new Error("User is not owner");
            }
            return ctx.use(ctx.deps.OrderModule.deleteOrder(id));
        });

export const app = {
    deleteOrder: deleteOrderHandler,
};
