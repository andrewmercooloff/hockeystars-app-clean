const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for players
app.get('/api/players', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        name: 'Test Player',
        status: 'player',
        team: 'Test Team'
      }
    ]
  });
});

// Test registration endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('Registration request:', req.body);
  res.json({
    success: true,
    message: 'Player registered successfully',
    data: {
      _id: 'test-' + Date.now(),
      ...req.body
    }
  });
});

// Test profile update endpoint
app.put('/api/auth/profile', (req, res) => {
  console.log('Profile update request:', req.body);
  res.json({
    success: true,
    message: 'Profile updated successfully'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📱 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Network: http://192.168.1.10:${PORT}/api`);
}); 