import { tugBuilders } from "../../src/core";

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

type ContextInput = {
  db: () => Promise<Database>;
  newDate: () => Date;
  logger: {
    log: (msg: string) => void;
    error: (msg: string) => void;
  };
  currentUserId: () => Promise<string | undefined>;
};

export const { Tug } = tugBuilders<ContextInput>();
