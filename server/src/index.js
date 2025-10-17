const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const { initDatabase } = require('./database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const friendRoutes = require('./routes/friends');
const uploadRoutes = require('./routes/upload');
const pushNotificationRoutes = require('./routes/pushNotifications');

const auth = require('./middleware/auth');
const setupSocketHandlers = require('./socket/handlers');

const app = express();
app.set('trust proxy', 1); // Доверяем первому прокси (Nginx)
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Инициализация SQLite базы данных
initDatabase()
  .then(() => console.log('✅ База данных SQLite готова'))
  .catch(err => console.error('❌ Ошибка инициализации базы данных:', err));

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/messages', auth, messageRoutes);
app.use('/api/notifications', auth, notificationRoutes);
app.use('/api/friends', auth, friendRoutes);
app.use('/api/upload', auth, uploadRoutes);
app.use('/api/push-notifications', auth, pushNotificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Что-то пошло не так!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Внутренняя ошибка сервера'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 API доступен по адресу: http://localhost:${PORT}/api`);
  console.log(`🌐 Внешний доступ: http://157.230.26.197:${PORT}/api`);
  console.log(`🔌 Socket.IO подключение: ws://157.230.26.197:${PORT}`);
});

module.exports = { app, server, io }; 