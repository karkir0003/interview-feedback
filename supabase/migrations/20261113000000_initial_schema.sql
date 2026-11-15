-- ==========================================
-- 1. TABLES & CONSTRAINTS
-- ==========================================

-- Signed-up Supabase Auth users & their roles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null check (email = lower(trim(email))),
  role text not null default 'candidate' check (role in ('admin', 'interviewer', 'candidate')),
  created_at timestamptz not null default now()
);

-- Directory of all interviewed candidates (exists prior to signup)
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(trim(email))),
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Interview rounds / tracks
create table if not exists interview_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  display_order int not null default 0,
  is_active boolean not null default true
);

-- Rubric criteria per interview track (with per-axis 1-5 tooltips)
create table if not exists rubric_criteria (
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
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  interview_type_id uuid not null references interview_types(id) on delete restrict,
  title text not null,
  is_active boolean not null default true,
  unique (interview_type_id, title)
);

-- Individual mock interview sessions
create table if not exists evaluations (
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
create table if not exists evaluation_scores (
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

create index if not exists idx_evaluations_candidate_date on evaluations (candidate_id, interviewed_at desc, created_at desc);
create index if not exists idx_evaluations_interviewed_at on evaluations (interviewed_at desc, created_at desc);

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

drop trigger if exists on_auth_user_created on auth.users;
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

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'interviewer')
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

-- Admin-only policies (Rubrics & System Settings)
drop policy if exists "Admin all profiles" on profiles;
create policy "Admin all profiles" on profiles for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Admin all interview_types" on interview_types;
create policy "Admin all interview_types" on interview_types for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "Admin all rubric_criteria" on rubric_criteria;
create policy "Admin all rubric_criteria" on rubric_criteria for all to authenticated using (is_admin()) with check (is_admin());

-- Staff policies (Interviewers + Admins can grade, save questions, and manage candidates)
drop policy if exists "Admin all candidates" on candidates;
drop policy if exists "Staff all candidates" on candidates;
create policy "Staff all candidates" on candidates for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "Admin all questions" on questions;
drop policy if exists "Staff all questions" on questions;
create policy "Staff all questions" on questions for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "Admin all evaluations" on evaluations;
drop policy if exists "Staff all evaluations" on evaluations;
create policy "Staff all evaluations" on evaluations for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists "Admin all evaluation_scores" on evaluation_scores;
drop policy if exists "Staff all evaluation_scores" on evaluation_scores;
create policy "Staff all evaluation_scores" on evaluation_scores for all to authenticated using (is_staff()) with check (is_staff());

-- User / Candidate policies
drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Candidate read own record" on candidates;
create policy "Candidate read own record" on candidates for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Candidate read own evaluations" on evaluations;
create policy "Candidate read own evaluations" on evaluations for select to authenticated
  using (candidate_id in (select id from candidates where email = lower(auth.jwt() ->> 'email')));

drop policy if exists "Candidate read own scores" on evaluation_scores;
create policy "Candidate read own scores" on evaluation_scores for select to authenticated
  using (evaluation_id in (
    select e.id from evaluations e
    join candidates c on c.id = e.candidate_id
    where c.email = lower(auth.jwt() ->> 'email')
  ));

-- Allow read access to active interview_types, rubric_criteria, and questions for both authenticated and anon roles
drop policy if exists "Authenticated read active interview_types" on interview_types;
drop policy if exists "Read active interview_types" on interview_types;
create policy "Read active interview_types" on interview_types for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated read active rubric_criteria" on rubric_criteria;
drop policy if exists "Read active rubric_criteria" on rubric_criteria;
create policy "Read active rubric_criteria" on rubric_criteria for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated read active questions" on questions;
drop policy if exists "Read active questions" on questions;
create policy "Read active questions" on questions for select to anon, authenticated
  using (is_active = true);

-- Public Unauthenticated Scorecard RPC
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

-- Ensure table-level permissions are granted to PostgREST roles (RLS policies govern row-level access)
grant usage on schema public to anon, authenticated;
grant select on interview_types to anon, authenticated;
grant select, update, insert, delete on rubric_criteria to authenticated;
grant select on rubric_criteria to anon;
grant select, update, insert, delete on questions to authenticated;
grant select on questions to anon;
grant all on candidates to authenticated;
grant all on evaluations to authenticated;
grant all on evaluation_scores to authenticated;
grant select, update on profiles to authenticated;
grant select on profiles to anon;

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
  on conflict (slug) do update set name = excluded.name, display_order = excluded.display_order
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
on conflict (interview_type_id, criterion_key) do update set
  label = excluded.label,
  scale_descriptions = excluded.scale_descriptions,
  display_order = excluded.display_order;

-- Insert AI fluency specifically for ai_coding
with ai_type as (
  select id from interview_types where slug = 'ai_coding'
)
insert into rubric_criteria (interview_type_id, criterion_key, label, display_order, scale_descriptions)
select id, 'ai_fluency', 'AI fluency', 6, '{"1":"Very poor — pastes vague prompts, accepts broken AI code blindly without testing","2":"Below bar — over-relies on AI for basic logic or gets stuck debugging AI-generated hallucinations","3":"Meets bar — uses AI effectively for scaffolding/boilerplate and verifies output with basic tests","4":"Strong — decomposes tasks into targeted prompts, reviews diffs critically, and catches subtle AI bugs","5":"Exceptional — surgical context/prompt framing, rapid human-AI iteration loop, full ownership of final code"}'::jsonb
from ai_type
on conflict (interview_type_id, criterion_key) do update set
  label = excluded.label,
  scale_descriptions = excluded.scale_descriptions,
  display_order = excluded.display_order;

-- Insert System Design criteria
with sys_type as (
  select id from interview_types where slug = 'system_design'
)
insert into rubric_criteria (interview_type_id, criterion_key, label, display_order, scale_descriptions)
select sys_type.id, x.criterion_key, x.label, x.display_order, x.scale_descriptions
from sys_type cross join (values
  ('requirements', 'Requirements & scope framing', 1, '{"1":"Very poor — jumps into boxes without clarifying scale or features","2":"Below bar — misses critical functional or non-functional constraints","3":"Meets bar — clarifies core APIs, scale targets, and basic SLAs","4":"Strong — sharp scope prioritization and back-of-the-envelope capacity math","5":"Exceptional — frames crisp product trade-offs and derives exact bottlenecks from numbers"}'::jsonb),
  ('architecture', 'High-level architecture & data modeling', 2, '{"1":"Very poor — incoherent components or flawed storage schema","2":"Below bar — generic diagram with vague data flow or missing schemas","3":"Meets bar — logical end-to-end architecture with sensible DB/API choices","4":"Strong — clean service boundaries, well-indexed data models, clear read/write paths","5":"Exceptional — deeply cohesive architecture with precise schemas, partitioning, and API contracts"}'::jsonb),
  ('scalability', 'Scalability, bottlenecks & trade-offs', 3, '{"1":"Very poor — ignores single points of failure, consistency, or load spikes","2":"Below bar — names buzzwords without explaining why or trade-offs","3":"Meets bar — identifies primary bottleneck and proposes valid caching/sharding/async patterns","4":"Strong — articulates concrete consistency, latency, and failure-mode trade-offs","5":"Exceptional — anticipates tail latency, hot partitions, backpressure, and graceful degradation"}'::jsonb),
  ('communication', 'Clear Communication', 4, '{"1":"Very poor — disorganized walkthrough; interviewer has to pull every detail","2":"Below bar — gets lost in minor details before establishing high-level flow","3":"Meets bar — logical top-down walkthrough and receptive to redirection","4":"Strong — clear pacing, structured diagram hygiene, proactive trade-off framing","5":"Exceptional — commands the room effortlessly, balancing vision with deep dives"}'::jsonb),
  ('product_system', 'Product and System thinking', 5, '{"1":"Very poor — over-engineers irrelevant parts while ignoring core user experience","2":"Below bar — disconnects technical choices from user-facing latency or reliability","3":"Meets bar — aligns design decisions with core product requirements","4":"Strong — ties consistency/availability choices directly to real user impact","5":"Exceptional — balances engineering complexity, cost, operational burden, and product velocity"}'::jsonb)
) as x(criterion_key, label, display_order, scale_descriptions)
on conflict (interview_type_id, criterion_key) do update set
  label = excluded.label,
  scale_descriptions = excluded.scale_descriptions,
  display_order = excluded.display_order;

-- Insert Behavioral criteria
with beh_type as (
  select id from interview_types where slug = 'behavioral'
)
insert into rubric_criteria (interview_type_id, criterion_key, label, display_order, scale_descriptions)
select beh_type.id, x.criterion_key, x.label, x.display_order, x.scale_descriptions
from beh_type cross join (values
  ('star_clarity', 'STAR structure & signal clarity', 1, '{"1":"Very poor — rambling stories with no clear situation, action, or measurable outcome","2":"Below bar — heavy context setup with vague personal actions or unclear results","3":"Meets bar — coherent STAR narrative with clear personal contribution and outcome","4":"Strong — concise, high-signal storytelling that anticipates follow-up probing","5":"Exceptional — executive-level clarity; every sentence delivers signal and quantified impact"}'::jsonb),
  ('ownership', 'Ownership, scope & impact', 2, '{"1":"Very poor — blames teammates/circumstances or describes passive execution","2":"Below bar — limited scope; waited for direction rather than driving resolution","3":"Meets bar — took clear responsibility for deliverables and saw problems through","4":"Strong — proactively identified gaps, unblocked dependencies, drove measurable impact","5":"Exceptional — high-agency end-to-end ownership under ambiguity with lasting impact"}'::jsonb),
  ('collaboration', 'Collaboration & conflict resolution', 3, '{"1":"Very poor — combative, dismissive of feedback, or unable to navigate disagreement","2":"Below bar — avoids conflict or struggles to articulate differing stakeholder perspectives","3":"Meets bar — listens actively, aligns with peers, and resolves friction constructively","4":"Strong — builds consensus across differing viewpoints with empathy and data","5":"Exceptional — elevates team alignment, turns friction into productive outcomes, mentors peers"}'::jsonb),
  ('communication', 'Clear Communication', 4, '{"1":"Very poor — struggles to answer directly or loses track of the question asked","2":"Below bar — verbose answers requiring frequent redirection","3":"Meets bar — answers directly and adapts well to follow-up questions","4":"Strong — structured, self-aware, and candid about lessons learned","5":"Exceptional — crisp, authentic, and deeply reflective communication throughout"}'::jsonb)
) as x(criterion_key, label, display_order, scale_descriptions)
on conflict (interview_type_id, criterion_key) do update set
  label = excluded.label,
  scale_descriptions = excluded.scale_descriptions,
  display_order = excluded.display_order;

-- Sample questions bank
insert into questions (interview_type_id, title)
select id, 'Train Trip Manager' from interview_types where slug in ('lld', 'ai_coding')
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'Permissions Service' from interview_types where slug in ('lld', 'ai_coding')
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'LRU Cache' from interview_types where slug in ('dsa', 'lld')
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'Design URL Shortener (TinyURL) at Scale' from interview_types where slug = 'system_design'
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'Design Distributed Rate Limiter' from interview_types where slug = 'system_design'
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'A time you navigated a high-stakes technical disagreement' from interview_types where slug = 'behavioral'
on conflict (interview_type_id, title) do nothing;

insert into questions (interview_type_id, title)
select id, 'A project that fell behind schedule and how you recovered' from interview_types where slug = 'behavioral'
on conflict (interview_type_id, title) do nothing;
