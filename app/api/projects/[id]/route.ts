import { NextRequest, NextResponse } from "next/server";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import {
  getProject,
  deleteProject,
  renameProject,
} from "@/lib/projects-store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — a single draft (if visible to the viewer). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const user = await getHubUser(req);
  const project = getProject(id, user, isHubAdmin(user));
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

/** Only the owner or a hub admin may mutate a draft. */
async function ensureCanModify(req: NextRequest, id: string) {
  const user = await getHubUser(req);
  if (!user) return { error: forbidden() };
  const project = getProject(id, user, isHubAdmin(user));
  if (!project) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const owns = project.ownedBy?.id === user.id;
  if (!owns && !isHubAdmin(user)) return { error: forbidden("Only the owner or an admin can do this.") };
  return { user };
}

/** DELETE /api/projects/[id] */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await ensureCanModify(req, id);
  if (gate.error) return gate.error;
  deleteProject(id);
  return NextResponse.json({ ok: true });
}

/** PATCH /api/projects/[id] { name } — rename */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await ensureCanModify(req, id);
  if (gate.error) return gate.error;
  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  renameProject(id, body.name.trim());
  return NextResponse.json({ ok: true });
}
