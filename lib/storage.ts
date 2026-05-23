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

const STORAGE_KEY = "vsl-builder-projects";

function readAll(): Record<string, ProjectDraft> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(projects: Record<string, ProjectDraft>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.warn("VSL Builder: localStorage write failed", e);
  }
}

export function listProjects(): ProjectDraft[] {
  return Object.values(readAll()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProject(id: string): ProjectDraft | null {
  return readAll()[id] ?? null;
}

export function saveProject(draft: ProjectDraft): void {
  const all = readAll();
  all[draft.id] = { ...draft, updatedAt: new Date().toISOString() };
  writeAll(all);
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
