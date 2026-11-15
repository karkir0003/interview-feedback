# Technical Specification: Lightweight Mock Interview Rubric Platform (v1)

## 1. Overview & Goals
A lightweight, low-friction web application for conducting and grading 1-on-1 mock interviews across technical and behavioral tracks.
- **Interviewer (Admin):** Rapidly select an interview track and question from a reusable bank (or add a new question inline), score candidates on a calibrated 1–5 rubric with multi-paragraph Markdown justifications, assign an overall hireability verdict, and email a direct report link in one click.
- **Candidate (Reader):** Immediately view their scorecard via a unique, unauthenticated share link (`public_token`) with zero PII exposed. Optionally sign up/log in with their email to unlock a longitudinal dashboard of all past mock interviews and axis score trends.
- **Operating Constraints:** Designed for low weekly traffic at **$0/month** operating cost using a serverless stack (React/Vite + TypeScript + Tailwind CSS on Vercel/Cloudflare Pages, Supabase Postgres + Auth, and Resend for transactional email).

---

## 2. Tech Stack & Architecture
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, `@tailwindcss/typography` (`prose` styling), `react-markdown`, `remark-gfm`, `lucide-react`.
- **Backend & Database:** Supabase (PostgreSQL, Row-Level Security, `SECURITY DEFINER` RPCs, Magic Link / Google OAuth).
- **Email Service:** Resend API (`3,000` free emails/month) called via a lightweight serverless function (`/api/send-report` or Supabase Edge Function).

---

## 3. Roles & Access Control
1. **Admin (`profiles.role = 'admin'`):**
   - Authenticated via Supabase Auth (Magic Link or Google OAuth).
   - Full read/write access across all tables via `is_admin()` helper.
   - Can create evaluations, upsert candidate records, add new questions to the question bank, and view all historical sessions.
2. **Unauthenticated Visitor (Public Magic Link `/r/:token`):**
   - No login required; includes `<meta name="robots" content="noindex, nofollow" />` so search engines never index shared links.
   - Cannot query tables directly (`anon` table `SELECT` is disabled so nobody can enumerate records); calls a single `SECURITY DEFINER` RPC (`get_evaluation_by_token(p_token)`) that returns only that specific scorecard and omits `candidate_email` and internal user IDs.
3. **Authenticated Candidate (`profiles.role = 'candidate'`):**
   - Authenticated via Supabase Magic Link or Google OAuth.
   - RLS restricts `SELECT` access strictly to records where `candidates.email == lower(auth.jwt() ->> 'email')`.

---

## 4. Rubric Tracks, Calibration & Scoring Scale

### Rating Scale (1–5)
- **1:** Very poor
- **2:** Below bar
- **3:** Meets bar
- **4:** Strong
- **5:** Exceptional / Exceeded Expectations

### Overall Hireability Verdicts
`No Hire` | `Partial Hire` | `Hire` | `Strong Hire`

### Interview Tracks (`interview_types`) & Criteria (`rubric_criteria`)
1. **DSA / LeetCode (`dsa`) & LLD Coding (`lld`):**
   - `optimality`: Optimality of solution
   - `communication`: Clear Communication
   - `ds_language`: Command of foundational data structures and language features
   - `complexity`: Ability to analyze time and space complexity
   - `product_system`: Product and System thinking
2. **AI-Enabled Coding (`ai_coding`):**
   - All 5 criteria from **LLD Coding**, plus:
   - `ai_fluency`: AI fluency (prompting precision, verification of AI output, iteration loop)
3. **System Design (`system_design`):**
   - `requirements`: Requirements & scope framing
   - `architecture`: High-level architecture & data modeling
   - `scalability`: Scalability, bottlenecks & trade-offs
   - `communication`: Clear Communication
   - `product_system`: Product and System thinking
4. **Behavioral (`behavioral`):**
   - `star_clarity`: STAR structure & signal clarity
   - `ownership`: Ownership, scope & impact
   - `collaboration`: Collaboration & conflict resolution
   - `communication`: Clear Communication

