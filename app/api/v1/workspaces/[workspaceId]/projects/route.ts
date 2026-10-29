import { z } from "zod";
import {
  HttpError,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import { createProject } from "@/lib/controllers/project.controller";

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
      "Workspace not found.",
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

    if (result.kind === "workspace_not_found") {
      throw new HttpError("Workspace not found.", 404);
    }

    if (result.kind === "permission_denied") {
      throw new HttpError(
        "Only workspace owners and admins can create projects.",
        403,
      );
    }

    return Response.json({ id: result.id }, { status: 201 });
  },
);
