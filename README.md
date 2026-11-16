# DischargeIQ

Helps community pharmacy teams complete **NHS Discharge Medicines Service (DMS)** referrals: AI reads the
hospital discharge letter, plain tested code compares it with the patient's pre-admission medicines
(started / stopped / changed / unchanged), and the pharmacist checks and approves every stage through to a
claim-ready record.

> **Prototype for a bootcamp project. Synthetic data only. Not a medical device.** It supports the
> pharmacist's decision; it never makes one.

## Live
- App: https://dischargeiq-pied.vercel.app
- API health: https://dischargeiq-api-nr30.onrender.com/api/health

## Tech stack
TypeScript everywhere · React + Vite (plain CSS + CSS Modules, design tokens) · Node + Express 5 ·
PostgreSQL on Supabase (London) via `pg` · Zod schemas shared by client and server · Vitest + Supertest ·
GitHub Actions CI · Vercel (client, forwards `/api`) + Render (API, Frankfurt).
Why each choice was made: [`docs/decisions.md`](docs/decisions.md) and [`docs/architecture.md`](docs/architecture.md).

## Run it locally
Requires Node 24 (see `.nvmrc`).

```
npm install
copy server\.env.example server\.env     # then fill in the values (names only are listed there)
copy client\.env.example client\.env
npm run dev:server                        # terminal 1: API on port 3000
npm run dev:client                        # terminal 2: app on http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm test` | Server tests, against the separate test database only |
| `npm run typecheck` · `npm run lint` · `npm run build` | The same checks CI runs on every push |
| `npm run migrate` | Applies new SQL migrations (production: GitHub Actions → "Run migrations") |

## Environment variables (names only)
- `server/.env`: `DATABASE_URL`, `TEST_DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`,
  `ANTHROPIC_MODEL`, `PORT`
- `client/.env`: `API_PROXY_TARGET` (development only, not secret)

Secrets live only in `.env` files (never committed) and in the hosts' settings.

## Documentation
Brief, architecture, decisions, design system, page designs, hazard log, user research, AI usage log and
test sheet are in [`docs/`](docs/).
