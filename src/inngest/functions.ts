import { inngest } from "./client";
import { createAgent, createNetwork, createTool, openai, Tool } from '@inngest/agent-kit';
import { Sandbox } from '@e2b/code-interpreter'
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    console.log(process.env.OPENAI_API_KEY);

    const sandboxId = await step.run("generate-sandbox-id", async () => {
      const sandbox = await Sandbox.create("veb-nextjs-test-897");
      return sandbox.sandboxId;
    })
    const codeAgent = createAgent<AgentState>({
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
          handler: async ({ files }, { step, network }: Tool.Options<AgentState>) => {
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

    const network = createNetwork<AgentState>({
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

    const { messageId, userId } = event.data;

    // 更新状态：开始处理
    await step.run("update-processing-status", async () => {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: "Analyzing your request...",
          role: "ASSISTANT",
          type: "PENDING",
          userId,
        }
      });
    });

    const historyLines: string[] = [];
    if (event.data.history) {
      for (const msg of event.data.history) {
        if (typeof msg.content === 'string') {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          historyLines.push(`${role}: ${msg.content}`);
        }
      }
    }
    const historyStr = historyLines.join('\n');

    // 增强上下文处理，添加项目信息
    const projectContext = await step.run("get-project-context", async () => {
      const project = await prisma.project.findUnique({
        where: { id: event.data.projectId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10, // 获取最近的10条消息
            include: { fragments: true }
          }
        }
      });
      return project;
    });

    // 构建更丰富的上下文
    let enhancedContext = `### PROJECT INFO ###\nProject Name: ${projectContext?.name || 'Unknown'}\n`;

    // 如果description字段存在则添加
    if (projectContext && 'description' in projectContext && projectContext.description) {
      enhancedContext += `Project Description: ${projectContext.description}\n\n`;
    } else {
      enhancedContext += `Project Description: No description\n\n`;
    }

    // 添加最近的代码片段信息
    const recentFragments = projectContext?.messages.flatMap(m => m.fragments) || [];
    if (recentFragments.length > 0) {
      enhancedContext += "### RECENT CODE FRAGMENTS ###\n";
      recentFragments.slice(0, 3).forEach(fragment => {
        enhancedContext += `- ${fragment.title || 'Untitled Fragment'}\n`;
      });
      enhancedContext += "\n";
    }

    enhancedContext += `### CONVERSATION HISTORY ###\n${historyStr}\n\n### CURRENT TASK ###\nUser: ${event.data.text}`;

    // 更新状态：生成代码中
    await step.run("update-generating-status", async () => {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: "Generating code solution...",
          role: "ASSISTANT",
          type: "PENDING",
          userId,
        }
      });
    });

    const result = await network.run(enhancedContext);

    // 更新状态：准备沙盒
    await step.run("update-sandbox-status", async () => {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: "Setting up sandbox environment...",
          role: "ASSISTANT",
          type: "PENDING",
          userId,
        }
      });
    });

    const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000)
      return `https://${host}`
    })

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.update({
          where: { id: messageId },
          data: {
            content: "Something went wrong, please try again.",
            role: "ASSISTANT",
            type: "ERROR",
            userId,
          }
        })
      }
      return await prisma.message.update({
        where: { id: messageId },
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          userId,
          fragments: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: JSON.stringify(result.state.data.files),
            }
          }
        }
      })
    })
    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    }
  },
);
