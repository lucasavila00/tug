import { z } from 'zod';
import { AppTug } from './tugs';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';

/**
 * Default selector for Post.
 * It's important to always explicitly say which fields you want to return in order to not leak extra information
 * @see https://github.com/prisma/prisma/issues/9353
 */
const defaultPostSelect = Prisma.validator<Prisma.PostSelect>()({
  id: true,
  title: true,
  text: true,
  createdAt: true,
  updatedAt: true,
});

export const AddPostInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(32),
  text: z.string().min(1),
});

export type AddPostInput = z.infer<typeof AddPostInput>;

export const ListPostInput = z.object({
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.string().nullish(),
});

export type ListPostInput = z.infer<typeof ListPostInput>;

const AddPost = (input: AddPostInput) =>
  AppTug.try(async (ctx) => {
    const post = await ctx.deps.prismaClient.post.create({
      data: input,
      select: defaultPostSelect,
    });
    return post;
  });

const PostById = (postId: string) =>
  AppTug.try(async (ctx) => {
    const post = await ctx.deps.prismaClient.post.findUnique({
      where: { id: postId },
      select: defaultPostSelect,
    });
    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No post with id '${postId}'`,
      });
    }
    return post;
  });

const ListPost = (input: ListPostInput) =>
  AppTug.try(async (ctx) => {
    /**
     * For pagination docs you can have a look here
     * @see https://trpc.io/docs/useInfiniteQuery
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/pagination
     */

    const limit = input.limit ?? 50;
    const { cursor } = input;

    const items = await ctx.deps.prismaClient.post.findMany({
      select: defaultPostSelect,
      // get an extra item at the end which we'll use as next cursor
      take: limit + 1,
      where: {},
      cursor: cursor
        ? {
            id: cursor,
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });
    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      // Remove the last item and use it as next cursor

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const nextItem = items.pop()!;
      nextCursor = nextItem.id;
    }

    return {
      items: items.reverse(),
      nextCursor,
    };
  });

export const PostModule = {
  AddPost,
  PostById,
  ListPost,
};
