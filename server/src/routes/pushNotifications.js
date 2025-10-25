const express = require('express');
const router = express.Router();
const { supabase } = require('../database');

/**
 * Отправка тестового push-уведомления пользователю
 */
router.post('/test/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title = 'Тестовое уведомление', body = 'Это тестовое push-уведомление от HockeyStars!' } = req.body;

    // Получаем push tokens пользователя
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('userId', userId);

    if (error) {
      console.error('❌ Ошибка получения push tokens:', error);
      return res.status(500).json({ error: 'Ошибка получения push tokens' });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: 'У пользователя нет зарегистрированных устройств' });
    }

    // Отправляем push-уведомления на все устройства
    const results = [];
    for (const tokenData of tokens) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokenData.token,
            sound: 'not.m4a',
            title,
            body,
            data: { test: true, timestamp: new Date().toISOString() },
            android: {
              sound: 'not.m4a',
            },
            ios: {
              sound: 'not.m4a',
            },
          }),
        });

        const result = await response.json();
        results.push({
          token: tokenData.token.substring(0, 20) + '...',
          success: result.data && result.data.status === 'ok',
          result
        });
      } catch (error) {
        console.error('❌ Ошибка отправки push-уведомления:', error);
        results.push({
          token: tokenData.token.substring(0, 20) + '...',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      message: `Push-уведомления отправлены на ${successCount}/${tokens.length} устройств`,
      results,
      success: successCount > 0
    });

  } catch (error) {
    console.error('❌ Ошибка отправки тестового push-уведомления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Получение информации о push tokens пользователя
 */
router.get('/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('userId', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения push tokens:', error);
      return res.status(500).json({ error: 'Ошибка получения push tokens' });
    }

    // Скрываем полные токены для безопасности
    const safeTokens = tokens.map(token => ({
      id: token.id,
      deviceId: token.device_id,
      platform: token.platform,
      tokenPreview: token.token.substring(0, 20) + '...',
      createdAt: token.created_at,
      updatedAt: token.updated_at
    }));

    res.json({
      tokens: safeTokens,
      count: tokens.length
    });

  } catch (error) {
    console.error('❌ Ошибка получения push tokens:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Отправка push-уведомления всем пользователям (только для админов)
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Требуются title и body' });
    }

    // Получаем все активные push tokens
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, userId');

    if (error) {
      console.error('❌ Ошибка получения push tokens:', error);
      return res.status(500).json({ error: 'Ошибка получения push tokens' });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ error: 'Нет зарегистрированных устройств' });
    }

    // Отправляем push-уведомления
    const results = [];
    for (const tokenData of tokens) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: tokenData.token,
            sound: 'not.m4a',
            title,
            body,
            data: data || {},
            android: {
              sound: 'not.m4a',
            },
            ios: {
              sound: 'not.m4a',
            },
          }),
        });

        const result = await response.json();
        results.push({
          userId: tokenData.userId,
          success: result.data && result.data.status === 'ok',
          result
        });
      } catch (error) {
        console.error('❌ Ошибка отправки push-уведомления:', error);
        results.push({
          userId: tokenData.userId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      message: `Push-уведомления отправлены на ${successCount}/${tokens.length} устройств`,
      results,
      success: successCount > 0
    });

  } catch (error) {
    console.error('❌ Ошибка отправки broadcast push-уведомления:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;











