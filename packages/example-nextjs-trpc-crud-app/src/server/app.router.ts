import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import {
    createNoteController,
    deleteNoteController,
    findAllNotesController,
    findNoteController,
    updateNoteController,
} from "./note.controller";
import {
    createNoteSchema,
    filterQuery,
    params,
    updateNoteSchema,
} from "./note.schema";
import { Context, TugResolver } from "./tugs";

const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const appRouter = t.router({
    getHello: t.procedure.query((req) => {
        return { message: "Welcome to Full-Stack tRPC CRUD App with Next.js" };
    }),
    createNote: t.procedure
        .input(createNoteSchema)
        .mutation(({ input, ctx }) =>
            TugResolver(createNoteController({ input }), ctx)
        ),
    updateNote: t.procedure.input(updateNoteSchema).mutation(({ input, ctx }) =>
        TugResolver(
            updateNoteController({
                paramsInput: input.params,
                input: input.body,
            }),
            ctx
        )
    ),
    deleteNote: t.procedure
        .input(params)
        .mutation(({ input, ctx }) =>
            TugResolver(deleteNoteController({ paramsInput: input }), ctx)
        ),
    getNote: t.procedure
        .input(params)
        .query(({ input, ctx }) =>
            TugResolver(findNoteController({ paramsInput: input }), ctx)
        ),
    getNotes: t.procedure
        .input(filterQuery)
        .query(({ input, ctx }) =>
            TugResolver(findAllNotesController({ filterQuery: input }), ctx)
        ),
});

export type AppRouter = typeof appRouter;
