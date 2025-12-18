# Как отправить сборку из TestFlight в App Store

## 📍 Текущая ситуация:
✅ Сборка уже загружена в TestFlight  
❓ Нужно отправить её на финальный App Store review

## 🎯 Пошаговая инструкция:

### Шаг 1: Войдите в App Store Connect

1. Откройте https://appstoreconnect.apple.com
2. Войдите в свой аккаунт
3. Нажмите **"Мои приложения"** (My Apps) в верхнем меню

### Шаг 2: Выберите приложение HockeyStars

1. Найдите и нажмите на **"HockeyStars"** в списке приложений
2. Вы попадете на главную страницу приложения

### Шаг 3: Перейдите в раздел App Store

**Важно:** НЕ в TestFlight, а в раздел **"App Store"**!

1. В левом боковом меню найдите раздел **"App Store"**
2. Нажмите на него
3. Вы увидите текущую версию приложения (например, "1.0.5")

### Шаг 4: Создайте новую версию или выберите существующую

**Вариант А: Если версия 1.0.6 уже существует:**
- Просто нажмите на версию **"1.0.6"** в списке

**Вариант Б: Если версии 1.0.6 еще нет:**
1. Нажмите кнопку **"+ Version or Platform"** (справа вверху)
2. Введите номер версии: **1.0.6**
3. Нажмите **"Create"**

### Шаг 5: Выберите сборку (Build)

1. Прокрутите страницу вниз до раздела **"Build"**
2. Нажмите на кнопку **"+"** рядом с "Build" (или "Select a build before you submit your app")
3. В появившемся списке найдите вашу новую сборку (версия 1.0.6)
4. Если сборки нет в списке:
   - Подождите 10-30 минут (Apple обрабатывает сборку из TestFlight)
   - Обновите страницу (F5)
   - Проверьте, что сборка обработана в TestFlight (статус "Ready to Submit")

### Шаг 6: Заполните информацию о версии (опционально)

1. Прокрутите до раздела **"What's New in This Version"**
2. Заполните описание изменений (можно на русском или английском):
   ```
   Bug fixes:
   - Fixed issue where messages didn't appear in chat after receiving push notifications
   - Improved message loading when opening chat
   ```
3. Или просто оставьте предыдущее описание

### Шаг 7: Проверьте все разделы

Убедитесь, что все разделы заполнены (обычно для patch версии ничего менять не нужно):
- ✅ App Information
- ✅ Pricing and Availability
- ✅ Version Information
- ✅ App Store Review Information
- ✅ Version Release

### Шаг 8: Отправьте на ревью

1. Нажмите кнопку **"Submit for Review"** (вверху справа, синяя кнопка)
2. Появится форма с вопросами:
   - **Export Compliance:** Обычно выбирайте "No" (если не используете шифрование)
   - **Advertising Identifier:** Обычно "No"
   - **Content Rights:** Обычно "Yes" (если у вас есть права на контент)
3. Нажмите **"Submit"**

### Шаг 9: (Опционально) Запросите Expedited Review

Если это критический багфикс, можно запросить ускоренный review:

1. После отправки нажмите **"Request Expedited Review"**
2. Заполните форму:
   - **Reason:** "Critical bug fix"
   - **Explanation:** 
     ```
     This is a critical bug fix that resolves an issue where users couldn't see messages in chat after receiving push notifications. Users had to restart the app to see new messages. This update fixes the message loading logic to ensure messages are always displayed when opening a chat.
     ```
3. Нажмите **"Submit"**

## 📊 Статусы после отправки:

- **Waiting for Review** - ожидает проверки (1-3 дня для patch версии)
- **In Review** - проверяется Apple
- **Ready for Sale** - одобрено и опубликовано
- **Rejected** - отклонено (нужно исправить и отправить заново)

## 🔍 Где найти раздел App Store:

Если не можете найти:
1. В App Store Connect нажмите **"Мои приложения"** (My Apps)
2. Выберите **"HockeyStars"**
3. В левом меню найдите **"App Store"** (НЕ TestFlight!)
4. Под разделом "App Store" будет подраздел с версиями

## ⚠️ Важно:

- **TestFlight** - это для тестирования (бета-версии)
- **App Store** - это для финальной публикации
- Сборка должна быть обработана Apple (статус "Ready to Submit" в TestFlight)
- Обычно это занимает 10-30 минут после загрузки в TestFlight

## 🔗 Прямые ссылки:

- **App Store Connect (HockeyStars):** https://appstoreconnect.apple.com/apps/6753738837
- **App Store раздел:** https://appstoreconnect.apple.com/apps/6753738837/appstore
- **TestFlight:** https://appstoreconnect.apple.com/apps/6753738837/testflight/ios

## 💡 Если не видите кнопку "Submit for Review":

1. Проверьте, что выбрана сборка в разделе "Build"
2. Убедитесь, что все обязательные поля заполнены
3. Проверьте, что сборка обработана (статус "Ready to Submit" в TestFlight)
4. Обновите страницу (F5)

## ⏱️ Время ожидания:

- **Обработка сборки Apple:** 10-30 минут
- **Обычный review:** 1-3 дня (patch версия)
- **Expedited Review:** 24-48 часов
















