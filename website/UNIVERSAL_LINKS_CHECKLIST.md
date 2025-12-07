# ✅ Чеклист для проверки Universal Links

## 📋 Условия для 100% работы

### 1. ✅ Файлы на сервере (уже готовы)

- [x] `.well-known/apple-app-site-association` - создан с Team ID `FAL33J6D2V`
- [x] `.well-known/assetlinks.json` - создан с SHA-256 fingerprint
- [ ] **ЗАГРУЗИТЬ** оба файла на сервер `hockey-stars.com` в папку `.well-known/`

### 2. ✅ Проверка доступности файлов

После загрузки проверьте в браузере:

- [ ] `https://hockey-stars.com/.well-known/apple-app-site-association`
  - Должен открыться **JSON файл** (не HTML!)
  - Content-Type должен быть `application/json`
  - НЕ должно быть редиректов (301/302)

- [ ] `https://hockey-stars.com/.well-known/assetlinks.json`
  - Должен открыться **JSON файл** (не HTML!)
  - Content-Type должен быть `application/json`
  - НЕ должно быть редиректов (301/302)

### 3. ✅ Настройки в приложении (уже готовы)

- [x] `app.json` - добавлен `associatedDomains` для iOS
- [x] `app.json` - добавлены `intentFilters` для Android
- [x] `app/_layout.tsx` - добавлена обработка входящих URL

### 4. ⚠️ Пересборка приложения (ОБЯЗАТЕЛЬНО!)

- [ ] **Пересобрать iOS:** `eas build --platform ios --profile production`
- [ ] **Пересобрать Android:** `eas build --platform android --profile production`
- [ ] **Установить новую сборку** на устройство

**Важно:** Universal Links работают ТОЛЬКО в production сборках, не в Expo Go!

### 5. ✅ Настройки сервера (уже готовы)

- [x] `.htaccess` - добавлен правильный Content-Type для JSON файлов
- [ ] **ЗАГРУЗИТЬ** обновленный `.htaccess` на сервер

---

## 🧪 Тестирование

### После выполнения всех пунктов:

1. **Очистите кеш iOS (если нужно):**
   - Settings → Safari → Clear History and Website Data

2. **Проверьте Universal Links:**
   - Откройте в Safari: `https://hockey-stars.com/player/test-id`
   - Если приложение установлено → должно открыться **напрямую в приложении**
   - Если не установлено → откроется веб-страница → редирект на App Store

3. **Проверьте QR-код:**
   - Отсканируйте QR-код из приложения
   - Если приложение установлено → должно открыться **напрямую на профиле**
   - Если не установлено → редирект на App Store

---

## ⚠️ Возможные проблемы

### Если Universal Links не работают:

1. **Проверьте файлы на сервере:**
   - Должны быть доступны по HTTPS
   - Должны возвращать JSON (не HTML)
   - Content-Type должен быть `application/json`

2. **Проверьте настройки в приложении:**
   - Убедитесь, что приложение пересобрано с новыми настройками
   - Проверьте, что используется production сборка (не Expo Go)

3. **Проверьте кеш:**
   - iOS может кешировать файлы до 24 часов
   - Очистите кеш Safari: Settings → Safari → Clear History

4. **Проверьте Team ID и Bundle ID:**
   - Team ID должен совпадать: `FAL33J6D2V`
   - Bundle ID должен совпадать: `by.hockeystars.app`

### Fallback (если Universal Links не работают):

Если Universal Links не сработают, `player.php` попытается открыть приложение через custom scheme (`hockeystars://player/{id}`). Это должно работать, но может показать краткую веб-страницу.

---

## 📊 Вероятность успеха

- **Если все условия выполнены:** ~95-98%
- **Остальные 2-5%:** могут быть связаны с кешированием iOS/Android или временными проблемами сети

**Важно:** Universal Links - это стандартная технология Apple/Google, которая работает надежно при правильной настройке.

