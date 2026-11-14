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
- **Unit & Integration Tests**: `yarn test` (or `yarn test:watch`)
- **Supabase Integration Tests**: `yarn test:supabase`
- **Type Check**: `yarn typecheck`
- **Full Verification**: `yarn verify` (Typecheck + Tests + Build)
- **Production Build**: `yarn build`
- **Preview Build**: `yarn preview`

## Google Analytics 4 (GA4) Tracking

The platform includes headless, privacy-first Google Analytics 4 tracking via [`src/lib/analytics.ts`](src/lib/analytics.ts) and [`src/components/common/AnalyticsTracker.tsx`](src/components/common/AnalyticsTracker.tsx).

### Setup
1. In [analytics.google.com](https://analytics.google.com), create a Web stream or copy your existing Measurement ID (`G-XXXXXXXXXX`).
2. Add your Measurement ID:
   - **Local Dev**: Add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to your `.env` file.
   - **Production**: Add `VITE_GA_MEASUREMENT_ID` to your GitHub Repository Secrets.

If `VITE_GA_MEASUREMENT_ID` is omitted or empty, Google Analytics remains gracefully disabled with zero runtime overhead, script injections, or network requests.

### Tracked Metrics & Events
| Event Name | Trigger | Payload Parameters |
| :--- | :--- | :--- |
| **`page_view`** | Automatic on every client-side route navigation (`/`, `/admin`, `/history`, `/r/:token`) | `page_path`, `page_title`, `page_location` |
| **`evaluation_published`** | When an interviewer publishes and shares an evaluation | `track` (e.g. `DSA / LeetCode`), `verdict` (`Hire`, etc.) |
| **`scorecard_viewed`** | When a candidate opens their public scorecard link (`/r/:token`) | `track`, `verdict` |
| **`scorecard_link_copied`** | When a user clicks "Copy Link" on a scorecard | `track` |
| **`question_added_to_bank`**| When an interviewer or admin adds a new reusable question | `track` |
| **`rubric_calibrated`** | When an admin updates an axis benchmark definition in the studio | `axis` |

### How to Verify
Open your browser Developer Tools Console or Google Analytics **Reports > Realtime** (or **DebugView**) to inspect live events firing as you navigate and grade mock interviews.

## Google Analytics 4 (GA4) Tracking

The platform includes headless, privacy-first Google Analytics 4 tracking via [`src/lib/analytics.ts`](src/lib/analytics.ts) and [`src/components/common/AnalyticsTracker.tsx`](src/components/common/AnalyticsTracker.tsx).

### Setup
1. In [analytics.google.com](https://analytics.google.com), create a Web stream or copy your existing Measurement ID (`G-XXXXXXXXXX`).
2. Add your Measurement ID:
   - **Local Dev**: Add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to your `.env` file.
   - **Production**: Add `VITE_GA_MEASUREMENT_ID` to your GitHub Repository Secrets.

If `VITE_GA_MEASUREMENT_ID` is omitted or empty, Google Analytics remains gracefully disabled with zero runtime overhead, script injections, or network requests.

### Tracked Metrics & Events
| Event Name | Trigger | Payload Parameters |
| :--- | :--- | :--- |
| **`page_view`** | Automatic on every client-side route navigation (`/`, `/admin`, `/history`, `/r/:token`) | `page_path`, `page_title`, `page_location` |
| **`evaluation_published`** | When an interviewer publishes and shares an evaluation | `track` (e.g. `DSA / LeetCode`), `verdict` (`Hire`, etc.) |
| **`scorecard_viewed`** | When a candidate opens their public scorecard link (`/r/:token`) | `track`, `verdict` |
| **`scorecard_link_copied`** | When a user clicks "Copy Link" on a scorecard | `track` |
| **`question_added_to_bank`**| When an interviewer or admin adds a new reusable question | `track` |
| **`rubric_calibrated`** | When an admin updates an axis benchmark definition in the studio | `axis` |

### How to Verify
Open your browser Developer Tools Console or Google Analytics **Reports > Realtime** (or **DebugView**) to inspect live events firing as you navigate and grade mock interviews.
