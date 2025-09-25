#!/usr/bin/env node

/**
 * Script to add intelligent features routes to server.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Adding intelligent features routes to server.js...');

try {
    const serverPath = path.join(__dirname, 'server.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');

    // Check if routes are already added
    if (serverContent.includes('/api/intelligent/')) {
        console.log('✅ Intelligent features routes already exist in server.js');
        process.exit(0);
    }

    // Find the place to insert the routes (after session configuration)
    const insertAfter = '}));\n';
    const insertIndex = serverContent.indexOf(insertAfter);

    if (insertIndex === -1) {
        throw new Error('Could not find insertion point in server.js');
    }

    const routesToAdd = `
// ==================== INTELLIGENT FEATURES ROUTES ====================

// Import intelligent features routes
const intelligentFeaturesRouter = require('./routes/intelligent-features');

// Middleware to track request start time for intelligent features
app.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

// Use intelligent features routes
app.use('/api', intelligentFeaturesRouter);

// Enhanced demo route for intelligent features
app.get('/demo-enhanced', (req, res) => {
    if (!req.session.tempUser) {
        req.session.tempUser = {
            id: 'temp_' + Date.now(),
            sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            ip: req.ip,
            timestamp: new Date()
        };
    }

    logAnalytics('demo_enhanced_page_view', req, {
        tempUserId: req.session.tempUser.id
    });

    res.render('demo-enhanced', {
        title: 'Demo Inteligente - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        tempUser: req.session.tempUser
    });
});

// ==================== END INTELLIGENT FEATURES ROUTES ====================
`;

    // Insert the routes
    const newContent = serverContent.slice(0, insertIndex + insertAfter.length) +
                      routesToAdd +
                      serverContent.slice(insertIndex + insertAfter.length);

    // Write the updated server.js
    fs.writeFileSync(serverPath, newContent);

    console.log('✅ Successfully added intelligent features routes to server.js');
    console.log('🚀 Intelligent features API endpoints are now available:');
    console.log('   - /api/features/status');
    console.log('   - /api/intelligent/classify');
    console.log('   - /api/intelligent/validate-cost');
    console.log('   - /api/intelligent/adaptive-questions');
    console.log('   - /api/intelligent/recommendations');
    console.log('   - /demo-enhanced (Enhanced demo with intelligent features)');

} catch (error) {
    console.error('❌ Error adding intelligent features routes:', error.message);
    process.exit(1);
}