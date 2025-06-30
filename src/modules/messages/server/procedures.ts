import { z } from "zod";
import { publicProcedure } from "@/server/trpc";
import { PrismaClient } from "@prisma/client";
import { inngest } from "@/inngest/client";
import { type Message as InngestMessage } from "@inngest/agent-kit";

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

    // 1. Create and save the user's message
    const userMessage = await prisma.message.create({
      data: {
        content,
        userId,
        projectId,
        role: "USER",
      },
    });

    // 2. Create a pending message for the AI's response
    const assistantMessage = await prisma.message.create({
      data: {
        content: "Thinking...",
        userId: "ai", // Or a dedicated AI user ID
        projectId,
        role: "ASSISTANT",
        type: "PENDING",
      },
    });

    // 3. Fetch conversation history for context
    const history = await prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 10, // Limit context to the last 10 messages
    });

    // 4. Map to the format expected by Inngest Agent Kit
    const formattedHistory: InngestMessage[] = history.map(msg => ({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
      type: 'text'
    }));


    // 5. Send to Inngest with context and the ID of the pending AI message
    await inngest.send({
      name: "test/hello.world",
      data: {
        text: content,
        messageId: assistantMessage.id, // Pass the AI message ID
        userId: userId,
        projectId: projectId,
        history: formattedHistory,
      },
    });

    return userMessage;
  });

export const list = publicProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input }) => {
    return await prisma.message.findMany({
      where: {
        projectId: input.projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        fragments: true,
      },
    });
  });
