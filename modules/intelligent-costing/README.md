# 🧠 Intelligent Costing Module for IAtiva

## Overview

The Intelligent Costing Module enhances IAtiva's core costing functionality with AI-powered features for better business analysis and recommendations.

## 🎯 Features

### ✅ Implemented Features
- **BusinessClassifier**: Automatically detects business type from user input
- **CostValidator**: Intelligent cost validation with industry benchmarks
- **AdaptiveQuestions**: Dynamic question generation based on business type
- **FeatureToggle**: Gradual rollout management for new features
- **Session Analytics**: Comprehensive tracking of intelligent features usage

### 🔧 Architecture

```
modules/intelligent-costing/
├── index.js                 # Main module export
├── IntelligentCosting.js    # Core integration class
├── BusinessClassifier.js   # Industry classification logic
├── CostValidator.js         # Smart validation engine
├── AdaptiveQuestions.js     # Dynamic question system
├── FeatureToggle.js         # Feature flag management
├── config/
│   └── features.json        # Feature toggle configuration
└── data/
    └── industry-profiles.json # Industry-specific data
```

## 🚀 Integration

The module is seamlessly integrated into the existing IAtiva agent system:

```javascript
// Automatic initialization in agent.js
const { IntelligentCosting } = require('../modules/intelligent-costing');
this.intelligentCosting = new IntelligentCosting();
```

## 🎛️ Feature Control

Features are controlled via `config/features.json` with environment-specific settings:

```json
{
  "intelligentCosting": {
    "enabled": true,
    "environment": {
      "development": true,
      "staging": false,
      "production": false
    }
  }
}
```

## 📊 Business Classification

Supports 7 business types with industry-specific profiles:
- Restaurante/Comida
- Tienda/Retail
- Servicios Profesionales
- Manufactura/Producción
- Tecnología/Software
- E-commerce/Ventas Online
- Belleza/Estética

## 🧪 Testing

Run integration tests:
```bash
node -e "const Agent = require('./src/agent.js'); const agent = new Agent(); console.log('✅ Integration working');"
```

## 🔒 Safety

- **Non-breaking**: All existing functionality preserved
- **Feature flags**: Safe gradual rollout
- **Fallbacks**: Default behavior when features disabled
- **Validation**: Input validation to prevent errors

## 📈 Analytics

Track feature usage and effectiveness:
- Business classification accuracy
- Validation warnings/errors
- Feature adoption metrics
- Session duration and completion

## 🎯 Future Enhancements

- Real-time market data integration
- Advanced ML-based recommendations
- Industry benchmarking APIs
- Multi-language support
- Voice interface integration

---
*Built for IAtiva v2.0.0+ with backward compatibility*