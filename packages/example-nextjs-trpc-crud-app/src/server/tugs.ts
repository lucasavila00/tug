import { Dependency, Tug } from "tug-ts";
import { PrismaClient } from "@prisma/client";

export type Context = PrismaDependency;
export const TugResolver = <T>(
    tug: Tug<PrismaDependency, T>,
    ctx: PrismaDependency
): Promise<T> => {
    return tug.provide(PrismaDependency, ctx).exec.orThrow();
};

const prisma = new PrismaClient();

interface PrismaDependency {
    prisma: typeof prisma;
}
export const PrismaDependency = Dependency<{ prisma: typeof prisma }>();
