const express = require('express');
const router = express.Router();
const https = require('https');

// Вспомогательная функция для запросов к VK API (совместимость со старыми версиями Node.js)
const fetchVkApi = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Получить превью VK видео через API video.get
router.get('/video-thumbnail', async (req, res) => {
  try {
    const { videoId } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId обязателен' });
    }
    
    // Извлекаем owner_id и video_id из videoId (формат: -173822370_456242306)
    const [ownerId, videoIdPart] = videoId.split('_');
    
    if (!ownerId || !videoIdPart) {
      return res.status(400).json({ error: 'Неверный формат videoId' });
    }
    
    // VK API endpoint
    // Для публичных видео можно попробовать без токена, но лучше использовать токен
    const vkAccessToken = process.env.VK_ACCESS_TOKEN || '';
    const vkApiVersion = '5.131';
    
    // Формируем URL для VK API
    const videosParam = `${ownerId}_${videoIdPart}`;
    let apiUrl = `https://api.vk.com/method/video.get?owner_id=${ownerId}&videos=${videosParam}&v=${vkApiVersion}`;
    
    if (vkAccessToken) {
      apiUrl += `&access_token=${vkAccessToken}`;
    }
    
    console.log('📡 Запрос к VK API:', apiUrl.replace(vkAccessToken, '***'));
    
    // Делаем запрос к VK API (используем встроенный https для совместимости)
    let response;
    try {
      // Пробуем использовать fetch если доступен (Node.js 18+)
      if (typeof fetch !== 'undefined') {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
      } else {
        // Fallback на https для старых версий Node.js
        response = await fetchVkApi(apiUrl);
      }
    } catch (fetchError) {
      console.error('❌ Ошибка при запросе к VK API:', fetchError);
      return res.status(500).json({ 
        error: 'Ошибка при запросе к VK API',
        message: fetchError.message 
      });
    }
    
    if (!response.ok) {
      console.error('❌ VK API вернул ошибку:', response.status);
      return res.status(response.status).json({ 
        error: 'Ошибка при запросе к VK API',
        status: response.status 
      });
    }
    
    const data = await response.json();
    
    // Проверяем на ошибки VK API
    if (data.error) {
      console.error('❌ VK API ошибка:', data.error);
      return res.status(400).json({ 
        error: 'Ошибка VK API',
        vkError: data.error 
      });
    }
    
    // Извлекаем превью из ответа
    if (data.response && data.response.items && Array.isArray(data.response.items) && data.response.items.length > 0) {
      const videoItem = data.response.items[0];
      
      // Пробуем разные поля с превью
      let thumbnailUrl = null;
      
      if (videoItem.image && Array.isArray(videoItem.image) && videoItem.image.length > 0) {
        // image - массив URL превью разных размеров, берем самый большой (последний)
        thumbnailUrl = videoItem.image[videoItem.image.length - 1];
      } else if (videoItem.photo_1280) {
        thumbnailUrl = videoItem.photo_1280;
      } else if (videoItem.photo_800) {
        thumbnailUrl = videoItem.photo_800;
      } else if (videoItem.photo_640) {
        thumbnailUrl = videoItem.photo_640;
      } else if (videoItem.photo_320) {
        thumbnailUrl = videoItem.photo_320;
      } else if (videoItem.photo_130) {
        thumbnailUrl = videoItem.photo_130;
      }
      
      if (thumbnailUrl) {
        console.log('✅ Найдено превью VK:', thumbnailUrl);
        return res.json({ 
          thumbnail_url: thumbnailUrl,
          image: videoItem.image || [thumbnailUrl],
          video: videoItem
        });
      } else {
        console.log('⚠️ Видео найдено, но нет превью');
        return res.status(404).json({ 
          error: 'Превью не найдено',
          video: videoItem 
        });
      }
    } else {
      console.log('⚠️ VK API вернул пустой ответ');
      return res.status(404).json({ 
        error: 'Видео не найдено',
        response: data.response 
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при получении превью VK:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      message: error.message 
    });
  }
});

module.exports = router;

