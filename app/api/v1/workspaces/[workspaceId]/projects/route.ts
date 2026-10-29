import { createProject } from "@/lib/controllers/project.controller";

export function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  return createProject(request, context);
}
