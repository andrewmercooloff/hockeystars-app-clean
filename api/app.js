#!/usr/bin/env node

/**
 * Express API server for adding testers to Google Play Console
 * Google API integration will be added after basic Express works
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Root endpoint - for testing
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'tester-api',
        message: 'HockeyStars Tester API is running',
        endpoints: {
            health: '/health',
            addTester: 'POST /add-tester'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tester-api' });
});

// Main endpoint: POST /add-tester
// Simplified version - just returns success for now
// Google API integration will be added after Express works
app.post('/add-tester', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email is required' 
        });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid email format' 
        });
    }
    
    console.log('Email received:', email);
    
    // For now, just return success
    // TODO: Add Google Play API integration
    res.json({
        success: true,
        message: 'Email received (Google API integration pending)'
    });
});


// Export app for Passenger
module.exports = app;
