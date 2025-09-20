# 📧 Настройка Email для отправки кодов подтверждения

## 🎯 Обзор

Приложение HockeyStars может отправлять коды подтверждения на реальные email адреса через:
1. **Gmail SMTP** (рекомендуется для начала)
2. **SendGrid API** (для продакшн)
3. **Другие SMTP провайдеры**

## 🔧 Настройка Gmail SMTP

### Шаг 1: Включить двухфакторную аутентификацию
1. Перейдите в [Google Account Settings](https://myaccount.google.com/)
2. Выберите "Security" → "2-Step Verification"
3. Включите двухфакторную аутентификацию

### Шаг 2: Создать App Password
1. В разделе "Security" найдите "App passwords"
2. Выберите "Mail" и "Other (custom name)"
3. Введите "HockeyStars" как название
4. Скопируйте сгенерированный пароль (16 символов)

### Шаг 3: Настроить переменные окружения
Создайте файл `.env` в корне проекта:

```env
# Email Configuration
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com

# Email Server
EMAIL_SERVER_PORT=3001
EMAIL_SERVER_URL=http://localhost:3001
```

## 🚀 Запуск Email Сервера

### Установка зависимостей
```bash
npm install express cors nodemailer dotenv
```

### Запуск сервера
```bash
node server/emailServer.js
```

Вы должны увидеть:
```
🚀 Email Server запущен!
📧 Порт: 3001
🌍 URL: http://localhost:3001
✅ Email транспорт инициализирован успешно
```

## 🧪 Тестирование

### Тест через API
```bash
curl -X POST http://localhost:3001/api/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

### Тест в приложении
1. Запустите email сервер: `node server/emailServer.js`
2. Запустите приложение: `npx expo start`
3. Попробуйте войти/зарегистрироваться с реальным email
4. Проверьте почту на получение кода

## ⚠️ Troubleshooting

### "Invalid login" ошибка
- Убедитесь что используете App Password, а не обычный пароль
- Проверьте что включена двухфакторная аутентификация

### "Connection refused" ошибка
- Проверьте что email сервер запущен на порту 3001
- Убедитесь что нет других процессов на этом порту

### Письма не приходят
- Проверьте папку "Спам"
- Убедитесь что email адрес корректный
- Проверьте логи email сервера

## 🌟 Альтернативные провайдеры

### SendGrid (для продакшн)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### Custom SMTP
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
FROM_EMAIL=noreply@yourdomain.com
```

## 📱 Для продакшн

1. Используйте профессиональный email сервис (SendGrid, Mailgun)
2. Настройте домен и DNS записи
3. Добавьте rate limiting
4. Настройте мониторинг и логирование
5. Используйте HTTPS для API endpoints

## 🔒 Безопасность

- Никогда не коммитьте `.env` файл в git
- Используйте переменные окружения в продакшн
- Настройте CORS правильно для продакшн
- Добавьте rate limiting для API endpoints
