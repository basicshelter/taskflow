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
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/lib/controllers/workspace.controller";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

type RouteContext = {
  params: Promise<{ workspaceId: string; memberId: string }>;
};

function parseRouteIds(workspaceId: string, memberId: string) {
  const parsedWorkspaceId = z.uuid().safeParse(workspaceId);
  const parsedMemberId = z.string().min(1).safeParse(memberId);

  if (!parsedWorkspaceId.success || !parsedMemberId.success) {
    return null;
  }

  return { workspaceId: parsedWorkspaceId.data, memberId: parsedMemberId.data };
}

export const PATCH = withApiErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const requesterId = await requireUserId(request);
    const { workspaceId, memberId } = await params;
    const routeIds = parseRouteIds(workspaceId, memberId);

    if (!routeIds) {
      throw new HttpError(HttpErrorMessage.InvalidWorkspaceMemberId, 404);
    }

    const input = validateInput(
      updateRoleSchema,
      await readJsonBody(request),
      "Choose either admin or member as the role.",
    );
    const membership = await updateWorkspaceMemberRole({
      ...routeIds,
      requesterId,
      role: input.role,
    });

    return Response.json(membership);
  },
);

export const DELETE = withApiErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const requesterId = await requireUserId(request);
    const { workspaceId, memberId } = await params;
    const routeIds = parseRouteIds(workspaceId, memberId);

    if (!routeIds) {
      throw new HttpError(HttpErrorMessage.InvalidWorkspaceMemberId, 404);
    }

    await removeWorkspaceMember({ ...routeIds, requesterId });
    return new Response(null, { status: 204 });
  },
);
