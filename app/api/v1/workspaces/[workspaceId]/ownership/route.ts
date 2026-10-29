import { z } from "zod";
import {
  HttpError,
  HttpErrorMessage,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import { transferWorkspaceOwnership } from "@/lib/controllers/workspace.controller";

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1),
});

export const POST = withApiErrorHandling(
  async (
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> },
  ) => {
    const requesterId = await requireUserId(request);
    const { workspaceId } = await params;
    const parsedWorkspaceId = z.uuid().safeParse(workspaceId);

    if (!parsedWorkspaceId.success) {
      throw new HttpError(HttpErrorMessage.WorkspaceNotFound, 404);
    }

    const input = validateInput(
      transferOwnershipSchema,
      await readJsonBody(request),
      "Choose a workspace member to become the new owner.",
    );
    await transferWorkspaceOwnership({
      workspaceId: parsedWorkspaceId.data,
      requesterId,
      newOwnerId: input.newOwnerId,
    });

    return new Response(null, { status: 204 });
  },
);