*(Each `rubric_criteria` row stores a custom per-axis `scale_descriptions` `jsonb` map `{"1": "...", ..., "5": "..."}` used for hover/inline calibration tooltips during grading.)*

---

## 5. Data Model, Query Patterns & ER Diagram

### Key Architectural Decisions
- **Pre-Signup vs. Signed-Up Users (Option A):** `candidates` stores the directory of all interviewed mentees (existing prior to account creation), while `profiles` stores signed-up Supabase Auth users (`auth.users`) with explicit roles (`'admin'` | `'candidate'`). When a candidate later signs up with their email, RLS matches `profiles.email = candidates.email` to unlock their full history automatically.
- **Reusable Question Bank (`questions`):** Stores problem titles per interview track (e.g., `"Train Trip Manager"`, `"Permissions System"`) so the interviewer selects from a dropdown instead of retyping problem names. Omits long prompt text in v1 to keep entry fast.
- **Historical Immutability (Snapshots):** `evaluations` and `evaluation_scores` snapshot `interview_type_name`, `question_title`, and `criterion_label` at submission time so future template wording tweaks or deactivated axes (`is_active = false`) never break or alter past scorecards.
- **Normalized Scores & Longitudinal Analytics:** Keeping scores in `evaluation_scores` (rather than raw JSONB) enforces `score between 1 and 5` at the DB level and allows clean `AVG(score) GROUP BY criterion_key` queries on `/history`.
- **Rich Markdown Support:** `overall_feedback` and `justification` use PostgreSQL `text` (up to 1 GB via TOAST) to support multi-paragraph Markdown feedback and code blocks without arbitrary `varchar` limits.

### Entity-Relationship Diagram

```text
+-------------------------------------+       +----------------------------------------+
|           interview_types           |       |            rubric_criteria             |
+-------------------------------------+       +----------------------------------------+
| PK  id                   uuid       |--+    | PK  id                      uuid       |
| UQ  slug                 text       |  +---<| FK  interview_type_id       uuid       |
|     name                 text       |  |    | UQ* criterion_key           text       |
|     display_order        int        |  |    |     label                   text       |
|     is_active            boolean    |  |    |     scale_descriptions      jsonb      |
+-------------------------------------+  |    |     display_order           int        |
           |               |             |    |     is_active               boolean    |
           | 1:N           | 1:N         |    +----------------------------------------+
           |               |             |
           |               |             |    +----------------------------------------+
           |               |             +---<|               questions                |
           |               |                  +----------------------------------------+
           |               |                  | PK  id                      uuid       |
           |               |                  | FK  interview_type_id       uuid       |
           |               |                  | UQ* title                   text       |
           |               |                  |     is_active               boolean    |
           |               |                  +----------------------------------------+
           |               |                                       |
+-------------------------------------+                            | 1:N (Nullable)
|             candidates              |                            v
|     (All Interviewed Mentees)       |       +----------------------------------------+
+-------------------------------------+       |              evaluations               |
| PK  id                   uuid       |--+    |        (Mock Interview Sessions)       |
| UQ  email                text       |  |    +----------------------------------------+
|     full_name            text       |  +---<| PK  id                      uuid       |
|     created_at           timestamptz|       | UQ  public_token            uuid       |
+-------------------------------------+       | FK  candidate_id            uuid       |
           :                                  | FK  interview_type_id       uuid       |
           : (Matched by email on login)      | FK  question_id (nullable)  uuid       |
           :                                  |     interview_type_name     text       |
+-------------------------------------+       |     question_title          text       |
|              profiles               |       |     hireability             text       |
|       (Signed-Up Auth Users)        |       |     overall_feedback        text (MD)  |
+-------------------------------------+       |     interviewed_at          date       |
| PK  id (FK auth.users)   uuid       |       |     created_at              timestamptz|
| UQ  email                text       |       +----------------------------------------+
|     role ('admin'|'candidate')      |                            |
|     created_at           timestamptz|                            | 1:N (ON DELETE CASCADE)
+-------------------------------------+                            v
                                              +----------------------------------------+
                                              |           evaluation_scores            |
                                              +----------------------------------------+
                                              | PK  id                      uuid       |
                                              | FK  evaluation_id           uuid       |
                                              | UQ* criterion_key           text       |
                                              |     criterion_label         text       |
                                              |     score                   smallint   |
                                              |     justification           text (MD)  |
                                              |     display_order           int        |
                                              +----------------------------------------+
```

