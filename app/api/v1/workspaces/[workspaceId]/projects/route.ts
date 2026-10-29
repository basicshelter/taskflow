import { z } from "zod";
import {
  HttpErrorMessage,
  mapApplicationError,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import {
  createProject,
  ProjectErrorKind,
} from "@/lib/controllers/project.controller";

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const POST = withApiErrorHandling(
  async (
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
  ) => {
    const userId = await requireUserId(request);
    const { workspaceId } = await params;
    const parsedWorkspaceId = validateInput(
      z.uuid(),
      workspaceId,
      HttpErrorMessage.WorkspaceNotFound,
      404,
    );
    const input = validateInput(
      createProjectSchema,
      await readJsonBody(request),
      "Project name must be between 2 and 120 characters.",
    );

    const result = await createProject({
      workspaceId: parsedWorkspaceId,
      name: input.name,
      userId,
    });

    if (result.kind !== ProjectErrorKind.Created) {
      throw mapApplicationError(result.kind);
    }

    return Response.json({ id: result.id }, { status: 201 });
  },
);
