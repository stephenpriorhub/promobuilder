/**
 * Promo Analyzer client — pulls REAL comparable-promo results so the VSL is
 * grounded in what actually performed, not just curated principles.
 *
 * Calls the Promo Analyzer's GET /api/top-promos, which sits behind the hub
 * auth wall (proxy.ts). Server-to-server, so we authenticate with the shared
 * service token (x-hub-token: HUB_API_TOKEN) rather than a user cookie.
 *
 * Soft by design — any failure returns [] and the prompt is built without it.
 */

import { getEnv } from "./env";

const DEFAULT_ANALYZER_URL = "https://promo.oxfordhub.app";

export interface TopPromo {
  displayName: string;
  effectivenessScore: number | null;
  tier: string | null;
  guru: string | null;
  service: string | null;
  oneLineWhyItWorked: string | null;
}

function analyzerUrl(): string {
  return (getEnv("PROMO_ANALYZER_URL") ?? DEFAULT_ANALYZER_URL).replace(/\/$/, "");
}

/** Fetch the top-performing comparable promos for a guru + service. */
export async function fetchTopPromos(
  guru: string | null,
  service: string | null,
  limit = 5
): Promise<TopPromo[]> {
  const token = getEnv("HUB_API_TOKEN");
  if (!token) return []; // no service credential → skip (analyzer API is walled)
  if (!guru && !service) return [];

  const params = new URLSearchParams();
  if (guru) params.set("guru", guru);
  if (service) params.set("service", service);
  params.set("limit", String(limit));

  try {
    const res = await fetch(`${analyzerUrl()}/api/top-promos?${params.toString()}`, {
      headers: { "x-hub-token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { promos?: TopPromo[] };
    return Array.isArray(json.promos) ? json.promos : [];
  } catch {
    return [];
  }
}

/** Assemble the top-promos block for the system prompt. "" when empty. */
export function buildTopPromosBlock(promos: TopPromo[]): string {
  if (!promos.length) return "";
  const rows = promos
    .map((p) => {
      const score = p.effectivenessScore != null ? `${p.effectivenessScore}/10` : "n/a";
      const tier = p.tier ? `, ${p.tier}` : "";
      const why = p.oneLineWhyItWorked ? ` — ${p.oneLineWhyItWorked}` : "";
      return `- ${p.displayName} (effectiveness ${score}${tier})${why}`;
    })
    .join("\n");
  return [
    "\n### Top comparable promos — REAL results (from the Promo Analyzer)",
    "These are the best-scoring analyzed promos for this guru/service. Model the new",
    "VSL on what made these win — the hook, mechanism framing, proof order, and offer:",
    "",
    rows,
  ].join("\n");
}
