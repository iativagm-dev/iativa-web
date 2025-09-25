# 🚨 Production Alert Configuration Guide

## ✅ **MONITORING SYSTEM STATUS: DEPLOYED AND ACTIVE**

**Dashboard URL**: http://localhost:3005/dashboard
**API Base**: http://localhost:3005/api/production-monitoring/
**Live Monitoring**: Real-time metrics and alerts active

---

## 📧 **Email Alerts Configuration**

### **Environment Variables**
Create a `.env` file or set these environment variables:

```bash
# Enable email alerts
ENABLE_EMAIL_ALERTS=true

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Email credentials (use app password for Gmail)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Alert recipients (comma-separated for multiple)
ALERT_FROM_EMAIL=production-alerts@yourcompany.com
ALERT_TO_EMAIL=admin@yourcompany.com,dev-team@yourcompany.com,ops@yourcompany.com
```

### **Gmail Setup Instructions**
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password:
   - Go to Google Account settings → Security
   - Select "App passwords" under "Signing in to Google"
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

### **Other Email Providers**
```bash
# Outlook/Hotmail
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587

# Custom SMTP
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=alerts@yourcompany.com
SMTP_PASS=your-smtp-password
```

---

## 💬 **Slack Alerts Configuration**

### **Environment Variables**
```bash
# Enable Slack alerts
ENABLE_SLACK_ALERTS=true

# Slack webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Slack channel (optional, defaults to #production-alerts)
SLACK_CHANNEL=#production-alerts

# Custom bot name and icon (optional)
SLACK_USERNAME=Production Monitor
SLACK_ICON=:rotating_light:
```

### **Slack Webhook Setup Instructions**

#### **1. Create Slack App**
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Production Monitoring"
4. Select your workspace

#### **2. Enable Incoming Webhooks**
1. In your app settings, go to "Incoming Webhooks"
2. Turn on "Activate Incoming Webhooks"
3. Click "Add New Webhook to Workspace"
4. Select the channel (#production-alerts)
5. Copy the webhook URL

#### **3. Test Slack Integration**
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"🧪 Test alert from Production Monitoring System"}' \
YOUR_WEBHOOK_URL
```

---

## 🔗 **Webhook Alerts Configuration**

### **Environment Variables**
```bash
# Enable webhook alerts
ENABLE_WEBHOOK_ALERTS=true

# Webhook endpoint
WEBHOOK_URL=https://your-monitoring-service.com/webhook

