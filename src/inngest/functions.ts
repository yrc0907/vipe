import { inngest } from "./client";
import { createAgent, openai } from '@inngest/agent-kit';
import { Sandbox } from '@e2b/code-interpreter'
import { getSandbox } from "./utils";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    console.log(process.env.OPENAI_API_KEY);

    const sandboxId = await step.run("generate-sandbox-id", async () => {
      const sandbox = await Sandbox.create("veb-nextjs-test-897");
      return sandbox.sandboxId;
    })

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000)
      return `https://${host}`
    })


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
    return { output, sandboxUrl };
  },
);
