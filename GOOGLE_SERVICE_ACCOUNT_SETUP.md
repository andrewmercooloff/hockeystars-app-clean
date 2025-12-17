# 🔐 Настройка Google Service Account для Android сборки

## 📋 Что нужно сделать

Для отправки Android сборки в Google Play Store нужен файл `google-service-account.json`.

---

## 🚀 Пошаговая инструкция

### Шаг 1: Создай проект в Google Cloud Console

1. Открой [Google Cloud Console](https://console.cloud.google.com/)
2. Войди в аккаунт, связанный с твоим Google Play Developer аккаунтом
3. Создай новый проект или выбери существующий:
   - Нажми **"Select a project"** → **"New Project"**
   - Назови проект (например: `HockeyStars Android`)
   - Нажми **"Create"**

---

### Шаг 2: Включи Google Play Android Developer API

1. В Google Cloud Console перейди в **"APIs & Services"** → **"Library"**
2. Найди **"Google Play Android Developer API"**
3. Нажми **"Enable"** (включить)

---

### Шаг 3: Создай Service Account

1. Перейди в **"APIs & Services"** → **"Credentials"**
2. Нажми **"Create Credentials"** → **"Service Account"**
3. Заполни форму:
   - **Service account name**: `hockeystars-android` (или любое имя)
   - **Service account ID**: автоматически заполнится
   - **Description**: `Service account for HockeyStars Android app deployment`
4. Нажми **"Create and Continue"**
5. В разделе **"Grant this service account access to project"**:
   - **Role**: выбери **"Editor"** (или **"Owner"** для полного доступа)
   - Нажми **"Continue"**
6. В разделе **"Grant users access to this service account"** можно пропустить
7. Нажми **"Done"**

---

### Шаг 4: Создай JSON ключ

1. В списке Service Accounts найди созданный аккаунт
2. Кликни на него
3. Перейди во вкладку **"Keys"**
4. Нажми **"Add Key"** → **"Create new key"**
5. Выбери **"JSON"**
6. Нажми **"Create"**
7. **Файл автоматически скачается** - это и есть `google-service-account.json`!

---

### Шаг 5: Настрой доступ в Google Play Console

1. Открой [Google Play Console](https://play.google.com/console/)
2. Выбери приложение **HockeyStars** (или создай новое)
3. Перейди в **"Setup"** → **"API access"**
4. Найди раздел **"Service accounts"**
5. Нажми **"Link service account"**
6. Вставь **Email адрес** из созданного Service Account (он есть в JSON файле, поле `client_email`)
   - Пример: `hockeystars-android@your-project.iam.gserviceaccount.com`
7. Нажми **"Grant access"**
8. Выбери права доступа:
   - ✅ **"View app information and download bulk reports"**
   - ✅ **"Manage production releases"** (для отправки в production)
   - ✅ **"Manage testing track releases"** (для internal/testing треков)
9. Нажми **"Invite user"**

---

### Шаг 6: Сохрани файл в проект

1. Переименуй скачанный файл в `google-service-account.json`
2. Перемести его в корень проекта (рядом с `package.json`)
3. **ВАЖНО:** Добавь в `.gitignore`, чтобы не закоммитить секретные данные!

---

## ⚠️ Безопасность

### Добавь в `.gitignore`:

```
# Google Service Account (секретный файл!)
google-service-account.json
```

**Никогда не коммить этот файл в Git!** Он содержит секретные ключи.

---

## ✅ Проверка

После создания файла проверь:

1. Файл `google-service-account.json` находится в корне проекта
2. Файл добавлен в `.gitignore`
3. В Google Play Console Service Account имеет доступ к приложению

---

## 🚀 После настройки

Теперь можно создавать Android сборку:

```bash
eas build --platform android --profile production --auto-submit
```

Или без автоматической отправки:

```bash
eas build --platform android --profile production
```

---

## 📝 Структура JSON файла (пример)

Файл должен выглядеть примерно так:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "hockeystars-android@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Не копируй этот пример!** Создай свой файл через Google Cloud Console.

---

## 🔗 Полезные ссылки

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Play Console](https://play.google.com/console/)
- [Официальная инструкция Expo](https://expo.fyi/creating-google-service-account)
- [Google Play Android Developer API](https://developers.google.com/android-publisher)

---

## ❓ Проблемы?

### Ошибка: "Service account does not have access"

**Решение:**
1. Проверь, что Service Account добавлен в Google Play Console
2. Убедись, что права доступа установлены правильно
3. Подожди несколько минут после добавления (может потребоваться время на синхронизацию)

### Ошибка: "API not enabled"

**Решение:**
1. Убедись, что **Google Play Android Developer API** включен в Google Cloud Console
2. Проверь, что используешь правильный проект

### Ошибка: "Invalid JSON file"

**Решение:**
1. Убедись, что файл не поврежден
2. Проверь, что это именно JSON файл (не текстовый)
3. Попробуй скачать файл заново из Google Cloud Console


















