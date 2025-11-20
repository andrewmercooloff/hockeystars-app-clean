-- Добавление полей для системы родительского согласия (COPPA Email-Plus)
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- 1. Добавляем поля в таблицу players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS consent_token text,
  ADD COLUMN IF NOT EXISTS consent_token_expires_at timestamptz;

-- 2. Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_players_consent_token 
  ON public.players (consent_token) 
  WHERE consent_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_status 
  ON public.players (status);

CREATE INDEX IF NOT EXISTS idx_players_parent_email 
  ON public.players (parent_email) 
  WHERE parent_email IS NOT NULL;

-- 3. Обновляем существующие записи: устанавливаем status = 'active' для всех текущих пользователей
-- (это безопасно, так как они уже были активны)
UPDATE public.players 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- 4. Комментарии к полям для документации
COMMENT ON COLUMN public.players.status IS 'Статус аккаунта: pending_verification (ожидает согласия родителя), active (активен), suspended (заблокирован)';
COMMENT ON COLUMN public.players.parent_email IS 'Email родителя для детей младше 13 лет';
COMMENT ON COLUMN public.players.consent_token IS 'Уникальный токен для верификации родительского согласия';
COMMENT ON COLUMN public.players.consent_token_expires_at IS 'Срок действия токена согласия (обычно 24 часа)';

-- 5. Создаем функцию для проверки валидности токена (опционально, для использования в Edge Functions)
CREATE OR REPLACE FUNCTION public.check_consent_token(token text)
RETURNS TABLE (
  player_id uuid,
  parent_email text,
  is_valid boolean,
  error_message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id uuid;
  v_parent_email text;
  v_expires_at timestamptz;
BEGIN
  -- Ищем игрока с таким токеном
  SELECT id, parent_email, consent_token_expires_at
  INTO v_player_id, v_parent_email, v_expires_at
  FROM public.players
  WHERE consent_token = token
  LIMIT 1;

  -- Если токен не найден
  IF v_player_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'Токен не найден'::text;
    RETURN;
  END IF;

  -- Если токен просрочен
  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT v_player_id, v_parent_email, false, 'Срок действия токена истек'::text;
    RETURN;
  END IF;

  -- Токен валиден
  RETURN QUERY SELECT v_player_id, v_parent_email, true, NULL::text;
END;
$$;

-- 6. Создаем функцию для активации аккаунта после подтверждения согласия
CREATE OR REPLACE FUNCTION public.activate_player_by_consent(token text)
RETURNS TABLE (
  success boolean,
  player_id uuid,
  player_name text,
  parent_email text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id uuid;
  v_player_name text;
  v_parent_email text;
  v_expires_at timestamptz;
BEGIN
  -- Проверяем токен
  SELECT id, name, parent_email, consent_token_expires_at
  INTO v_player_id, v_player_name, v_parent_email, v_expires_at
  FROM public.players
  WHERE consent_token = token
  LIMIT 1;

  -- Если токен не найден
  IF v_player_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, 'Токен не найден'::text;
    RETURN;
  END IF;

  -- Если токен просрочен
  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_player_id, v_player_name, v_parent_email, 'Срок действия токена истек'::text;
    RETURN;
  END IF;

  -- Если аккаунт уже активирован
  IF EXISTS (SELECT 1 FROM public.players WHERE id = v_player_id AND status = 'active') THEN
    RETURN QUERY SELECT false, v_player_id, v_player_name, v_parent_email, 'Аккаунт уже активирован'::text;
    RETURN;
  END IF;

  -- Активируем аккаунт и очищаем токен
  UPDATE public.players
  SET 
    status = 'active',
    consent_token = NULL,
    consent_token_expires_at = NULL,
    parent_email = NULL -- Очищаем email родителя после активации (опционально, можно оставить для истории)
  WHERE id = v_player_id;

  RETURN QUERY SELECT true, v_player_id, v_player_name, v_parent_email, NULL::text;
END;
$$;

-- 7. Создаем таблицу для логирования запросов родительского согласия (опционально, для аудита)
CREATE TABLE IF NOT EXISTS public.parental_consent_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  parent_email text NOT NULL,
  token text NOT NULL,
  action text NOT NULL, -- 'requested', 'verified', 'expired', 'revoked'
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamptz,
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_parental_consent_logs_player_id 
  ON public.parental_consent_logs (player_id);

CREATE INDEX IF NOT EXISTS idx_parental_consent_logs_token 
  ON public.parental_consent_logs (token);

CREATE INDEX IF NOT EXISTS idx_parental_consent_logs_created_at 
  ON public.parental_consent_logs (created_at);

-- 8. Включаем RLS для таблицы логов (если нужно)
ALTER TABLE public.parental_consent_logs ENABLE ROW LEVEL SECURITY;

-- Политика: только сервисный ключ может читать логи
CREATE POLICY "Service role can read consent logs" 
  ON public.parental_consent_logs
  FOR SELECT
  USING (auth.role() = 'service_role');

-- 9. Обновляем RLS политики для таблицы players (если они есть)
-- Убеждаемся, что пользователи не могут сами менять status на active
-- Это должно быть сделано только через функцию activate_player_by_consent

-- Проверяем, что все работает
DO $$
BEGIN
  RAISE NOTICE '✅ Миграция завершена успешно!';
  RAISE NOTICE '📊 Проверьте таблицу players: SELECT id, name, status, parent_email FROM players LIMIT 5;';
END $$;


