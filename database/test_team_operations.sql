-- Пошаговое тестирование операций с командами
-- Найдем на какой именно операции происходит сбой

-- ВАЖНО: Этот скрипт только ТЕСТИРУЕТ, не изменяет данные!

-- 1. Тест: Можем ли мы читать команды?
DO $$
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM player_teams WHERE player_id = auth.uid();
    RAISE NOTICE '✅ SELECT из player_teams работает';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ SELECT из player_teams НЕ работает: %', SQLERRM;
  END;
END $$;

-- 2. Тест: Можем ли мы удалять команды?
DO $$
BEGIN
  BEGIN
    -- Создаем тестовую транзакцию (откатится автоматически)
    PERFORM player_id FROM player_teams WHERE player_id = auth.uid() LIMIT 1;
    
    -- Пробуем DELETE (в транзакции, не выполнится реально)
    BEGIN
      DELETE FROM player_teams WHERE player_id = auth.uid() AND FALSE; -- FALSE гарантирует что ничего не удалится
      RAISE NOTICE '✅ DELETE из player_teams разрешен';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ DELETE из player_teams запрещен: %', SQLERRM;
    END;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Ошибка доступа к player_teams: %', SQLERRM;
  END;
END $$;

-- 3. Тест: Можем ли мы вставлять команды?
DO $$
BEGIN
  BEGIN
    -- Пробуем INSERT (в транзакции, не выполнится реально)
    BEGIN
      INSERT INTO player_teams (player_id, team_id, is_primary) 
      SELECT auth.uid(), id, false FROM teams LIMIT 1
      WHERE FALSE; -- FALSE гарантирует что ничего не вставится
      RAISE NOTICE '✅ INSERT в player_teams разрешен';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ INSERT в player_teams запрещен: %', SQLERRM;
    END;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Ошибка доступа к teams или player_teams: %', SQLERRM;
  END;
END $$;

-- 4. Тест: Можем ли мы обновлять команды?
DO $$
BEGIN
  BEGIN
    -- Пробуем UPDATE (в транзакции, не выполнится реально)
    BEGIN
      UPDATE player_teams 
      SET is_primary = is_primary 
      WHERE player_id = auth.uid() AND FALSE; -- FALSE гарантирует что ничего не обновится
      RAISE NOTICE '✅ UPDATE в player_teams разрешен';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ UPDATE в player_teams запрещен: %', SQLERRM;
    END;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Ошибка доступа к player_teams: %', SQLERRM;
  END;
END $$;

-- 5. Тест: Проверяем доступ к таблице teams
DO $$
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM teams;
    RAISE NOTICE '✅ SELECT из teams работает';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ SELECT из teams НЕ работает: %', SQLERRM;
  END;
END $$;

-- 6. Итоговое сообщение
SELECT 'Тестирование завершено. Проверьте сообщения выше для диагностики.' as result;
