import { Dependency } from "tug-ts";

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
    export interface Logger {
        Logger: {
            log: (msg: string) => void;
            error: (msg: string) => void;
        };
    }
    export const Logger = Dependency<Logger>();

    export interface Database {
        Database: {
            getInstance: () => Promise<DatabaseClient>;
        };
    }
    export const Database = Dependency<Database>();

    export interface UserContext {
        UserContext: {
            currentUserId: () => Promise<string | undefined>;
        };
    }
    export const UserContext = Dependency<UserContext>();
}
