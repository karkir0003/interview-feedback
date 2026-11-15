# MockSignal: Calibrated Mock Interview Feedback Platform

MockSignal is an end-to-end engineering mock interview evaluation and performance tracking platform. It allows interviewers to grade candidates across calibrated rubrics with markdown feedback, generates secure public scorecards, and provides candidates with longitudinal growth tracking.

---

## ⚡ Quick Start (Local Development)

MockSignal features a **1-command fullstack local development environment** that spins up isolated local Supabase containers (seeded with production snapshots and pre-configured test users), configures environment variables, and launches the Vite frontend.

### Prerequisites
* [Node.js](https://nodejs.org/) (v20+ recommended) & [Yarn](https://yarnpkg.com/)
* [Docker Desktop](https://www.docker.com/), [OrbStack](https://orbstack.dev/), or [Colima](https://github.com/abiosoft/colima) running locally
* [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase`)

### 1. Install Dependencies
```bash
yarn install
```

### 2. Start Local Stack
```bash
yarn dev:local
```

That's it! Local services will be ready at:
* 🌐 **Web App**: [http://localhost:5173](http://localhost:5173)
* 🛠️ **Supabase Studio (Web UI)**: [http://127.0.0.1:54323](http://127.0.0.1:54323)
* 📬 **Mailpit Local Mailbox**: [http://127.0.0.1:54324](http://127.0.0.1:54324)
* ⚡ **PostgREST API**: [http://127.0.0.1:54321](http://127.0.0.1:54321)

---

## 🔑 Pre-Seeded Local Accounts

When running locally, you don't need real credentials or email delivery. The `/login` page includes a **Local Dev Quick-Login** card with **1-click sign-in buttons** for all three roles:

| Role | Email | Password | Capabilities & Pre-Loaded State |
| :--- | :--- | :--- | :--- |
| 👑 **Admin** | `admin@mocksignal.local` | `password123` | Full access: Grade Interview, Question Bank, Rubrics Calibration (`/admin`) |
| 📝 **Interviewer** | `interviewer@mocksignal.local` | `password123` | Grade Interview, Question Bank, score mock sessions |
| 🎓 **Candidate** | `candidate@mocksignal.local` | `password123` | **Pre-seeded with 2 graded interview evaluations** (Splitwise & LRU Cache) and historical score charts (`/history`) |

> [!NOTE]
> All local mutations are contained strictly inside your Docker database. Nothing touches production. To reset your local database back to the pristine baseline and snapshot at any time, run:
> ```bash
> yarn db:reset
> ```

---

## 🧪 Testing & Verification

MockSignal maintains a strict verification pipeline. Before submitting PRs or deploying, verify that all checks pass:

```bash
# Run the complete verification pipeline (Typecheck + Unit Tests + Vite Production Build)
yarn verify

# Run Vitest test suite
yarn test

# Typecheck TypeScript across client, server, and edge functions
yarn typecheck

# Build client-side assets to ./dist
yarn build
```

---

## 🛠️ Database & CLI Operations

| Command | Purpose |
| :--- | :--- |
| `yarn dev:local` | Boots local Supabase, loads snapshot + test users, sets `.env.local`, and runs Vite. |
| `yarn db:reset` | Wipes the local database, replays all migrations, and reapplies snapshot + dev accounts. |
| `yarn db:snapshot` | Exports a data-only snapshot of public tables from production into `supabase/seed.sql`. |
| `yarn db:clone` | Refreshes the local Supabase container and database without starting Vite. |
| `yarn db:stop` | Stops local Supabase Docker containers. |
| `yarn db:types` | Regenerates TypeScript definitions from the local schema into `src/types/database.types.ts`. |

---

## ☁️ Connecting to Cloud / Production

To point your local frontend directly to remote Supabase Cloud or staging:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your project credentials:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_APP_URL=http://localhost:5173
   
   # Optional: Resend API Key for live email delivery
   RESEND_API_KEY=re_your_key
   ```
3. Run the frontend standalone:
   ```bash
   yarn dev
   ```
