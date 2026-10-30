import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { AdaptiveListPage } from "@/components/adaptive-list-page";
import { AuthForm } from "@/components/auth-form";
import { ProjectBoard } from "@/components/project-board";
import { ProjectCreateForm } from "@/components/project-create-form";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { RouterRecorder } from "./router-recorder";

function withRouterRecorder(Component: ComponentType) {
  return function RecordedStory() {
    return (
      <RouterRecorder>
        <Component />
      </RouterRecorder>
    );
  };
}

function SignInForm() {
  return <AuthForm mode="sign-in" />;
}

function SignUpForm() {
  return <AuthForm mode="sign-up" />;
}

function WorkspaceForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceCreateForm />
    </QueryClientProvider>
  );
}

function ProjectForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ProjectCreateForm workspaceId="workspace-1" />
    </QueryClientProvider>
  );
}

function ProjectBoardStory() {
  return (
    <ProjectBoard
      project={{
        name: "Website",
        description: "Redesign the company website.",
        isArchived: false,
        tasks: [
          {
            id: "task-1",
            title: "Write copy",
            description: null,
            status: "TODO",
          },
          {
            id: "task-2",
            title: "Build layout",
            description: null,
            status: "IN_PROGRESS",
          },
          {
            id: "task-3",
            title: "Review design",
            description: null,
            status: "IN_REVIEW",
          },
          {
            id: "task-4",
            title: "Publish site",
            description: null,
            status: "DONE",
          },
        ],
      }}
      userName="Alex"
      workspaceId="workspace-1"
    />
  );
}

function AdaptiveListStory() {
  return (
    <AdaptiveListPage
      compactBackHref="/workspaces"
      compactBackLabel="All workspaces"
      context="WORKSPACE"
      pageTitle="Design"
      userName="Alex"
    >
      <section style={{ flex: "none", height: 1200 }}>
        <h1>Design</h1>
      </section>
    </AdaptiveListPage>
  );
}

export const stories: Record<string, ComponentType> = {
  "auth/sign-in": withRouterRecorder(SignInForm),
  "auth/sign-up": withRouterRecorder(SignUpForm),
  "workspace/create": withRouterRecorder(WorkspaceForm),
  "project/create": withRouterRecorder(ProjectForm),
  "project/board": ProjectBoardStory,
  "workspace/adaptive-list": AdaptiveListStory,
};
