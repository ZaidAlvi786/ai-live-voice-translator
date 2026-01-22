-- Add missing RLS policies for meeting_costs table

-- Allow users to insert costs for their own meetings
create policy "Users can insert costs for their meetings"
  on public.meeting_costs for insert
  with check (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));

-- Allow users to update costs for their own meetings
create policy "Users can update costs for their meetings"
  on public.meeting_costs for update
  using (exists (select 1 from public.meetings where id = meeting_id and user_id = auth.uid()));
