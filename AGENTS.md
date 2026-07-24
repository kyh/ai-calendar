# AGENTS.md

**ai-calendar** is a single-package Next.js 16 app: a calendar you talk to. One surface (web), no database, no auth, no server state — events live in a zustand store persisted to `localStorage`, and the AI half runs on [eve](https://eve.dev) (`withEve` mounts the agent runtime behind the Next origin). This is the tool-agnostic guide for coding agents — meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

## Quickstart (headless)

```sh
pnpm install
pnpm dev            # Next.js + the eve agent runtime → http://localhost:3000
```

That's the whole provisioning story — there is no bootstrap script, no Docker, no migration step, nothing to seed server-side. `pnpm dev` starts two processes behind one origin: the Next dev server and eve's dev server (see `next.config.ts`).

Liveness: `curl -s -o /dev/null -w '%{http_code}' localhost:3000` → `200`.

Requires Node 24+ (`engines` in `package.json`) and pnpm.

## The one thing that needs a key

Everything except the chat loop works with zero configuration. The assistant needs a [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key:

```sh
echo "AI_GATEWAY_API_KEY=vck_..." > .env.local   # see .env.example
```

Without it, sending a chat message fails server-side (`AI Gateway received no credentials`), the panel shows an "Invalid API key" toast and opens the key dialog. Nothing crashes, but **no agent-driven event will ever appear**. So:

- **calendar CRUD, both views, navigation, persistence — fully verifiable headlessly.**
- **the AI loop — not verifiable without a gateway key.** Don't report "chat is broken"; report "no gateway key".

In production the same dialog collects the visitor's own key, which rides each request as a bearer token (`agent/channels/eve.ts`) and backs a per-session model (`agent/agent.ts`).

## Seeded state (there is no login)

Single-user client-side app — no accounts, no seeded credentials, nothing to sign in to. Instead, `src/lib/seed-events.ts` writes ~8 plausible events around the current week into the store the first time it rehydrates (`event-store.ts` → `onRehydrateStorage` → `state.seed()`). A fresh browser therefore lands on a populated calendar.

Reset it:

```sh
agent-browser eval "localStorage.removeItem('ai-calendar-events')"   # then reload — reseeds
```

The store key is `ai-calendar-events`; the `seeded` flag inside it is what stops seeds resurrecting after you delete every event by hand.

## Verify a change end-to-end

Static gate — run before every commit:

```sh
pnpm verify         # typecheck · lint · format(check) · test
pnpm build          # optional but cheap; catches prerender-only failures
```

A vitest harness runs as part of `pnpm verify`, but no tests are written yet and there is no CI workflow, so `pnpm verify` + `pnpm build` is the whole automated safety net. `format` is `oxfmt --check` (it fails, it does not rewrite); use `pnpm format:fix` to apply.

Runtime — drive the real UI with [agent-browser](https://github.com/vercel-labs/agent-browser). This sequence is verified working against `pnpm dev`:

```sh
agent-browser open http://localhost:3000
agent-browser find first "[aria-label^='Create event on']" click   # a day cell — opens the dialog
agent-browser find label "Title" fill "Recipe check"
agent-browser press Enter                                          # submits the form
agent-browser snapshot                                             # assert a "9AMRecipe check" chip on that day
```

Use locators, not refs. `@eN` refs from `snapshot` are allocated per-snapshot and are invalid the moment the tree changes (and the tree does change — see both gotchas below). Snapshot to _read_ state; act via `find`.

Two gotchas worth knowing before you burn a loop on them:

- **Submit with `press Enter`, not by clicking "Create".** The dialog renders in a portal and its refs restart at `@e1`, colliding with the header's — clicking the "Create" button by ref can land on the header's "Next" instead, which dismisses the dialog without saving.
- **Nothing clock-derived is server-rendered.** The month label and the grid appear only after mount, so a snapshot taken too early shows a spinner. Give the page a second.

Don't stop at `pnpm verify` — exercise the flow and observe the result.

## Platform matrix

| Platform      | Dev command | Agent-verifiable at runtime?         |
| ------------- | ----------- | ------------------------------------ |
| Web (Next.js) | `pnpm dev`  | **Yes** — headless via agent-browser |

That's the whole matrix. There is no mobile, desktop, or extension target, and no separate API service — the eve agent deploys with the Next app as one Vercel project.

## Rules that matter

- **NEVER run `eve build` while `pnpm dev` is running.** It corrupts eve's dev workflow cache. Recovery: delete `.eve/` and `.workflow-data/`, restart.
- **Files imported by `agent/` must use relative imports** (`../../src/lib/...`). eve's compiler does not read tsconfig `paths`, so `@/` breaks the agent build. Everywhere else, use `@/`.
- **`agent/tools/*.ts` are snake_case on purpose** — eve derives the tool name the model sees from the filename. Every other TS/TSX file is kebab-case.
- **No `any`, no non-null `!`, no `as` casts** — enforced by `.oxlintrc.json`, not just documented. Parse at boundaries with zod (stream events, tool payloads, persisted storage).
- **Don't read the wall clock during a server render.** `new Date()` resolves in UTC on Vercel and locally in the browser; a date rendered in both passes will mismatch at a month boundary. Read it in an effect (see `calendar-app.tsx`).
- **Add UI components only via `pnpm dlx shadcn@latest add <name>`** (base-vega registry, Base UI primitives — `render` prop, not `asChild`). One exception to "never hand-edit generated files": the registry emits `as` casts, which `pnpm verify` rejects. Re-run `pnpm verify` after every `shadcn add` and fix what it flags. `src/components/ui/sonner.tsx` is the known case — re-adding it reintroduces two casts:
  - `theme={theme as ToasterProps["theme"]}` → the local `toasterTheme()` narrowing helper.
  - `style={{ ... } as React.CSSProperties}` → hoist to the local `toasterStyle` const, typed as an intersection of `React.CSSProperties` and a template-literal `Record` of `--*` keys to `string`.

## Map

- `agent/agent.ts` — model + BYO-key dynamic resolver · `agent/instructions.md` — system prompt · `agent/channels/eve.ts` — auth walk · `agent/tools/*.ts` — tool definitions and `disableTool()` sentinels
- `src/lib/assistant-schemas.ts` — the zod contract shared by agent tools and the chat panel; change both sides together
- `src/lib/event.ts` — the calendar event schema (domain source of truth) · `src/lib/event-store.ts` — zustand + persist · `src/lib/date.ts` — all date math
- `src/components/calendar/` — app shell, header, month/week views, event dialog · `src/components/chat/` — chat panel, key dialog
- `CLAUDE.md` — conventions + architecture (Claude-specific) · `README.md` — product-facing overview