### Core Query Patterns & Index Coverage
1. **Load Admin Form Templates:** `SELECT ... FROM interview_types WHERE is_active = true ORDER BY display_order`, plus `rubric_criteria` and `questions` filtered by `interview_type_id` (covered by leftmost prefixes of `UNIQUE(interview_type_id, criterion_key)` and `UNIQUE(interview_type_id, title)`).
2. **Candidate Single Scorecard Lookup (`/r/:token`):** `WHERE evaluations.public_token = $1` (covered by `UNIQUE` index on `public_token`).
3. **Candidate History (`/history`):** `WHERE candidates.email = lower($1)` $\rightarrow$ `SELECT ... FROM evaluations WHERE candidate_id = $1 ORDER BY interviewed_at DESC, created_at DESC` (covered by `UNIQUE` index on `candidates(email)` + `idx_evaluations_candidate_date`).
4. **Admin Recent Feed (`/admin`):** `SELECT ... FROM evaluations ORDER BY interviewed_at DESC, created_at DESC LIMIT 50` (covered by `idx_evaluations_interviewed_at`).
5. **Upsert Candidate on Submit:** `INSERT INTO candidates (email, full_name) ... ON CONFLICT (email) DO UPDATE` (covered by `UNIQUE` index on `candidates(email)`).

---

## 6. Database Schema & Initial Migration (`20261113000000_initial_schema.sql`)

