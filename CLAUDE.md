# Agent Instructions

AI-powered calendar app built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Vercel AI SDK.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui (new-york style)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/react`)
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/          # Next.js App Router pages
├── components/   # React components (ui/)
├── hooks/        # Custom React hooks
└── lib/          # Utilities, types, schemas
```

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # Lint
```

## Conventions

- Path alias: `@/*` -> `./src/*`
- UI components: shadcn/ui in `src/components/ui/`
- Icons: lucide-react
