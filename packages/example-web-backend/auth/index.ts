import { Dependency } from "tug-ts";
import { AuthModuleTug } from "./core";

export interface AuthModuleT {
    AuthModule: typeof AuthModuleTug;
}
export const AuthModule = Dependency<AuthModuleT>();
