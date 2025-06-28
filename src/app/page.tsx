'use client';

import { useState } from "react";
import { trpc } from "@/trpc/client";

export default function Home() {
  const [text, setText] = useState('');
  const sendEvent = trpc.sendEvent.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendEvent.mutate({ text });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">AI Agent</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text for the AI..."
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sendEvent.isPending}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {sendEvent.isPending ? 'Sending...' : 'Send to AI'}
          </button>
        </form>
        {sendEvent.isSuccess && (
          <div className="mt-6 p-4 bg-green-100 rounded-lg dark:bg-green-900">
            <p className="text-green-800 dark:text-green-200">Event sent successfully to Inngest!</p>
          </div>
        )}
      </div>
    </div>
  );
}
