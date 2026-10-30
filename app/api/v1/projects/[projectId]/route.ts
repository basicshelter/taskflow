import { z } from "zod";
import {
  HttpError,
  HttpErrorMessage,
  readJsonBody,
  requireUserId,
  validateInput,
  withApiErrorHandling,
} from "@/lib/api";
import { updateProject } from "@/lib/controllers/project.controller";

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    archive: z.literal(true).optional(),
  })
  .refine(
    (input) =>
      input.name !== undefined ||
      input.description !== undefined ||
      input.archive !== undefined,
  );

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export const PATCH = withApiErrorHandling(
  async (request: Request, { params }: RouteContext) => {
    const requesterId = await requireUserId(request);
    const { projectId } = await params;
    const parsedProjectId = z.uuid().safeParse(projectId);

    if (!parsedProjectId.success) {
      throw new HttpError(HttpErrorMessage.ProjectNotFound, 404);
    }

    const input = validateInput(
      updateProjectSchema,
      await readJsonBody(request),
      "Provide a valid project name, description, or archive action.",
    );
    const project = await updateProject({
      projectId: parsedProjectId.data,
      requesterId,
      ...input,
    });

    return Response.json(project);
  },
);
