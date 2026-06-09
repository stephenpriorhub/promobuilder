# VSL Builder — CLAUDE.md

## Purpose
A 3-stage tool for creating Video Sales Letters (VSLs) for MTA financial newsletter promotions. Used by copywriters and marketing team.

## Tech Stack
- Next.js (App Router)
- 3-stage flow: Headlines → Outline → VSL
- Research card system
- Split-panel UI
- Local dev: port 3001

## Status
**Future project** — Local codebase exists but not yet integrated with OxfordHub.

## Next Steps (when resuming)
1. Brief Middleware Agent to run hub integration checklist
2. Register project in hub admin (oxfordhub.app/admin/projects)
3. Add hub-nav.js to layout.tsx with generated cuid
4. Deploy to Railway at vsl.oxfordhub.app
5. Assign to relevant users (copywriters, marketing team)

## Hub Integration (Next.js Pattern)
```tsx
// app/globals.css: html { visibility: hidden }
// app/layout.tsx:
<Script
  src="https://oxfordhub.app/hub-nav.js"
  data-project-id="[cuid from hub admin]"
  strategy="afterInteractive"
  id="hub-nav"
/>
```

## Past Session
"VSL chat tool for copywriters" — check transcript for full build history.
