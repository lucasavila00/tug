import { Dependency } from "../../../src/core";
import { OrderModuleTug } from "./core";

export type OrderModuleTug = typeof OrderModuleTug;
export interface OrderModuleT extends OrderModuleTug {}

export const OrderModule = Dependency<OrderModuleT>();
