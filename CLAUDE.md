# Caffeine Tracker (build repo)

A browser-only web app for personal use. It logs caffeine intake and shows a
notification when there has been no intake for a while during work hours.
There is no backend: everything runs in the open browser tab, and data lives in
localStorage. It's hosted for free on Cloudflare Pages.

This repo is Parts 2–4 of a four-part Claude Code demo (build, test, production).
Part 1, the architecture, lives in the sibling repo `../Part 1 - Architecture` and is
frozen there. `docs/ARCHITECTURE.md` here is the living copy: when the design
changes during the build, update it and note the change in its
"Changes since Part 1" list.

- Architecture and decisions: `docs/ARCHITECTURE.md`. Read it before making structural changes.
- Architecture canvas (Claude Design): https://claude.ai/artifact/BTrzarsxNJSB65EYwf9kBz.
  Read it with the Artifact tool when you need the diagrams or screen mock-ups.

## Stack
- npm workspaces: `apps/web` (React + Vite + TypeScript), `packages/core`
  (pure rules, drink search, the `CaffeineStore` interface, `InMemoryStore`, shared types).
- Vitest for unit tests, Playwright for end-to-end tests (Part 3).
- No router or state library: hash routing and React state are enough.

## Commands
- `npm run dev` starts the app (Vite). Add `?demo=1` to the URL for demo mode.
- `npm test`, `npm run typecheck`, `npm run build`.

## Rules
- Keep it free and simple: no server, database, accounts or paid services.
  Don't add dependencies the architecture doc doesn't call for.
- The reminder logic lives in `packages/core` as pure functions: no `Date.now()`,
  no storage, no browser APIs. Pass `now` in.
- All data access goes through the async `CaffeineStore` interface (ARCHITECTURE.md
  section 5). Only `LocalStorageStore` may touch localStorage. Components use
  `useStore()`, never a concrete store. Keep business rules out of stores.
- Any new store implementation must pass the shared contract tests (`storeContract`).
- Store times as ISO strings in UTC. Evaluate work hours and reminder times in the
  user's chosen time zone (`settings.timeZone`) with the built-in `Intl` API, not the browser's.
- Styling: terminal theme with light and dark modes (ARCHITECTURE.md section 8).
  Use the CSS colour tokens (`var(--accent)` and so on), never raw hex in components.
- Every built-in drink in `drinks.json` needs a `source`. Don't make up caffeine values.
- Every change to `packages/core` comes with tests.
