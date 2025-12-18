-- ============================================
-- СИСТЕМА РЕФЕРАЛЬНЫХ БАЛЛОВ
-- ============================================
-- Баллы за приглашённых:
-- - Игрок (player): +1 балл
-- - Тренер (coach): +5 баллов  
-- - Звезда (star): +10 баллов
-- ============================================

-- 1. Добавляем поле invited_by в таблицу players (если не существует)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES players(id);

-- 2. Добавляем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_players_invited_by ON players(invited_by);

-- 3. Функция для подсчёта реферальных баллов пользователя
CREATE OR REPLACE FUNCTION calculate_referral_points(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN status = 'star' THEN 10
            WHEN status = 'coach' THEN 5
            ELSE 1  -- player и все остальные
        END
    ), 0)
    INTO total_points
    FROM players
    WHERE invited_by = user_id;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- 4. Представление (View) для топ-10 рейтинга
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
    p.id,
    p.name,
    p.avatar,
    p.status,
    COUNT(r.id) as invited_count,
    COALESCE(SUM(
        CASE 
            WHEN r.status = 'star' THEN 10
            WHEN r.status = 'coach' THEN 5
            ELSE 1
        END
    ), 0) as referral_points,
    -- Детализация
    COUNT(CASE WHEN r.status = 'player' THEN 1 END) as invited_players,
    COUNT(CASE WHEN r.status = 'coach' THEN 1 END) as invited_coaches,
    COUNT(CASE WHEN r.status = 'star' THEN 1 END) as invited_stars
FROM players p
LEFT JOIN players r ON r.invited_by = p.id
WHERE p.status != 'admin'  -- Исключаем администраторов из рейтинга
GROUP BY p.id, p.name, p.avatar, p.status
HAVING COUNT(r.id) > 0  -- Только те, кто кого-то пригласил
ORDER BY referral_points DESC, invited_count DESC;

-- 5. Функция для получения топ-N рейтинга
CREATE OR REPLACE FUNCTION get_referral_top(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    avatar TEXT,
    status TEXT,
    invited_count BIGINT,
    referral_points BIGINT,
    invited_players BIGINT,
    invited_coaches BIGINT,
    invited_stars BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM referral_leaderboard
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Пример запроса для получения топ-10
-- SELECT * FROM get_referral_top(10);

-- 7. Пример запроса для получения баллов конкретного пользователя
-- SELECT calculate_referral_points('user-uuid-here');

-- ============================================
-- ПРИМЕЧАНИЯ:
-- После выполнения этого скрипта в Supabase SQL Editor:
-- 1. Добавьте поле invited_by в форму регистрации
-- 2. При регистрации передавайте ID пригласившего
-- 3. Используйте get_referral_top(10) для отображения рейтинга
-- ============================================
