import { publicProcedure, router } from './trpc';

export const appRouter = router({
  greeting: publicProcedure.query(() => 'Hello from tRPC!'),
});

export type AppRouter = typeof appRouter; 