// Простой тест для проверки работы Passenger
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Simple test app is working' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'test' });
});

module.exports = app;







