# App Store Connect - Checklist для исправления замечаний Apple

## ✅ Что нужно проверить/изменить в App Store Connect:

### 1. **App Information → Age Rating** (КРИТИЧНО!)

**Текущая проблема:** Apple указал, что в Age Rating выбрано "In-App Controls", но они не нашли Parental Controls.

**Что делать:**
- Зайдите в **App Store Connect → Ваше приложение → App Information → Age Rating**
- Проверьте настройки:
  - **Parental Controls:** 
    - Если у вас стоит "Yes" - оставьте "Yes" и в ответе Apple объясните, где находятся родительские контроли (как в письме)
    - Если у вас стоит "None" - оставьте "None" и в ответе объясните, что родительские контроли есть, но они работают через email-верификацию (Email-Plus метод)
  - **Age Assurance:** 
    - Обычно должно быть "None" (если нет специальной верификации возраста)
    - Или "Yes" если есть механизм проверки возраста

**Рекомендация:** Если Apple не может найти родительские контроли в интерфейсе приложения, лучше временно поставить "None" для обоих пунктов и объяснить в ответе, что родительское согласие получается через email-верификацию (это валидный метод COPPA).

---

### 2. **App Information → Privacy Policy URL** (ОБЯЗАТЕЛЬНО!)

**Что проверить:**
- Зайдите в **App Store Connect → Ваше приложение → App Information**
- Убедитесь, что указан **Privacy Policy URL:**
  - Английская версия: `https://hockey-stars.com/privacy-en.html`
  - Или русская версия: `https://hockey-stars.com/rules.html`
  
**Важно:** URL должен быть доступен и работать. Проверьте, что страница открывается.

---

### 3. **App Privacy → Data Types** (ВАЖНО!)

**Что проверить:**
- Зайдите в **App Store Connect → Ваше приложение → App Privacy**
- Убедитесь, что указаны все типы данных, которые собирает приложение:

**Обязательно должны быть указаны:**
- ✅ **Photos or Videos** (Photo Library)
  - Purpose: "App Functionality" или "Product Personalization"
  - Description: "Used to upload profile photos, team photos, and achievement photos"
  
- ✅ **Audio Data** (Microphone)
  - Purpose: "App Functionality"
  - Description: "Used to measure puck speed by detecting sound"

- ✅ **Camera** (Camera)
  - Purpose: "App Functionality"
  - Description: "Used to measure puck speed by tracking puck movement"

- ✅ **User Content** (Messages, Posts, etc.)
  - Purpose: "App Functionality"
  - Description: "User-generated content such as messages, photos, videos"

- ✅ **Contact Info** (Phone Number, Email)
  - Purpose: "App Functionality"
  - Description: "Used for user registration and account management"

- ✅ **Identifiers** (User ID)
  - Purpose: "App Functionality"
  - Description: "Used to identify users and manage accounts"

**Если что-то не указано - добавьте!**

---

### 4. **App Privacy → Data Collection Practices** (ПРОВЕРИТЬ!)

**Что проверить:**
- Убедитесь, что для каждого типа данных указано:
  - ✅ Собирается ли эта информация
  - ✅ Используется ли для отслеживания (tracking)
  - ✅ Связана ли с пользователем
  - ✅ Используется ли для рекламы

**Важно:** Если вы не используете данные для рекламы или отслеживания, убедитесь, что это правильно указано.

---

### 5. **App Information → Support URL** (ПРОВЕРИТЬ!)

**Что проверить:**
- Убедитесь, что указан **Support URL:**
  - Например: `https://hockey-stars.com/contact.html`
  - Или email: `support@hockeystars.app`

---

### 6. **App Information → Marketing URL** (ОПЦИОНАЛЬНО)

**Что проверить:**
- Если есть маркетинговый сайт, укажите его
- Например: `https://hockey-stars.com`

---

## 📝 Что НЕ нужно менять в App Store Connect:

- ❌ **Version Number** - не меняйте, если не выпускаете новую версию
- ❌ **Build Number** - не меняйте, если не загружаете новую сборку
- ❌ **App Description** - не нужно менять, если Apple не просил
- ❌ **Screenshots** - не нужно менять, если Apple не просил
- ❌ **Keywords** - не нужно менять, если Apple не просил

---

## 🎯 Приоритет проверки:

1. **ВЫСОКИЙ ПРИОРИТЕТ:**
   - ✅ Age Rating (Parental Controls / Age Assurance)
   - ✅ Privacy Policy URL
   - ✅ App Privacy → Data Types (особенно Photo Library)

2. **СРЕДНИЙ ПРИОРИТЕТ:**
   - ✅ App Privacy → Data Collection Practices
   - ✅ Support URL

3. **НИЗКИЙ ПРИОРИТЕТ:**
   - ✅ Marketing URL

---

## ⚠️ Важно:

После внесения изменений в App Store Connect:
1. Сохраните все изменения
2. Дождитесь, пока изменения применятся (может занять несколько минут)
3. Создайте новую сборку приложения с исправлениями в коде
4. Отправьте новую сборку на ревью вместе с ответом Apple (из файла `APPLE_REVIEW_RESPONSE.md`)

---

## 📧 Ответ Apple:

После проверки всех настроек, скопируйте содержимое файла `APPLE_REVIEW_RESPONSE.md` в ответ на замечания Apple в App Store Connect.








