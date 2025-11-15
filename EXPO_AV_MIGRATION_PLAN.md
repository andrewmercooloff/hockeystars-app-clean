# План миграции с expo-av на expo-audio/expo-video

## ⚠️ Важно

**Предупреждение:** `expo-av` будет удален в SDK 54 (или в следующей версии после 54). Сейчас используется Expo SDK 54, поэтому нужно подготовиться к миграции.

## 📋 Текущее использование expo-av

### 1. `utils/soundService.ts`
- **Использование:** Воспроизведение звуков сообщений и уведомлений
- **API:** `Audio.Sound`, `Audio.setAudioModeAsync`
- **Замена:** `expo-audio` (пакет `expo-audio`)

### 2. `app/puck-speed-sound.tsx`
- **Использование:** Запись аудио с метерингом для измерения скорости шайбы
- **API:** `Audio.Recording`, `Audio.Recording.createAsync`, метеринг
- **Замена:** `expo-audio` (пакет `expo-audio`)

## 🔄 План миграции

### Шаг 1: Установка новых пакетов

```bash
npx expo install expo-audio
# Если используется видео (проверить):
# npx expo install expo-video
```

### Шаг 2: Миграция soundService.ts

**Было (expo-av):**
```typescript
import { Audio } from 'expo-av';
await Audio.setAudioModeAsync({...});
const { sound } = await Audio.Sound.createAsync(...);
```

**Станет (expo-audio):**
```typescript
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
// Использовать useAudioPlayer hook или AudioPlayer API
```

### Шаг 3: Миграция puck-speed-sound.tsx

**Было (expo-av):**
```typescript
import { Audio } from 'expo-av';
const { recording } = await Audio.Recording.createAsync({
  isMeteringEnabled: true,
  ...
});
```

**Станет (expo-audio):**
```typescript
import { AudioRecorder } from 'expo-audio';
// Использовать AudioRecorder API
```

## ⏰ Когда мигрировать?

### Вариант 1: Миграция сейчас (рекомендуется)
- ✅ Предотвращает проблемы в будущем
- ✅ Использует современные API
- ⚠️ Требует тестирования

### Вариант 2: Отложить до SDK 55
- ✅ expo-av еще работает в SDK 54
- ⚠️ Придется мигрировать позже
- ⚠️ Может быть срочно при обновлении SDK

## 🎯 Рекомендация

**Мигрировать сейчас**, так как:
1. SDK 54 уже использует expo-av (может быть удален в следующей версии)
2. Лучше мигрировать постепенно, чем срочно
3. Новые пакеты более оптимизированы

## 📝 Чеклист миграции

- [ ] Установить `expo-audio`
- [ ] Мигрировать `utils/soundService.ts`
- [ ] Мигрировать `app/puck-speed-sound.tsx`
- [ ] Протестировать воспроизведение звуков
- [ ] Протестировать запись аудио с метерингом
- [ ] Удалить `expo-av` из `package.json`
- [ ] Обновить `app.json` (убрать плагин expo-av)

## 🔗 Полезные ссылки

- [expo-audio документация](https://docs.expo.dev/versions/latest/sdk/audio/)
- [expo-video документация](https://docs.expo.dev/versions/latest/sdk/video/)
- [Миграция с expo-av](https://docs.expo.dev/versions/latest/sdk/audio/#migrating-from-expo-av)

