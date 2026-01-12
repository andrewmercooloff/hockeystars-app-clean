#!/usr/bin/env node

/**
 * Express API server for adding testers to Google Play Console
 * This is the startup file for the Node.js application in cPanel
 */

console.log('📦 Loading dependencies...');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
console.log('✅ Dependencies loaded');

const app = express();
const PORT = process.env.PORT || 3000;
console.log('✅ Express app created');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to service account JSON file
// __dirname is server/scripts/, so we go up two levels to root
// Then look for google-service-account.json in the root directory
// Also check if we're running from server/ directory (process.cwd())
const possibleRoots = [
    path.resolve(__dirname, '../..'), // From server/scripts/ -> root
    path.resolve(process.cwd(), '..'), // From server/ -> root
    process.cwd() // Current directory might be root
];

let rootDir = possibleRoots[0];
let serviceAccountPath = null;

// Try to find service account file
for (const possibleRoot of possibleRoots) {
    const possiblePath = path.join(possibleRoot, 'google-service-account.json');
    if (fs.existsSync(possiblePath)) {
        rootDir = possibleRoot;
        serviceAccountPath = possiblePath;
        break;
    }
}

// If not found, use default path
if (!serviceAccountPath) {
    serviceAccountPath = path.join(possibleRoots[0], 'google-service-account.json');
}

console.log('🔍 Looking for service account at:', serviceAccountPath);
console.log('📁 Current working directory:', process.cwd());
console.log('📁 __dirname:', __dirname);
console.log('📁 Root directory:', rootDir);

let serviceAccount = null;
if (fs.existsSync(serviceAccountPath)) {
    try {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log('✅ Service account file found and loaded');
    } catch (error) {
        console.error('❌ Error reading service account file:', error.message);
    }
} else {
    console.warn('⚠️ Service account file not found at:', serviceAccountPath);
    console.warn('⚠️ API will start but add-tester endpoint will return errors');
}
const PACKAGE_NAME = 'by.hockeystars.app';
const TRACK = 'internal'; // internal, alpha, beta, production

/**
 * Function to add tester to Google Play Console
 */
