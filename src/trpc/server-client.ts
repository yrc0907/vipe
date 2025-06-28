import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@/server';

export const serverClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
}); 