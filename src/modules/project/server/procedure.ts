import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const create = publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input }) => {
    return await prisma.project.create({
      data: {
        name: input.name,
      },
    });
  });

export const list = publicProcedure.query(async () => {
  return await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
});

export const get = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    return await prisma.project.findUnique({
      where: {
        id: input.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            fragments: true,
          },
        },
      },
    });
  });
