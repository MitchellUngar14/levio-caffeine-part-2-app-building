# Part 2: App Building — what was done

The goal: build the app the Part 1 architecture describes, in its own folder,
through to a working app checked in the browser. Part 1's folder stayed
untouched; this repo carries a living copy of the architecture doc.

## Steps

1. **Started a new repo for the build** with a `CLAUDE.md` that points at the
   frozen Part 1 architecture and the design canvas, and a README.
2. **Scaffolded npm workspaces:** `packages/core` (pure rules and shared types)
   and `apps/web` (React + Vite + TypeScript). Strict TypeScript, Vitest for
   unit tests. No router or state library.
3. **Built the core package:**
   - time helpers on the built-in `Intl` API, so work hours are evaluated in the
     user's chosen time zone, including daylight-saving changes;
   - `shouldRemind`, the pure reminder decision (work hours, cut-off, daily
     limit, both reminder modes), plus `nextReminderAt` and `dailyTotals`;
   - typo-tolerant drink search over a `drinks.json` with a source for every
     caffeine figure;
   - the async `CaffeineStore` interface, `InMemoryStore`, and shared contract
     tests every store must pass.
   36 unit tests, all passing on the first run.
4. **Built the web app:**
   - the terminal theme as CSS tokens with light and dark modes, applied before
     first paint;
   - `LocalStorageStore` behind a `StoreProvider` and `useStore()` hook, with
     one setting choosing the store;
   - the pixel coffee cup (fills, steams, overflows; animations stop under
     reduced motion);
   - Today with the collapsible history drawer and the add-drink dialog;
   - Calendar with the three colour levels and a month summary;
   - Settings: time zone, work days and hours, reminder mode, limits, theme,
     notifications, JSON export and import;
   - the reminder timer, which checks every minute and when the tab wakes,
     with an in-page banner when notifications are blocked;
   - demo mode (`?demo=1`) for a reminder within a minute on stage.
5. **Ran and checked it in the browser:** logged drinks, pushed the total over
   the limit to see the overflow, collapsed the drawer, opened the calendar and
   settings, switched themes. Two bugs found and fixed: the dialog didn't focus
   its search box, and "next reminder" showed a time after the limit was reached.
6. **Recorded the design changes** in the living architecture doc under
   "Changes since Part 1".
7. **Committed and tagged** `part-2-app`.

## Outputs

- A working app: `npm run dev`, then open the printed URL
- 47 tests passing, production build clean
- Tag `part-2-app`

## Worth showing live

- Claude reading `CLAUDE.md` and the architecture doc without being told.
- The in-app browser previewing the running app and finding the two bugs.
- `?demo=1` firing a reminder within a minute.
