const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Player = require('../models/Player');
const auth = require('../middleware/auth');

const router = express.Router();

// Генерация JWT токена
const generateToken = (playerId) => {
  return jwt.sign(
    { playerId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Регистрация
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  body('email')
    .isEmail()
    .withMessage('Неверный формат email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен быть не менее 6 символов'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно быть от 2 до 100 символов'),
  body('birthDate')
    .isISO8601()
    .withMessage('Неверный формат даты рождения'),
  body('status')
    .isIn(['player', 'coach', 'scout'])
    .withMessage('Неверный статус')
], async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Ошибка валидации',
        details: errors.array() 
      });
    }

    const { username, email, password, name, birthDate, status, country, team, position } = req.body;

    // Проверка существования пользователя
    const existingPlayer = await Player.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });

    if (existingPlayer) {
      return res.status(400).json({
        error: 'Пользователь с таким именем или email уже существует'
      });
    }

    // Создание нового игрока
    const player = new Player({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      name,
      birthDate,
      status,
      country: country || 'Беларусь',
      team,
      position
    });

    await player.save();

    // Генерация токена
    const token = generateToken(player._id);

    // Обновление статистики входа
    player.loginCount += 1;
    player.isOnline = true;
    player.lastSeen = new Date();
    await player.save();

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      player: player.getPublicProfile()
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      error: 'Ошибка сервера при регистрации'
    });
  }
});

// Вход
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Имя пользователя обязательно'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Ошибка валидации',
        details: errors.array() 
      });
    }

    const { username, password } = req.body;

    // Поиск пользователя
    const player = await Player.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    if (!player) {
      return res.status(401).json({
        error: 'Неверное имя пользователя или пароль'
      });
    }

    // Проверка пароля
    const isPasswordValid = await player.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Неверное имя пользователя или пароль'
      });
    }

    // Генерация токена
    const token = generateToken(player._id);

    // Обновление статистики входа
    player.loginCount += 1;
    player.isOnline = true;
    player.lastSeen = new Date();
    await player.save();

    res.json({
      message: 'Вход выполнен успешно',
      token,
      player: player.getPublicProfile()
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      error: 'Ошибка сервера при входе'
    });
  }
});

// Получение текущего пользователя
router.get('/me', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player._id)
      .populate('friends', 'name avatar status team')
      .populate('followers', 'name avatar status team')
      .populate('following', 'name avatar status team');

    if (!player) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    res.json({
      player: player.getPublicProfile()
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      error: 'Ошибка сервера'
    });
  }
});

// Обновление профиля
router.put('/profile', auth, [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Имя должно быть от 2 до 100 символов'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Биография не должна превышать 500 символов')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Ошибка валидации',
        details: errors.array() 
      });
    }

    const player = await Player.findById(req.player._id);
    if (!player) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    // Обновление разрешенных полей
    const allowedFields = [
      'name', 'bio', 'team', 'position', 'number', 'grip', 
      'height', 'weight', 'hockeyStartDate', 'favoriteGoals',
      'pullUps', 'pushUps', 'plankTime', 'sprint100m', 'longJump',
      'games', 'goals', 'assists', 'points', 'photos', 'avatar',
      'isPublic', 'allowMessages', 'allowFriendRequests'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        player[field] = req.body[field];
      }
    });

    // Пересчет очков если изменились голы или передачи
    if (req.body.goals !== undefined || req.body.assists !== undefined) {
      const goals = req.body.goals !== undefined ? req.body.goals : player.goals;
      const assists = req.body.assists !== undefined ? req.body.assists : player.assists;
      player.points = (goals || 0) + (assists || 0);
    }

    await player.save();

    res.json({
      message: 'Профиль обновлен',
      player: player.getPublicProfile()
    });

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      error: 'Ошибка сервера при обновлении профиля'
    });
  }
});

// Выход
router.post('/logout', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player._id);
    if (player) {
      player.isOnline = false;
      player.lastSeen = new Date();
      await player.save();
    }

    res.json({
      message: 'Выход выполнен успешно'
    });

  } catch (error) {
    console.error('Ошибка выхода:', error);
    res.status(500).json({
      error: 'Ошибка сервера при выходе'
    });
  }
});

// Обновление токена
router.post('/refresh', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player._id);
    if (!player) {
      return res.status(404).json({
        error: 'Пользователь не найден'
      });
    }

    const token = generateToken(player._id);

    res.json({
      token,
      player: player.getPublicProfile()
    });

  } catch (error) {
    console.error('Ошибка обновления токена:', error);
    res.status(500).json({
      error: 'Ошибка сервера'
    });
  }
});

module.exports = router; 