-- 03_update_match_documents.sql

-- Drop the old function first to change signature safely
drop function if exists match_documents;

-- Re-create with advanced filtering
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_agent_id uuid,
  filter_modes text[] default null, -- e.g. ['interview']
  filter_source_type text default null -- e.g. 'resume'
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.agent_id = filter_agent_id
  and 1 - (documents.embedding <=> query_embedding) > match_threshold
  -- Filter by Modes (Intersection check)
  -- If document.allowed_modes is empty, it is considered 'universal' for that agent? 
  -- OR strictly enforce: allowed_modes && filter_modes
  and (
      filter_modes is null 
      or documents.allowed_modes is null 
      or documents.allowed_modes && filter_modes
  )
  -- Filter by Source Type
  and (
      filter_source_type is null 
      or documents.source_type = filter_source_type
  )
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
