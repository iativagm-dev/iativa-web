
-- Migration: Create cost_validations table
CREATE TABLE IF NOT EXISTS cost_validations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    cost_data JSONB,
    validation_result JSONB,
    savings_potential DECIMAL(12,2),
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_validations_user_id ON cost_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_validations_created_at ON cost_validations(created_at);
