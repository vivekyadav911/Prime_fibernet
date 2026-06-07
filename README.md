# Prime Fibernet Enterprise — Unified React Native App

Single unified Expo app for **Customer**, **Officer**, and **Admin** roles, backed by Supabase.

## Structure

```
apps/unified-app/     Unified Expo app (Redux + React Navigation)
packages/types/       Shared Zod schemas
packages/ui/          Design system (v2.0 tokens)
packages/api-client/  Supabase client factory
packages/config/      ESLint + TypeScript presets
supabase/             Migrations, Edge Functions, seed
docs/source/          Official v2.0 PDF/DOCX/MD originals
archive/              Legacy two-app scaffold (deprecated)
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI (for migrations)
- Expo Go or dev client

## Setup

```bash
pnpm install
cp .env.example apps/unified-app/.env
# Edit apps/unified-app/.env with Supabase URL and anon key

# Apply database migrations (requires linked Supabase project)
supabase db push
```

## Development

```bash
pnpm dev
```

## Quality

```bash
pnpm lint
pnpm typecheck
```

## Documentation

| Doc | Path |
|-----|------|
| PRD v2.0 | [docs/PRD.md](docs/PRD.md) |
| Architecture | [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) |
| Security | [docs/SECURITY_AND_ACCESS.md](docs/SECURITY_AND_ACCESS.md) |
| Frontend spec | [docs/FRONTEND_SPEC.md](docs/FRONTEND_SPEC.md) |
| Feature tickets (42) | [docs/FEATURE_TICKETS.md](docs/FEATURE_TICKETS.md) |
| Roadmap | [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) |
| Original sources | [docs/source/](docs/source/) |

## Sprint status

| Sprint | Focus | Status |
|--------|-------|--------|
| S0 | Unified app scaffold | Done |
| 1 | INFRA-004/005/006 migrations, RLS, FCM | Scaffolded |
| 2 | AUTH-001–007 | Implemented |
| 3 | Customer + Payments | Screen + API layer |
| 4 | Officer + EAS/Sentry | Screen + config |
| 5 | Admin ADM-001–005 | Screen shells |
| 6 | Backlog P2/P3 | Stubs + Edge Functions |

## License

Proprietary — Prime Fibernet
