# 🔍 Отладка загрузки аватаров

## ❌ Проблема

Когда вы загружаете новый аватар в приложении, он становится пустым на других устройствах.

## 🔍 Диагностика

### Шаг 1: Проверьте логи в консоли

При загрузке нового аватара в приложении проверьте логи в консоли:

1. **Откройте консоль разработчика** в приложении
2. **Загрузите новый аватар**
3. **Найдите логи** с префиксами:
   - `📤 Начинаем загрузку изображения в Supabase Storage...`
   - `✅ Изображение загружено:`
   - `❌ Ошибка загрузки в Storage:`

### Шаг 2: Проверьте, что происходит

**Если видите логи загрузки:**
- ✅ Функция `uploadImageToStorage` вызывается
- Проверьте, возвращает ли она URL или `null`

**Если НЕ видите логи загрузки:**
- ❌ Функция `uploadImageToStorage` не вызывается
- Проблема в коде приложения

## 🔧 Возможные решения

### Решение 1: Принудительная загрузка в Storage

Если функция не вызывается, добавьте принудительную загрузку в `profile.tsx`:

```typescript
const pickFromGallery = async () => {
  if (!currentUser) {
    Alert.alert('Ошибка', 'Пользователь не найден');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    console.log('📸 Фото загружено из галереи:', result.assets[0].uri);
    
    // ПРИНУДИТЕЛЬНО загружаем в Storage
    try {
      const { uploadImageToStorage } = await import('../utils/uploadImage');
      const uploadedUrl = await uploadImageToStorage(result.assets[0].uri);
      
      if (uploadedUrl) {
        console.log('✅ Изображение загружено в Storage:', uploadedUrl);
        setEditData({...editData, avatar: uploadedUrl});
        setCurrentUser({...currentUser, avatar: uploadedUrl});
        
        // Сохраняем в базу данных
        const updatedUser = { ...currentUser, avatar: uploadedUrl };
        await updatePlayer(currentUser.id, updatedUser);
        await saveCurrentUser(updatedUser);
        
        showAlert('Успешно', 'Фото загружено и сохранено', 'success');
      } else {
        console.error('❌ Не удалось загрузить в Storage');
        showAlert('Ошибка', 'Не удалось загрузить фото в облако', 'error');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      showAlert('Ошибка', 'Ошибка при загрузке фото', 'error');
    }
  }
};
```

### Решение 2: Проверка bucket

Убедитесь, что bucket `avatars` существует и доступен:

```sql
-- Выполните в SQL Editor в Supabase Dashboard
SELECT * FROM storage.buckets WHERE name = 'avatars';
```

### Решение 3: Проверка политик

Убедитесь, что политики доступа настроены правильно:

```sql
-- Выполните в SQL Editor в Supabase Dashboard
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## 📋 Чек-лист отладки

- [ ] Проверьте логи в консоли при загрузке аватара
- [ ] Убедитесь, что bucket `avatars` существует
- [ ] Проверьте политики доступа к Storage
- [ ] Убедитесь, что функция `uploadImageToStorage` вызывается
- [ ] Проверьте, что функция возвращает URL, а не `null`
- [ ] Убедитесь, что URL сохраняется в базе данных

## 🎯 Ожидаемый результат

После исправления:
- ✅ Новые аватары загружаются в Supabase Storage
- ✅ URL сохраняется в базе данных
- ✅ Аватары синхронизируются между устройствами
- ✅ Изображения отображаются на всех платформах

## 📞 Поддержка

Если проблема остается:
- Предоставьте логи из консоли при загрузке аватара
- Укажите, на каком этапе происходит ошибка
- Предоставьте скриншот ошибок 