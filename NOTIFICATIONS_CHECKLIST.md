# Чек-лист проверки уведомлений

## Типы уведомлений в приложении:

### 1. ✅ Подарки (gift_received)
- **Где**: `utils/playerStorage.ts` - `sendGiftNotification()`
- **In-app**: ✅ Создается через `supabase.from('notifications').insert()`
- **Counter**: ✅ Инкрементируется через `supabase.rpc('increment_unread_notifications')`
- **Push**: ✅ Отправляется через `sendNotificationToUser()`
- **Друзьям**: ✅ Отправляется друзьям получателя (кроме отправителя)

### 2. ⚠️ Запрос в друзья (friend_request)
- **Где**: `utils/playerStorage.ts` - `sendFriendRequest()`
- **In-app**: ✅ Создается
- **Counter**: ✅ Инкрементируется
- **Push**: ✅ Отправляется
- **Проверить**: Нужно убедиться что все работает

### 3. ⚠️ Принятие дружбы (friendship)
- **Где**: `utils/playerStorage.ts` - `acceptFriendRequest()`
- **In-app**: ❓ Нужно проверить
- **Counter**: ❓ Нужно проверить
- **Push**: ❓ Нужно проверить
- **Друзьям**: ❓ Нужно проверить (друзьям обоих)

### 4. ⚠️ Изменения статистики (stats_change)
- **Где**: `utils/playerStorage.ts` - `notifyFriendsAboutChanges()`
- **In-app**: ✅ Создается
- **Counter**: ✅ Инкрементируется
- **Push**: ❓ Нужно проверить
- **Друзьям**: ✅ Только друзьям

### 5. ⚠️ Изменения физических данных (physical_data_change)
- **Где**: `utils/playerStorage.ts` - `notifyFriendsAboutPhysicalData()`
- **In-app**: ✅ Создается
- **Counter**: ✅ Инкрементируется
- **Push**: ❓ Нужно проверить
- **Друзьям**: ✅ Только друзьям

### 6. ⚠️ Новые фото (photo_added)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓
- **Друзьям**: ❓

### 7. ⚠️ Новые видео (video_added)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓
- **Друзьям**: ❓

### 8. ⚠️ Новые достижения (achievement_added)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓
- **Друзьям**: ❓

### 9. ⚠️ Изменение аватара (avatar_changed)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓
- **Друзьям**: ❓

### 10. ⚠️ Выполнение упражнения (exercise_completed)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓
- **Друзьям**: ❓

### 11. ⚠️ Запрос подарка (gift_request)
- **Где**: `components/ItemRequestButtons.tsx`
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓

### 12. ⚠️ Принятие запроса подарка (gift_accepted)
- **Где**: Нужно найти
- **In-app**: ❓
- **Counter**: ❓
- **Push**: ❓

## Проверка:
- [ ] Все уведомления создают запись в БД
- [ ] Все уведомления инкрементируют счетчик
- [ ] Все уведомления отправляют push
- [ ] Push уведомления локализованы
- [ ] Уведомления друзьям работают корректно


