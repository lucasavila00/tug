import { Dependency } from "../../../src/core";
import { UserModuleTug } from "./core";

type UserModuleTug = typeof UserModuleTug;
interface UserModuleT extends UserModuleTug {}

export const UserModule = Dependency<UserModuleT>();
