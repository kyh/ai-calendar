# AI Calendar

AI-native calendar — manage your schedule in natural language. Forkable
Next.js template.

![AI Calendar](public/og.jpg)

## Features

- **Talk to your calendar** — "Lunch with Sam tomorrow at noon", "Move my 3pm
  to Thursday", "What does next week look like?" The assistant creates,
  updates, and deletes events; answers come straight from your schedule.
- **Month + week views** — day-cell grid with event chips and overflow, 7-day
  time grid with positioned events, all-day row, overlap lanes.
- **Manual CRUD** — click a day/slot to create, click an event to edit or
  delete. Events persist to localStorage (zustand persist).
- **Bring your own key** — visitors paste their own Vercel AI Gateway key
  (stored locally in the browser), or hit "Use a demo key" for a scripted,
  fully client-side chat round-trip.

## Setup

```bash
pnpm install
cp .env.example .env.local   # add your AI_GATEWAY_API_KEY
pnpm dev
```

Get a gateway key from the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
dashboard. In development the server uses `AI_GATEWAY_API_KEY` directly; in
production visitors supply a key in the UI (or the optional `SECRET_KEY`
sentinel swaps in the server key). No key at all? The `demo` key replays a
scripted exchange without any network calls.

Requires Node 24+.

## Architecture

```
src/ai/
├── gateway.ts                   # createModel(apiKey) — one model config
├── agents/
│   ├── calendar-agent.ts        # ToolLoopAgent: createEvent / updateEvent / deleteEvent
│   └── calendar-agent-prompt.ts # system prompt
├── messages/
│   ├── data-parts.ts            # zod schemas — the client <-> server contract
│   └── types.ts                 # UIMessage specializations + stream writer type
└── response/
    └── stream-chat-response.ts  # createUIMessageStream -> agent.stream -> merge
src/app/api/chat/route.ts        # POST: zod-parsed body, key resolution, delegate
src/components/chat/             # chat panel (useChat + onData), api-key dialog,
                                 # demo transport (@loremllm/transport)
src/lib/                         # event schema (zod), zustand store, calendar-context
```

The model never mutates state directly: each tool validates its input, writes
a `data-<create|update|delete>-event` part into the UI-message stream, and
returns a text ack. The client `onData` handler zod-parses every payload
before folding it into the zustand store. The server is stateless — the
client ships the relevant schedule window (± 45 days), current datetime, and
timezone as per-turn context that gets appended to the agent's instructions.

## Notes for forkers

- Replace `public/og.jpg` and `public/favicon/` with your own brand assets.
- UI components are shadcn/ui **base-vega** (Base UI primitives). Add more
  with `pnpm dlx shadcn@latest add <name>`.
- Swap the model in one place: `src/ai/gateway.ts`.
