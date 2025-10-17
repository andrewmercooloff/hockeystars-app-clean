const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Player = require('../models/Player');
const Notification = require('../models/Notification');

const router = express.Router();

// Отправить запрос в друзья
router.post('/request', [
  auth,
  body('recipientId').notEmpty().withMessage('Recipient ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId } = req.body;

    // Проверяем, что не отправляем запрос самому себе
    if (req.player._id.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Проверяем, что получатель существует
    const recipient = await Player.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Player not found' });
    }

    // Проверяем, что запрос уже не отправлен
    const existingRequest = await Notification.findOne({
      sender: req.player._id,
      recipient: recipientId,
      type: 'friend_request'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Создаем уведомление о запросе в друзья
    const notification = new Notification({
      sender: req.player._id,
      recipient: recipientId,
      type: 'friend_request',
      content: `${req.player.name} отправил вам запрос в друзья`
    });

    await notification.save();
    await notification.populate('sender', 'name username avatar');

    // Отправляем через Socket.IO
    req.app.get('io').to(recipientId.toString()).emit('newNotification', notification);

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Принять запрос в друзья
router.post('/accept/:senderId', auth, async (req, res) => {
  try {
    const { senderId } = req.params;

    // Находим уведомление о запросе
    const notification = await Notification.findOne({
      sender: senderId,
      recipient: req.player._id,
      type: 'friend_request',
      read: false
    });

    if (!notification) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Добавляем друг друга в списки друзей
    await Player.findByIdAndUpdate(req.player._id, {
      $addToSet: { friends: senderId }
    });

    await Player.findByIdAndUpdate(senderId, {
      $addToSet: { friends: req.player._id }
    });

    // Отмечаем уведомление как прочитанное
    notification.read = true;
    await notification.save();

    // Создаем уведомление о принятии запроса
    const acceptNotification = new Notification({
      sender: req.player._id,
      recipient: senderId,
      type: 'friend_accepted',
      content: `${req.player.name} принял ваш запрос в друзья`
    });

    await acceptNotification.save();

    // Отправляем через Socket.IO
    req.app.get('io').to(senderId.toString()).emit('newNotification', acceptNotification);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Отклонить запрос в друзья
router.post('/reject/:senderId', auth, async (req, res) => {
  try {
    const { senderId } = req.params;

    // Находим и удаляем уведомление о запросе
    await Notification.findOneAndDelete({
      sender: senderId,
      recipient: req.player._id,
      type: 'friend_request'
    });

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Получить список друзей
router.get('/', auth, async (req, res) => {
  try {
    const player = await Player.findById(req.player._id)
      .populate('friends', 'name username avatar status hockeyInfo.team hockeyInfo.position');

    res.json(player.friends || []);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Удалить из друзей
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Удаляем друг друга из списков друзей
    await Player.findByIdAndUpdate(req.player._id, {
      $pull: { friends: friendId }
    });

    await Player.findByIdAndUpdate(friendId, {
      $pull: { friends: req.player._id }
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 