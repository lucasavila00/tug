import { Dependency } from "tug-ts";
import { UserModuleTugs } from "./core";

export interface UserModuleT {
    UserModule: typeof UserModuleTugs;
}

export const UserModule = Dependency<UserModuleT>();
