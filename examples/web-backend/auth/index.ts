import { Dependency, tugReturns } from "../../../src/core";
import { AuthModuleTug } from "./core";

export const AuthModule = Dependency<tugReturns<typeof AuthModuleTug>>();
