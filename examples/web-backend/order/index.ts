import { Dependency, tugReturns } from "../../../src/core";
import { OrderModuleTug } from "./core";

export const OrderModule = Dependency<tugReturns<typeof OrderModuleTug>>();
