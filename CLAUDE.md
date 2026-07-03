# Promo Builder — CLAUDE.md

## Purpose
An AI copy-director chat tool that produces complete Video Sales Letters (VSLs) for MTA
financial newsletter promotions through a guided, staged conversation. Used by copywriters
and the marketing team. Product name: **Promo Builder** (repo `promobuilder`, local dir
`vsl-builder`).

## How it works
- Structured 7-area interview → **Stage 1** Headlines & Lead → **Stage 2** Outline →
  **Stage 3** full 9,000–12,000-word VSL. Stage order is enforced by the system prompt.
- Split-panel UI: streaming chat + an artifact panel (headlines/outline/VSL + research cards).
- Research Cards: paste a URL → `/api/research` extracts stat/fact/quote/angle cards that
  feed the generation prompt.
- Projects: save/load/rename/delete drafts, now **server-side** on the Railway volume.

## Tech Stack
- Next.js 15 (App Router), React 19, Tailwind, `@anthropic-ai/sdk`
- Model: `claude-opus-4-8`
- Deployed on Railway (Nixpacks) at **builder.oxfordhub.app**

## Live promo intelligence (the core integration)
The volatile "what works / what fails / per-guru playbooks / gain-claim rules" is NOT
hard-coded. `lib/system-prompt.ts` is a stable scaffold (frameworks + stage process +
output formats + a compliance-floor gain-claim safety rule). At request time,
`lib/build-prompt.ts` composes it with:
- **Brain vault reads** (`lib/brain-reader.ts`, GitHub Contents API → `stephenpriorhub/brain`):
  Copywriting Principles, Promo Pattern Ledger, Promo Lessons, 00-synthesis,
  `{SERVICE} Promo Analysis.md`, and the `{Guru}.md` profile — selected by the guru/service
  detected from the conversation.
- **Real comparable-promo results** (`lib/promo-intel-client.ts`): calls the Promo Analyzer's
  `GET /api/top-promos?guru=&service=` (server-to-server with `x-hub-token`, since that API is
  behind the hub-auth wall). Returns top-scoring promos + performance tier.
Every read is soft — the app still produces a VSL if the brain/analyzer are unreachable.

## Hub Integration
- `app/layout.tsx`: `hub-nav.js` with `data-project-id="promo-builder"`.
- `app/globals.css`: `html { visibility: hidden }` (hub-nav reveals after auth).
- `lib/hub-auth.ts`: forwards the session cookie to `oxfordhub.app/api/me?projectId=promo-builder`
  to resolve the user; used to stamp project ownership.
- Access is **user-based**: the hub Project row is not exec/superAdmin-only, so super_admins
  and admins see it, and plain users need a `UserProject` assignment.

## Environment Variables
| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API (interview + generation). |
| `GITHUB_TOKEN` | Brain vault reads (repo read). Falls back to `BRAIN_DIR` locally. |
| `BRAIN_GITHUB_REPO` | Defaults `stephenpriorhub/brain`. |
| `BRAIN_DIR` | Local vault path fallback (dev). |
| `PROMO_ANALYZER_URL` | Defaults `https://promo.oxfordhub.app`. |
| `HUB_API_TOKEN` | Shared service token — auth for the walled `/api/top-promos` call. |
| `HUB_URL` | Defaults `https://oxfordhub.app` (identity resolution). |
| `DATA_DIR` | Project store path — `/app/data` on Railway (volume). |

## Learning loop
Read-only for now: Promo Builder consumes brain intelligence but does not write back.
Write-back (logging generated VSLs to a brain ledger via the Analyzer's `brain-api.ts`
pattern) is a deferred follow-up.
