import { Dependency, tugReturns } from "../../../src/core";
import { AuthModuleTug } from "./core";

interface AuthModuleT extends tugReturns<typeof AuthModuleTug> {}
export const AuthModule = Dependency<AuthModuleT>();
