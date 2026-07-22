# AI Calendar

AI-native calendar — manage your schedule in natural language. A forkable Next.js template built on [eve](https://eve.dev), Vercel's agent framework.

![AI Calendar](public/og.jpg)

## Features

- **Talk to your calendar** — "Lunch with Sam tomorrow at noon", "Move my 3pm to Thursday", "What does next week look like?" The assistant creates, updates, and deletes events; answers come straight from your schedule.
- **Month + week views** — day-cell grid with event chips and overflow, 7-day time grid with positioned events, all-day row, overlap lanes.
- **Manual CRUD** — click a day/slot to create, click an event to edit or delete. Events persist to localStorage (zustand persist, zod-validated).
- **Tool-driven mutations** — the agent changes the schedule through typed eve tools; results stream into the calendar UI live.
- **Bring your own key** — visitors add their own [Vercel AI Gateway key](https://vercel.com/docs/ai-gateway) (stored in the browser) and the agent runs on it per session.

## Setup

```bash
pnpm install
echo "AI_GATEWAY_API_KEY=vck_..." > .env.local
pnpm dev
```

`pnpm dev` boots both runtimes: the Next.js dev server and eve's agent dev server (proxied same-origin by `withEve`). In development the agent uses `AI_GATEWAY_API_KEY`; in production, keyless visitors are prompted for their own gateway key, which rides each request as a bearer token and backs a per-session model.

Requires Node 24+.

## Architecture

```
agent/
├── agent.ts             # defineAgent: gateway model + BYO-key dynamic model resolver
├── instructions.md      # system prompt (incl. the per-turn context contract)
├── channels/eve.ts      # HTTP auth: user bearer key → Vercel OIDC → localhost dev
└── tools/
    ├── create_event.ts  # defineTool — filename = tool name the model sees
    ├── update_event.ts
    ├── delete_event.ts
    └── *.ts             # disableTool() sentinels for the built-in harness tools
next.config.ts           # withEve(nextConfig) — mounts eve behind the Next.js origin
src/lib/assistant-schemas.ts  # zod contract shared by agent tools + chat panel
src/lib/calendar-context.ts   # per-turn app state (now/timezone + ±45-day events window)
src/components/chat/     # chat panel (useEveAgent bridge), api key dialog
src/components/calendar/ # app shell, header, month view, week view, event dialog
src/lib/event-store.ts   # zustand + localStorage persist
```

The streaming contract: the client sends the schedule snapshot as eve `clientContext` on every turn (`send({ message, clientContext })`); each tool returns a structured payload the chat panel receives as an `action.result` stream event, zod-parses against `assistant-schemas.ts`, and applies to the zustand store — so AI edits appear on the calendar in real time.

## Notes

- Driving this repo with a coding agent? Start at [`AGENTS.md`](AGENTS.md) — quickstart, seeded state, `pnpm verify`, and a working agent-browser recipe.
- UI: shadcn/ui **base-vega** style (Base UI primitives). Add components with `pnpm dlx shadcn@latest add <name>`.
- Replace `public/og.jpg` and `public/favicon/` with your own brand assets before shipping a fork.
- Never run `eve build` while `pnpm dev` is running — it corrupts eve's dev cache (fix: delete `.eve/` + `.workflow-data/` and restart).
