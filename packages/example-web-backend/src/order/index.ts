import { Dependency } from "tug-ts";
import { OrderModuleTug } from "./core";

export interface OrderModuleT {
    OrderModule: typeof OrderModuleTug;
}

export const OrderModule = Dependency<OrderModuleT>();
