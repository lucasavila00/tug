import { Dependency, TugBuilder } from "tug-ts";

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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Capacities {
    export interface LoggerT {
        Logger: {
            log: (msg: string) => void;
            error: (msg: string) => void;
        };
    }
    export const Logger = Dependency<LoggerT>();

    export interface DatabaseT {
        Database: {
            getInstance: () => Promise<DatabaseClient>;
        };
    }
    export const Database = Dependency<DatabaseT>();

    export interface UserContextT {
        UserContext: {
            currentUserId: () => Promise<string | undefined>;
        };
    }
    export const UserContext = Dependency<UserContextT>();
}

export const AllCapacitiesTug = TugBuilder.depends(Capacities.UserContext)
    .depends(Capacities.Database)
    .depends(Capacities.Logger);
