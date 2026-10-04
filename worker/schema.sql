-- Wesco QA Monitor — D1 schema (safe to re-run)

CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL,      -- waiting | inspecting | done | cancelled
  job_no     TEXT NOT NULL,
  updated_at INTEGER NOT NULL,   -- ms epoch, used for incremental sync
  data       TEXT NOT NULL       -- full request JSON
);
CREATE INDEX IF NOT EXISTS idx_requests_updated ON requests(updated_at);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_job ON requests(job_no);

CREATE TABLE IF NOT EXISTS photos (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,      -- data URL (compressed JPEG)
  created_at INTEGER NOT NULL
);

-- initial master data (only inserted if missing)
INSERT OR IGNORE INTO kv (k, v) VALUES
  ('version', '1'),
  ('epoch', '1'),
  ('settings', '{"leadMin":30,"maxInspectMin":30}'),
  ('employees', '[{"id":"T-815","name":"Wiphawas Chantakarm","role":"admin"},{"id":"E343997","name":"Jirawat Srijak","role":"qa"},{"id":"E344537","name":"Noppanai Prasomwong","role":"qa"}]'),
  ('processes', '["Cutting Stripping","Crimping","Solder","Assembly","Packing"]'),
  ('details', '[{"id":"first","name":"1st piece","system":true},{"id":"job4h","name":"Job in 4 hrs."},{"id":"last","name":"Last piece","system":true},{"id":"assy","name":"Assembly"},{"id":"pack","name":"Packing"}]');
