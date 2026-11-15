# Interview Feedback Platform

A platform for grading and viewing feedback from 1:1 mock interview sessions. 

**Supported Functionality**
* Admin can fill out interview feedback based on interview type and rubric and it's emailed to a candidate
* Candidate can view their specific feedback via the emailed URL and if they sign up, they're able to view all historical feedback 

## How to Run the App

### 1. Install Dependencies
```bash
yarn install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173

# Optional: Resend API Key for live email dispatch (simulated in dev if omitted)
RESEND_API_KEY=re_your_api_key
```

### 3. Initialize the Database
1. Run migrations using Supabase CLI (`yarn db:push` or `supabase db push`), or copy and run the baseline schema in your [Supabase Dashboard](https://supabase.com) > **SQL Editor** from [`supabase/migrations/20261113000000_initial_schema.sql`](supabase/migrations/20261113000000_initial_schema.sql). This sets up tables, RLS policies, triggers, and calibrated rubric criteria.
2. Sign in once at `/login` with your email, then run this in the Supabase SQL Editor to grant admin access:
```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

### 4. Start Development Server

#### Option A: Full Local Stack (Recommended — 1 Command)
Automatically boots local Supabase with the latest production snapshot, sets up environment variables, and launches the frontend:
```bash
yarn dev:local
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Supabase Studio (Web UI)**: [http://127.0.0.1:54323](http://127.0.0.1:54323)
- **Inbucket Local Mailbox**: [http://127.0.0.1:54324](http://127.0.0.1:54324)

#### Option B: Frontend Only (Points to Supabase Cloud)
```bash
yarn dev
```

### Stopping the Local Stack
When finished working with the local stack:
```bash
yarn db:stop
rm .env.local
```

### Other Commands
- **Unit & Integration Tests**: `yarn test` (or `yarn test:watch`)
- **Supabase Integration Tests**: `yarn test:supabase`
- **Type Check**: `yarn typecheck`
- **Full Verification**: `yarn verify` (Typecheck + Tests + Build)
- **Production Build**: `yarn build`
- **Preview Build**: `yarn preview`
