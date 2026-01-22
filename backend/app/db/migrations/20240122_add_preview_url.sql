-- Add preview_url column
ALTER TABLE public.voice_models ADD COLUMN IF NOT EXISTS preview_url text;

-- Update seed data with sample MP3s (using generic placeholders for now, in prod you'd use real S3/CDN links)
-- These are some generic reliable test URLs.
UPDATE public.voice_models 
SET preview_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
WHERE name = 'Adam';

UPDATE public.voice_models 
SET preview_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' 
WHERE name = 'Dorothy';

UPDATE public.voice_models 
SET preview_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' 
WHERE name = 'Charlie';

UPDATE public.voice_models 
SET preview_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' 
WHERE name = 'Alloy';
