# Быстрое обновление приложения (Patch версия)

## Что было изменено:
- Добавлен параметр `RiskCheck=disable` в отправку SMS через Twilio
- Это предотвращает блокировку SMS Pumping Protection для легитимных кодов подтверждения

## Шаги для быстрого обновления:

### 1. Обновить версию в app.json

Измените версию с `1.0.4` на `1.0.5` (patch версия):

```json
"version": "1.0.5",
"runtimeVersion": "1.0.5",
```

**Важно:** `runtimeVersion` должен совпадать с `version` для OTA updates.

### 2. Закоммитить изменения

```bash
cd c:\hockeystars-app-clean-old-recovered
git add utils/smsService.ts app.json
git commit -m "fix: add RiskCheck=disable to Twilio SMS to prevent 30453 error"
```

### 3. Создать новую сборку (Patch версия)

**Для iOS (TestFlight):**
```bash
eas build --platform ios --profile production --auto-submit --no-wait
```

**Для Android (Google Play):**
```bash
eas build --platform android --profile preview --no-wait
```

### 4. Отправить на ревью

**iOS:**
- Сборка автоматически отправится в TestFlight (благодаря `--auto-submit`)
- После тестирования в TestFlight можно отправить в App Store
- Patch версии (1.0.4 → 1.0.5) обычно проходят быстрее (1-3 дня вместо недели)

**Android:**
- Загрузите AAB в Google Play Console
- Patch версии проходят быстрее (обычно несколько часов)

## ⚡ Ускорение процесса:

### Для iOS:
1. **Используйте Expedited Review** (если доступно):
   - В App Store Connect при отправке на ревью
   - Объясните: "Critical bug fix - SMS verification codes not being delivered to new users"
   - Обычно ускоряет до 24 часов

2. **Patch версии проходят быстрее:**
   - Apple понимает, что это исправление бага
   - Обычно 1-3 дня вместо недели

### Для Android:
- Google Play обычно проверяет patch версии быстрее
- Может быть автоматически одобрено за несколько часов

## 📝 Что НЕ нужно делать:

- ❌ Не нужно менять описание приложения
- ❌ Не нужно менять скриншоты
- ❌ Не нужно менять настройки в App Store Connect (кроме версии)
- ❌ Не нужно обновлять Privacy Policy (это только исправление бага)

## ⏱️ Ожидаемое время:

- **Сборка:** 20-40 минут
- **iOS ревью:** 1-3 дня (patch версия)
- **Android ревью:** Несколько часов - 1 день

**Итого:** Обновление будет доступно пользователям через 1-3 дня после начала процесса.

## 🔄 Альтернатива (пока ждем обновление):

Пока обновление проходит ревью, можно:
1. Обратиться в Twilio Support (может помочь за 1-2 дня)
2. Использовать WhatsApp для регистрации (если настроено)
3. Временно использовать email для регистрации (если доступно)


