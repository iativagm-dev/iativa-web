
-- Migration: Create business_classifications table
CREATE TABLE IF NOT EXISTS business_classifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    business_info TEXT,
    classification_result JSONB,
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_classifications_user_id ON business_classifications(user_id);
CREATE INDEX IF NOT EXISTS idx_business_classifications_created_at ON business_classifications(created_at);
