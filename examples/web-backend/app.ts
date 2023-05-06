import { AuthModule } from "./auth";
import { AllCapacitiesTug } from "./core";
import { OrderModule } from "./order";
import { UserModule } from "./user";

const AppTug = AllCapacitiesTug.depends(AuthModule)
    .depends(OrderModule)
    .depends(UserModule);

const canCurrentUserEditOrder = (orderId: string) =>
    AppTug.try(async (ctx) => {
        const orderItem = await ctx.use(
            ctx.deps.OrderModule.getOrderById(orderId)
        );
        const user = await ctx.use(ctx.deps.AuthModule.getLoggedInUser());
        return orderItem.userId === user.id;
    });

export const deleteOrderHandler = (id: string) =>
    AppTug.try(async (ctx) => {
        const canUserEditOrder = await ctx.use(canCurrentUserEditOrder(id));

        if (!canUserEditOrder) {
            throw new Error("User is not owner");
        }
        await ctx.use(ctx.deps.OrderModule.deleteOrder(id));
    });

export const app = {
    deleteOrder: deleteOrderHandler,
};
