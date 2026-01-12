// Ultra simple test - just export a basic Express app
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;




