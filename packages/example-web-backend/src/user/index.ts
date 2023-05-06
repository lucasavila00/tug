import { Dependency } from "tug-ts";
import { UserModuleTug } from "./core";

export interface UserModuleT {
    UserModule: typeof UserModuleTug;
}

export const UserModule = Dependency<UserModuleT>();
