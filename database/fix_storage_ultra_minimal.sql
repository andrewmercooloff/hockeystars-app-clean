-- Ультра-минимальное исправление Storage (без проверок)
-- Только создание политик, если Storage существует

-- Создаем политики для avatars (игнорируем ошибки если Storage не настроен)
DO $$
BEGIN
  -- Пытаемся создать политики для avatars
  BEGIN
    DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
    CREATE POLICY "Users can view avatars" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage не настроен или bucket avatars не существует';
  END;

  BEGIN
    DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
    CREATE POLICY "Users can upload avatars" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Не удалось создать политику загрузки для avatars';
  END;

  BEGIN
    DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
    CREATE POLICY "Users can update own avatars" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Не удалось создать политику обновления для avatars';
  END;

  BEGIN
    DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
    CREATE POLICY "Users can delete own avatars" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid() IS NOT NULL
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Не удалось создать политику удаления для avatars';
  END;

END $$;

-- Сообщение о завершении
SELECT 'Storage политики созданы (если Storage настроен)' as result;
