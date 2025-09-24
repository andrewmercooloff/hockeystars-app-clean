# 📧 Настройка Resend API для HockeyStars

## Шаг 1: Регистрация в Resend

1. **Перейдите на [resend.com](https://resend.com)**
2. **Создайте аккаунт** (бесплатно)
3. **Подтвердите email**

## Шаг 2: Получение API ключа

1. **Войдите в панель управления Resend**
2. **Перейдите в раздел "API Keys"**
3. **Создайте новый API ключ:**
   - Name: `HockeyStars Production`
   - Permission: `Sending access`
4. **Скопируйте API ключ** (начинается с `re_`)

## Шаг 3: Верификация домена

1. **В панели Resend перейдите в "Domains"**
2. **Добавьте домен `hockeystars.by`**
3. **Настройте DNS записи** (в Cloudflare):
   - **DKIM**: `_dkim.hockeystars.by` → TXT запись от Resend
   - **Return-Path**: `_resend.hockeystars.by` → TXT запись от Resend
4. **Дождитесь верификации** (обычно 5-15 минут)

## Шаг 4: Установка Supabase CLI

### macOS (через Homebrew):
```bash
# Установите Homebrew если его нет
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установите Supabase CLI
brew install supabase/tap/supabase
```

### Альтернативно через npm:
```bash
sudo npm install -g supabase
```

## Шаг 5: Настройка Supabase проекта

1. **Войдите в Supabase:**
```bash
supabase login
```

2. **Инициализируйте проект:**
```bash
supabase init
```

3. **Подключитесь к проекту:**
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

## Шаг 6: Настройка переменных окружения

1. **Установите API ключ Resend:**
```bash
supabase secrets set RESEND_API_KEY=re_ваш_api_ключ_здесь
```

2. **Проверьте что ключ установлен:**
```bash
supabase secrets list
```

## Шаг 7: Деплой Edge Function

1. **Разверните функцию:**
```bash
supabase functions deploy send-verification-email
```

2. **Проверьте деплой:**
```bash
supabase functions list
```

## Шаг 8: Тестирование

### Тест через curl:
```bash
curl -X POST 'https://YOUR_PROJECT_ID.functions.supabase.co/send-verification-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "subject": "Test Email"
  }'
```

### Ожидаемый ответ:
```json
{
  "success": true,
  "data": {
    "messageId": "re_01234567-89ab-cdef-0123-456789abcdef",
    "message": "Email отправлен успешно"
  }
}
```

## Шаг 9: Обновление приложения

Edge Function будет автоматически использоваться через `sendEmailViaSupabase()` в `utils/emailService.ts`.

## 🎯 Бесплатный тариф Resend:

- ✅ **3,000 emails/месяц** бесплатно
- ✅ **Верификация домена** включена
- ✅ **API доступ** без ограничений
- ✅ **Webhooks** поддерживаются

## 🚨 Troubleshooting:

### Ошибка "Domain not verified":
- Проверьте DNS записи в Cloudflare
- Подождите до 24 часов для распространения DNS
- Используйте `dig` для проверки записей

### Ошибка "API key invalid":
- Убедитесь что ключ скопирован полностью
- Проверьте что ключ установлен: `supabase secrets list`
- Пересоздайте ключ в панели Resend

### Ошибка "Function not found":
- Проверьте деплой: `supabase functions list`
- Переразверните: `supabase functions deploy send-verification-email`

## 📊 Мониторинг:

В панели Resend можете отслеживать:
- Количество отправленных emails
- Статусы доставки
- Bounces и жалобы
- Статистику открытий (если включено)

---

**После настройки Resend, приложение будет отправлять реальные emails вместо показа кодов в консоли!** 🎉
