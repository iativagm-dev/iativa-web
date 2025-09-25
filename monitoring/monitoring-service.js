const fs = require('fs');
const path = require('path');

class MonitoringService {
    constructor() {
        this.metricsFile = path.join(__dirname, '../data/metrics.json');
        this.initializeMetrics();
    }

    initializeMetrics() {
        if (!fs.existsSync(this.metricsFile)) {
            const initialMetrics = {
                totalSessions: 0,
                classificationSuccess: 0,
                classificationTotal: 0,
                validationSuccess: 0,
                validationTotal: 0,
                responseTimeSum: 0,
                responseTimeCount: 0,
                betaUserSessions: 0,
                errorCount: 0,
                industryDistribution: {},
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.metricsFile, JSON.stringify(initialMetrics, null, 2));
        }
    }

    getMetrics() {
        try {
            return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
        } catch (error) {
            console.error('Error reading metrics:', error);
            return null;
        }
    }

    updateMetrics(updates) {
        const metrics = this.getMetrics();
        if (!metrics) return false;

        Object.assign(metrics, updates);
        metrics.lastUpdated = new Date().toISOString();

        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
            return true;
        } catch (error) {
            console.error('Error updating metrics:', error);
            return false;
        }
    }

    recordSession(sessionData) {
        const metrics = this.getMetrics();
        if (!metrics) return;

        metrics.totalSessions++;

        if (sessionData.classification) {
            metrics.classificationTotal++;
            if (sessionData.classification.confidence >= 80) {
                metrics.classificationSuccess++;
            }

            const industry = sessionData.classification.industry;
            metrics.industryDistribution[industry] = (metrics.industryDistribution[industry] || 0) + 1;
        }

        if (sessionData.validationResults) {
            sessionData.validationResults.forEach(result => {
                metrics.validationTotal++;
                if (['success', 'info', 'warning'].includes(result.type)) {
                    metrics.validationSuccess++;
                }
            });
        }

        if (sessionData.responseTime) {
            metrics.responseTimeSum += sessionData.responseTime;
            metrics.responseTimeCount++;
        }

        if (sessionData.isBetaUser) {
            metrics.betaUserSessions++;
        }

        if (sessionData.errors) {
            metrics.errorCount += sessionData.errors.length;
        }

        this.updateMetrics(metrics);
    }

    getCalculatedMetrics() {
        const metrics = this.getMetrics();
        if (!metrics) return null;

        return {
            totalSessions: metrics.totalSessions,
            classificationRate: metrics.classificationTotal > 0 ?
                Math.round((metrics.classificationSuccess / metrics.classificationTotal) * 100) : 0,
            validationScore: metrics.validationTotal > 0 ?
                Math.round((metrics.validationSuccess / metrics.validationTotal) * 100) : 0,
            averageResponseTime: metrics.responseTimeCount > 0 ?
                Math.round(metrics.responseTimeSum / metrics.responseTimeCount) : 0,
            errorRate: metrics.totalSessions > 0 ?
                Math.round((metrics.errorCount / metrics.totalSessions) * 100 * 10) / 10 : 0,
            betaUserSessions: metrics.betaUserSessions,
            industryDistribution: metrics.industryDistribution,
            lastUpdated: metrics.lastUpdated
        };
    }

    generateDailyReport() {
        const metrics = this.getCalculatedMetrics();
        if (!metrics) return null;

        const report = {
            date: new Date().toISOString().split('T')[0],
            summary: {
                totalSessions: metrics.totalSessions,
                classificationAccuracy: metrics.classificationRate + '%',
                validationScore: metrics.validationScore + '%',
                averageResponseTime: metrics.averageResponseTime + 'ms',
                errorRate: metrics.errorRate + '%'
            },
            insights: this.generateInsights(metrics),
            recommendations: this.generateRecommendations(metrics)
        };

        const reportsDir = path.join(__dirname, 'reports');
        const reportPath = path.join(reportsDir, 'daily-report-' + report.date + '.json');

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            return report;
        } catch (error) {
            console.error('Error generating report:', error);
            return null;
        }
    }

    generateInsights(metrics) {
        const insights = [];

        if (metrics.classificationRate >= 90) {
            insights.push("🎯 Business classification is performing excellently");
        } else if (metrics.classificationRate >= 80) {
            insights.push("✅ Business classification meets target performance");
        } else {
            insights.push("⚠️ Business classification may need optimization");
        }

        if (metrics.validationScore >= 95) {
            insights.push("🏆 Cost validation is performing exceptionally well");
        } else if (metrics.validationScore >= 80) {
            insights.push("✅ Cost validation performance is good");
        }

        if (metrics.averageResponseTime <= 1500) {
            insights.push("⚡ Response times are excellent");
        } else if (metrics.averageResponseTime <= 2000) {
            insights.push("✅ Response times are acceptable");
        } else {
            insights.push("⚠️ Response times may need optimization");
        }

        const topIndustries = Object.entries(metrics.industryDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        if (topIndustries.length > 0) {
            insights.push('📊 Top industries: ' + topIndustries.map(([industry, count]) => industry + ' (' + count + ')').join(', '));
        }

        return insights;
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.classificationRate < 85) {
            recommendations.push("Consider expanding business type keywords and training data");
        }

        if (metrics.validationScore < 80) {
            recommendations.push("Review industry cost profiles and validation thresholds");
        }

        if (metrics.averageResponseTime > 2000) {
            recommendations.push("Optimize intelligent costing algorithms for better performance");
        }

        if (metrics.errorRate > 2) {
            recommendations.push("Investigate and address recurring error patterns");
        }

        if (metrics.betaUserSessions >= 50) {
            recommendations.push("Beta testing criteria met - consider full adaptive questions rollout");
        }

        return recommendations;
    }
}

module.exports = MonitoringService;