import { serverClient } from '@/trpc/server-client';
import 'server-only';

export default async function TestPage() {
  const greeting = await serverClient.greeting.query();

  return (
    <div>
      <h1>tRPC Server Component Test</h1>
      <p>{greeting}</p>
    </div>
  );
} 