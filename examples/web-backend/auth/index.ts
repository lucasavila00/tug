import { Dependency } from "../../../src/core";
import * as AuthModule from "./core";

export const AuthDependency = Dependency<typeof AuthModule>();
