"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  const getProjects = trpc.project.list.useQuery();
  const createProject = trpc.project.create.useMutation({
    onSuccess: (data) => {
      getProjects.refetch();
      setDialogOpen(false);
      setProjectName("");
      toast({
        title: "Project Created",
        description: `Project "${data.name}" has been created.`,
      });
      router.push(`/project/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (projectName.trim()) {
      createProject.mutate({ name: projectName.trim() });
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create a new project</DialogTitle>
              <DialogDescription>
                Give your project a name to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="col-span-3"
                  placeholder="My awesome project"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {getProjects.isLoading && (
        <div className="text-center py-16">
          <p>Loading projects...</p>
        </div>
      )}
      {getProjects.error && (
        <div className="text-center py-16 text-red-500">
          <p>Error: {getProjects.error.message}</p>
        </div>
      )}

      {getProjects.data && getProjects.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getProjects.data?.map((project) => (
            <Link href={`/project/${project.id}`} key={project.id} passHref>
              <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">
                    Click to view the project details.
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {getProjects.data?.length === 0 && !getProjects.isLoading && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Projects Found</h2>
          <p className="text-muted-foreground mb-4">
            Get started by creating a new project.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            Create Your First Project
          </Button>
        </div>
      )}
    </main>
  );
}
