const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Player = require('../models/Player');

const router = express.Router();

// Получить всех игроков (без авторизации)
router.get('/', async (req, res) => {
  try {
    const players = await Player.find({})
      .select('-password -email')
      .sort({ createdAt: -1 });
    
    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Поиск игроков
router.get('/search', auth, async (req, res) => {
  try {
    const { q, status, position } = req.query;
    let query = { _id: { $ne: req.player._id } };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { 'hockeyInfo.team': { $regex: q, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (position) {
      query['hockeyInfo.position'] = position;
    }

    const players = await Player.find(query)
      .select('-password -email')
      .sort({ createdAt: -1 });

    res.json(players);
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Получить звездных игроков
router.get('/stars', auth, async (req, res) => {
  try {
    const stars = await Player.find({ status: 'star' })
      .select('-password -email')
      .sort({ createdAt: -1 });

    res.json(stars);
  } catch (error) {
    console.error('Get stars error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Получить профиль игрока по ID
router.get('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.params.id)
      .select('-password -email');

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 