#!/usr/bin/env node

/**
 * Express API server for adding testers to Google Play Console
 * This is the startup file for the Node.js application in cPanel
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to service account JSON file
const serviceAccountPath = path.join(__dirname, '../../google-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: Service account file not found at:', serviceAccountPath);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const PACKAGE_NAME = 'by.hockeystars.app';
const TRACK = 'internal'; // internal, alpha, beta, production

/**
 * Function to add tester to Google Play Console
 */
async function addTester(email) {
    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Invalid email format' };
        }

        // Authenticate with Google Play Developer API
        const auth = new google.auth.JWT(
            serviceAccount.client_email,
            null,
            serviceAccount.private_key,
            ['https://www.googleapis.com/auth/androidpublisher']
        );

        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth
        });

        // Get current testers list
        let testers = [];
        try {
            const response = await androidpublisher.testers.list({
                packageName: PACKAGE_NAME,
                track: TRACK
            });
            
            if (response.data && response.data.testers) {
                testers = response.data.testers.map(t => {
                    if (typeof t === 'string') return t;
                    return t.emailAddress || t.email || t;
                });
            }
        } catch (error) {
            // If track doesn't exist or no testers yet, start with empty array
            if (error.code !== 404 && error.response?.status !== 404) {
                throw error;
            }
        }

        // Check if email already exists
        if (testers.includes(email)) {
            return { success: true, message: 'Email already in tester list', alreadyExists: true };
        }

        // Add new tester
        testers.push(email);

        // Update testers list
        await androidpublisher.testers.patch({
            packageName: PACKAGE_NAME,
            track: TRACK,
            requestBody: {
                testers: testers
            }
        });

        return { success: true, message: 'Tester added successfully' };
    } catch (error) {
        console.error('Error adding tester:', error);
        return {
            success: false,
            error: error.message || 'Failed to add tester',
            details: error.response?.data || error.stack
        };
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'tester-api' });
});

// Main endpoint: POST /add-tester
app.post('/add-tester', async (req, res) => {
    try {
        const { email, lang } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        const result = await addTester(email.trim());

        if (result.success) {
            res.json({
                success: true,
                message: result.message || 'Tester added successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to add tester',
                details: result.details
            });
        }
    } catch (error) {
        console.error('Request error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Tester API server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Add tester: POST http://localhost:${PORT}/add-tester`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});



