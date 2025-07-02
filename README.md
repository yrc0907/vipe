一个人只能做到这样了，原本想做成豆包那样，但是可以自选模型（虽然也没难度，调api的事情），但是一个人做太累了😭，剩余的语音输入，图片识别都是调api的事情…………
后面有时间再来重构吧，做别的有意思的东西去了……
### AI 驱动的应用程序生成器

由 Inngest 提供支持的可编程 AI 代理，通过简单提示词生成全栈应用程序。使用 OpenAI、Anthropic 和 Grok 等模型处理代码生成，在 E2B 和 Docker 安全云沙箱中执行所有操作。

![image](https://github.com/user-attachments/assets/03eedbe7-70d5-4237-97c3-61fdc25b62dc)


![image](https://github.com/user-attachments/assets/fc3e09a5-6151-4e2c-9445-5c2246b28a4c)

![image](https://github.com/user-attachments/assets/5985c890-c1ad-4fe2-bc34-00ebf99fc226)



#### 技术覆盖范围

* 代理架构与后台任务编排
* 项目仪表盘设计
* Clerk 身份验证与计费功能
* 结合 CodeRabbit 的 AI 辅助 PR 审查 Git 工作流

#### 技术栈

基于 Next.js 15、React 19、Tailwind v4 和 AI 优先的现代工具链构建。

#### 核心功能

* 🚀 Next.js 15 + React 19
* 🎨 Tailwind v4 + Shadcn/ui
* 📡 基于 tRPC 的全栈类型安全
* 🔁 Inngest 后台任务
* 🧠 Inngest 代理工具包
* 🔐 Clerk 身份验证
* 💳 Clerk 计费系统
* 🧱 基于 AI 提示词的组件 / 应用生成
* 🗂️ 支持 URL 访问的实时项目预览
* 🖥️ E2B 云沙箱（运行时执行）
* 🐳 基于 Docker 的沙箱模板
* 🧠 支持 OpenAI/Anthropic/Grok 等 AI 模型
* 📦 Prisma + Neon 数据库集成
* 🤖 CodeRabbit AI 驱动的 PR 审查
* 🧾 内置信用系统与使用情况跟踪
* 🧪 预览模式与代码浏览器切换功能
