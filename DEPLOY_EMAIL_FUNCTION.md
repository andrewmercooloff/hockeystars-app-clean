# 🚀 Развертывание функции send-email

## Проблема
Функция `send-email` не развернута в Supabase, поэтому возникает ошибка "Requested function was not found".

## Решение

### Вариант 1: Развернуть через Supabase CLI (РЕКОМЕНДУЕТСЯ)

```bash
# Убедись, что Supabase CLI установлен
supabase --version

# Войди в Supabase
supabase login

# Свяжись с проектом
supabase link --project-ref jvsypfwiajuwsyuzkyda

# Разверни функцию
supabase functions deploy send-email
```

### Вариант 2: Развернуть через Supabase Dashboard

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери проект `jvsypfwiajuwsyuzkyda`
3. Перейди в **Edge Functions**
4. Нажми **Deploy new function**
5. Выбери папку `supabase/functions/send-email`
6. Или скопируй код из `supabase/functions/send-email/index.ts` и создай новую функцию

### Вариант 3: Использовать существующую функцию handle-child-registration

Можно временно использовать существующую функцию, добавив туда endpoint для отправки кода.

---

## Проверка

После развертывания проверь:
```bash
supabase functions list
```

Должна быть функция `send-email`.

---

## Настройка RESEND_API_KEY

Убедись, что `RESEND_API_KEY` настроен в Supabase:
1. Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Добавь `RESEND_API_KEY` (если еще не добавлен)
3. Значение должно быть таким же, как для функции `handle-child-registration`

---

## После развертывания

После развертывания функции `send-email` всё должно заработать автоматически.





















