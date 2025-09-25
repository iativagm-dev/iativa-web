
-- Migration: Create analytics tables
CREATE TABLE IF NOT EXISTS feature_usage_analytics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    feature_name VARCHAR(100),
    usage_data JSONB,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100),
    metric_value DECIMAL(12,4),
    metric_unit VARCHAR(50),
    tags JSONB,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage_analytics(feature_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
