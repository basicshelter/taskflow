import { NextResponse } from "next/server";
import type { z } from "zod";
import { ApplicationErrorKind } from "@/lib/application-errors";
import { auth } from "@/lib/auth";

export { ApplicationErrorKind };

export enum HttpErrorMessage {
  AuthenticationRequired = "Authentication required.",
  InvalidJsonBody = "Invalid JSON body.",
  InternalServerError = "Internal server error.",
  WorkspaceNotFound = "This workspace could not be found.",
  InvalidWorkspaceMemberId = "This workspace member could not be found.",
  WorkspacePermissionDenied = "Only workspace owners and admins can manage members.",
  WorkspaceOwnerRequired = "Only the workspace owner can perform this action.",
  WorkspaceMemberMissing = "That user is not a workspace member.",
  ProjectNotFound = "Project not found.",
  MembershipRequired = "Workspace membership required.",
  ProjectCreationPermissionDenied = "Only workspace owners and admins can create projects.",
}

const APPLICATION_ERROR_HTTP_MAPPINGS: Record<
  ApplicationErrorKind,
  { message: HttpErrorMessage; status: number }
> = {
  [ApplicationErrorKind.WorkspaceNotFound]: {
    message: HttpErrorMessage.WorkspaceNotFound,
    status: 404,
  },
  [ApplicationErrorKind.PermissionDenied]: {
    message: HttpErrorMessage.ProjectCreationPermissionDenied,
    status: 403,
  },
  [ApplicationErrorKind.ProjectNotFound]: {
    message: HttpErrorMessage.ProjectNotFound,
    status: 404,
  },
  [ApplicationErrorKind.MembershipRequired]: {
    message: HttpErrorMessage.MembershipRequired,
    status: 403,
  },
};

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function mapApplicationError(kind: ApplicationErrorKind): HttpError {
  const mapping = APPLICATION_ERROR_HTTP_MAPPINGS[kind];

  return new HttpError(mapping.message, mapping.status);
}

export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      }

      console.error("Unhandled API error:", error);
      return NextResponse.json(
        { error: HttpErrorMessage.InternalServerError },
        { status: 500 },
      );
    }
  };
}

export async function requireUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new HttpError(HttpErrorMessage.AuthenticationRequired, 401);
  }

  return session.user.id;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(HttpErrorMessage.InvalidJsonBody, 400);
  }
}

export function validateInput<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  message: string,
  status = 400,
): z.output<Schema> {
  const input = schema.safeParse(value);

  if (!input.success) {
    throw new HttpError(message, status);
  }

  return input.data;
}
