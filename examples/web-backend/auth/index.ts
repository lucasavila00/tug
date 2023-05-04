import { Dependency } from "../../../src/core";
import { AuthModuleTug } from "./core";

export type AuthModuleTug = typeof AuthModuleTug;
export interface AuthModuleT extends AuthModuleTug {}
export const AuthModule = Dependency<AuthModuleT>();
