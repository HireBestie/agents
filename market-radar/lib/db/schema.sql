CREATE TABLE IF NOT EXISTS monitor_configs (
  id TEXT PRIMARY KEY DEFAULT 'default',
  operator_summary TEXT NOT NULL,
  assumptions JSONB NOT NULL,
  principles JSONB NOT NULL,
  cadence JSONB NOT NULL,
  escalation_policy TEXT NOT NULL,
  since_hours INTEGER NOT NULL,
  delivery JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_sources (
  config_id TEXT NOT NULL REFERENCES monitor_configs(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (config_id, id)
);

CREATE TABLE IF NOT EXISTS monitor_runs (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES monitor_configs(id),
  trigger_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  dropped_count INTEGER NOT NULL DEFAULT 0,
  skipped_sources JSONB,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS monitor_observations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES monitor_runs(id) ON DELETE CASCADE,
  source_id TEXT,
  source_kind TEXT,
  source_url TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monitor_digests (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES monitor_runs(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL,
  escalations JSONB NOT NULL,
  morning_brief JSONB NOT NULL,
  digest_markdown TEXT NOT NULL,
  world_model JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  digest_id TEXT NOT NULL REFERENCES monitor_digests(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_requests (
  id TEXT PRIMARY KEY,
  requested_kind TEXT NOT NULL,
  requested_detail TEXT NOT NULL,
  context JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitor_runs_config_started_idx
  ON monitor_runs (config_id, started_at DESC);

CREATE INDEX IF NOT EXISTS source_requests_status_created_idx
  ON source_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS coverage_requests (
  id TEXT PRIMARY KEY,
  pain_id TEXT NOT NULL,
  requested_capability TEXT NOT NULL,
  context JSONB,
  contact_email TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coverage_requests_pain_created_idx
  ON coverage_requests (pain_id, created_at DESC);

ALTER TABLE coverage_requests ADD COLUMN IF NOT EXISTS request_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE coverage_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE monitor_configs ADD COLUMN IF NOT EXISTS bestie_seed JSONB;
