# 🌍 Руководство по добавлению новых языков

## 📊 Текущее состояние

У вас есть **централизованная система переводов** с отличной архитектурой:

- ✅ **1,585 уникальных ключей перевода**
- ✅ **Централизованное хранение** в `locales/*.json`
- ✅ **Вложенная структура** ключей (например, `exercises.details.title`)
- ✅ **Интерполяция переменных** `{variable}`
- ✅ **Автоматические предупреждения** о недостающих переводах

## 🚀 Быстрое добавление нового языка

### Вариант 1: Автоматический (рекомендуется)

```bash
# 1. Анализируем текущие переводы
node analyze_translations.js

# 2. Добавляем новый язык (например, немецкий)
node add_new_language.js de "German"

# 3. Переводим файл locales/de.json
# (можно использовать Google Translate, ChatGPT или профессионального переводчика)
```

### Вариант 2: Массовый перевод через CSV

```bash
# 1. Создаем CSV файл для переводчика
node auto_translate_helper.js csv de

# 2. Открываем translation_de.csv в Google Sheets
# 3. Заполняем колонку "Translation"
# 4. Импортируем обратно
node auto_translate_helper.js import translation_de_filled.csv de
```

## 🛠️ Что происходит автоматически

При запуске `node add_new_language.js [код] [название]`:

1. **Создается файл** `locales/[код].json` со всеми ключами
2. **Обновляется** `contexts/LanguageContext.tsx`
3. **Добавляется тип** в `Language = 'ru' | 'en' | 'de'`
4. **Создается файл** для переводчика

## 📁 Структура файлов переводов

```
locales/
├── ru.json          # Русский (1,380 ключей)
├── en.json          # Английский (1,476 ключей)
└── de.json          # Немецкий (будет создан)
```

## 🔧 Техническая реализация

### LanguageContext.tsx
```typescript
// Автоматически обновляется при добавлении языка
import ruTranslations from '../locales/ru.json';
import enTranslations from '../locales/en.json';
import deTranslations from '../locales/de.json'; // Добавится автоматически

export type Language = 'ru' | 'en' | 'de'; // Обновится автоматически

const translations = {
  ru: ruTranslations,
  en: enTranslations,
  de: deTranslations, // Добавится автоматически
};
```

### Использование в компонентах
```typescript
const { t } = useLanguage();

// Простой перевод
<Text>{t('common.save')}</Text>

// С переменными
<Text>{t('notifications.friendRequest', { playerName: 'Иван' })}</Text>

// Вложенные ключи
<Text>{t('exercises.details.category')}</Text>
```

## 📋 Примеры добавления популярных языков

```bash
# Немецкий
node add_new_language.js de "German"

# Французский
node add_new_language.js fr "French"

# Испанский
node add_new_language.js es "Spanish"

# Итальянский
node add_new_language.js it "Italian"

# Польский
node add_new_language.js pl "Polish"

# Украинский
node add_new_language.js uk "Ukrainian"

# Белорусский
node add_new_language.js be "Belarusian"
```

## 💡 Советы по переводу

### 1. Используйте AI для первичного перевода
```bash
# Создайте базовый перевод с помощью ChatGPT:
# "Переведи этот JSON файл на немецкий язык, сохранив структуру"
```

### 2. Обратите внимание на контекст
- `common.save` = "Сохранить" (кнопка)
- `profile.save` = "Сохранить профиль" (специфичный контекст)

### 3. Интерполяция переменных
```json
{
  "notifications.friendRequest": "Заявка в друзья от {playerName}",
  "exercises.canRetryIn": "Можно повторить через {hours} часов"
}
```

### 4. Массивы и множественные формы
```json
{
  "exercises.benefits": [
    "Улучшает выносливость",
    "Развивает координацию"
  ]
}
```

## 🔍 Проверка качества переводов

После добавления нового языка:

1. **Запустите приложение** и переключите язык
2. **Проверьте консоль** на предупреждения о недостающих переводах
3. **Протестируйте основные экраны**: профиль, упражнения, уведомления
4. **Проверьте длину текстов** - некоторые языки длиннее других

## 🚨 Частые ошибки

### ❌ Неправильно
```json
{
  "exercises.details.title": "Übung Details" // Пропущен ключ
}
```

### ✅ Правильно
```json
{
  "exercises": {
    "details": {
      "title": "Übung Details"
    }
  }
}
```

## 📞 Поддержка

Если что-то пошло не так:

1. Проверьте консоль на ошибки
2. Запустите `node analyze_translations.js` для диагностики
3. Убедитесь, что JSON файлы валидны
4. Перезапустите Metro bundler: `npx expo start --clear`

---

**🎉 Ваша система переводов готова к масштабированию на любое количество языков!**
