import { Dependency } from "../../../src/core";
import { AuthModuleTug } from "./core";

export interface AuthModuleT {
    AuthModule: typeof AuthModuleTug;
}
export const AuthModule = Dependency<AuthModuleT>();
