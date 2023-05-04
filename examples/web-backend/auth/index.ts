import { Dependency } from "../../../src/core";
import { AuthModuleTug } from "./core";

export type AuthModuleTug = typeof AuthModuleTug;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AuthModuleT extends AuthModuleTug {}
export const AuthModule = Dependency<AuthModuleT>();
