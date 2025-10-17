const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();

// Получить сообщения с конкретным пользователем
router.get('/:recipientId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.player._id, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.player._id }
      ]
    })
    .populate('sender', 'name username avatar')
    .populate('recipient', 'name username avatar')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Отправить сообщение
router.post('/', [
  auth,
  body('recipientId').notEmpty().withMessage('Recipient ID is required'),
  body('content').notEmpty().withMessage('Message content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId, content, type = 'text' } = req.body;

    const message = new Message({
      sender: req.player._id,
      recipient: recipientId,
      content,
      type
    });

    await message.save();
    
    await message.populate('sender', 'name username avatar');
    await message.populate('recipient', 'name username avatar');

    // Отправляем через Socket.IO
    req.app.get('io').to(recipientId.toString()).emit('newMessage', message);

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Отметить сообщения как прочитанные
router.put('/:recipientId/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.recipientId,
        recipient: req.player._id,
        read: false
      },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 