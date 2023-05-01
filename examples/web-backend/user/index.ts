import { Dependency, tugReturns } from "../../../src/core";
import { UserModuleTug } from "./core";

export const UserModule = Dependency<tugReturns<typeof UserModuleTug>>();
