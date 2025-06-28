import { inngest } from "./client";
import { createAgent, openai } from '@inngest/agent-kit';


export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
    console.log(process.env.OPENAI_API_KEY);
    const summarizer = createAgent({

      name: "My Agent",
      system: "You are a helpful assistant.",
      tools: [],
      model: openai({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY, baseUrl: "https://api.302.ai/v1" }),
    });

    const { output } = await summarizer.run(
      `
      You are a helpful assistant.Summarize the following text: ${event.data.text}
      `
    )

    console.log(output);
    return { message: output };
  },
);
