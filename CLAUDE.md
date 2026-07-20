# Agent Instructions

AI-native calendar app. Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, eve (Vercel's agent framework) + `ai@7`.

## Tech Stack

- **Framework**: Next.js 16, React 19
- **UI**: Tailwind v4, shadcn/ui **base-vega** style (Base UI primitives — `@base-ui/react`, `render` prop, NOT Radix), lucide icons, sonner toasts
- **AI**: `eve` (agent runtime, `withEve` Next integration, `useEveAgent` client hook) via Vercel AI Gateway (`openai/gpt-5.1-instant`); BYO-key via bearer auth + dynamic model resolver
- **State**: zustand + localStorage persist (zod-validated on rehydrate)
- **Package Manager**: pnpm

## Architecture

```
agent/agent.ts                  # defineAgent: model + step.started BYO-key resolver + limits
agent/instructions.md           # system prompt (documents the per-turn context JSON)
agent/channels/eve.ts           # auth walk: gatewayKeyBearer → vercelOidc → localDev
agent/tools/create_event.ts     # defineTool; snake_case filename = tool name
agent/tools/{update,delete}_event.ts
agent/tools/<builtin>.ts        # disableTool() sentinels (bash, web_fetch, …)
src/lib/assistant-schemas.ts    # zod contract: tool input + payload schemas (shared both sides)
src/lib/calendar-context.ts     # per-turn app state shape (now/timezone + ±45-day events window)
src/components/chat/chat-panel.tsx  # useEveAgent bridge: clientContext out, action.result in
src/components/chat/api-key-dialog.tsx
src/components/calendar/        # calendar-app, header, month-view, week-view, event-dialog
src/lib/event.ts                # calendar event zod schema — the domain source of truth
src/lib/event-store.ts          # zustand store, seeds from src/lib/seed-events.ts
```

Flow: chat panel `send({ message, clientContext: calendarSnapshot })` → eve channel authenticates (user bearer key / OIDC / localhost) → dynamic model resolver picks the user's gateway key from session auth (fallback: server `AI_GATEWAY_API_KEY`) → tools return structured payloads → client `onEvent` zod-parses `action.result` events → store mutation + sonner toast.

## Commands

```bash
pnpm dev          # dev server — boots Next.js AND the eve agent runtime
pnpm build        # production build (Next). Vercel builds the eve service via withEve
pnpm verify       # the gate: typecheck · lint · format — run before every commit
pnpm typecheck    # tsc --noEmit (covers agent/ too)
pnpm lint         # oxlint, warnings are errors
pnpm format:fix   # oxfmt --write (bare `pnpm format` only checks)
```

**NEVER run `eve build` while `pnpm dev` is running** — it corrupts the eve dev workflow cache. If dev breaks mysteriously: delete `.eve/` + `.workflow-data/` and restart.

## Agent-driven development

`AGENTS.md` is the runnable guide — read it before driving this app. In short:

- **Provisioning is `pnpm install && pnpm dev`.** No database, no auth, no bootstrap script.
- **No login.** The store seeds ~8 events into `localStorage` (`ai-calendar-events`) on first rehydrate, so a fresh browser gets a populated calendar.
- **Verify with `pnpm verify`, then drive the real UI** with `agent-browser` — the recipe (and its two portal/ref gotchas) is in `AGENTS.md`.
- **Chat needs `AI_GATEWAY_API_KEY` in `.env.local`.** Without it the calendar is fully exercisable but every AI turn fails with an auth error — that's missing config, not a bug.

## Conventions

- Path alias: `@/*` → `./src/*` — but files imported by `agent/` code MUST use relative imports (eve's compiler doesn't read tsconfig paths)
- kebab-case filenames for TS/TSX; `agent/tools/*` are snake_case (eve derives tool names from filenames)
- No `any`, no `!`, no `as` — zod-parse at boundaries (stream events, tool payloads, localStorage)
- Add ui components ONLY via `pnpm dlx shadcn@latest add <name>` (base-vega registry); never hand-copy
- Base UI idioms: `render` prop (not `asChild`), `data-open:`/`data-closed:` variants