# Optional security
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT=10000
```

### **Webhook Payload Format**
```json
{
  "alert": {
    "id": "1758803008506",
    "timestamp": "2025-09-25T12:23:28.506Z",
    "severity": "critical",
    "message": "System performance degraded",
    "component": "business-metrics",
    "phase": "phase1",
    "data": {
      "metric": "accuracy",
      "currentValue": 72.5,
      "threshold": 75
    }
  },
  "timestamp": "2025-09-25T12:23:28.506Z",
  "source": "production-alert-system"
}
```

### **Popular Webhook Integrations**

#### **Microsoft Teams**
```bash
WEBHOOK_URL=https://your-tenant.webhook.office.com/webhookb2/YOUR-WEBHOOK-ID
```

#### **Discord**
```bash
WEBHOOK_URL=https://discord.com/api/webhooks/YOUR-WEBHOOK-ID/YOUR-WEBHOOK-TOKEN
```

#### **PagerDuty**
```bash
WEBHOOK_URL=https://events.pagerduty.com/v2/enqueue
# Add PagerDuty integration key in webhook secret
WEBHOOK_SECRET=your-pagerduty-integration-key
```

---

## 🚨 **Alert Severity Levels**

### **Critical Alerts** 🚨
- **System failures**: Database down, API unresponsive
- **Rollback triggers**: Accuracy <70%, error rate >10%
- **Business impact**: Revenue drop >20%, critical user issues
- **Security**: Unauthorized access attempts, data breaches

**Notification**: All channels (Email, Slack, Webhook, Console)

### **Warning Alerts** ⚠️
- **Performance degradation**: Response time increase, cache misses
- **Threshold breaches**: Accuracy 70-80%, error rate 5-10%
- **User feedback**: Negative feedback rate >20%
- **Business metrics**: Revenue/engagement decline 10-20%

**Notification**: Email, Slack, Console

### **Info Alerts** ℹ️
- **System updates**: Deployments, configuration changes
- **Performance improvements**: Optimizations, successful rollouts
- **Milestone alerts**: ROI targets achieved, user engagement up

**Notification**: Console, optional Slack

---

## 🎯 **Alert Configuration by Component**

### **Phase Monitoring**
```javascript
// Automatic alerts for each deployment phase
{
  phase1: {
    accuracy: { warning: 80, critical: 70 },
    errorRate: { warning: 5, critical: 10 },
    responseTime: { warning: 200, critical: 500 }
  },
  phase2: {
    accuracy: { warning: 75, critical: 65 },
    errorRate: { warning: 7, critical: 12 },
    costValidation: { warning: 15, critical: 25 }
  }
}
```

### **Business Metrics Alerts**
```javascript
{
  revenue: {
    dailyDecline: -10,    // Alert on 10% daily decline
    weeklyDecline: -15,   // Alert on 15% weekly decline
    monthlyDecline: -20   // Alert on 20% monthly decline
  },
  userEngagement: {
    dailyDecline: -15,    // Alert on 15% engagement drop
    negativeReviews: 30   // Alert on 30% negative feedback
  }
}
```

### **System Health Alerts**
```javascript
{
  performance: {
    responseTime: 2000,     // Alert if >2 seconds
    uptime: 99,            // Alert if <99% uptime
    memoryUsage: 85        // Alert if >85% memory usage
  },
  rollback: {
    autoRollbackTriggered: true,  // Always alert on rollback
    emergencyStop: true           // Always alert on emergency stop
  }
}
```

---

## 📊 **Real-time Dashboard Features**

### **Live Metrics Display**
- **Phase Status**: Current deployment phase and health
- **Performance Charts**: Real-time accuracy, response time, error rate
- **Business Impact**: Revenue, engagement, conversion tracking
- **User Feedback**: Sentiment analysis and issue tracking
- **System Health**: Server status, database, cache performance

### **Interactive Controls**
- **🚨 Emergency Rollback**: One-click rollback for critical issues
- **📊 Metric Filters**: Filter by time range, component, severity
- **🔔 Alert Management**: Acknowledge alerts, view history
- **📈 Trend Analysis**: Historical performance comparison

### **Real-time Updates**
- **Server-Sent Events**: Live data streaming every 10 seconds
- **Auto-refresh**: Dashboard auto-updates without page reload
- **Mobile Responsive**: Works on all devices and screen sizes
- **Color-coded Status**: Visual indicators for system health

---

## 🔧 **Rollback Trigger Configuration**

### **Automatic Rollback Triggers**
```javascript
{
  accuracy: {
    criticalThreshold: 70,      // Rollback if accuracy <70%
    sustainedPeriod: 5,         // For 5 minutes
    phases: ['phase4', 'phase3', 'phase2']
  },
  errorRate: {
    criticalThreshold: 10,      // Rollback if errors >10%
    sustainedPeriod: 3,         // For 3 minutes
    phases: ['phase4', 'phase3']
  },
  businessImpact: {
    revenueDecline: 25,         // Rollback if revenue drops 25%
    userComplaintRate: 40       // Rollback if complaints >40%
  }
}
```

### **Rollback Safety Controls**
- **Rate Limiting**: Maximum 3 rollbacks per hour
- **Cooldown Period**: 1 hour between rollbacks
- **Manual Override**: Emergency rollback always available
- **Phase Order**: Rollback in reverse deployment order

---

## 💬 **User Feedback Monitoring**

### **Feedback Collection**
- **API Integration**: Direct feedback submission via API
- **Dashboard Widget**: Built-in feedback form on dashboard
- **Email Integration**: Process feedback from support emails
- **Review Monitoring**: Track app store and review site ratings

### **Sentiment Analysis**
- **Automatic Categorization**: Bugs, performance, usability, features
- **Sentiment Scoring**: Positive, neutral, negative classification
- **Priority Assessment**: Critical, high, medium, low urgency
- **Business Impact**: Revenue-affecting vs. minor issues

### **Alert Thresholds**
```javascript
{
  negativeFeedbackRate: { warning: 20, critical: 35 },  // Percentage
  averageRating: { warning: 3.5, critical: 2.8 },      // 1-5 stars
  issueReportRate: { warning: 5, critical: 10 },       // Percentage
  satisfactionScore: { warning: 70, critical: 50 }     // Percentage
}
```

---

## 🎯 **Quick Setup Commands**

### **1. Set Environment Variables**
```bash
# Windows
set ENABLE_EMAIL_ALERTS=true
set ENABLE_SLACK_ALERTS=true
set SMTP_USER=your-email@gmail.com
set SLACK_WEBHOOK_URL=your-webhook-url

