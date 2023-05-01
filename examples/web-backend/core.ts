import { Dependency } from "../../src/core";

// start database mock

type Collection<T> = {
  insertOne: (it: T) => Promise<T>;
  deleteOne: (it: Partial<T>) => Promise<T>;
  findOne: (query: Partial<T>) => Promise<T | undefined>;
  findMany: (query?: Partial<T>) => Promise<T[]>;
};

type Database = {
  collection: <T>(name: string) => Collection<T>;
};

// end database mock

export namespace Dependencies {
  export const Logger = Dependency<{
    log: (msg: string) => void;
    error: (msg: string) => void;
  }>();

  export const Db = Dependency<{
    db: () => Promise<Database>;
  }>();

  export const UserContext = Dependency<{
    currentUserId: () => Promise<string | undefined>;
  }>();
}
