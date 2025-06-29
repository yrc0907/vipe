import { inngest } from "./client";
import { createAgent, createNetwork, createTool, openai } from '@inngest/agent-kit';
import { Sandbox } from '@e2b/code-interpreter'
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    console.log(process.env.OPENAI_API_KEY);

    const sandboxId = await step.run("generate-sandbox-id", async () => {
      const sandbox = await Sandbox.create("veb-nextjs-test-897");
      return sandbox.sandboxId;
    })



    const codeAgent = createAgent({
      name: "My Agent",
      description: "An expert coding agent",
      system: PROMPT,
      tools: [
        createTool({
          name: "terminal",
          description: "Use this tool to run terminal commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers: { stdout: string[]; stderr: (string | Error)[] } = {
                stdout: [],
                stderr: [],
              };

              try {
                const sandbox = await getSandbox(sandboxId);
                await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout.push(data);
                  },
                  onStderr: (data: string) => {
                    buffers.stderr.push(data);
                  },
                });
              } catch (error) {
                console.log(error);
                return `Command failed: ${error} \nstdoit: ${buffers.stdout.join("")} \nstderr: ${buffers.stderr.map(String).join("")}`
              }

              return {
                stdout: buffers.stdout.join(""),
                stderr: buffers.stderr.map(String).join(""),
              };
            });
          }
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            )
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};

                const sandbox = await getSandbox(sandboxId);

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                console.log(error);
                return `Failed to create or update files: ${error}`;
              }
            })

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }

          }
        }),
        createTool({
          name: "readFile",
          description: "Read a file from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFile", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                console.log(error);
                return `Failed to read files: ${error}`;
              }
            })
          }
        }),

      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText = lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
      model: openai({ model: "gpt-4.1", apiKey: process.env.OPENAI_API_KEY, baseUrl: "https://api.302.ai/v1", defaultParameters: { temperature: 0.1 } }),
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return codeAgent;
      }
    })


    const result = await network.run(event.data.text);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000)
      return `https://${host}`
    })

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.filters,
      summary: result.state.data.summary,
    }
  },
);
