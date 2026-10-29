import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
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
        { error: "Internal server error." },
        { status: 500 },
      );
    }
  };
}

export async function requireUserId(request: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new HttpError("Authentication required.", 401);
  }

  return session.user.id;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError("Invalid JSON body.", 400);
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
