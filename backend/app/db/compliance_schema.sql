-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Voice Consents Table
-- Stores the legal proof of consent for voice cloning.
CREATE TABLE IF NOT EXISTS voice_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  agent_id UUID, -- Can be null if consent is global for the user
  consent_text TEXT NOT NULL,
  audio_proof_path TEXT NOT NULL, -- Path in Supabase Storage
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  jurisdiction VARCHAR(20) DEFAULT 'Global',
  proof_hash TEXT -- SHA256 of the audio file for immutability check
);

-- Index for fast lookup by user
CREATE INDEX idx_consents_user ON voice_consents(user_id);

-- 2. Security Audit Log
-- Immutable log of sensitive system actions.
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL, -- e.g. 'LOGIN', 'CONSENT_GRANTED', 'TTS_GENERATED'
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for timeline analysis
CREATE INDEX idx_security_timeline ON security_events(created_at desc);

-- RLS Policies (Security)
ALTER TABLE voice_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own consents
CREATE POLICY "Users can read own consents" ON voice_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own audit logs
CREATE POLICY "Users can read own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only System (Service Role) can insert/update
-- (Note: In Supabase, Service Role bypasses RLS, so explicit DENY is not needed standardly 
-- if we don't grant public write access. We assume standard secure schema setup).
