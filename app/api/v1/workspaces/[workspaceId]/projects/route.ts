import { createProject } from "@/lib/controllers/workspace.controller";

export function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  return createProject(request, context);
}
