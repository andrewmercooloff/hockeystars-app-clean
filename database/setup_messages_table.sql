-- Настройка таблицы сообщений в Supabase
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Создание таблицы сообщений (если не существует)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);

-- 3. Включение Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Политика для чтения сообщений (пользователь может читать сообщения, где он отправитель или получатель)
CREATE POLICY "Users can read their messages" ON public.messages
FOR SELECT USING (
  auth.uid()::text = sender_id::text OR 
  auth.uid()::text = receiver_id::text
);

-- 5. Политика для отправки сообщений (авторизованные пользователи могут отправлять сообщения)
CREATE POLICY "Authenticated users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid()::text = sender_id::text
);

-- 6. Политика для обновления сообщений (пользователь может обновлять только свои сообщения)
CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (
  auth.uid()::text = sender_id::text
);

-- 7. Политика для удаления сообщений (пользователь может удалять только свои сообщения)
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (
  auth.uid()::text = sender_id::text
);

-- 8. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Проверка создания таблицы
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- 11. Проверка политик
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'messages'; 