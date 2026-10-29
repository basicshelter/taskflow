import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function createWorkspace(request: Request) {
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

type CreateProjectContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function createProject(
  request: Request,
  { params }: CreateProjectContext,
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { workspaceId } = await params;
  const parsedWorkspaceId = z.uuid().safeParse(workspaceId);

  if (!parsedWorkspaceId.success) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = createProjectSchema.safeParse(body);

  if (!input.success) {
    return NextResponse.json(
      { error: "Project name must be between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId.data },
    select: {
      id: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 },
    );
  }

  const role = workspace.memberships[0]?.role;

  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only workspace owners and admins can create projects." },
      { status: 403 },
    );
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: input.data.name,
      createdById: session.user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
