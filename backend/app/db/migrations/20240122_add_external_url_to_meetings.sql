-- Add external_url column to meetings table for Google Meet/Zoom integration
alter table public.meetings 
add column if not exists external_url text;
