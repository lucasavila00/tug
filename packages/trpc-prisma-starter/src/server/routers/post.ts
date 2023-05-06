/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { router, publicProcedure } from '../trpc';
import {
  AddPost,
  AddPostInput,
  ListPost,
  ListPostInput,
  PostById,
} from './post.core';
import { TugResolver } from './tugs';
import { z } from 'zod';

export const postRouter = router({
  list: publicProcedure
    .input(ListPostInput)
    .query(({ input, ctx }) => TugResolver(ListPost(input), ctx)),
  byId: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(({ input, ctx }) => TugResolver(PostById(input.id), ctx)),
  add: publicProcedure
    .input(AddPostInput)
    .mutation(({ input, ctx }) => TugResolver(AddPost(input), ctx)),
});
