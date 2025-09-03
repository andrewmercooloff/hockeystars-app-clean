# 🔧 Настройка Git для проекта HockeyStars

## 📥 Установка Git

### Для Windows:
1. Скачайте Git с официального сайта: https://git-scm.com/download/win
2. Запустите установщик и следуйте инструкциям
3. Перезапустите командную строку после установки

### Проверка установки:
```bash
git --version
```

## 🚀 Инициализация Git репозитория

### Шаг 1: Инициализация
```bash
cd C:\hockeystars-app\instead
git init
```

### Шаг 2: Настройка пользователя
```bash
git config --global user.name "Ваше Имя"
git config --global user.email "ваш.email@example.com"
```

### Шаг 3: Первый коммит
```bash
git add .
git commit -m "Инициализация проекта HockeyStars"
```

## 📤 Создание резервной копии на GitHub

### Шаг 1: Создайте репозиторий на GitHub
1. Зайдите на https://github.com
2. Нажмите "New repository"
3. Назовите репозиторий: `hockeystars-app`
4. Оставьте его публичным или приватным
5. НЕ создавайте README (у нас уже есть)

### Шаг 2: Подключите локальный репозиторий
```bash
git remote add origin https://github.com/ваш-username/hockeystars-app.git
git branch -M main
git push -u origin main
```

## 🔄 Ежедневная работа с Git

### Сохранение изменений:
```bash
git add .
git commit -m "Описание изменений"
git push
```

### Проверка статуса:
```bash
git status
```

### Просмотр истории:
```bash
git log --oneline
```

## 🛡️ Дополнительная безопасность

### Создание резервной копии на другом сервисе:
- GitLab: https://gitlab.com
- Bitbucket: https://bitbucket.org
- Gitea: https://gitea.io

### Автоматическое резервное копирование:
```bash
# Создайте скрипт для автоматического бэкапа
echo "git add . && git commit -m 'Автоматический бэкап $(date)' && git push" > backup.bat
```

## 📋 Чек-лист безопасности

- [ ] Git установлен и настроен
- [ ] Репозиторий инициализирован
- [ ] Первый коммит создан
- [ ] Резервная копия на GitHub создана
- [ ] .gitignore настроен
- [ ] README.md создан

## 🆘 Если что-то пошло не так

### Восстановление из резервной копии:
```bash
git clone https://github.com/ваш-username/hockeystars-app.git
cd hockeystars-app
npm install
npm start
```

### Сброс к последнему коммиту:
```bash
git reset --hard HEAD
```

### Просмотр изменений:
```bash
git diff
```

---

**Важно:** Регулярно делайте коммиты и пушите изменения на GitHub для безопасности ваших данных! 🛡️ 