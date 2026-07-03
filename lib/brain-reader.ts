/**
 * Brain Reader (Promo Builder)
 *
 * Reads the LIVE promo-intelligence corpus from the brain vault and assembles
 * it into a block that gets injected into the VSL generation prompt. This is
 * what keeps Promo Builder current: instead of a frozen snapshot of "what
 * works," it pulls the same curated files the Promo Analyzer writes to.
 *
 * Ported from promo-analyzer/lib/brain-reader.ts. GitHub Contents API first
 * (works on Railway where the vault isn't mounted), local filesystem fallback
 * for dev. Every read is soft — a missing file degrades gracefully and never
 * throws, so teaching the brain can never break the product.
 */

import fs from "fs";
import path from "path";
import { getEnv } from "./env";

const BRAIN_DIR =
  getEnv("BRAIN_DIR")?.replace(/\/Resources\/.*$/, "") ??
  "/Users/stephenprior/github/brain";

const RESOURCES = path.join(BRAIN_DIR, "Resources");
const PROMO_ANALYSIS_REL = "Resources/Promo Analysis";
const PROMO_ANALYSIS_ABS = path.join(RESOURCES, "Promo Analysis");

const BRAIN_GITHUB_REPO = getEnv("BRAIN_GITHUB_REPO") ?? "stephenpriorhub/brain";

// Guru display name → vault profile filename (lives at Resources/Experts/{file}).
const GURU_MAP: Record<string, string> = {
  "Bryan Bottarelli": "Bryan Bottarelli.md",
  "Karim Rahemtulla": "Karim Rahemtulla.md",
  "Nate Bear": "Nate Bear.md",
  "Chris Johnson": "Chris Johnson.md",
};
const EXPERTS_REL = "Resources/Experts";
const EXPERTS_ABS = path.join(RESOURCES, "Experts");

// Canonical MTA service codes that map to a "{CODE} Promo Analysis.md" file.
const SERVICE_CODES = ["PSU", "TPU", "WAR", "PMK", "WNM", "DPL", "DPS", "MIC"];

function readFileLocal(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** Read a vault file via the GitHub Contents API. Null on any failure. */
async function readViaGitHub(relPath: string): Promise<string | null> {
  const token = getEnv("GITHUB_TOKEN");
  if (!token) return null;
  try {
    const apiBase = `https://api.github.com/repos/${BRAIN_GITHUB_REPO}/contents/${encodeURIComponent(
      relPath
    )}`;
    const res = await fetch(apiBase, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "promo-builder",
        Accept: "application/vnd.github+json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: string };
    if (!json.content) return null;
    return Buffer.from(json.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/** GitHub Contents API first (when GITHUB_TOKEN is set), local fallback. */
async function readVaultFile(relPath: string, localPath: string): Promise<string | null> {
  if (getEnv("GITHUB_TOKEN")) {
    const fromGitHub = await readViaGitHub(relPath);
    if (fromGitHub !== null) return fromGitHub;
  }
  return readFileLocal(localPath);
}

function stripObsidianMarkup(text: string): string {
  return text
    .replace(/^---[\s\S]*?---\n/, "") // frontmatter
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1") // wikilinks → text
    .replace(/^>\s*\[!.*?\]\s*$/gm, "") // bare callouts
    .trim();
}

/** Detect the presenter guru from the conversation text. */
export function detectGuru(text: string): string | null {
  const hay = text.toLowerCase();
  // Match on last name too, since copywriters often just say "Nate" / "Bryan".
  for (const guru of Object.keys(GURU_MAP)) {
    const [first, last] = guru.split(" ");
    if (hay.includes(guru.toLowerCase()) || hay.includes(last.toLowerCase()) || hay.includes(first.toLowerCase())) {
      return guru;
    }
  }
  return null;
}

/** Detect the MTA service code being sold from the conversation text. */
export function detectService(text: string): string | null {
  for (const code of SERVICE_CODES) {
    if (new RegExp(`\\b${code}\\b`).test(text)) return code;
  }
  return null;
}

export interface BrainIntel {
  guru: string | null;
  service: string | null;
  principles: string | null;
  ledger: string | null;
  lessons: string | null;
  synthesis: string | null;
  serviceAnalysis: string | null;
  guruProfile: string | null;
}

/**
 * Load the live promo-intelligence corpus for a given guru + service.
 * All reads run in parallel; each is independently soft.
 */
export async function loadBrainIntel(
  guru: string | null,
  service: string | null
): Promise<BrainIntel> {
  const readAnalysis = (name: string) =>
    readVaultFile(`${PROMO_ANALYSIS_REL}/${name}`, path.join(PROMO_ANALYSIS_ABS, name));

  const [principles, ledger, lessons, synthesis, serviceAnalysis, guruProfile] =
    await Promise.all([
      readAnalysis("Copywriting Principles.md"),
      readAnalysis("Promo Pattern Ledger.md"),
      readAnalysis("Promo Lessons.md"),
      readAnalysis("00-synthesis.md"),
      service ? readAnalysis(`${service} Promo Analysis.md`) : Promise.resolve(null),
      guru && GURU_MAP[guru]
        ? readVaultFile(`${EXPERTS_REL}/${GURU_MAP[guru]}`, path.join(EXPERTS_ABS, GURU_MAP[guru]))
        : Promise.resolve(null),
    ]);

  return { guru, service, principles, ledger, lessons, synthesis, serviceAnalysis, guruProfile };
}

/** Truncate a long vault file so no single source dominates the prompt. */
function clip(text: string, max = 6000): string {
  const cleaned = stripObsidianMarkup(text);
  return cleaned.length > max ? cleaned.slice(0, max) + "\n…(truncated)" : cleaned;
}

/**
 * Assemble the LIVE PROMO INTELLIGENCE block injected into the system prompt.
 * Returns "" when nothing could be loaded (offline / no token / early in the
 * interview before a guru or service is known) so the prompt stays clean.
 */
export function buildBrainIntelBlock(intel: BrainIntel): string {
  const sections: string[] = [];

  if (intel.principles)
    sections.push(`### MTA Copywriting Principles (live, curated)\n${clip(intel.principles)}`);
  if (intel.synthesis)
    sections.push(`### What Works / What Fails — Synthesis\n${clip(intel.synthesis)}`);
  if (intel.lessons)
    sections.push(`### Promo Lessons (accumulated)\n${clip(intel.lessons)}`);
  if (intel.serviceAnalysis)
    sections.push(`### ${intel.service} — Service-Specific Promo Analysis\n${clip(intel.serviceAnalysis)}`);
  if (intel.guruProfile)
    sections.push(`### ${intel.guru} — Guru Profile & Playbook\n${clip(intel.guruProfile)}`);
  if (intel.ledger)
    sections.push(`### Promo Pattern Ledger (every analyzed promo, machine-comparable)\n${clip(intel.ledger, 5000)}`);

  if (sections.length === 0) return "";

  return [
    "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "LIVE PROMO INTELLIGENCE (from the MTA Brain — supersedes any general knowledge)",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "This is the current, curated understanding of what converts for THIS publisher,",
    "accumulated from real analyzed promos and their performance. When it conflicts",
    "with generic copywriting instinct, THIS wins. Apply the specific principles,",
    "gain-claim rules, and per-guru nuances below to the VSL you build.",
    "",
    sections.join("\n\n"),
  ].join("\n");
}
