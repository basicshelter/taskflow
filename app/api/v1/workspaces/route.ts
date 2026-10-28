import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = createWorkspaceSchema.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      { error: "Workspace name must be between 2 and 100 characters." },
      { status: 400 },
    );
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: input.data.name,
      ownerId: session.user.id,
      memberships: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: workspace.id }, { status: 201 });
}
