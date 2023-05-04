import { Dependency } from "../../../src/core";
import { UserModuleTug } from "./core";

export type UserModuleTug = typeof UserModuleTug;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserModuleT extends UserModuleTug {}

export const UserModule = Dependency<UserModuleT, "UserModule">("UserModule");
