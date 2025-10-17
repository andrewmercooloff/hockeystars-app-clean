const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// Получить уведомления пользователя
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.player._id })
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Отметить уведомление как прочитанное
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.player._id
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Отметить все уведомления как прочитанные
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.player._id,
        read: false
      },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Удалить уведомление
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.player._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 