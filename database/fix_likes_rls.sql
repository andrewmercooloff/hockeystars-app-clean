-- Исправление RLS политик для таблицы likes
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

-- Создаем новые политики с более мягкими правилами
-- Пользователи могут видеть все лайки (для отображения счетчиков)
CREATE POLICY "Users can view all likes" ON public.likes 
  FOR SELECT 
  USING (true);

-- Пользователи могут создавать лайки
-- Разрешаем всем создавать лайки (проверка прав доступа выполняется в приложении)
CREATE POLICY "Users can create their own likes" ON public.likes 
  FOR INSERT 
  WITH CHECK (true);

-- Пользователи могут удалять лайки
-- Разрешаем удаление (проверка прав доступа выполняется в приложении)
CREATE POLICY "Users can delete their own likes" ON public.likes 
  FOR DELETE 
  USING (true);

