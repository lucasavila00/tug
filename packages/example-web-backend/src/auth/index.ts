import { Dependency } from "tug-ts";
import { AuthModuleTugs } from "./core";

export interface AuthModuleT {
    AuthModule: typeof AuthModuleTugs;
}
export const AuthModule = Dependency<AuthModuleT>();
