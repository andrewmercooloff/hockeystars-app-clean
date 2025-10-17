-- Проверяем и исправляем Storage (если он существует)

-- 1. Проверяем существует ли schema storage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    RAISE NOTICE 'Schema storage существует';
    
    -- Проверяем существует ли таблица objects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
      RAISE NOTICE 'Таблица storage.objects существует';
      
      -- Создаем политики
      BEGIN
        DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
        CREATE POLICY "Users can view avatars" ON storage.objects
          FOR SELECT USING (bucket_id = 'avatars');
        RAISE NOTICE 'Политика просмотра avatars создана';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Ошибка создания политики просмотра: %', SQLERRM;
      END;

      BEGIN
        DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
        CREATE POLICY "Users can upload avatars" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'avatars' 
            AND auth.uid() IS NOT NULL
          );
        RAISE NOTICE 'Политика загрузки avatars создана';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Ошибка создания политики загрузки: %', SQLERRM;
      END;

    ELSE
      RAISE NOTICE 'Таблица storage.objects НЕ существует - Storage не настроен';
    END IF;
    
  ELSE
    RAISE NOTICE 'Schema storage НЕ существует - Storage не настроен в проекте';
  END IF;
END $$;

-- Результат
SELECT 'Проверка Storage завершена' as result;