```sql
-- ==========================================
-- 1. TABLES & CONSTRAINTS
-- ==========================================

-- Signed-up Supabase Auth users & their roles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null check (email = lower(trim(email))),
  role text not null default 'candidate' check (role in ('admin', 'candidate')),
  created_at timestamptz not null default now()
);

-- Directory of all interviewed candidates (exists prior to signup)
create table candidates (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(trim(email))),
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Interview rounds / tracks
create table interview_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  display_order int not null default 0,
  is_active boolean not null default true
);

-- Rubric criteria per interview track (with per-axis 1-5 tooltips)
create table rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  interview_type_id uuid not null references interview_types(id) on delete cascade,
  criterion_key text not null,
  label text not null,
  scale_descriptions jsonb not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  unique (interview_type_id, criterion_key)
);

-- Reusable question bank per interview track
create table questions (
  id uuid primary key default gen_random_uuid(),
  interview_type_id uuid not null references interview_types(id) on delete restrict,
  title text not null,
  is_active boolean not null default true,
  unique (interview_type_id, title)
);

-- Individual mock interview sessions
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  public_token uuid unique not null default gen_random_uuid(),
  candidate_id uuid not null references candidates(id),
  interview_type_id uuid not null references interview_types(id),
  question_id uuid references questions(id) on delete set null,
  interview_type_name text not null,
  question_title text not null,
  hireability text not null check (
    hireability in ('No Hire', 'Partial Hire', 'Hire', 'Strong Hire')
  ),
  overall_feedback text not null,
  interviewed_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Per-axis grades & Markdown justifications
create table evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  criterion_key text not null,
  criterion_label text not null,
  score smallint not null check (score between 1 and 5),
  justification text not null,
  display_order int not null default 0,
  unique (evaluation_id, criterion_key)
);

-- ==========================================
-- 2. TARGETED INDEXES
-- ==========================================

create index idx_evaluations_candidate_date on evaluations (candidate_id, interviewed_at desc, created_at desc);
create index idx_evaluations_interviewed_at on evaluations (interviewed_at desc, created_at desc);

-- ==========================================
-- 3. SIGNUP TRIGGER & ROLE HELPER
-- ==========================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, lower(trim(new.email)), 'candidate')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ==========================================
-- 4. ROW-LEVEL SECURITY (RLS) & PUBLIC RPC
-- ==========================================

alter table profiles enable row level security;
alter table candidates enable row level security;
alter table interview_types enable row level security;
alter table rubric_criteria enable row level security;
alter table questions enable row level security;
alter table evaluations enable row level security;
alter table evaluation_scores enable row level security;

create policy "Admin all profiles" on profiles for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all candidates" on candidates for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all interview_types" on interview_types for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all rubric_criteria" on rubric_criteria for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all questions" on questions for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all evaluations" on evaluations for all to authenticated using (is_admin()) with check (is_admin());
create policy "Admin all evaluation_scores" on evaluation_scores for all to authenticated using (is_admin()) with check (is_admin());

create policy "Users read own profile" on profiles for select to authenticated
  using (id = auth.uid());

create policy "Candidate read own record" on candidates for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "Candidate read own evaluations" on evaluations for select to authenticated
  using (candidate_id in (select id from candidates where email = lower(auth.jwt() ->> 'email')));

create policy "Candidate read own scores" on evaluation_scores for select to authenticated
  using (evaluation_id in (
    select e.id from evaluations e
    join candidates c on c.id = e.candidate_id
    where c.email = lower(auth.jwt() ->> 'email')
  ));

create or replace function get_evaluation_by_token(p_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id,
    'candidate_name', c.full_name,
    'interview_type_name', e.interview_type_name,
    'question_title', e.question_title,
    'hireability', e.hireability,
    'overall_feedback', e.overall_feedback,
    'interviewed_at', e.interviewed_at,
    'scores', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'criterion_key', s.criterion_key,
          'criterion_label', s.criterion_label,
          'score', s.score,
          'justification', s.justification
        ) order by s.display_order
      ) from evaluation_scores s where s.evaluation_id = e.id
    ), '[]'::jsonb)
  )
  from evaluations e
  join candidates c on c.id = e.candidate_id
  where e.public_token = p_token;
$$;

grant execute on function get_evaluation_by_token(uuid) to anon, authenticated;

-- ==========================================
-- 5. SEED INTERVIEW TYPES & CALIBRATED RUBRICS
-- ==========================================

with types as (
  insert into interview_types (slug, name, display_order) values
    ('dsa', 'DSA / LeetCode', 1),
    ('lld', 'LLD Coding', 2),
    ('ai_coding', 'AI-Enabled Coding', 3),
    ('system_design', 'System Design', 4),
    ('behavioral', 'Behavioral', 5)
  returning id, slug
),
coding_axes(criterion_key, label, display_order, scale_descriptions) as (
  values
    ('optimality', 'Optimality of solution', 1, '{"1":"Very poor — fails to produce a working brute force or misses core problem constraints","2":"Below bar — working brute force only; unable to optimize even with hints","3":"Meets bar — reaches optimal or near-optimal approach with minor nudges; handles main cases","4":"Strong — independently identifies optimal algorithm/design and handles key edge cases cleanly","5":"Exceptional — immediately spots optimal invariants, writes bug-free code, and nails every edge case"}'::jsonb),
    ('communication', 'Clear Communication', 2, '{"1":"Very poor — silent coding, unclear reasoning, or unable to explain approach when asked","2":"Below bar — jumps into code prematurely; jumps between ideas without clear structure","3":"Meets bar — explains approach before coding and responds coherently to clarifying questions","4":"Strong — structured upfront alignment, narrates trade-offs clearly, proactive check-ins","5":"Exceptional — crisp executive clarity; drives the session like a senior engineering peer"}'::jsonb),
    ('ds_language', 'Command of foundational data structures and language features', 3, '{"1":"Very poor — struggles with basic syntax, collections, or choosing an appropriate data structure","2":"Below bar — awkward data structure choices or frequent language/API stumbling","3":"Meets bar — selects appropriate standard structures and writes idiomatic, readable code","4":"Strong — clean abstractions, strong command of standard library primitives and language idioms","5":"Exceptional — effortless, production-grade code structure with clean modularity and zero friction"}'::jsonb),
    ('complexity', 'Ability to analyze time and space complexity', 4, '{"1":"Very poor — unable to state Big-O time or space complexity or guesses inaccurately","2":"Below bar — states headline complexity loosely; misses auxiliary space or bottlenecks","3":"Meets bar — accurately derives time and space complexity for the final solution","4":"Strong — compares complexity across approaches and justifies memory/CPU trade-offs","5":"Exceptional — tight amortized/worst-case analysis including constant factors and scaling limits"}'::jsonb),
    ('product_system', 'Product and System thinking', 5, '{"1":"Very poor — treats problem purely mechanically with zero awareness of real-world usage or failure modes","2":"Below bar — overlooks input validation, concurrency, or extensibility until prompted","3":"Meets bar — considers practical edge cases, clean interfaces, and basic extensibility","4":"Strong — proactively designs for extensibility, error states, and real-world operational constraints","5":"Exceptional — anticipates downstream product evolution, concurrency/state invariants, and failure recovery"}'::jsonb)
)
insert into rubric_criteria (interview_type_id, criterion_key, label, display_order, scale_descriptions)
select t.id, c.criterion_key, c.label, c.display_order, c.scale_descriptions
from types t cross join coding_axes c where t.slug in ('dsa', 'lld', 'ai_coding')
union all
select t.id, 'ai_fluency', 'AI fluency', 6, '{"1":"Very poor — pastes vague prompts, accepts broken AI code blindly without testing","2":"Below bar — over-relies on AI for basic logic or gets stuck debugging AI-generated hallucinations","3":"Meets bar — uses AI effectively for scaffolding/boilerplate and verifies output with basic tests","4":"Strong — decomposes tasks into targeted prompts, reviews diffs critically, and catches subtle AI bugs","5":"Exceptional — surgical context/prompt framing, rapid human-AI iteration loop, full ownership of final code"}'::jsonb
from types t where t.slug = 'ai_coding'
union all
select t.id, x.criterion_key, x.label, x.display_order, x.scale_descriptions
from types t cross join (values
  ('requirements', 'Requirements & scope framing', 1, '{"1":"Very poor — jumps into boxes without clarifying scale or features","2":"Below bar — misses critical functional or non-functional constraints","3":"Meets bar — clarifies core APIs, scale targets, and basic SLAs","4":"Strong — sharp scope prioritization and back-of-the-envelope capacity math","5":"Exceptional — frames crisp product trade-offs and derives exact bottlenecks from numbers"}'::jsonb),
  ('architecture', 'High-level architecture & data modeling', 2, '{"1":"Very poor — incoherent components or flawed storage schema","2":"Below bar — generic diagram with vague data flow or missing schemas","3":"Meets bar — logical end-to-end architecture with sensible DB/API choices","4":"Strong — clean service boundaries, well-indexed data models, clear read/write paths","5":"Exceptional — deeply cohesive architecture with precise schemas, partitioning, and API contracts"}'::jsonb),
  ('scalability', 'Scalability, bottlenecks & trade-offs', 3, '{"1":"Very poor — ignores single points of failure, consistency, or load spikes","2":"Below bar — names buzzwords without explaining why or trade-offs","3":"Meets bar — identifies primary bottleneck and proposes valid caching/sharding/async patterns","4":"Strong — articulates concrete consistency, latency, and failure-mode trade-offs","5":"Exceptional — anticipates tail latency, hot partitions, backpressure, and graceful degradation"}'::jsonb),
  ('communication', 'Clear Communication', 4, '{"1":"Very poor — disorganized walkthrough; interviewer has to pull every detail","2":"Below bar — gets lost in minor details before establishing high-level flow","3":"Meets bar — logical top-down walkthrough and receptive to redirection","4":"Strong — clear pacing, structured diagram hygiene, proactive trade-off framing","5":"Exceptional — commands the room effortlessly, balancing vision with deep dives"}'::jsonb),
  ('product_system', 'Product and System thinking', 5, '{"1":"Very poor — over-engineers irrelevant parts while ignoring core user experience","2":"Below bar — disconnects technical choices from user-facing latency or reliability","3":"Meets bar — aligns design decisions with core product requirements","4":"Strong — ties consistency/availability choices directly to real user impact","5":"Exceptional — balances engineering complexity, cost, operational burden, and product velocity"}'::jsonb)
) as x(criterion_key, label, display_order, scale_descriptions) where t.slug = 'system_design'
union all
select t.id, x.criterion_key, x.label, x.display_order, x.scale_descriptions
from types t cross join (values
  ('star_clarity', 'STAR structure & signal clarity', 1, '{"1":"Very poor — rambling stories with no clear situation, action, or measurable outcome","2":"Below bar — heavy context setup with vague personal actions or unclear results","3":"Meets bar — coherent STAR narrative with clear personal contribution and outcome","4":"Strong — concise, high-signal storytelling that anticipates follow-up probing","5":"Exceptional — executive-level clarity; every sentence delivers signal and quantified impact"}'::jsonb),
  ('ownership', 'Ownership, scope & impact', 2, '{"1":"Very poor — blames teammates/circumstances or describes passive execution","2":"Below bar — limited scope; waited for direction rather than driving resolution","3":"Meets bar — took clear responsibility for deliverables and saw problems through","4":"Strong — proactively identified gaps, unblocked dependencies, drove measurable impact","5":"Exceptional — high-agency end-to-end ownership under ambiguity with lasting impact"}'::jsonb),
  ('collaboration', 'Collaboration & conflict resolution', 3, '{"1":"Very poor — combative, dismissive of feedback, or unable to navigate disagreement","2":"Below bar — avoids conflict or struggles to articulate differing stakeholder perspectives","3":"Meets bar — listens actively, aligns with peers, and resolves friction constructively","4":"Strong — builds consensus across differing viewpoints with empathy and data","5":"Exceptional — elevates team alignment, turns friction into productive outcomes, mentors peers"}'::jsonb),
  ('communication', 'Clear Communication', 4, '{"1":"Very poor — struggles to answer directly or loses track of the question asked","2":"Below bar — verbose answers requiring frequent redirection","3":"Meets bar — answers directly and adapts well to follow-up questions","4":"Strong — structured, self-aware, and candid about lessons learned","5":"Exceptional — crisp, authentic, and deeply reflective communication throughout"}'::jsonb)
) as x(criterion_key, label, display_order, scale_descriptions) where t.slug = 'behavioral';
```

