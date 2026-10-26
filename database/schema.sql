CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    response_time INTEGER,
    status_code INTEGER,
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS anomalies (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    value NUMERIC,
    expected_value NUMERIC,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE INDEX IF NOT EXISTS idx_metrics_service_recorded ON metrics(service_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_service_id ON anomalies(service_id);
CREATE INDEX IF NOT EXISTS idx_events_service_id ON events(service_id);
 
INSERT INTO services
(name, type, url, status)
VALUES
(
    'Orders API',
    'API',
    'http://localhost:3001/health',
    'UNKNOWN'
),
(
    'Products API',
    'API',
    'http://localhost:3002/health',
    'UNKNOWN'
)
ON CONFLICT (name) DO NOTHING;
