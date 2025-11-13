# Быстрый старт: Сборка для TestFlight

## 🚀 Быстрая инструкция

### Шаг 1: Подготовка
```bash
# Windows
prepare-testflight.bat

# macOS/Linux  
chmod +x prepare-testflight.sh
./prepare-testflight.sh
```

### Шаг 2: Проверка
- [ ] Открой `PRE_TESTFLIGHT_CHECKLIST.md` и проверь все пункты
- [ ] Запусти `npm start` и протестируй на реальном устройстве
- [ ] Убедись, что все работает (главная страница, аудио-радар)

### Шаг 3: Сборка
```bash
# Сборка production версии
eas build --platform ios --profile production --clear-cache
```

### Шаг 4: Загрузка в TestFlight
```bash
# После успешной сборки
eas submit --platform ios --profile production
```

## 📋 Текущая конфигурация

- **Версия:** 1.0.1
- **Runtime Version:** 1.0.1
- **Bundle ID:** by.hockeystars.app
- **Build Number:** Автоматически увеличивается (`autoIncrement: true`)

## ⚠️ Важно перед сборкой

1. **Протестируй локально** - если не работает в development, не будет работать и в production
2. **Проверь зависимости** - все должны быть установлены
3. **Проверь разрешения** - микрофон и камера должны быть указаны
4. **Закоммить изменения** - все должно быть в git

## 📚 Дополнительная информация

- **Полный чеклист:** `PRE_TESTFLIGHT_CHECKLIST.md`
- **Руководство по сборке:** `TESTFLIGHT_BUILD_GUIDE.md`
- **Решение проблем:** См. раздел "Конкретные исправления" в `TESTFLIGHT_BUILD_GUIDE.md`

## 🔧 Если что-то пошло не так

1. Проверь логи сборки в EAS Dashboard
2. Проверь логи в TestFlight (Xcode Console)
3. Сравни с предыдущей рабочей версией
4. Используй `TESTFLIGHT_BUILD_GUIDE.md` для решения проблем

