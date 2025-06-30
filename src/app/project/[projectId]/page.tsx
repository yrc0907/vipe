"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { type ImperativePanelGroupHandle } from "react-resizable-panels";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Laptop, Smartphone, Tablet, Copy, BrainCircuit, Code, Eye, File as FileIcon, ChevronRight, Loader2, Folder as FolderIcon, FolderOpen as FolderOpenIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from "@/lib/utils";

// Define more specific types to avoid inference issues with tRPC
type Fragment = {
  id: string;
  messageId: string;
  sandboxUrl: string;
  title: string;
  files: string;
  createdAt: string;
  updatedAt: string;
};

type MessageWithFragments = {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  type: "RESULT" | "ERROR" | "PENDING" | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  fragments: Fragment[];
};

type Files = Record<string, string>;

interface FileTree {
  [key: string]: FileTree | string;
}

// Use a hardcoded user ID since we are removing login
const userId = "anonymous_user";

// Helper functions
function buildFileTree(files: Files): FileTree {
  const tree: FileTree = {};
  Object.keys(files).forEach(path => {
    let currentLevel = tree;
    const parts = path.split('/');
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        currentLevel[part] = path;
      } else {
        currentLevel[part] = currentLevel[part] || {};
        currentLevel = currentLevel[part] as FileTree;
      }
    });
  });
  return tree;
}

