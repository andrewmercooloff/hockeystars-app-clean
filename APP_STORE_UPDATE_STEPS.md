# Шаги после сборки для обновления в App Store

## ✅ Что происходит автоматически:

С флагом `--auto-submit`:
1. ✅ Сборка создается в EAS
2. ✅ После завершения сборка **автоматически отправляется в TestFlight**
3. ✅ Сборка появляется в App Store Connect → TestFlight

## 📱 Что нужно сделать ВРУЧНУЮ в App Store Connect:

### Шаг 1: Дождаться завершения сборки
- Проверьте статус: https://expo.dev/accounts/[ваш-аккаунт]/projects/[ваш-проект]/builds
- Или через команду: `eas build:list --platform ios`
- Сборка должна быть в статусе "Finished"

### Шаг 2: Проверить TestFlight (автоматически)
- Зайдите в App Store Connect: https://appstoreconnect.apple.com
- Перейдите: **Мои приложения → HockeyStars → TestFlight**
- Сборка должна появиться автоматически (благодаря `--auto-submit`)
- Дождитесь обработки Apple (обычно 10-30 минут)

### Шаг 3: Отправить на ревью в App Store (ВРУЧНУЮ)

**Важно:** `--auto-submit` отправляет только в TestFlight, НЕ в App Store!

1. **Зайдите в App Store Connect:**
   - https://appstoreconnect.apple.com
   - **Мои приложения → HockeyStars**

2. **Создайте новую версию:**
   - Нажмите на версию приложения (например, "1.0.5")
   - Или нажмите "+ Version or Platform" если версии еще нет

3. **Выберите сборку:**
   - В разделе "Build" нажмите "+"
   - Выберите новую сборку (версия 1.0.5)
   - Если сборки нет в списке, подождите 10-30 минут (Apple обрабатывает)

4. **Заполните информацию (если требуется):**
   - Для patch версии обычно ничего менять не нужно
   - Можно оставить описание пустым или написать: "Bug fixes and improvements"

5. **Отправьте на ревью:**
   - Нажмите "Submit for Review" (вверху справа)
   - Подтвердите отправку

6. **Опционально - Expedited Review:**
   - При отправке на ревью можно выбрать "Expedited Review"
   - Объяснение: "Critical bug fix - SMS verification codes not being delivered to new users"
   - Может ускорить до 24 часов

## ⏱️ Временные рамки:

- **Сборка:** 20-40 минут
- **Обработка Apple (TestFlight):** 10-30 минут
- **Ревью (patch версия):** 1-3 дня
- **С Expedited Review:** 24 часа

## 📝 Чеклист:

- [ ] Сборка завершена (статус "Finished")
- [ ] Сборка появилась в TestFlight
- [ ] Создана новая версия в App Store Connect
- [ ] Выбрана новая сборка
- [ ] Отправлено на ревью
- [ ] (Опционально) Запрошен Expedited Review

## 🔗 Полезные ссылки:

- **App Store Connect:** https://appstoreconnect.apple.com/apps/6753738837
- **TestFlight:** https://appstoreconnect.apple.com/apps/6753738837/testflight/ios
- **Статус сборок EAS:** https://expo.dev/accounts/[ваш-аккаунт]/projects/[ваш-проект]/builds


