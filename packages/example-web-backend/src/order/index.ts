import { Dependency } from "tug-ts";
import { OrderModuleTugs } from "./core";

export interface OrderModuleT {
    OrderModule: typeof OrderModuleTugs;
}

export const OrderModule = Dependency<OrderModuleT>();
