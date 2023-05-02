import { Dependency, Tug } from "../../src/core";

// start database mock

type DatabaseClientCollection<T> = {
  insertOne: (it: T) => Promise<T>;
  deleteOne: (it: Partial<T>) => Promise<T>;
  findOne: (query: Partial<T>) => Promise<T | undefined>;
  findMany: (query?: Partial<T>) => Promise<T[]>;
};

type DatabaseClient = {
  collection: <T>(name: string) => DatabaseClientCollection<T>;
};

// end database mock

export namespace Capacities {
  interface LoggerT {
    log: (msg: string) => void;
    error: (msg: string) => void;
  }
  export const Logger = Dependency<LoggerT>();

  interface DatabaseT {
    db: () => Promise<DatabaseClient>;
  }
  export const Database = Dependency<DatabaseT>();

  interface UserContextT {
    currentUserId: () => Promise<string | undefined>;
  }
  export const UserContext = Dependency<UserContextT>();
}

export const AllCapacitiesTug = Tug.depends(Capacities.UserContext)
  .depends(Capacities.Database)
  .depends(Capacities.Logger);