---

## 7. Frontend Routes & UI Specification

### Shared Markdown Renderer Component (`FeedbackMarkdown`)
Use `react-markdown` + `remark-gfm` + `@tailwindcss/typography` (`prose prose-slate prose-sm max-w-none`) so multi-paragraph comments, bullet lists, and fenced code snippets render cleanly and safely without raw HTML injection.

### Route 1: `/login` (Authentication)
- **Features:** Clean single-card login supporting **Magic Link (OTP email)** and **Google OAuth** via Supabase Auth.
- **Post-Login Redirect:** Checks `profiles.role`:
  - `'admin'` $\rightarrow$ redirects to `/admin`.
  - `'candidate'` $\rightarrow$ redirects to `/history`.

### Route 2: `/admin` (Interviewer Evaluation Builder & Dashboard)
- **Guard:** Redirects non-admin users to `/login`.
- **Evaluation Form UX:**
  - **Candidate Info:** `Candidate Name` (text), `Candidate Email` (email), `Interview Date` (defaults to today).
  - **Track Selector:** Dropdown/tabs of active `interview_types` (`is_active = true`). Changing tracks dynamically loads its active `rubric_criteria` and filters the `Question` combobox.
  - **Question Combobox:** Select an existing question from `questions` for that track, OR type a new question title inline (with a checkbox/option to save it to the `questions` bank on submit).
  - **Rubric Axis Cards:** One card per criterion displaying:
    - Criterion label + interactive `1` `2` `3` `4` `5` pill buttons.
    - Selecting or hovering over a score displays the calibration tooltip from `scale_descriptions[score]`.
    - Multi-line Markdown textarea for `justification` with a **Write | Preview** toggle.
  - **Verdict & Summary:** Pill selector for `Hireability` (`No Hire`, `Partial Hire`, `Hire`, `Strong Hire`) + Markdown textarea for `Overall Feedback & Next Steps` (with **Write | Preview** toggle).
  - **Draft Auto-Save:** Persist form state to `localStorage` on change and clear upon successful submission.
  - **Submit Action ("Publish & Email Candidate"):**
    1. Upsert `candidates` (`email = lower(trim(email))`).
    2. If a new question title was entered and saved, insert into `questions` and capture `question_id`.
    3. Insert `evaluations` row (with snapshot `interview_type_name` and `question_title`) + bulk-insert `evaluation_scores` rows (with snapshot `criterion_label`).
    4. Copy `https://<domain>/r/<public_token>` to clipboard and show toast confirmation.
    5. Call `/api/send-report` (Resend) to email the candidate their direct scorecard link.
