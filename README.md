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
1. In your [Supabase Dashboard](https://supabase.com) > **SQL Editor**, run the contents of [`supabase/init.sql`](supabase/init.sql). This sets up tables, RLS policies, triggers, and calibrated rubric criteria.
2. Sign in once at `/login` with your email, then run this in the Supabase SQL Editor to grant admin access:
```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

### 4. Start Development Server
```bash
yarn dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Other Commands
- **Unit & Integration Tests**: `yarn test` (or `yarn test:watch`)
- **Supabase Integration Tests**: `yarn test:supabase`
- **Type Check**: `yarn typecheck`
- **Full Verification**: `yarn verify` (Typecheck + Tests + Build)
- **Production Build**: `yarn build`
- **Preview Build**: `yarn preview`

## Google Tag Manager (GTM) & Analytics Tracking

The platform is integrated with **Google Tag Manager** (`GTM-T2HTC67J`) and dispatches client-side SPA route navigations and custom actions directly to `window.dataLayer` and `window.gtag` via [`src/lib/analytics.ts`](src/lib/analytics.ts).

### How it Works
1. **Container Snippet**: The official GTM container script is embedded in `<head>` and the `<noscript>` fallback in `<body>` of [`index.html`](index.html).
2. **Data Layer Events**: The app pushes structured event objects to `window.dataLayer` for GTM tags, triggers, and variables:
   - **`page_view`**: Triggered automatically on every React Router SPA navigation (`/`, `/admin`, `/history`, `/r/:token`) with `page_path`, `page_title`, and `page_location`.
   - **`evaluation_published`**: Fired when an interviewer publishes a scorecard (payload: `track`, `verdict`).
   - **`scorecard_viewed`**: Fired when a candidate opens their scorecard link `/r/:token` (payload: `track`, `verdict`).
   - **`scorecard_link_copied`**: Fired when someone clicks the shareable link copy button (payload: `track`).
   - **`question_added_to_bank`**: Fired when a new reusable question is created (payload: `track`).
   - **`rubric_calibrated`**: Fired when an admin updates an evaluation criterion (payload: `axis`).
3. **Optional Direct GA4**: If `VITE_GA_MEASUREMENT_ID` (`G-XXXXXXXXXX`) is provided, `analytics.ts` also calls `gtag('event', ...)` directly.

### Verification
- **GTM Preview / Tag Assistant**: Visit [tagassistant.google.com](https://tagassistant.google.com) and connect to your deployed domain (`https://mocksignal.karkir0003.workers.dev`) to see tags and dataLayer events fire in real time.
- **Browser Console**: Inspect `window.dataLayer` in the DevTools console to see the event stream.
