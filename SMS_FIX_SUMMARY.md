# Исправление SMS блокировки Twilio

## ✅ Что было сделано:

1. **Добавлен параметр `RiskCheck=disable` в отправку SMS**
   - Файл: `utils/smsService.ts`
   - Функция: `sendSMSViaTwilio` (строка 78)
   - Это сообщает Twilio, что сообщения легитимные (коды подтверждения)

2. **Добавлен параметр `RiskCheck=disable` в отправку WhatsApp**
   - Файл: `utils/smsService.ts`
   - Функция: `sendWhatsAppViaTwilio` (строка 186)
   - Для консистентности

3. **Обновлена версия приложения**
   - `1.0.4` → `1.0.5` (patch версия)

## 📱 Как быстро обновить:

### Шаг 1: Закоммитить изменения
```bash
git add utils/smsService.ts app.json
git commit -m "fix: add RiskCheck=disable to Twilio SMS/WhatsApp to prevent 30453 error"
```

### Шаг 2: Создать сборки
```bash
# iOS (TestFlight + App Store)
eas build --platform ios --profile production --auto-submit --no-wait

# Android (Google Play)
eas build --platform android --profile preview --no-wait
```

### Шаг 3: Ожидание ревью
- **iOS:** 1-3 дня (patch версии проходят быстрее)
- **Android:** Несколько часов - 1 день

## ⚡ Ускорение для iOS:

При отправке на ревью в App Store Connect можно запросить **Expedited Review**:
- Объяснение: "Critical bug fix - SMS verification codes not being delivered to new users due to Twilio Error 30453"
- Может ускорить до 24 часов

## 📝 Важно:

- Patch версии (1.0.4 → 1.0.5) проходят быстрее, чем major версии
- Это исправление бага, не новая функциональность
- Apple обычно одобряет patch версии за 1-3 дня













































