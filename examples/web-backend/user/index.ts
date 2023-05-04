import { Dependency } from "../../../src/core";
import { UserModuleTug } from "./core";

export type UserModuleTug = typeof UserModuleTug;
export interface UserModuleT extends UserModuleTug {}

export const UserModule = Dependency<UserModuleT>();
