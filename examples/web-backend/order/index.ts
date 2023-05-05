import { Dependency } from "../../../src/core";
import { OrderModuleTug } from "./core";

export interface OrderModuleT {
    OrderModule: typeof OrderModuleTug;
}

export const OrderModule = Dependency<OrderModuleT>();
