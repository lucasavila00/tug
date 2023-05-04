import { Dependency, TugBuilder } from "../../src/core";

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
    export interface LoggerT {
        log: (msg: string) => void;
        error: (msg: string) => void;
    }
    export const Logger = Dependency<LoggerT>();

    export interface DatabaseT {
        db: () => Promise<DatabaseClient>;
    }
    export const Database = Dependency<DatabaseT>();

    export interface UserContextT {
        currentUserId: () => Promise<string | undefined>;
    }
    export const UserContext = Dependency<UserContextT>();
}

export const AllCapacitiesTug = TugBuilder.depends(Capacities.UserContext)
    .depends(Capacities.Database)
    .depends(Capacities.Logger);
