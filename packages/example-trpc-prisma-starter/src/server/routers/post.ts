/**
 *
 * This is an example router, you can delete this file and then update `../pages/api/trpc/[trpc].tsx`
 */
import { router, publicProcedure } from '../trpc';
import { AddPostInput, ListPostInput, PostModule } from './post.core';
import { TugResolver } from './tugs';
import { z } from 'zod';

export const postRouter = router({
  list: publicProcedure
    .input(ListPostInput)
    .query(({ input, ctx }) => TugResolver(PostModule.ListPost(input), ctx)),
  byId: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(({ input, ctx }) => TugResolver(PostModule.PostById(input.id), ctx)),
  add: publicProcedure
    .input(AddPostInput)
    .mutation(({ input, ctx }) => TugResolver(PostModule.AddPost(input), ctx)),
});
