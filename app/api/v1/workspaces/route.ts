import { z } from "zod";
import {
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import { createWorkspace } from "@/lib/controllers/workspace.controller";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const POST = withApiErrorHandling(async (request: Request) => {
  const userId = await requireUserId(request);
  const input = validateInput(
    createWorkspaceSchema,
    await readJsonBody(request),
    "Workspace name must be between 2 and 100 characters.",
  );
  const workspace = await createWorkspace({
    name: input.name,
    userId,
  });

  return Response.json({ id: workspace.id }, { status: 201 });
});
