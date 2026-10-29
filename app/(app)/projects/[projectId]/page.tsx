import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { ProjectBoard } from "@/components/project-board";
import { verifySession } from "@/lib/auth-session";
import {
  getProjectDetails,
  ProjectErrorKind,
} from "@/lib/controllers/project.controller";

export const instant = false;

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await verifySession();
  const parsedProjectId = z.uuid().safeParse(projectId);

  if (!parsedProjectId.success) {
    notFound();
  }

  const result = await getProjectDetails({
    projectId: parsedProjectId.data,
    userId: user.id,
  });

  if (result.kind === ProjectErrorKind.ProjectNotFound) {
    notFound();
  }

  if (result.kind === ProjectErrorKind.MembershipRequired) {
    forbidden();
  }

  return (
    <ProjectBoard
      project={result.project}
      workspaceId={result.workspaceId}
      userName={user.name || user.email}
    />
  );
}
