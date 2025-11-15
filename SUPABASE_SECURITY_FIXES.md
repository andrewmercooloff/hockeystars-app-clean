# Исправление предупреждений безопасности Supabase

## Обзор

Supabase Database Linter обнаружил несколько предупреждений безопасности. Ниже описано, что нужно исправить и как.

## 1. ✅ function_search_path_mutable (ИСПРАВЛЯЕТСЯ В КОДЕ)

**Проблема:** Функции PostgreSQL не имеют установленного `search_path`, что может быть уязвимостью безопасности (search_path injection).

**Решение:** Выполните SQL-скрипт `database/fix_function_search_path_security.sql` в Supabase SQL Editor.

**Функции, которые будут исправлены:**
- `search_teams`
- `get_player_teams`
- `increment_unread_notifications`
- `reset_unread_notifications`
- `increment_unread_messages`
- `decrement_unread_messages_on_read`
- `delete_item_by_user`
- `delete_museum_item_by_user`
- `delete_museum_item_admin`
- `check_team_years_overlap`
- `update_exercises_updated_at`
- `update_activity_points_updated_at`
- `update_updated_at_column`
- `update_modified_column`
- `cleanup_expired_email_verification_codes` (удаляется, так как email авторизация не используется)

**Что делает скрипт:** Добавляет `SET search_path = public, pg_temp` в определение каждой функции для защиты от search_path injection атак.

---

## 2. ⚠️ auth_leaked_password_protection (ТРЕБУЕТ НАСТРОЕК В SUPABASE)

**Проблема:** Защита от утечек паролей отключена.

**Решение:** Включите в настройках Supabase:
1. Перейдите в **Authentication** → **Policies**
2. Включите **"Leaked Password Protection"**
3. Это проверит пароли через HaveIBeenPwned.org

**Документация:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## 3. ⚠️ auth_insufficient_mfa_options (ТРЕБУЕТ НАСТРОЕК В SUPABASE)

**Проблема:** Включено недостаточно опций многофакторной аутентификации (MFA).

**Решение:** Включите дополнительные методы MFA в настройках Supabase:
1. Перейдите в **Authentication** → **Providers**
2. Включите дополнительные методы MFA (например, TOTP, SMS)
3. Это улучшит безопасность аккаунтов

**Документация:** https://supabase.com/docs/guides/auth/auth-mfa

---

## 4. ⚠️ vulnerable_postgres_version (ТРЕБУЕТ ОБНОВЛЕНИЯ В SUPABASE)

**Проблема:** Текущая версия Postgres (supabase-postgres-17.4.1.064) имеет доступные обновления безопасности.

**Решение:** Обновите базу данных в настройках Supabase:
1. Перейдите в **Settings** → **Database**
2. Проверьте доступные обновления
3. Выполните обновление до последней версии

**Документация:** https://supabase.com/docs/guides/platform/upgrading

**⚠️ ВАЖНО:** Перед обновлением сделайте резервную копию базы данных!

---

## Порядок действий

1. **Сначала** выполните SQL-скрипт `database/fix_function_search_path_security.sql` в Supabase SQL Editor
2. **Затем** включите защиту от утечек паролей в настройках Authentication
3. **Затем** включите дополнительные методы MFA
4. **В конце** обновите версию Postgres (после резервной копии)

---

## Проверка исправлений

После выполнения SQL-скрипта выполните запрос из конца файла `database/fix_function_search_path_security.sql` для проверки, что все функции исправлены.

Также проверьте Database Linter в Supabase - предупреждения `function_search_path_mutable` должны исчезнуть.

