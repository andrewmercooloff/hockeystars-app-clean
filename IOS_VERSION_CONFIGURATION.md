# 📱 Настройка минимальной версии iOS

## Где установить совместимость с нужной версией iOS?

Есть **два места**, где нужно/можно указать минимальную версию iOS:

---

## 1️⃣ В коде проекта (`app.json`)

### Текущая ситуация:
- **Expo SDK 54** требует минимум **iOS 15.1+**
- В вашем `app.json` **нет явного указания** `deploymentTarget`
- По умолчанию используется значение из Expo SDK (iOS 15.1)

### Как явно указать минимальную версию:

#### Шаг 1: Установите плагин `expo-build-properties`

```bash
npx expo install expo-build-properties
```

#### Шаг 2: Добавьте плагин в `app.json`

Добавьте в секцию `"plugins"` в `app.json`:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-web-browser",
      "expo-splash-screen",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "15.1"
          }
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/ic_notification.png",
          "color": "#fa2f40",
          "defaultChannel": "default",
          "sounds": ["./assets/not.m4a"]
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "This app uses microphone to measure puck speed by detecting sound of puck hitting the net"
        }
      ],
      "expo-audio"
    ]
  }
}
```

#### Шаг 3: После изменений в `app.json`

Если вы используете **managed workflow** (Expo Go), изменения применятся автоматически при следующей сборке.

Если вы используете **bare workflow** или делаете `prebuild`, выполните:

```bash
npx expo prebuild --clean
```

---

## 2️⃣ В App Store Connect

### Где находится:
1. Войдите в [App Store Connect](https://appstoreconnect.apple.com/)
2. Выберите ваше приложение (App ID: 6753738837)
3. Перейдите в раздел **"App Information"** или **"Version Information"**
4. Найдите поле **"Minimum OS Version"** или **"iOS Version"**

### Важно:
- **Минимальная версия iOS определяется автоматически** из build, который вы загружаете
- Вы **не можете изменить** минимальную версию iOS в App Store Connect вручную
- Она устанавливается на основе `deploymentTarget` в вашем проекте

### Где это видно:
- В разделе **"App Information"** → **"General Information"**
- В разделе **"Version Information"** → **"Build"** → при выборе build показывается минимальная версия iOS

---

## 📋 Рекомендуемая конфигурация для HockeyStars:

### Для Expo SDK 54:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "15.1"
          }
        }
      ]
    ]
  }
}
```

### Почему iOS 15.1?
- ✅ **Требование Expo SDK 54** - минимальная версия
- ✅ **Покрывает 95%+ устройств** - отличное покрытие
- ✅ **Современные функции** - доступ к новым API iOS
- ✅ **Безопасность** - поддержка последних обновлений безопасности

---

## 🔧 Пошаговая инструкция:

### Вариант 1: Явно указать в коде (рекомендуется)

1. **Установите плагин:**
   ```bash
   npx expo install expo-build-properties
   ```

2. **Добавьте в `app.json`** (см. пример выше)

3. **Создайте новый build:**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Проверьте в App Store Connect:**
   - Загрузите build
   - Проверьте минимальную версию iOS в разделе "App Information"

### Вариант 2: Оставить по умолчанию

- Если не указывать явно, Expo SDK 54 автоматически установит **iOS 15.1**
- Это уже правильная минимальная версия
- Но **явное указание** делает конфигурацию более понятной

---

## ⚠️ Важные моменты:

### 1. Нельзя поставить версию ниже требования SDK
- Если Expo SDK 54 требует iOS 15.1, вы **не можете** установить iOS 13.0
- Это вызовет ошибки при сборке

### 2. Можно поставить версию выше
- Можно установить iOS 16.0 или 17.0, если нужно
- Но это **уменьшит** количество поддерживаемых устройств

### 3. После изменения нужно пересобрать
- Изменения в `deploymentTarget` требуют **новой сборки**
- Старые builds не обновятся автоматически

---

## 📊 Где проверить текущую версию:

### В коде:
- Проверьте `app.json` → плагин `expo-build-properties`
- Или проверьте `ios/Podfile` (если делали `prebuild`) → `platform :ios, '15.1'`

### В App Store Connect:
1. **App Information** → **General Information** → **Minimum OS Version**
2. **Version Information** → выберите build → посмотрите **iOS Version**

### В build логах:
- При сборке через EAS Build, в логах будет указано:
  ```
  iOS Deployment Target: 15.1
  ```

---

## ✅ Чеклист:

- [ ] Установлен плагин `expo-build-properties` (если хотите явно указать)
- [ ] Добавлен плагин в `app.json` с `deploymentTarget: "15.1"`
- [ ] Создан новый build после изменений
- [ ] Проверена минимальная версия iOS в App Store Connect
- [ ] Убедились, что версия соответствует требованиям (iOS 15.1+)

---

## 💡 Рекомендация:

**Явно укажите `deploymentTarget: "15.1"` в `app.json`** через плагин `expo-build-properties`. Это:
- ✅ Делает конфигурацию явной и понятной
- ✅ Гарантирует правильную версию при сборке
- ✅ Легко изменить в будущем, если понадобится








































