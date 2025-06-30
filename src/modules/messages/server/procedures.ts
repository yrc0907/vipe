import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { PrismaClient } from "@prisma/client";
import { inngest } from "@/inngest/client";

const prisma = new PrismaClient();

export const send = publicProcedure
  .input(
    z.object({
      content: z.string(),
      userId: z.string(),
      projectId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { content, userId, projectId } = input;

    const message = await prisma.message.create({
      data: {
        content,
        userId,
        projectId,
        role: "USER",
        type: "PENDING",
      },
    });

    await inngest.send({
      name: "test/hello.world",
      data: {
        text: content,
        messageId: message.id,
        userId: userId,
        projectId: projectId,
      },
    });

    return message;
  });

export const list = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input }) => {
    return await prisma.message.findMany({
      where: {
        projectId: input.projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        fragments: true,
      },
    });
  });