- **Past Sessions Table:** Below the form, display recent evaluations (Candidate Name, Track, Question, Hireability Badge, Date, and a **"Copy Link"** button).

### Route 3: `/r/:token` (Sleek Public Candidate Scorecard — Zero Login)
- **SEO / Privacy:** Include `<meta name="robots" content="noindex, nofollow" />`.
- **Data Fetch:** Calls `supabase.rpc('get_evaluation_by_token', { p_token: token })`. Show a clean 404 state if `null`.
- **Visual Layout:**
  - **Top Banner (Unauthenticated):** Subtle callout bar: *"Done multiple mock interviews? **Sign in with your email** to track your full rubric history and score progression."*
  - **Scorecard Header:** Candidate Name, Interview Track badge, Question Title, Interview Date, prominent color-coded **Hireability Badge**, and calculated **Overall Average Score** (e.g., `4.2 / 5.0`).
  - **Axis Breakdown Cards:** Each criterion rendered with its `X / 5` badge, a visual color-coded progress bar, and Markdown-rendered `justification` via `FeedbackMarkdown`.
  - **Overall Feedback Section:** Clean card rendering `overall_feedback` via `FeedbackMarkdown`.

### Route 4: `/history` (Candidate Longitudinal Portal — Authenticated)
- **Guard:** Redirects unauthenticated visitors to `/login`.
- **Features:**
  - Queries all `evaluations` and nested `evaluation_scores` accessible via RLS for the logged-in user's email.
  - **Summary Stats:** Total sessions completed, overall average score, and average score grouped by `criterion_key` / `criterion_label` across sessions.
  - **Session List:** Chronological cards showing Date, Track, Question Title, Hireability Badge, Average Score, and a **"View Full Rubric"** link to `/r/:public_token`.