# Linux/Mac
export ENABLE_EMAIL_ALERTS=true
export ENABLE_SLACK_ALERTS=true
export SMTP_USER=your-email@gmail.com
export SLACK_WEBHOOK_URL=your-webhook-url
```

### **2. Test Alert System**
```bash
# Test email
curl -X POST http://localhost:3005/api/production-monitoring/alerts \
-H "Content-Type: application/json" \
-d '{"message":"Test email alert","severity":"info","component":"test"}'

# Test emergency rollback (simulation)
curl -X POST http://localhost:3005/api/production-monitoring/rollback/emergency \
-H "Content-Type: application/json" \
-d '{"phase":"phase1","reason":"Manual test","userId":"admin"}'
```

### **3. Access Dashboard**
```bash
# Open dashboard in browser
start http://localhost:3005/dashboard

# Check API health
curl http://localhost:3005/api/production-monitoring/health/detailed
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

#### **Email Alerts Not Working**
1. Check SMTP credentials and server settings
2. Ensure "Less secure apps" or app password is configured
3. Verify firewall doesn't block SMTP ports (587, 465)
4. Test SMTP connection with telnet

#### **Slack Alerts Not Working**
1. Verify webhook URL is correct and active
2. Check if channel exists and bot has permissions
3. Test webhook with curl command
4. Ensure workspace allows incoming webhooks

#### **Dashboard Not Loading**
1. Verify server is running on correct port (3005)
2. Check for JavaScript errors in browser console
3. Ensure firewall allows connections to port 3005
4. Try accessing API endpoints directly

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=production-monitoring node deploy-production-monitoring.js

# Check alert system status
curl http://localhost:3005/api/production-monitoring/alerts?limit=10

# Monitor live data stream
curl -N http://localhost:3005/api/production-monitoring/stream
```

---

## 🎉 **Production Monitoring System Summary**

### ✅ **Successfully Configured:**
- **📱 Live Dashboard**: Real-time monitoring interface
- **🚨 Multi-Channel Alerts**: Console, Email, Slack, Webhook
- **🔄 Automatic Rollback**: Trigger-based rollback system
- **💬 User Feedback**: Sentiment analysis and monitoring
- **📊 Business Metrics**: ROI tracking and impact analysis
- **⚡ Real-time Updates**: Server-Sent Events for live data

### 🌐 **Access Points:**
- **Dashboard**: http://localhost:3005/dashboard
- **API**: http://localhost:3005/api/production-monitoring/
- **Health**: http://localhost:3005/health

### 🔧 **Next Steps:**
1. Configure your preferred alert channels (Email/Slack)
2. Set up webhook integrations for external monitoring
3. Customize alert thresholds for your specific needs
4. Monitor the dashboard during production rollout
5. Test emergency rollback procedures

**🎯 Your production monitoring system is fully operational and ready to ensure a safe, monitored rollout!**