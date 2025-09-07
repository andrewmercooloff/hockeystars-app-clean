# 📧 Настройка email для домена hockeystars.by

## 🎯 Цель
Настроить отправку кодов подтверждения с адреса `noreply@hockeystars.by` через Cloudflare Workers + MailChannels.

## ⚡ Быстрая настройка

### Шаг 1: DNS записи в Cloudflare

Перейдите в **Cloudflare Dashboard** → **hockeystars.by** → **DNS** → **Records**

#### 1.1 SPF запись (обязательно!)
```
Type: TXT
Name: hockeystars.by (или @)
Content: v=spf1 include:relay.mailchannels.net ~all
```

#### 1.2 DMARC запись (рекомендуется)
```
Type: TXT  
Name: _dmarc.hockeystars.by
Content: v=DMARC1; p=quarantine; rua=mailto:noreply@hockeystars.by
```

#### 1.3 DKIM запись (опционально, но лучше)
```
Type: TXT
Name: mailchannels._domainkey.hockeystars.by  
Content: v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Dx8v1FHhRHvD2Yw7CmW...
```
*Полный ключ можно получить от MailChannels*

### Шаг 2: Создание Cloudflare Worker

1. **Cloudflare Dashboard** → **Workers & Pages** → **Create application**
2. **Create Worker**
3. Имя: `hockeystars-by-email`
4. **Deploy**

### Шаг 3: Загрузка кода Worker

1. В редакторе удалите весь код
2. Скопируйте код из `cloudflare-worker/email-sender.js`
3. **Save and Deploy**

### Шаг 4: Настройка Custom Domain (опционально)

1. В настройках Worker → **Settings** → **Triggers**
2. **Add Custom Domain**
3. Введите: `email.hockeystars.by`
4. **Add Domain**

## 🧪 Тестирование

### Тест 1: Проверка DNS записей
```bash
# Проверка SPF
dig TXT hockeystars.by

# Проверка DMARC  
dig TXT _dmarc.hockeystars.by
```

### Тест 2: Проверка Worker
```bash
curl -X POST "https://hockeystars-by-email.ваш-поддомен.workers.dev" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ваш-email@example.com",
    "code": "123456"
  }'
```

## 📋 Полная конфигурация DNS

После настройки ваши DNS записи должны выглядеть так:

```
# Основные записи домена
hockeystars.by          A       192.0.2.1
www.hockeystars.by      CNAME   hockeystars.by

# Email записи
hockeystars.by          TXT     "v=spf1 include:relay.mailchannels.net ~all"
_dmarc.hockeystars.by   TXT     "v=DMARC1; p=quarantine; rua=mailto:noreply@hockeystars.by"

# Worker (если используете custom domain)
email.hockeystars.by    AAAA    100::
email.hockeystars.by    A       192.0.2.1
```

## ⚠️ Важные моменты

### DNS Propagation
- Изменения DNS могут занять до 24 часов
- Проверить статус: `dig TXT hockeystars.by`

### MailChannels лимиты
- **Бесплатно**: до 1000 писем/день
- **Без регистрации**: работает из коробки с Cloudflare Workers

### Delivery в спам
- SPF запись **обязательна** для доставки
- DMARC повышает репутацию отправителя
- DKIM улучшает доставляемость

## 🔧 Troubleshooting

### Письма не приходят
1. Проверьте SPF запись: `dig TXT hockeystars.by`
2. Посмотрите логи Worker в Cloudflare Dashboard
3. Проверьте папку "Спам"

### SPF запись не работает
```bash
# Должно показать: "v=spf1 include:relay.mailchannels.net ~all"
dig TXT hockeystars.by
```

### Worker возвращает ошибку
- Проверьте код Worker
- Убедитесь что from email = `noreply@hockeystars.by`

## 🎉 Результат

После настройки:
- ✅ Письма приходят с `noreply@hockeystars.by`
- ✅ Высокая доставляемость (не спам)
- ✅ Профессиональный вид
- ✅ Бесплатно до 1000 писем/день

## 📱 Интеграция с приложением

Обновите URL в `utils/emailService.ts`:
```javascript
const workerUrl = 'https://hockeystars-by-email.ваш-поддомен.workers.dev';
// или с custom domain:
// const workerUrl = 'https://email.hockeystars.by';
```
