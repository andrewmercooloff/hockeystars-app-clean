# 🚀 Развертывание функции send-email (Windows)

## Проблема
Supabase CLI нельзя установить через `npm install -g`. Нужно использовать другой способ.

## Решение 1: Через Supabase Dashboard (САМЫЙ ПРОСТОЙ)

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери проект `jvsypfwiajuwsyuzkyda`
3. Перейди в **Edge Functions** (в левом меню)
4. Нажми **Create a new function**
5. Назови функцию: `send-email`
6. Скопируй код из файла `supabase/functions/send-email/index.ts`
7. Вставь код в редактор
8. Нажми **Deploy**

## Решение 2: Установить Supabase CLI через Scoop (Windows)

```powershell
# Установи Scoop (если еще не установлен)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Установи Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Войди в Supabase
supabase login

# Свяжись с проектом
supabase link --project-ref jvsypfwiajuwsyuzkyda

# Разверни функцию
supabase functions deploy send-email
```

## Решение 3: Скачать бинарник напрямую

1. Перейди на [GitHub Releases](https://github.com/supabase/cli/releases)
2. Скачай `supabase_windows_amd64.zip` для Windows
3. Распакуй и добавь в PATH
4. Используй команды из Решения 2

## Решение 4: Использовать npx (без установки)

```powershell
# Войди в Supabase (откроется браузер)
npx supabase login

# Свяжись с проектом
npx supabase link --project-ref jvsypfwiajuwsyuzkyda

# Разверни функцию
npx supabase functions deploy send-email
```

---

## Рекомендация

**Используй Решение 1 (Supabase Dashboard)** - это самый простой способ, не требует установки CLI.

---

## После развертывания

После развертывания функции `send-email` всё должно заработать автоматически.

Проверь, что функция развернута:
- В Supabase Dashboard → Edge Functions должна быть функция `send-email`




