---

## 8. Serverless Email Endpoint (`/api/send-report`)
- Accepts `POST` with `{ evaluationId, candidateEmail, candidateName, interviewTypeName, questionTitle, publicToken }` + the Admin's Supabase `Authorization: Bearer <access_token>`.
- Verifies the caller is an admin via Supabase (`is_admin()`).
- Sends a clean HTML email via **Resend**:
  - **Subject:** `Your Mock Interview Feedback: ${interviewTypeName} — ${questionTitle}` - **Body:** Greeting, interview track & question summary, primary CTA button linking to `${APP_URL}/r/${publicToken}`, and a note that signing in with `${candidateEmail}` unlocks their full session history.

---

## 9. Deployment & Setup Checklist
1. Create a Supabase project and execute `20261113000000_initial_schema.sql` (or `supabase db push`) in the SQL Editor.
2. Enable **Email (Magic Link)** and/or **Google OAuth** in Supabase Authentication settings and configure redirect URLs (`/login`, `/admin`, `/history`).
3. Sign into the app once with your admin email (triggering `handle_new_user`), then run `update profiles set role = 'admin' where email = '<your-email>';` in Supabase SQL Editor.
4. Configure environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `APP_URL`) and deploy to Vercel or Cloudflare Pages. I'm thinking of going for cloudflare pages

---

## 10. Deferred to v2 (Out of Scope for v1)
- Merging or reassigning historical evaluations if a candidate switches email addresses.
- In-app editing or re-issuing of already published evaluations.
- In-app CRUD UI for managing `interview_types` and `rubric_criteria` templates.