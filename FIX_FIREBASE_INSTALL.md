# 🔧 Исправление проблемы с установкой Firebase

## Проблема
Metro bundler не может найти `firebase/auth`, хотя пакет указан в `package.json`.

## Решение

### Шаг 1: Убедись, что firebase установлен

```bash
npm install firebase@11.0.0 --save
```

### Шаг 2: Очисти кеш и перезапусти Metro

```bash
# Останови Metro (Ctrl+C)

# Очисти кеш
npx expo start -c

# Или полностью очисти
rm -rf node_modules/.cache
rm -rf .expo
npm cache clean --force
npx expo start -c
```

### Шаг 3: Если не помогло - переустанови зависимости

```bash
rm -rf node_modules
rm package-lock.json
npm install
npx expo start -c
```

### Шаг 4: Проверь версию Node.js

Firebase 11 требует Node.js >= 18:
```bash
node --version
```

Если версия < 18, обнови Node.js.

---

## Альтернатива: Используй более старую версию Firebase

Если проблемы продолжаются, можно использовать Firebase 10:

```bash
npm install firebase@10.13.0 --save
npx expo start -c
```

---

## Проверка

После установки проверь:
```bash
npm list firebase
```

Должно показать установленную версию.







