import { Dependency } from "../../../src/core";
import { UserModuleTug } from "./core";

export interface UserModuleT {
    UserModule: typeof UserModuleTug;
}

export const UserModule = Dependency<UserModuleT>();
