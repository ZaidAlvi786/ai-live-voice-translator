-- 02_agent_system_harden.sql

-- 1. HARDEN AGENTS TABLE
-- Add immutable identity constraints
alter table public.agents 
add column if not exists role text,
add column if not exists years_experience int default 0,
add column if not exists industries text[] default '{}',
add column if not exists communication_style text default 'formal', -- 'confident', 'concise', 'casual', 'formal'
add column if not exists guardrails jsonb default '{"forbidden_topics": [], "max_answer_seconds": 60, "allow_speculation": false}'::jsonb;

-- 2. AGENT MODES TABLE
-- Strict separation of behaviors (Interview vs Standup)
create table if not exists public.agent_modes (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  mode_type text not null, -- 'interview', 'standup', 'general'
  system_prompt_override text, -- Validated prompt template
  config jsonb default '{}'::jsonb, -- specialized config for this mode
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(agent_id, mode_type)
);

-- Enable RLS for Agent Modes
alter table public.agent_modes enable row level security;

create policy "Users can view modes of their agents"
  on public.agent_modes for select
  using (exists (select 1 from public.agents where id = agent_id and user_id = auth.uid()));

create policy "Users can manage modes of their agents"
  on public.agent_modes for all
  using (exists (select 1 from public.agents where id = agent_id and user_id = auth.uid()));


-- 3. ENHANCE DOCUMENTS TABLE (Knowledge Graph)
-- Add scoping and expiration
alter table public.documents
add column if not exists source_type text default 'general', -- 'resume', 'project', 'standup'
add column if not exists allowed_modes text[] default '{}', -- e.g. ['interview']
add column if not exists expires_at timestamp with time zone; -- For ephemeral standup context

-- 4. AGENT AUDIT LOGS (Compliance)
-- Immutable record of every AI response
create table if not exists public.agent_audit_logs (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  question text not null,
  answer text not null, -- The final spoken response
  retrieved_sources jsonb default '[]'::jsonb, -- Array of doc IDs used
  confidence_score float not null,
  decision_path text, -- 'retrieval', 'fallback', 'refusal'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Audit Logs (Read-only for users)
alter table public.agent_audit_logs enable row level security;

create policy "Users can view audit logs of their agents"
  on public.agent_audit_logs for select
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

-- Only system/service role should insert (enforced via application logic or service key)


-- 5. STANDUP SESSIONS (Ephemeral Context)
-- Tracks active standup contexts for agents
create table if not exists public.standup_sessions (
    id uuid default gen_random_uuid() primary key,
    agent_id uuid not null references public.agents(id) on delete cascade,
    meeting_id uuid references public.meetings(id) on delete set null,
    context_summary text not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.standup_sessions enable row level security;

create policy "Users can view their agent standup sessions"
    on public.standup_sessions for select
    using (exists (select 1 from public.agents where id = agent_id and user_id = auth.uid()));

create policy "Users can manage their agent standup sessions"
    on public.standup_sessions for all
    using (exists (select 1 from public.agents where id = agent_id and user_id = auth.uid()));
