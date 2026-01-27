-- Add description and elevenlabs_id to voice_models table

ALTER TABLE voice_models 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS elevenlabs_id TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'cloned',
ADD COLUMN IF NOT EXISTS user_id UUID;
