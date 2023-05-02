import { Dependency, tugReturns } from "../../../src/core";
import { UserModuleTug } from "./core";

interface UserModuleT extends tugReturns<typeof UserModuleTug> {}
export const UserModule = Dependency<UserModuleT>();
