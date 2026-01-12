#!/usr/bin/env node

/**
 * Script to add a tester email to Google Play Console internal testing track
 * Usage: node add-tester.js <email>
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const email = process.argv[2];

if (!email) {
    console.error(JSON.stringify({ error: 'Email is required' }));
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.error(JSON.stringify({ error: 'Invalid email format' }));
    process.exit(1);
}

// Path to service account JSON file
const serviceAccountPath = path.join(__dirname, '../../google-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(JSON.stringify({ error: 'Service account file not found' }));
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Google Play package name (from app.json)
const PACKAGE_NAME = 'by.hockeystars.app';
const TRACK = 'internal'; // internal, alpha, beta, production

async function addTester() {
    try {
        // Authenticate with Google Play Developer API
        const auth = new google.auth.JWT(
            serviceAccount.client_email,
            null,
            serviceAccount.private_key,
            ['https://www.googleapis.com/auth/androidpublisher']
        );

        // Проверка, что googleapis загружен
        if (!google || !google.androidpublisher) {
            throw new Error('googleapis module not loaded correctly. Check if googleapis and its dependencies are installed.');
        }

        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth
        });

        // Проверка, что androidpublisher загружен правильно
        if (!androidpublisher || !androidpublisher.testers) {
            throw new Error('Failed to initialize Google Play Publisher API. androidpublisher.testers is undefined. Check if googleapis dependencies are installed.');
        }

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
            console.log(JSON.stringify({ 
                success: true, 
                message: 'Email already in tester list' 
            }));
            return;
        }

        // Add new tester
        testers.push(email);

        // Update testers list
        // The API expects an array of email strings
        await androidpublisher.testers.patch({
            packageName: PACKAGE_NAME,
            track: TRACK,
            requestBody: {
                testers: testers
            }
        });

        console.log(JSON.stringify({ 
            success: true, 
            message: 'Tester added successfully' 
        }));

    } catch (error) {
        console.error(JSON.stringify({ 
            error: error.message || 'Failed to add tester',
            details: error.response?.data || error.stack
        }));
        process.exit(1);
    }
}

addTester();

