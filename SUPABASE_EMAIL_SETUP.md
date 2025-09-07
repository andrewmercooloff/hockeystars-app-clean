# 📧 Настройка отправки Email через Supabase Edge Functions

## 🎯 Обзор

Мы используем Supabase Edge Functions для отправки кодов подтверждения на email. Это серверное решение, которое работает надежно и безопасно.

## 🚀 Быстрый старт

### 1. Установка Supabase CLI
```bash
npm install -g supabase
```

### 2. Логин в Supabase
```bash
supabase login
```

### 3. Связывание с проектом
```bash
supabase link --project-ref jvsypfwiajuwsyuzkyda
```

### 4. Развертывание Edge Function
```bash
supabase functions deploy send-email
```

## 🔧 Настройка Email провайдера

### Вариант 1: Resend (Рекомендуется)

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Получите API ключ
3. Добавьте переменную окружения в Supabase:

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
```

### Вариант 2: Gmail SMTP

1. Создайте App Password в Gmail (см. EMAIL_SETUP_INSTRUCTIONS.md)
2. Добавьте переменные окружения:

```bash
supabase secrets set GMAIL_USER=your-email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your-16-char-app-password
```

## 🧪 Тестирование

### Тест Edge Function
```bash
node test_supabase_email.js
```

### Ручной тест через curl
```bash
curl -X POST 'https://jvsypfwiajuwsyuzkyda.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

## 📱 Использование в приложении

Edge Function автоматически используется через `emailService.ts`. Просто вызывайте:

```typescript
import { sendVerificationEmail } from '../utils/emailService';

const success = await sendVerificationEmail('user@example.com', '123456');
```

## 🔍 Логи и мониторинг

Просмотр логов Edge Function:
```bash
supabase functions logs send-email
```

## ⚠️ Troubleshooting

### Edge Function не найдена (404)
- Убедитесь что функция развернута: `supabase functions deploy send-email`
- Проверьте что вы связаны с правильным проектом

### Email не отправляется
- Проверьте переменные окружения: `supabase secrets list`
- Посмотрите логи: `supabase functions logs send-email`
- Убедитесь что Resend API ключ валидный

### CORS ошибки
- Edge Function уже настроена для CORS
- Убедитесь что используете правильный домен

## 🌟 Преимущества Edge Functions

✅ **Безопасность**: API ключи хранятся на сервере  
✅ **Надежность**: Работает независимо от клиентского устройства  
✅ **Масштабируемость**: Автоматическое масштабирование Supabase  
✅ **Мониторинг**: Встроенные логи и метрики  
✅ **CORS**: Автоматическая настройка для веб-приложений  

## 📊 Статус интеграции

- ✅ Edge Function создана
- ✅ emailService.ts обновлен
- ⏳ Функция требует развертывания
- ⏳ Настройка email провайдера
- ⏳ Тестирование

## 🔄 Следующие шаги

1. Разверните Edge Function: `supabase functions deploy send-email`
2. Настройте Resend API ключ
3. Протестируйте отправку email
4. Проверьте работу в приложении
