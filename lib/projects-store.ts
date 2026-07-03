/**
 * Server-side project store (Railway volume at DATA_DIR, e.g. /app/data).
 *
 * Replaces the old browser-localStorage store so drafts persist across devices
 * and browsers and survive redeploys. Each project is stamped with its owner
 * (hub user id) so the app is user-based: a copywriter sees their own drafts;
 * admins/super_admins see everything.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const FILE = path.join(DATA_DIR, "projects.json");

export interface StoredProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: "user" | "assistant"; content: string; id: string }>;
  headlinesContent: string;
  outlineContent: string;
  vslContent: string;
  researchSources: unknown[];
  ownedBy?: { id: string; email: string; name?: string | null } | null;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Record<string, StoredProject> {
  ensureDir();
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Record<string, StoredProject>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, StoredProject>): void {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(map, null, 2), "utf-8");
}

/** Admins see all; everyone else sees only projects they own (or legacy unowned). */
function visibleTo(p: StoredProject, viewer: { id: string } | null, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!p.ownedBy?.id) return true; // legacy/unowned drafts stay visible to all signed-in users
  return !!viewer && p.ownedBy.id === viewer.id;
}

export function listProjects(
  viewer: { id: string } | null,
  isAdmin: boolean
): StoredProject[] {
  return Object.values(readAll())
    .filter((p) => visibleTo(p, viewer, isAdmin))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProject(
  id: string,
  viewer: { id: string } | null,
  isAdmin: boolean
): StoredProject | null {
  const p = readAll()[id];
  if (!p) return null;
  return visibleTo(p, viewer, isAdmin) ? p : null;
}

/** Upsert a project, stamping/preserving ownership. */
export function saveProject(
  draft: StoredProject,
  owner: { id: string; email: string; name?: string | null } | null
): StoredProject {
  const all = readAll();
  const existing = all[draft.id];
  const saved: StoredProject = {
    ...draft,
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt ?? draft.createdAt ?? new Date().toISOString(),
    ownedBy: existing?.ownedBy ?? owner ?? null,
  };
  all[draft.id] = saved;
  writeAll(all);
  return saved;
}

export function deleteProject(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

export function renameProject(id: string, name: string): void {
  const all = readAll();
  if (!all[id]) return;
  all[id] = { ...all[id], name, updatedAt: new Date().toISOString() };
  writeAll(all);
}
