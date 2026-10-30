import { z } from "zod";
import {
  HttpError,
  HttpErrorMessage,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import {
  deleteWorkspace,
  renameWorkspace,
} from "@/lib/controllers/workspace.controller";

const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

function parseWorkspaceId(workspaceId: string) {
  const parsedWorkspaceId = z.uuid().safeParse(workspaceId);

  if (!parsedWorkspaceId.success) {
    throw new HttpError(HttpErrorMessage.WorkspaceNotFound, 404);
  }

  return parsedWorkspaceId.data;
}

export const PATCH = withApiErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const requesterId = await requireUserId(request);
    const { workspaceId } = await params;
    const parsedWorkspaceId = parseWorkspaceId(workspaceId);
    const input = validateInput(
      renameWorkspaceSchema,
      await readJsonBody(request),
      "Workspace name must be between 2 and 100 characters.",
    );
    const workspace = await renameWorkspace({
      workspaceId: parsedWorkspaceId,
      requesterId,
      name: input.name,
    });

    return Response.json(workspace);
  },
);

export const DELETE = withApiErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const requesterId = await requireUserId(request);
    const { workspaceId } = await params;
    await deleteWorkspace({
      workspaceId: parseWorkspaceId(workspaceId),
      requesterId,
    });

    return new Response(null, { status: 204 });
  },
);
