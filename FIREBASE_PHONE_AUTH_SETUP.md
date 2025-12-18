# 🔥 Настройка Firebase Phone Auth для HockeyStars

## ✅ Что уже сделано:

1. **Установлены пакеты:**
   - `@react-native-firebase/app`
   - `@react-native-firebase/auth`

2. **Код переписан:**
   - `app/login.tsx` - использует `auth().signInWithPhoneNumber()`
   - `app/register.tsx` - использует `auth().signInWithPhoneNumber()`
   - Убран устаревший `expo-firebase-recaptcha`

3. **Добавлены плагины в `app.json`:**
   - `@react-native-firebase/app`
   - `@react-native-firebase/auth`

---

## 📋 Что нужно сделать в Firebase Console:

### 1. Включить Phone Auth

1. Открой [Firebase Console](https://console.firebase.google.com)
2. Выбери проект **hockeystars-app**
3. Перейди в **Authentication** → **Sign-in method**
4. Нажми на **Phone**
5. Включи переключатель **Enable**
6. Нажми **Save**

### 2. Добавить iOS приложение (если еще не добавлено)

1. В Firebase Console → **Project settings** → **General**
2. Прокрути вниз до секции **Your apps**
3. Если iOS приложения нет, нажми **Add app** → **iOS**
4. Введи:
   - **Bundle ID**: `by.hockeystars.app`
   - **App nickname**: HockeyStars iOS (опционально)
5. Нажми **Register app**
6. **Скачай** `GoogleService-Info.plist`
7. Помести его в папку `ios/` (если используешь bare workflow) или добавь через `app.json` (для managed workflow)

### 3. Добавить Android приложение (если еще не добавлено)

1. В Firebase Console → **Project settings** → **General**
2. Прокрути вниз до секции **Your apps**
3. Если Android приложения нет, нажми **Add app** → **Android**
4. Введи:
   - **Package name**: `by.hockeystars.app`
   - **App nickname**: HockeyStars Android (опционально)
5. Нажми **Register app**
6. **Скачай** `google-services.json`
7. Помести его в папку `android/app/` (если используешь bare workflow) или добавь через `app.json` (для managed workflow)

---

## 🔧 Настройка в app.json (для managed workflow)

Если используешь **managed workflow** (Expo Go), добавь конфигурацию Firebase в `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

**Важно:** Файлы `google-services.json` и `GoogleService-Info.plist` должны быть в корне проекта.

---

## 🚀 После настройки:

1. **Перезапусти Expo:**
   ```bash
   npx expo start -c
   ```

2. **Для production билдов:**
   - Создай development build: `eas build --profile development --platform ios`
   - Или production build: `eas build --profile production --platform ios`

3. **Проверь работу:**
   - Попробуй зарегистрироваться с американским номером (`+1...`)
   - SMS должно прийти через Firebase (без ошибок Twilio 21612)

---

## 📝 Как это работает:

### Логин:
1. Пользователь вводит телефон
2. Вызывается `auth().signInWithPhoneNumber(phone)`
3. Firebase отправляет SMS с кодом
4. Пользователь вводит код
5. Вызывается `confirmation.confirm(code)`
6. После успешной верификации ищем пользователя в Supabase и логиним

### Регистрация:
1. Пользователь заполняет форму
2. Вызывается `auth().signInWithPhoneNumber(phone)`
3. Firebase отправляет SMS с кодом
4. Пользователь вводит код
5. Вызывается `confirmation.confirm(code)`
6. После успешной верификации создаем пользователя в Supabase

### Bypass режимы:
- Номера с `######` - пропускают Firebase проверку
- Код `291019` - универсальный код для App Store ревьюеров

---

## ⚠️ Важно:

- **Firebase Phone Auth работает во всех странах**, включая США, без необходимости регистрации A2P 10DLC
- **Бесплатный лимит**: 10,000 SMS/месяц на Spark плане
- **После лимита**: $0.06 за SMS (но это очень много для начала)

---

## 🔍 Проверка:

После настройки в логах должно быть:
- ✅ `📱 Отправляем код через Firebase Phone Auth`
- ❌ НЕ должно быть `📱 Отправляем SMS через Twilio API` (для логина/регистрации)

---

## 📚 Полезные ссылки:

- [React Native Firebase Auth](https://rnfirebase.io/auth/phone-auth)
- [Firebase Phone Auth Setup](https://firebase.google.com/docs/auth/web/phone-auth)




















