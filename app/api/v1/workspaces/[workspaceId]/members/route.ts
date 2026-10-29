import { z } from "zod";
import {
  HttpError,
  HttpErrorMessage,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import { inviteWorkspaceMember } from "@/lib/controllers/workspace.controller";

const inviteMemberSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const POST = withApiErrorHandling(
  async (
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
  ) => {
    const userId = await requireUserId(request);
    const { workspaceId } = await params;
    const parsedWorkspaceId = z.uuid().safeParse(workspaceId);

    if (!parsedWorkspaceId.success) {
      throw new HttpError(HttpErrorMessage.WorkspaceNotFound, 404);
    }

    const input = validateInput(
      inviteMemberSchema,
      await readJsonBody(request),
      "Enter a valid email address.",
    );
    const membership = await inviteWorkspaceMember({
      workspaceId: parsedWorkspaceId.data,
      requesterId: userId,
      email: input.email,
    });

    return Response.json(membership, { status: 201 });
  },
);