async function addTester(email) {
    try {
        // Check if service account is loaded
        if (!serviceAccount) {
            return { 
                success: false, 
                error: 'Service account not configured. Please check server logs.' 
            };
        }

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
            console.log(`📋 Получаем текущий список тестировщиков для track: ${TRACK}`);
            const response = await androidpublisher.testers.list({
                packageName: PACKAGE_NAME,
                track: TRACK
            });
            
            console.log('📋 Ответ API (list testers):', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.testers) {
                testers = response.data.testers.map(t => {
                    if (typeof t === 'string') return t.toLowerCase().trim();
                    return (t.emailAddress || t.email || t).toLowerCase().trim();
                });
            }
            console.log(`📋 Текущие тестировщики (${testers.length}):`, testers);
        } catch (error) {
            // If track doesn't exist or no testers yet, start with empty array
            if (error.response?.status === 404) {
                console.log('ℹ️ Track не найден или список пуст, начинаем с пустого массива');
            } else {
                console.error('⚠️ Ошибка при получении списка тестировщиков:', error.message);
                // Продолжаем с пустым массивом
            }
        }

        // Normalize email for comparison
        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already exists
        if (testers.includes(normalizedEmail)) {
            console.log(`✅ Email уже в списке: ${normalizedEmail}`);
            return { success: true, message: 'Email already in tester list', alreadyExists: true };
        }

        // Add new tester
        testers.push(normalizedEmail);
        console.log(`➕ Добавляем email в список: ${normalizedEmail}`);
        console.log(`📋 Новый список (${testers.length} тестировщиков):`, testers);

        // Update testers list
        // Для internal track используем update для полной замены списка
        // Формат: массив email адресов как строк
        const requestBody = {
            testers: testers
        };
        
        console.log('📤 Отправляем запрос на обновление списка тестировщиков...');
        console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        // Используем update для полной замены списка тестировщиков
        // Для internal track это более надежный метод
        const updateResponse = await androidpublisher.testers.update({
            packageName: PACKAGE_NAME,
            track: TRACK,
            requestBody: requestBody
        });
        
        console.log('✅ Ответ API (update testers):', JSON.stringify(updateResponse.data, null, 2));

        console.log(`✅ Successfully added tester: ${email}`);
        return { success: true, message: 'Tester added successfully' };
    } catch (error) {
        console.error('❌ Error adding tester:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Provide more user-friendly error messages
        let errorMessage = error.message || 'Failed to add tester';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to Google Play API. Please check network connection.';
        } else if (error.response?.status === 403) {
            errorMessage = 'Permission denied. Please check service account permissions in Google Play Console.';
        } else if (error.response?.status === 404) {
            errorMessage = 'App or track not found. Please check package name and track configuration.';
        }
        
        return {
            success: false,
            error: errorMessage,
            details: error.response?.data || error.stack
        };
    }
}

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
app.post('/add-tester', async (req, res) => {
    try {
        const { email, lang } = req.body;

        console.log(`\n📥 Получен запрос на добавление тестировщика`);
        console.log(`   Email: ${email}`);
        console.log(`   Lang: ${lang || 'не указан'}`);

        if (!email) {
            console.log('❌ Email не указан');
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            console.log(`❌ Неверный формат email: ${email}`);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        const result = await addTester(email.trim());

        if (result.success) {
            console.log(`✅ Успешно обработан запрос для: ${email}`);
            res.json({
                success: true,
                message: result.message || 'Tester added successfully',
                alreadyExists: result.alreadyExists || false
            });
        } else {
            console.log(`❌ Ошибка при обработке запроса для: ${email}`);
            console.log(`   Ошибка: ${result.error}`);
            
            // Определяем правильный HTTP статус код
            let statusCode = 500;
            if (result.error.includes('Permission denied') || result.error.includes('403')) {
                statusCode = 403;
            } else if (result.error.includes('not found') || result.error.includes('404')) {
                statusCode = 404;
            } else if (result.error.includes('Invalid email')) {
                statusCode = 400;
            }
            
            res.status(statusCode).json({
                success: false,
                error: result.error || 'Failed to add tester',
                details: process.env.NODE_ENV === 'development' ? result.details : undefined
            });
        }
    } catch (error) {
        console.error('❌ Неожиданная ошибка при обработке запроса:', error);
        console.error('   Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Always export app for Passenger/cPanel
// Passenger will handle the server startup
module.exports = app;

// If running standalone (development/testing), start the server
if (!process.env.PASSENGER_APP_ENV && !process.env.PASSENGER_APP_ROOT && typeof require.main !== 'undefined' && require.main === module) {
    const server = app.listen(PORT, () => {
        console.log('🚀 Tester API server starting...');
        console.log(`📡 Listening on port ${PORT}`);
        console.log(`✅ Root endpoint: http://localhost:${PORT}/`);
        console.log(`✅ Health check: http://localhost:${PORT}/health`);
        console.log(`✅ Add tester: POST http://localhost:${PORT}/add-tester`);
        console.log(`📁 Service account status: ${serviceAccount ? '✅ Loaded' : '❌ Not found'}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Handle server errors (only for standalone mode)
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use`);
        } else {
            console.error('❌ Server error:', error);
        }
        process.exit(1);
    });
    
    // Handle graceful shutdown (only for standalone mode)
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing HTTP server');
        server.close(() => {
            process.exit(0);
        });
    });
} else {
    // Running in Passenger/cPanel
    console.log('🚀 Running in Passenger mode (cPanel)');
    console.log(`✅ Root endpoint: /`);
    console.log(`✅ Health check: /health`);
    console.log(`✅ Add tester: POST /add-tester`);
    console.log(`📁 Service account status: ${serviceAccount ? '✅ Loaded' : '❌ Not found'}`);
}



