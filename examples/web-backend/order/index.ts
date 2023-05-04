import { Dependency } from "../../../src/core";
import { OrderModuleTug } from "./core";

export type OrderModuleTug = typeof OrderModuleTug;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OrderModuleT extends OrderModuleTug {}

export const OrderModule = Dependency<OrderModuleT>();
