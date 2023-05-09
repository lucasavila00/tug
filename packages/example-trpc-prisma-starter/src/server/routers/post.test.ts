/**
 * Integration test example for the `post` router
 */
import { createContextInner } from '../context';
import { AppRouter, appRouter } from './_app';
import { inferProcedureInput } from '@trpc/server';
import { AddPostInput, PostModule } from './post.core';
import { PrismaDependency } from './tugs';

test('add and get post', async () => {
  const ctx = await createContextInner({});
  const caller = appRouter.createCaller(ctx);

  const input: inferProcedureInput<AppRouter['post']['add']> = {
    text: 'hello test',
    title: 'hello test',
  };

  const post = await caller.post.add(input);
  const byId = await caller.post.byId({ id: post.id });

  expect(byId).toMatchObject(input);
});

test('add and get post - tug', async () => {
  const input: AddPostInput = {
    text: 'hello test',
    title: 'hello test',
  };

  const prismaClient = {
    post: {
      create: async () => ({
        id: 'abc',
        text: 'hello test',
        title: 'hello test',
      }),
      findUnique: () => ({
        text: 'hello test',
        title: 'hello test',
      }),
    },
  } as any;

  const post = await PostModule.AddPost(input)
    .provide(PrismaDependency, { prismaClient })
    .exec.orThrow();
  const byId = await PostModule.PostById(post.id)
    .provide(PrismaDependency, { prismaClient })
    .exec.orThrow();

  expect(byId).toMatchObject(input);
});
