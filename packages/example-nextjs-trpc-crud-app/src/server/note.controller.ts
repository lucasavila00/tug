import { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
    CreateNoteInput,
    FilterQueryInput,
    ParamsInput,
    UpdateNoteInput,
} from "./note.schema";
import { TugBuilder } from "tug-ts";
import { PrismaDependency } from "./tugs";

export const createNoteController = ({ input }: { input: CreateNoteInput }) =>
    TugBuilder.depends(PrismaDependency)
        .try(async (ctx) => {
            const note = await ctx.deps.prisma.note.create({
                data: {
                    title: input.title,
                    content: input.content,
                    category: input.category,
                    published: input.published,
                },
            });

            return {
                status: "success",
                data: {
                    note,
                },
            };
        })
        .catch((error) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "Note with that title already exists",
                    });
                }
            }
            throw error;
        });

export const updateNoteController = ({
    paramsInput,
    input,
}: {
    paramsInput: ParamsInput;
    input: UpdateNoteInput["body"];
}) =>
    TugBuilder.depends(PrismaDependency)
        .try(async (ctx) => {
            const updatedNote = await ctx.deps.prisma.note.update({
                where: { id: paramsInput.noteId },
                data: input,
            });

            return {
                status: "success",
                note: updatedNote,
            };
        })
        .catch((error) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "Note with that title already exists",
                    });
                }
            }
            throw error;
        });

export const findNoteController = ({
    paramsInput,
}: {
    paramsInput: ParamsInput;
}) =>
    TugBuilder.depends(PrismaDependency).try(async (ctx) => {
        const note = await ctx.deps.prisma.note.findFirst({
            where: { id: paramsInput.noteId },
        });

        if (!note) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Note with that ID not found",
            });
        }

        return {
            status: "success",
            note,
        };
    });

export const findAllNotesController = ({
    filterQuery,
}: {
    filterQuery: FilterQueryInput;
}) =>
    TugBuilder.depends(PrismaDependency).try(async (ctx) => {
        const page = filterQuery.page || 1;
        const limit = filterQuery.limit || 10;
        const skip = (page - 1) * limit;

        const notes = await ctx.deps.prisma.note.findMany({
            skip,
            take: limit,
        });

        return {
            status: "success",
            results: notes.length,
            notes,
        };
    });

export const deleteNoteController = ({
    paramsInput,
}: {
    paramsInput: ParamsInput;
}) =>
    TugBuilder.depends(PrismaDependency)
        .try(async (ctx) => {
            await ctx.deps.prisma.note.delete({
                where: { id: paramsInput.noteId },
            });

            return {
                status: "success",
            };
        })
        .catch((error) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2025") {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Note with that ID not found",
                    });
                }
            }
            throw error;
        });
