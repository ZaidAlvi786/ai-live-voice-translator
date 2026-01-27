-- Enable RLS on tables (good practice, though likely already on)
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Insert for Authenticated Users
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."voice_models"
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Allow Select for Authenticated Users
CREATE POLICY "Enable select for authenticated users" 
ON "public"."voice_models"
FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow Update for Authenticated Users
CREATE POLICY "Enable update for authenticated users" 
ON "public"."voice_models"
FOR UPDATE 
TO authenticated 
USING (true);

-- Do the same for Agents if needed (though agents usually has policies)
CREATE POLICY "Enable update for agents" 
ON "public"."agents"
FOR UPDATE 
TO authenticated 
USING (true);
