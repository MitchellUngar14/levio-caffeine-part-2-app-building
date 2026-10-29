# Caffeine Tracker

A free, browser-only app that logs your caffeine and reminds you when you've gone
too long without it during work hours. Terminal theme, light and dark.

This repo holds Parts 2–4 of a Claude Code demo. Part 1 (architecture) is in the
sibling folder `../caffeine-tracker`, frozen at tag `part-1-architecture`.

| Part | Tag |
|---|---|
| 2 · application development | `part-2-app` |
| 3 · testing | `part-3-tests` |
| 4 · production grade | `part-4-prod` |

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. Add `?demo=1` to get a reminder within a minute.

```bash
npm test          # unit and contract tests
npm run typecheck
npm run build     # static files in apps/web/dist
```

## Layout

```
apps/web        React + Vite app: Today, Calendar and Settings screens, reminder timer,
                LocalStorageStore and the StoreProvider / useStore hook
packages/core   Pure rules (shouldRemind, nextReminderAt, dailyTotals), drink search,
                drinks.json, the CaffeineStore interface, InMemoryStore, contract tests
docs            Living copy of the architecture (see "Changes since Part 1")
```

## Caffeine figures

`packages/core/src/drinks.json` lists common drinks with a `source` for each
figure. They're widely published numbers (Mayo Clinic, USDA, manufacturers) and
should be re-checked against those sources before relying on them.
