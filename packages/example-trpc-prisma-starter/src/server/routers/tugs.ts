import { PrismaClient } from '@prisma/client';
import { Dependency, TugBuilder, TugBuiltBy } from 'tug-ts';

interface PrismaDependency {
  prismaClient: PrismaClient;
}
export const PrismaDependency = Dependency<PrismaDependency>();

export const AppTug = TugBuilder.depends(PrismaDependency);
export type AppTug<T> = TugBuiltBy<typeof AppTug, T>;

export const TugResolver = <T>(
  tug: AppTug<T>,
  ctx: PrismaDependency,
): Promise<T> => {
  return tug.provide(PrismaDependency, ctx).exec.orThrow();
};
