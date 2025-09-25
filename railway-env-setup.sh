#!/bin/bash

# Railway Production Environment Setup Script
# Sets up all environment variables for intelligent features deployment

echo "🚀 Setting up Railway Production Environment Variables..."
echo "======================================================"

# Core application settings
echo "📱 Setting core application variables..."
railway variables set NODE_ENV="production"
railway variables set RAILWAY_DEPLOYMENT_TYPE="intelligent-features"
railway variables set DEPLOYMENT_VERSION="1.0.0"

# Enable intelligent features
echo "🧠 Enabling intelligent features..."
railway variables set ENABLE_INTELLIGENT_FEATURES="true"
railway variables set ENABLE_BUSINESS_CLASSIFICATION="true"
railway variables set ENABLE_COST_VALIDATION="true"
railway variables set ENABLE_RECOMMENDATION_ENGINE="true"

# Business classification settings
echo "🏢 Configuring business classification..."
railway variables set BUSINESS_CLASSIFICATION_ROLLOUT_PERCENTAGE="10"
railway variables set BUSINESS_CLASSIFICATION_CONFIDENCE_THRESHOLD="0.8"
railway variables set BUSINESS_CLASSIFICATION_CACHE_TTL="3600"
railway variables set BUSINESS_CLASSIFICATION_API_TIMEOUT="5000"
railway variables set BUSINESS_CLASSIFICATION_MAX_RETRIES="3"

# Cost validation settings
echo "💰 Configuring cost validation..."
railway variables set COST_VALIDATION_ENABLED="true"
railway variables set COST_VALIDATION_ROLLOUT_PERCENTAGE="80"
railway variables set COST_VALIDATION_CONFIDENCE_THRESHOLD="0.75"
railway variables set COST_VALIDATION_CACHE_SIZE="200"

# Recommendation engine settings
echo "🎯 Configuring recommendation engine..."
railway variables set RECOMMENDATION_ENGINE_ENABLED="true"
railway variables set RECOMMENDATION_CACHE_SIZE="1000"
railway variables set RECOMMENDATION_REFRESH_INTERVAL="7200"
railway variables set RECOMMENDATION_MAX_RESULTS="10"

# Performance optimization settings
echo "⚡ Setting performance optimizations..."
railway variables set CACHE_ENABLED="true"
railway variables set CACHE_MAX_SIZE="500"
railway variables set CACHE_TTL="1800"
railway variables set CACHE_CLEANUP_INTERVAL="300"

# Throttling and rate limiting
echo "🚦 Configuring throttling and rate limiting..."
railway variables set THROTTLE_ENABLED="true"
railway variables set THROTTLE_MAX_REQUESTS="1000"
railway variables set THROTTLE_WINDOW_MS="900000"
railway variables set API_RATE_LIMIT="1000"
railway variables set API_RATE_WINDOW="900000"

# Database settings
echo "🗄️ Configuring database settings..."
railway variables set ENABLE_INTELLIGENT_DATA_SCHEMAS="true"
railway variables set DATABASE_MIGRATION_ENABLED="true"
railway variables set DB_CONNECTION_POOL_SIZE="20"
railway variables set DB_QUERY_TIMEOUT="30000"
railway variables set DB_STATEMENT_TIMEOUT="60000"

# Monitoring and alerting
echo "📊 Setting up monitoring and alerting..."
railway variables set ENABLE_PRODUCTION_MONITORING="true"
railway variables set ENABLE_PERFORMANCE_TRACKING="true"
railway variables set ENABLE_ERROR_REPORTING="true"
railway variables set ENABLE_ANALYTICS="true"

# Feature flags
echo "🎌 Configuring feature flags..."
railway variables set FEATURE_FLAGS_ENABLED="true"
railway variables set FEATURE_FLAGS_CACHE_TTL="300"
railway variables set FEATURE_FLAGS_REFRESH_INTERVAL="60"

# Security settings
echo "🔒 Setting security configurations..."
railway variables set CORS_ENABLED="true"
railway variables set HELMET_ENABLED="true"
railway variables set COMPRESSION_ENABLED="true"
railway variables set TRUST_PROXY="true"

# Backup and recovery
echo "💾 Configuring backup and recovery..."
railway variables set ENABLE_AUTO_BACKUP="true"
railway variables set BACKUP_RETENTION_DAYS="30"
railway variables set BACKUP_INTERVAL_HOURS="24"

# Logging and debugging
echo "📝 Setting logging configuration..."
railway variables set LOG_LEVEL="info"
railway variables set ENABLE_REQUEST_LOGGING="true"
railway variables set ENABLE_PERFORMANCE_LOGGING="true"
railway variables set LOG_FORMAT="json"

# Health checks
echo "🏥 Configuring health checks..."
railway variables set HEALTH_CHECK_ENABLED="true"
railway variables set HEALTH_CHECK_INTERVAL="30"
railway variables set HEALTH_CHECK_TIMEOUT="5000"

# Set deployment metadata
echo "📋 Setting deployment metadata..."
DEPLOYMENT_ID="railway-prod-$(date +%Y%m%d-%H%M%S)"
railway variables set RAILWAY_DEPLOYMENT_ID="$DEPLOYMENT_ID"
railway variables set DEPLOYMENT_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"

echo ""
echo "✅ Railway environment variables set successfully!"
echo "📋 Deployment ID: $DEPLOYMENT_ID"
echo ""

# Verify critical variables are set
echo "🔍 Verifying critical variables..."
railway variables get NODE_ENV
railway variables get ENABLE_INTELLIGENT_FEATURES
railway variables get ENABLE_BUSINESS_CLASSIFICATION
railway variables get DATABASE_URL

echo ""
echo "🎉 Railway production environment setup complete!"
echo "Ready for intelligent features deployment."