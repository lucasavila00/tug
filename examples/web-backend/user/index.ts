import { Dependency } from "../../../src/core";
import * as UserModule from "./core";

export const UserDependency = Dependency<typeof UserModule>();
