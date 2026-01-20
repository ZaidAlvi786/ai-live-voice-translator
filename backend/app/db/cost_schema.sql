-- Cost Ledger Table
CREATE TABLE IF NOT EXISTS cost_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL, -- Meeting ID (Text to match current implementation)
  user_id UUID, -- Can be null for system costs
  resource_type VARCHAR(20) NOT NULL, -- 'LLM_TOKEN', 'TTS_CHAR', 'STT_MIN', 'GPU_SEC'
  quantity NUMERIC NOT NULL,
  cost_usd NUMERIC NOT NULL,
  provider VARCHAR(50), -- 'OpenAI', 'ElevenLabs', 'Deepgram'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for realtime budget aggregation
CREATE INDEX idx_ledger_session ON cost_ledger(session_id);

-- View for Session Totals
CREATE OR REPLACE VIEW session_costs AS
SELECT 
    session_id, 
    SUM(cost_usd) as total_cost
FROM cost_ledger
GROUP BY session_id;
