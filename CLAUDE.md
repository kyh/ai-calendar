# Agent Instructions

AI-native calendar. Users manage their schedule by talking to an AI assistant;
manual CRUD works too. Forkable template.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **UI**: Tailwind CSS v4, shadcn/ui base-vega style (Base UI primitives, NOT Radix)
- **AI**: Vercel AI SDK (`ai@6`, `@ai-sdk/react@3`) — ToolLoopAgent streaming
  `data-*` parts over `/api/chat`; `@loremllm/transport` for keyless demo mode
- **State**: zustand (persisted to localStorage)
- **Lint/format**: oxlint / oxfmt
- **Package Manager**: pnpm (Node >= 24)

## Project Structure

```
src/
├── ai/
│   ├── gateway.ts            # MODEL_ID + createModel(apiKey) — the one model config
│   ├── agents/               # calendar-agent.ts (ToolLoopAgent factory) + prompt
│   ├── messages/             # data-parts.ts (zod contract), metadata.ts, types.ts
│   └── response/             # stream-chat-response.ts (UI-message stream plumbing)
├── app/                      # pages, api/chat route, sitemap, robots.txt route
├── components/               # calendar/, chat/ (panel, api-key dialog, demo transport), ui/
├── hooks/                    # use-local-storage.ts
└── lib/                      # event schema (zod, source of truth), store, calendar-context
```

## AI data flow

- Client `useChat` sends per-turn `calendarContext` (now, timezone, events
  window) in the body; the server appends it to the agent instructions —
  stateless server, no read tool.
- Agent tools (`createEvent`/`updateEvent`/`deleteEvent`) validate input,
  `writer.write` a `data-<create|update|delete>-event` part, return a text ack.
- Client `onData` zod-parses every payload (`src/ai/messages/data-parts.ts`)
  before mutating the zustand store.
- Keyless demo: `"demo"` key swaps in `StaticChatTransport` — one scripted
  "Plan my Wednesday" exchange, fully client-side.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm lint         # oxlint
pnpm format:fix   # oxfmt
```

## Conventions

- Path alias: `@/*` -> `./src/*`
- kebab-case filenames; no `any`, no `as`, no `!` — zod-parse at boundaries
- UI via `pnpm dlx shadcn@latest add <name>` (base-vega registry); Base UI
  composition uses the `render` prop, not `asChild`
- Icons: lucide-react; toasts: sonner
- Env: `AI_GATEWAY_API_KEY` (+ optional `SECRET_KEY`) in `.env.local`
  (see `.env.example`)
