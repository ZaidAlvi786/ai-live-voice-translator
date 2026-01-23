-- Create Agents Table
create table public.agents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  personality_config jsonb not null default '{}'::jsonb,
  voice_model_id text,
  status text not null default 'creating', -- 'creating', 'ready', 'active', 'offline'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.agents enable row level security;

-- Policies
create policy "Users can view their own agents"
  on public.agents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own agents"
  on public.agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own agents"
  on public.agents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own agents"
  on public.agents for delete
  using (auth.uid() = user_id);

-- Voice Models Table
create table public.voice_models (
  id text primary key,
  name text not null,
  provider text not null, -- 'elevenlabs', 'deepgram', 'openai'
  voice_id text not null, -- External ID
  category text default 'general', -- 'male', 'female', 'narrative', etc
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Voice Models (Read-only for users)
alter table public.voice_models enable row level security;
create policy "Anyone can view voice models"
  on public.voice_models for select
  using (true);

-- Agent Templates Table
create table public.agent_templates (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null, -- Lucide icon name
  default_config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Templates (Read-only for users)
alter table public.agent_templates enable row level security;
create policy "Anyone can view agent templates"
  on public.agent_templates for select
  using (true);

-- Seed Data: Voice Models
insert into public.voice_models (id, name, provider, voice_id, category) values
('eleven_monolingual_v1', 'Adam', 'elevenlabs', 'pNInz6obpgDQGcFmaJgB', 'male'),
('eleven_monolingual_v2', 'Dorothy', 'elevenlabs', 'ThT5KcBeYPX3keUQqHPh', 'female'),
('eleven_monolingual_v3', 'Charlie', 'elevenlabs', 'IKne3meq5aSn9XLyUdCD', 'male'),
('openai_alloy', 'Alloy', 'openai', 'alloy', 'neutral');

-- Seed Data: Templates
insert into public.agent_templates (id, name, description, icon, default_config) values
('meeting_assistant', 'Meeting Auto', 'Autonomous scheduling & summaries with RAG.', 'User', '{"confidence": 0.8, "empathy": 0.5, "technical": 0.7, "speed": 1.0}'),
('tech_interviewer', 'Tech Interview', 'Code review and algorithm scoring.', 'Cpu', '{"confidence": 0.9, "empathy": 0.2, "technical": 1.0, "speed": 1.0}'),
('customer_support', 'Customer Support', 'Empathetic troubleshooting and Q&A.', 'Headphones', '{"confidence": 0.6, "empathy": 1.0, "technical": 0.5, "speed": 0.9}');

-- Meetings Table (Neural Logs)
create table public.meetings (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone,
  summary text,
  recording_url text,
  status text not null default 'active', -- 'active', 'completed', 'failed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Meetings
alter table public.meetings enable row level security;

-- Policies
create policy "Users can view their own meetings"
  on public.meetings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meetings"
  on public.meetings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meetings"
  on public.meetings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meetings"
  on public.meetings for delete
  using (auth.uid() = user_id);

-- Knowledge Base (RAG)
-- Enable pgvector extension
create extension if not exists vector;

create table public.documents (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small or ada-002
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Documents
alter table public.documents enable row level security;

-- Policies
create policy "Users can view their own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- Vector Search Function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_agent_id uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.agent_id = filter_agent_id
  and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- SPATIAL MEETINGS SCHEMA UPGRADE

-- Add new columns to meetings table
alter table public.meetings 
add column if not exists title text default 'Neural Session',
add column if not exists platform text default 'webrtc', -- 'zoom', 'meet', 'webrtc'
add column if not exists external_url text,
add column if not exists knowledge_snapshot jsonb default '{}'::jsonb;


-- Meeting Participants Table
create table public.meeting_participants (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  name text not null,
  role text not null, -- 'interviewer', 'candidate', 'observer'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Meeting Transcripts Table (Real-time stream storage)
create table public.meeting_transcripts (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  speaker text not null, -- 'agent', 'user', 'system'
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  confidence float default 1.0
);

-- Meeting Costs Table (FinOps)
create table public.meeting_costs (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  llm_tokens int default 0,
  tts_seconds int default 0,
  stt_seconds int default 0,
  gpu_seconds float default 0.0,
  total_cost float default 0.0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for New Tables via Meeting ownership
alter table public.meeting_participants enable row level security;
alter table public.meeting_transcripts enable row level security;
alter table public.meeting_costs enable row level security;

-- Policies (Cascading access through meeting ownership)

-- Participants
create policy "Users can view participants of their meetings"
  on public.meeting_participants for select
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

create policy "Users can insert participants for their meetings"
  on public.meeting_participants for insert
  with check (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

-- Transcripts
create policy "Users can view transcripts of their meetings"
  on public.meeting_transcripts for select
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

create policy "Users can insert transcripts for their meetings"
  on public.meeting_transcripts for insert
  with check (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

-- Costs
create policy "Users can view costs of their meetings"
  on public.meeting_costs for select
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

create policy "Users can insert costs for their meetings"
  on public.meeting_costs for insert
  with check (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

create policy "Users can update costs for their meetings"
  on public.meeting_costs for update
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

-- USER SETTINGS SCHEMA
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'dark',
  notifications_enabled boolean default true,
  api_keys jsonb default '{}'::jsonb, -- e.g. {"openai": "sk-...", "deepgram": "..."}
  updated_at timestamp with time zone default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- NOTIFICATIONS SCHEMA
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info', -- 'info', 'success', 'warning', 'error'
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

create policy "Users can manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id);


