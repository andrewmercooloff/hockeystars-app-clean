# ☁️ Настройка отправки Email через Cloudflare Workers

## 🎯 Преимущества Cloudflare Workers

✅ **Бесплатно** - 100,000 запросов/день  
✅ **Быстро** - глобальная CDN сеть  
✅ **Надежно** - инфраструктура Cloudflare  
✅ **Просто** - минимальная настройка  
✅ **Без домена** - работает из коробки  

## 🚀 Пошаговая настройка

### Шаг 1: Создание аккаунта Cloudflare

1. Перейдите на [cloudflare.com](https://cloudflare.com)
2. Нажмите **"Sign up"**
3. Зарегистрируйтесь (бесплатно)
4. Подтвердите email

### Шаг 2: Создание Worker

1. В панели Cloudflare перейдите в **"Workers & Pages"**
2. Нажмите **"Create application"**
3. Выберите **"Create Worker"**
4. Дайте имя: `hockeystars-email-sender`
5. Нажмите **"Deploy"**

### Шаг 3: Загрузка кода

1. В редакторе Worker удалите весь код
2. Скопируйте код из файла `cloudflare-worker/email-sender.js`
3. Вставьте в редактор
4. Нажмите **"Save and Deploy"**

### Шаг 4: Получение URL Worker

После деплоя вы получите URL вида:
```
https://hockeystars-email-sender.your-subdomain.workers.dev
```

### Шаг 5: Настройка в приложении

Обновите URL в коде или создайте `.env`:
```env
CLOUDFLARE_WORKER_URL=https://hockeystars-email-sender.your-subdomain.workers.dev
```

## 🧪 Тестирование

### Тест через curl
```bash
curl -X POST "https://hockeystars-email-sender.your-subdomain.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Тест в приложении
```javascript
// В консоли браузера или Node.js
const response = await fetch('https://hockeystars-email-sender.your-subdomain.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    code: '123456'
  })
});

const result = await response.json();
console.log(result);
```

## 📧 Как это работает

1. **MailChannels** - бесплатный SMTP сервис для Cloudflare Workers
2. **Глобальная сеть** - Worker запускается в ближайшем дата-центре
3. **Автоматический CORS** - настроен для работы с веб-приложениями
4. **Валидация** - проверка email и кода перед отправкой

## ⚠️ Troubleshooting

### Worker возвращает 404
- Проверьте правильность URL
- Убедитесь что Worker развернут

### Email не приходит
- Проверьте папку "Спам"
- Убедитесь что email адрес корректный
- Посмотрите логи в Cloudflare Dashboard

### CORS ошибки
- Worker уже настроен для CORS
- Проверьте что используете POST запрос

## 🔧 Дополнительные настройки

### Кастомный домен (опционально)

1. Добавьте домен в Cloudflare
2. В настройках Worker добавьте Custom Domain
3. Обновите URL в приложении

### Мониторинг

- В Cloudflare Dashboard: **Workers & Pages** → **Ваш Worker** → **Metrics**
- Просмотр логов: **Real-time Logs**
- Лимиты: 100,000 запросов/день на бесплатном плане

## 💰 Стоимость

- **Бесплатно**: 100,000 запросов/день
- **Paid план**: $5/месяц за 10M запросов

## 🌟 Готово!

После настройки ваше приложение будет:
1. ✅ Отправлять реальные email через Cloudflare
2. ✅ Работать быстро по всему миру  
3. ✅ Иметь надежную инфраструктуру
4. ✅ Не требовать собственного сервера

**Следующий шаг**: Создайте Worker и получите URL для настройки!
