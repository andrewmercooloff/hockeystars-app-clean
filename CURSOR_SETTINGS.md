# ⚙️ Настройки Cursor для проекта HockeyStars

## 📁 Экспорт настроек

### Шаг 1: Экспорт настроек Cursor
1. Откройте Cursor
2. Перейдите в File → Preferences → Settings
3. Нажмите на иконку шестеренки ⚙️
4. Выберите "Export Settings"
5. Сохраните файл как `cursor-settings.json`

### Шаг 2: Рекомендуемые расширения
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### Шаг 3: Настройки редактора
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000
}
```

## 🔄 Автоматическое сохранение

Cursor автоматически сохраняет:
- ✅ Все изменения в файлах
- ✅ Историю изменений
- ✅ Настройки проекта
- ✅ Открытые вкладки

## 🛡️ Дополнительная защита

### Резервное копирование настроек:
1. Скопируйте папку настроек Cursor
2. Сохраните в облаке (Google Drive, Dropbox)
3. Регулярно обновляйте резервную копию

### Восстановление настроек:
1. Скопируйте файлы настроек обратно
2. Перезапустите Cursor
3. Проверьте, что все работает

---

**Совет:** Регулярно экспортируйте настройки Cursor для быстрого восстановления! 🔧 