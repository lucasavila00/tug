import { Dependency, tugReturns } from "../../../src/core";
import { AuthModuleTug } from "./core";

type AuthModuleTug = typeof AuthModuleTug;
interface AuthModuleT extends AuthModuleTug {}
export const AuthModule = Dependency<AuthModuleT>();
