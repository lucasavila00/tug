import { Dependency } from "../../../src/core";
import { OrderModuleTug } from "./core";

type OrderModuleTug = typeof OrderModuleTug;
interface OrderModuleT extends OrderModuleTug {}

export const OrderModule = Dependency<OrderModuleT>();
