/**
 * Assembles the full system prompt for a chat turn:
 *   stable scaffold (system-prompt.ts)
 *   + LIVE PROMO INTELLIGENCE (brain vault, per guru/service)
 *   + top comparable promos with REAL results (Promo Analyzer)
 *   + research cards the copywriter pasted
 *
 * Guru/service are detected from the whole conversation so the right brain
 * files load as soon as the copywriter names them in the interview. Brain reads
 * are cached in-process (short TTL) so we don't hit GitHub on every turn.
 */

import { SYSTEM_PROMPT } from "./system-prompt";
import {
  detectGuru,
  detectService,
  loadBrainIntel,
  buildBrainIntelBlock,
  type BrainIntel,
} from "./brain-reader";
import { fetchTopPromos, buildTopPromosBlock } from "./promo-intel-client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ResearchSourceInput {
  title?: string;
  url?: string;
  cards?: Array<{ type?: string; headline?: string; content?: string; copyUse?: string }>;
}

function buildResearchCardsBlock(researchCards: ResearchSourceInput[]): string {
  if (!researchCards || researchCards.length === 0) return "";
  const cardsText = researchCards
    .map((s) => {
      const lines = [`SOURCE: ${s.title || "Untitled"} (${s.url || ""})`];
      for (const card of s.cards ?? []) {
        lines.push(
          `  [${(card.type || "fact").toUpperCase()}] ${card.headline}: ${card.content}${
            card.copyUse ? ` | Copy use: ${card.copyUse}` : ""
          }`
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
  return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRESEARCH CARDS (provided by copywriter)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${cardsText}\n\nDraw from these research cards when generating headlines, outlines, and copy.`;
}

// --- tiny in-process cache for brain reads (per guru+service) ---
const CACHE_TTL_MS = 5 * 60 * 1000;
const brainCache = new Map<string, { at: number; intel: BrainIntel }>();

async function loadBrainIntelCached(
  guru: string | null,
  service: string | null
): Promise<BrainIntel> {
  const key = `${guru ?? ""}|${service ?? ""}`;
  const hit = brainCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.intel;
  const intel = await loadBrainIntel(guru, service);
  brainCache.set(key, { at: Date.now(), intel });
  return intel;
}

/**
 * Build the complete system prompt for the current conversation.
 * Every enrichment is soft — if the brain/analyzer are unreachable, the
 * copywriter still gets a fully functional scaffold-only prompt.
 */
export async function buildSystemPrompt(
  messages: ChatMessage[],
  researchCards: ResearchSourceInput[]
): Promise<string> {
  const convoText = messages.map((m) => m.content).join("\n");
  const guru = detectGuru(convoText);
  const service = detectService(convoText);

  let intelBlock = "";
  let topPromosBlock = "";

  if (guru || service) {
    const [intel, topPromos] = await Promise.all([
      loadBrainIntelCached(guru, service),
      fetchTopPromos(guru, service, 5),
    ]);
    intelBlock = buildBrainIntelBlock(intel);
    topPromosBlock = buildTopPromosBlock(topPromos);
  }

  return (
    SYSTEM_PROMPT +
    intelBlock +
    topPromosBlock +
    buildResearchCardsBlock(researchCards)
  );
}
