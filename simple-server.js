const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check - быстрый ответ
app.get('/api/health', (req, res) => {
  console.log('Health check request received');
  res.json({ 
    status: 'OK', 
    message: 'Simple server is running',
    playersCount: registeredPlayers.length
  });
});

// Простая регистрация - сразу успех
app.post('/api/auth/register', (req, res) => {
  const playerName = req.body.name || req.body.username;
  console.log('Registration request for:', playerName);
  
  // Создаем игрока и добавляем в список
  const newPlayer = {
    _id: 'test-' + Date.now(),
    name: playerName,
    username: req.body.username,
    status: req.body.status || 'player',
    team: req.body.team || '',
    position: req.body.position || '',
    country: req.body.country || 'Беларусь',
    birthDate: req.body.birthDate || '1990-01-01',
    avatar: '',
    isOnline: true,
    createdAt: new Date().toISOString()
  };
  
  registeredPlayers.push(newPlayer);
  console.log('Total players registered:', registeredPlayers.length);
  
  res.json({
    success: true,
    message: 'Player registered successfully',
    data: {
      ...newPlayer,
      token: 'fake-token-123'
    }
  });
});

// Простое обновление профиля - сразу успех
app.put('/api/auth/profile', (req, res) => {
  console.log('Profile update request received');
  res.json({
    success: true,
    message: 'Profile updated successfully'
  });
});

// Хранилище зарегистрированных игроков
let registeredPlayers = [];

// Простой список игроков
app.get('/api/players', (req, res) => {
  console.log('Players list request - returning', registeredPlayers.length, 'players');
  res.json(registeredPlayers);
});

// Простая проверка игрока по ID
app.get('/api/players/:id', (req, res) => {
  console.log('Player check for ID:', req.params.id);
  res.status(404).json({
    success: false,
    message: 'Player not found'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📱 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Network: http://192.168.1.10:${PORT}/api`);
}); 