// Sub-components
const FileTreeView = ({ tree, onFileClick, activeFile }: { tree: FileTree, onFileClick: (path: string) => void, activeFile: string | null }) => {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (path: string) => {
    setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (node: FileTree, currentPath = '') => {
    return Object.entries(node).map(([name, content]) => {
      const newPath = currentPath ? `${currentPath}/${name}` : name;
      if (typeof content === 'string') { // It's a file
        return (
          <Button key={newPath} variant="ghost" className={cn("w-full justify-start text-left h-auto py-1.5 px-2", activeFile === content && "bg-accent text-accent-foreground")} onClick={() => onFileClick(content)}>
            <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{name}</span>
          </Button>
        );
      } else { // It's a folder
        const isOpen = openFolders[newPath];
        return (
          <div key={newPath}>
            <Button variant="ghost" className="w-full justify-start text-left h-auto py-1.5 px-2" onClick={() => toggleFolder(newPath)}>
              {isOpen ? <FolderOpenIcon className="w-4 h-4 mr-2 flex-shrink-0" /> : <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0" />}
              <span className="truncate">{name}</span>
            </Button>
            {isOpen && <div className="pl-4 border-l ml-2">{renderTree(content, newPath)}</div>}
          </div>
        );
      }
    });
  };

  return <>{renderTree(tree)}</>;
};

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [text, setText] = useState("");
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isAiResponding, setIsAiResponding] = useState(false);

  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const initialLoadHandled = useRef(false);

  const projectDetailsQuery = trpc.project.get.useQuery(
    { id: projectId },
    {
      enabled: !!projectId,
    }
  );

  useEffect(() => {
    if (projectDetailsQuery.data && !initialLoadHandled.current) {
      const messages = projectDetailsQuery.data.messages ?? [];
      const lastMessageWithFragment = [...messages].reverse().find(m => m.fragments.length > 0);
      if (lastMessageWithFragment && lastMessageWithFragment.fragments[0]) {
        handleFragmentCardClick(lastMessageWithFragment.fragments[0]);
        initialLoadHandled.current = true;
      }
    }
  }, [projectDetailsQuery.data]);

  const sendMessageMutation = trpc.messages.send.useMutation({
    onMutate: async (newMessage) => {
      setText('');
      await utils.project.get.cancel({ id: projectId });
      const previousProjectDetails = utils.project.get.getData({ id: projectId });

      utils.project.get.setData({ id: projectId }, (oldQueryData) => {
        if (!oldQueryData) {
          return oldQueryData;
        }

        const optimisticUserMessage: MessageWithFragments = {
          id: `optimistic-user-${Date.now()}`,
          role: 'USER',
          type: 'PENDING',
          content: newMessage.content,
          userId: newMessage.userId,
          projectId: newMessage.projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fragments: [],
        };

        const optimisticAiMessage: MessageWithFragments = {
          id: `optimistic-ai-${Date.now()}`,
          role: 'ASSISTANT',
          type: 'PENDING',
          content: "Thinking...",
          userId: 'ai',
          projectId: newMessage.projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fragments: [],
        };

        return {
          ...oldQueryData,
          messages: [...oldQueryData.messages, optimisticUserMessage, optimisticAiMessage],
        };
      });

      return { previousProjectDetails };
    },
    onSuccess: () => {
      setIsAiResponding(true);
    },
    onError: (err, newMessage, context) => {
      if (context?.previousProjectDetails) {
        utils.project.get.setData({ id: projectId }, context.previousProjectDetails);
      }
      toast({
        title: "Error sending message",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive",
      });
      // Restore the text in the input box if sending fails
      setText(newMessage.content);
      setIsAiResponding(false);
    },
    onSettled: () => {
      utils.project.get.invalidate({ id: projectId });
    },
  });

  useEffect(() => {
    if (!isAiResponding) return;

    const interval = setInterval(() => {
      utils.project.get.invalidate({ id: projectId });
    }, 2000);

    return () => clearInterval(interval);
  }, [isAiResponding, projectId, utils.project.get]);

  useEffect(() => {
    const messages = projectDetailsQuery.data?.messages ?? [];
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ASSISTANT' && lastMessage.type !== 'PENDING') {
        setIsAiResponding(false);
      }
    }
  }, [projectDetailsQuery.data?.messages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [projectDetailsQuery.data?.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && projectId && !isAiResponding) {
      sendMessageMutation.mutate({ content: text, userId, projectId });
    }
  };

  const handleFragmentCardClick = (fragment: Fragment) => {
    setSelectedFragment(fragment);
    try {
      const files: Files = JSON.parse(fragment.files);
      const firstFileName = Object.keys(files)[0];
      if (firstFileName) {
        setActiveFile(firstFileName);
      }
    } catch (error) {
      console.error("Failed to parse files JSON", error);
      toast({
        title: "Error",
        description: "Could not display code files.",
        variant: "destructive",
      });
      setActiveFile(null);
    }
  };

  const handleCopy = () => {
    if (selectedFragment && activeFile) {
      try {
        const files: Files = JSON.parse(selectedFragment.files);
        navigator.clipboard.writeText(files[activeFile]);
        toast({ title: "Copied to clipboard!" });
      } catch {
        toast({ title: "Failed to copy", variant: "destructive" });
      }
    }
  };

  const messages = projectDetailsQuery.data?.messages ?? [];
  const files: Files = selectedFragment ? JSON.parse(selectedFragment.files) : {};
  const fileTree = buildFileTree(files);
  const activeFileContent = activeFile ? files[activeFile] : null;

  return (
    <ResizablePanelGroup ref={panelGroupRef} direction="horizontal" className="min-h-screen w-full bg-background">
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="flex flex-col h-screen p-2 md:p-4">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <Button asChild variant="outline" size="sm">
              <Link href="/">&larr; Back to Projects</Link>
            </Button>
            <h2 className="text-lg font-semibold truncate ml-4 mr-auto px-2">
              {projectDetailsQuery.data?.name || "Loading..."}
            </h2>
          </div>

          <ScrollArea className="flex-1 -mx-4" ref={scrollAreaRef}>
            <div className="px-4 space-y-4 py-4">
              {messages.map((msg: MessageWithFragments) => (
                <div key={msg.id} className={`flex flex-col items-start w-full ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-2xl p-3 rounded-lg ${msg.role === 'USER' ? 'bg-primary text-primary-foreground self-end' : 'bg-muted self-start'}`}>
                    {msg.role === 'ASSISTANT' && msg.type === 'PENDING' ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{msg.content}</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.fragments.map((frag: Fragment) => (
                      <Card key={frag.id} className="mt-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFragmentCardClick(frag)}>
                        <CardHeader className="flex flex-row items-center space-x-2 p-3">
                          <Code className="w-4 h-4" />
                          <CardTitle className="text-sm font-semibold">Code Generated</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4 border-t mt-auto">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask for a new component or describe your changes..."
              className="flex-1"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={sendMessageMutation.isPending || isAiResponding}
            />
            <Button type="submit" disabled={!text.trim() || sendMessageMutation.isPending || isAiResponding}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="flex flex-col h-screen bg-muted/40">
          {selectedFragment ? (
            <Tabs defaultValue="preview" className="flex flex-col h-full w-full">
              <div className="flex items-center justify-between p-2 md:p-4 border-b bg-background">
                <TabsList>
                  <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2" />Preview</TabsTrigger>
                  <TabsTrigger value="code"><Code className="w-4 h-4 mr-2" />Code</TabsTrigger>
                </TabsList>
                <div className="flex items-center space-x-2 pl-2">
                  <div className="flex space-x-1 p-1 bg-muted rounded-md border">
                    <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewport('desktop')}>
                      <Laptop className="h-4 w-4" />
                    </Button>
                    <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewport('tablet')}>
                      <Tablet className="h-4 w-4" />
                    </Button>
                    <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewport('mobile')}>
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <TabsContent value="preview" className="flex-1 bg-background shadow-inner overflow-hidden m-0">
                <iframe
                  src={selectedFragment.sandboxUrl}
                  className="border-0"
                  style={{
                    width: viewport === 'mobile' ? '412px' : viewport === 'tablet' ? '768px' : '100%',
                    height: '100%',
                    maxWidth: '100%'
                  }}
                />
              </TabsContent>
              <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                  <ResizablePanel defaultSize={25} minSize={15} className="bg-background p-2">
                    <ScrollArea className="h-full">
                      <h4 className="text-sm font-semibold mb-2 p-2">Files</h4>
                      <FileTreeView tree={fileTree} onFileClick={setActiveFile} activeFile={activeFile} />
                    </ScrollArea>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={75} minSize={30}>
                    <div className="flex flex-col h-full bg-[#282c34]">
                      <div className="flex items-center justify-between bg-background border-b text-sm text-muted-foreground p-2">
                        <div className="flex items-center space-x-1">
                          <span>app</span>
                          <ChevronRight className="w-4 h-4" />
                          <span className="font-semibold text-foreground">{activeFile}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!activeFileContent}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-full">
                        <SyntaxHighlighter language="tsx" style={atomDark} customStyle={{ margin: 0, height: '100%', width: '100%' }} showLineNumbers>
                          {String(activeFileContent || "")}
                        </SyntaxHighlighter>
                      </ScrollArea>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              <BrainCircuit className="w-16 h-16 mb-4" />
              <h3 className="text-lg font-semibold">Code & Preview</h3>
              <p>Select a &quot;Code Generated&quot; card from the chat to see the result here.</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
