'use client';

import { useState } from "react";
import { trpc } from "@/trpc/client";

// NOTE: In a real app, you would get this from your auth solution
const userId = "user_placeholder_123";

export default function Home() {
  const [text, setText] = useState('');

  // Fetch the list of messages
  const messagesQuery = trpc.messages.list.useQuery({ userId });

  // Use the new 'send' mutation
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      // When a message is sent successfully, refetch the list
      messagesQuery.refetch();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      sendMessage.mutate({ content: text, userId });
      setText(''); // Clear the input after sending
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-4">AI Agent Dialogue</h1>

        {/* Display Messages */}
        <div className="mb-4 h-96 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
          {messagesQuery.isLoading && <p>Loading messages...</p>}
          {messagesQuery.data?.map((msg) => (
            <div key={msg.id} className={`mb-4 p-3 rounded-lg ${msg.role === 'USER' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-600'}`}>
              <p className="font-bold">{msg.role}</p>
              <p className="text-gray-800 dark:text-gray-200">{msg.content}</p>
              {msg.type === 'PENDING' && <p className="text-sm text-gray-500">Awaiting response...</p>}
              {msg.type === 'ERROR' && <p className="text-sm text-red-500">An error occurred.</p>}
              {msg.fragments[0] && (
                <a
                  href={msg.fragments[0].sandboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline mt-2 inline-block"
                >
                  View Result
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text for the AI..."
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            disabled={sendMessage.isPending}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {sendMessage.isPending ? 'Sending...' : 'Send to AI'}
          </button>
        </form>
      </div>
    </div>
  );
}
