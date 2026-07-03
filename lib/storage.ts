import type { ResearchSource } from "@/components/ArtifactPanel";

export interface ProjectDraft {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: "user" | "assistant"; content: string; id: string }>;
  headlinesContent: string;
  outlineContent: string;
  vslContent: string;
  researchSources: ResearchSource[];
}

// ── Client-side API wrappers ──────────────────────────────────────────────────
// Projects now live server-side on the Railway volume (see lib/projects-store.ts
// + /api/projects), scoped to the signed-in hub user. These wrappers keep the
// original call signatures the components used, but are now async. The hub
// session cookie rides along automatically (same-origin fetch).

export async function listProjects(): Promise<ProjectDraft[]> {
  try {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { projects?: ProjectDraft[] };
    return json.projects ?? [];
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<ProjectDraft | null> {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { project?: ProjectDraft };
    return json.project ?? null;
  } catch {
    return null;
  }
}

export async function saveProject(draft: ProjectDraft): Promise<void> {
  try {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
  } catch (e) {
    console.warn("Promo Builder: project save failed", e);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    console.warn("Promo Builder: project delete failed", e);
  }
}

export async function renameProject(id: string, name: string): Promise<void> {
  try {
    await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  } catch (e) {
    console.warn("Promo Builder: project rename failed", e);
  }
}

const PRESENTER_TOKENS = [
  "Bryan", "Bottarelli",
  "Karim", "Rahemtulla",
  "Nate", "Bear",
  "Chris", "Johnson",
  "Ryan", "Fitzwater",
];

const SERVICE_TOKENS = [
  "PSU", "TPU", "WAR", "PMK", "WNM", "DPL", "DPS", "NBS", "MIC", "MTLIV",
];

export function deriveProjectName(
  messages: Array<{ role: string; content: string }>
): string {
  const userText = messages
    .filter((m) => m.role === "user")
    .slice(0, 3)
    .map((m) => m.content)
    .join(" ");

  const presenter = PRESENTER_TOKENS.find((p) =>
    new RegExp(`\\b${p}\\b`, "i").test(userText)
  );
  const service = SERVICE_TOKENS.find((s) =>
    new RegExp(`\\b${s}\\b`, "i").test(userText)
  );

  if (presenter && service) return `${presenter} — ${service}`;
  if (presenter) return presenter;
  if (service) return service;

  return `Draft — ${new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}
