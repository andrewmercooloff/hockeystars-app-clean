# Инструкция по созданию Favicon с темным фоном

## 📋 Что нужно сделать

Создайте favicon с логотипом на темном фоне (#050008) для всех устройств.

## 🎨 Размеры изображений

Нужно создать следующие файлы в корне сайта (`website/`):

1. **favicon-16x16.png** - 16x16 пикселей
2. **favicon-32x32.png** - 32x32 пикселей  
3. **apple-touch-icon.png** - 180x180 пикселей (для iOS)
4. **android-chrome-192x192.png** - 192x192 пикселей (для Android)
5. **android-chrome-512x512.png** - 512x512 пикселей (для Android)

## 🛠️ Как создать

### Вариант 1: Онлайн-генератор (рекомендуется)

1. Откройте https://realfavicongenerator.net/
2. Загрузите ваш `logo.png`
3. В настройках:
   - **Background color**: `#050008` (темный фон)
   - **Theme color**: `#050008`
   - Включите опцию "Add padding" для лучшего отображения
4. Скачайте все файлы
5. Загрузите их в корень сайта

### Вариант 2: Photoshop/GIMP

1. Откройте `logo.png`
2. Создайте новый файл с нужным размером (например, 180x180 для iOS)
3. Залейте фон цветом `#050008`
4. Вставьте логотип по центру (с отступами)
5. Сохраните как PNG
6. Повторите для всех размеров

### Вариант 3: Используя ImageMagick (командная строка)

```bash
# Создаем favicon с темным фоном из logo.png
convert logo.png -background "#050008" -gravity center -extent 180x180 apple-touch-icon.png
convert logo.png -background "#050008" -gravity center -extent 192x192 android-chrome-192x192.png
convert logo.png -background "#050008" -gravity center -extent 512x512 android-chrome-512x512.png
convert logo.png -background "#050008" -gravity center -extent 32x32 favicon-32x32.png
convert logo.png -background "#050008" -gravity center -extent 16x16 favicon-16x16.png
```

## ✅ Что уже сделано

- ✅ Обновлен `index.html` с правильными ссылками на favicon
- ✅ Создан `site.webmanifest` для Android
- ✅ Добавлены meta-теги для iOS и Windows

## 📤 После создания

Загрузите все созданные файлы в корень сайта `hockey-stars.com`:
- favicon-16x16.png
- favicon-32x32.png
- apple-touch-icon.png
- android-chrome-192x192.png
- android-chrome-512x512.png
- site.webmanifest (уже создан)

## 🧪 Проверка

После загрузки проверьте:
1. Откройте сайт в браузере - должна появиться новая иконка
2. Добавьте сайт на главный экран iOS - должна появиться иконка с темным фоном
3. Добавьте сайт на главный экран Android - должна появиться иконка с темным фоном

