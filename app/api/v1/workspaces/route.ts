import { createWorkspace } from "@/lib/controllers/workspace.controller";

export function POST(request: Request) {
  return createWorkspace(request);
}
