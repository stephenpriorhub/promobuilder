import { NextRequest, NextResponse } from "next/server";
import { getHubUser, isHubAdmin, forbidden } from "@/lib/hub-auth";
import { listProjects, saveProject, type StoredProject } from "@/lib/projects-store";

export const runtime = "nodejs";

/** GET /api/projects — the current user's drafts (admins/super_admins: all). */
export async function GET(req: NextRequest) {
  const user = await getHubUser(req);
  const projects = listProjects(user, isHubAdmin(user));
  return NextResponse.json({ projects });
}

/** POST /api/projects — upsert a draft, stamping the owner. */
export async function POST(req: NextRequest) {
  const user = await getHubUser(req);
  if (!user) return forbidden();

  let draft: StoredProject;
  try {
    draft = (await req.json()) as StoredProject;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!draft?.id) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

  const saved = saveProject(draft, { id: user.id, email: user.email, name: user.name });
  return NextResponse.json({ project: saved });
}
