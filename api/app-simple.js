#!/usr/bin/env node

/**
 * Simple test version - just Express without googleapis
 * Let's first make sure Express works, then add Google API later
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'tester-api',
        message: 'API is running (simple version)'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tester-api' });
});

// Test endpoint - just save email to log file
app.post('/add-tester', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        // For now, just return success (we'll add Google API integration later)
        // This proves the endpoint works
        console.log(`📥 Received email: ${email}`);
        
        res.json({
            success: true,
            message: 'Email received (simple version - will add to Google Play later)'
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

console.log('🚀 Simple API server running');

// Export app for Passenger
module.exports = app;





