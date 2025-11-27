# Инструкция по настройке Android для тестирования

## Текущая ситуация

EAS Build требует Android keystore для всех сборок (включая preview), но в неинтерактивном режиме его нельзя создать автоматически.

## Решение: Настройка credentials (один раз)

### Шаг 1: Настройка keystore

Запустите скрипт для интерактивной настройки:

```powershell
.\setup-android-credentials.ps1
```

Или вручную:
```bash
eas credentials --platform android
```

**Выберите:**
1. Профиль: `production` (для Google Play) или `preview` (для тестирования)
2. Действие: `Set up a new keystore` (создать новый)
3. EAS автоматически создаст и сохранит keystore в облаке

### Шаг 2: Создание сборки для тестирования

После настройки credentials можно создавать сборки:

**Для тестирования (preview):**
```bash
eas build --platform android --profile preview --non-interactive
```

**Для Google Play Internal Testing (production):**
```bash
eas build --platform android --profile production --auto-submit --non-interactive
```

## Текущая конфигурация

В `eas.json` настроено:
- **preview**: APK для внутреннего тестирования (требует keystore)
- **production**: APK для Google Play Internal Testing (требует keystore + auto-submit)

## Google Play Internal Testing

После настройки keystore команда автоматически:
1. Создаст сборку
2. Отправит её в Google Play Internal Testing track
3. Сделает доступной для тестировщиков

## Важно

- Keystore настраивается **один раз** и сохраняется в EAS
- После настройки можно использовать `--non-interactive` режим
- Keystore хранится безопасно в облаке EAS
- Не нужно хранить keystore локально

