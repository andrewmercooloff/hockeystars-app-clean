#!/usr/bin/env node

/**
 * Minimal Express API server - just to test if it works
 */

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Health check - fastest endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tester-api' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'tester-api',
        message: 'API is running'
    });
});

// Add tester endpoint - simplified version
app.post('/add-tester', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email is required' 
        });
    }
    
    // For now, just return success
    // We'll add Google API integration after this works
    console.log('Email received:', email);
    
    res.json({
        success: true,
        message: 'Email received (will add to Google Play later)'
    });
});

console.log('Minimal API server started');

module.exports = app;




