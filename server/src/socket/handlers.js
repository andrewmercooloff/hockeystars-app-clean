const Player = require('../models/Player');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// Хранилище активных соединений
const activeConnections = new Map();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Аутентификация пользователя
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;
        if (!token) {
          socket.emit('error', { message: 'Token required' });
          return;
        }

        // Здесь должна быть проверка JWT токена
        // Пока используем простую проверку
        const player = await Player.findById(token);
        if (!player) {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }

        // Сохраняем информацию о пользователе
        socket.playerId = player._id.toString();
        socket.join(player._id.toString());
        activeConnections.set(player._id.toString(), socket.id);

        // Обновляем статус онлайн
        player.isOnline = true;
        player.lastSeen = new Date();
        await player.save();

        socket.emit('authenticated', { 
          message: 'Successfully authenticated',
          playerId: player._id 
        });

        // Уведомляем друзей о том, что пользователь онлайн
        if (player.friends && player.friends.length > 0) {
          player.friends.forEach(friendId => {
            const friendSocketId = activeConnections.get(friendId.toString());
            if (friendSocketId) {
              io.to(friendSocketId).emit('friendOnline', {
                playerId: player._id,
                name: player.name
              });
            }
          });
        }

      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Обработка сообщений
    socket.on('sendMessage', async (data) => {
      try {
        const { recipientId, content, type = 'text' } = data;
        
        if (!socket.playerId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const message = new Message({
          sender: socket.playerId,
          recipient: recipientId,
          content,
          type
        });

        await message.save();
        await message.populate('sender', 'name username avatar');
        await message.populate('recipient', 'name username avatar');

        // Отправляем сообщение получателю
        socket.to(recipientId).emit('newMessage', message);
        
        // Подтверждаем отправку отправителю
        socket.emit('messageSent', message);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Обработка уведомлений
    socket.on('markNotificationRead', async (data) => {
      try {
        const { notificationId } = data;
        
        if (!socket.playerId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const notification = await Notification.findOneAndUpdate(
          {
            _id: notificationId,
            recipient: socket.playerId
          },
          { read: true },
          { new: true }
        );

        if (notification) {
          socket.emit('notificationUpdated', notification);
        }

      } catch (error) {
        console.error('Mark notification read error:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Обработка друзей
    socket.on('sendFriendRequest', async (data) => {
      try {
        const { recipientId } = data;
        
        if (!socket.playerId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Проверяем, что запрос еще не отправлен
        const existingRequest = await Notification.findOne({
          sender: socket.playerId,
          recipient: recipientId,
          type: 'friend_request'
        });

        if (existingRequest) {
          socket.emit('error', { message: 'Friend request already sent' });
          return;
        }

        const sender = await Player.findById(socket.playerId);
        const notification = new Notification({
          sender: socket.playerId,
          recipient: recipientId,
          type: 'friend_request',
          content: `${sender.name} отправил вам запрос в друзья`
        });

        await notification.save();
        await notification.populate('sender', 'name username avatar');

        // Отправляем уведомление получателю
        socket.to(recipientId).emit('newNotification', notification);
        
        // Подтверждаем отправку отправителю
        socket.emit('friendRequestSent', { message: 'Friend request sent' });

      } catch (error) {
        console.error('Send friend request error:', error);
        socket.emit('error', { message: 'Failed to send friend request' });
      }
    });

    // Обработка отключения
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      if (socket.playerId) {
        // Удаляем из активных соединений
        activeConnections.delete(socket.playerId);

        // Обновляем статус оффлайн
        try {
          const player = await Player.findById(socket.playerId);
          if (player) {
            player.isOnline = false;
            player.lastSeen = new Date();
            await player.save();

            // Уведомляем друзей о том, что пользователь оффлайн
            if (player.friends && player.friends.length > 0) {
              player.friends.forEach(friendId => {
                const friendSocketId = activeConnections.get(friendId.toString());
                if (friendSocketId) {
                  io.to(friendSocketId).emit('friendOffline', {
                    playerId: player._id,
                    name: player.name
                  });
                }
              });
            }
          }
        } catch (error) {
          console.error('Update offline status error:', error);
        }
      }
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = setupSocketHandlers; 