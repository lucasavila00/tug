import { Dependency, tugReturns } from "../../../src/core";
import { OrderModuleTug } from "./core";

interface OrderModuleT extends tugReturns<typeof OrderModuleTug> {}

export const OrderModule = Dependency<OrderModuleT>();
