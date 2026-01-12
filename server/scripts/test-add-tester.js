#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки добавления тестировщика
 * Использование: node server/scripts/test-add-tester.js <email>
 */

const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');

// Находим google-service-account.json
const possibleRoots = [
    path.resolve(__dirname, '../..'),
    path.resolve(process.cwd(), '..'),
    process.cwd()
];

let serviceAccountPath = null;
for (const possibleRoot of possibleRoots) {
    const possiblePath = path.join(possibleRoot, 'google-service-account.json');
    if (fs.existsSync(possiblePath)) {
        serviceAccountPath = possiblePath;
        break;
    }
}

if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error('❌ Файл google-service-account.json не найден!');
    console.error('📁 Проверенные пути:');
    possibleRoots.forEach(root => {
        console.error(`   - ${path.join(root, 'google-service-account.json')}`);
    });
    process.exit(1);
}

console.log('✅ Найден service account:', serviceAccountPath);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const email = process.argv[2] || 'test@example.com';
const PACKAGE_NAME = 'by.hockeystars.app';
const TRACK = 'internal';

async function testAddTester() {
    try {
        console.log(`\n🧪 Тестируем добавление тестировщика: ${email}`);
        console.log(`📦 Package: ${PACKAGE_NAME}`);
        console.log(`🎯 Track: ${TRACK}\n`);

        // Authenticate
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

        // Get current testers
        console.log('📋 Получаем текущий список тестировщиков...');
        let testers = [];
        try {
            const response = await androidpublisher.testers.list({
                packageName: PACKAGE_NAME,
                track: TRACK
            });
            
            if (response.data && response.data.testers) {
                testers = response.data.testers.map(t => {
                    if (typeof t === 'string') return t.toLowerCase().trim();
                    return (t.emailAddress || t.email || t).toLowerCase().trim();
                });
            }
            console.log(`✅ Текущие тестировщики (${testers.length}):`, testers);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('ℹ️ Track не найден или список пуст');
            } else {
                throw error;
            }
        }

        // Check if exists
        const normalizedEmail = email.toLowerCase().trim();
        if (testers.includes(normalizedEmail)) {
            console.log(`\n✅ Email уже в списке: ${normalizedEmail}`);
            return;
        }

        // Add tester
        testers.push(normalizedEmail);
        console.log(`\n➕ Добавляем email: ${normalizedEmail}`);
        console.log(`📋 Новый список (${testers.length}):`, testers);

        // Update
        console.log('\n📤 Отправляем запрос на обновление...');
        const updateResponse = await androidpublisher.testers.patch({
            packageName: PACKAGE_NAME,
            track: TRACK,
            requestBody: {
                testers: testers
            }
        });

        console.log('\n✅ Успешно добавлен тестировщик!');
        console.log('📋 Ответ API:', JSON.stringify(updateResponse.data, null, 2));

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📊 Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

testAddTester();










