import { publicProcedure, router } from './trpc';
import { inngest } from '../inngest/client';
import { z } from 'zod';
import * as messages from '@/modules/messages/server/procedures';

export const appRouter = router({
  greeting: publicProcedure.query(() => 'Hello from tRPC!'),
  messages,
  sendEvent: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      await inngest.send({
        name: 'test/hello.world',
        data: {
          text: input.text,
        },
      });
      return { success: true };
    }),
});

export type AppRouter = typeof appRouter; 