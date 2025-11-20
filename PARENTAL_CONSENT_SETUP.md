# Настройка системы родительского согласия (COPPA Email-Plus)

## 📋 Обзор

Эта система реализует метод "Email-Plus" для получения верифицированного родительского согласия для детей младше 13 лет, что соответствует требованиям COPPA и App Store.

## 🔧 Шаг 1: Выполнение SQL миграции

1. Откройте Supabase Dashboard → SQL Editor
2. Выполните скрипт: `database/add_parental_consent_fields.sql`
3. Проверьте, что поля добавлены:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'players' 
   AND column_name IN ('status', 'parent_email', 'consent_token', 'consent_token_expires_at');
   ```

## 📧 Шаг 2: Настройка почтового сервиса

### Вариант A: Resend (рекомендуется)

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Создайте API ключ
3. В Supabase Dashboard → Settings → Edge Functions → Secrets:
   - Добавьте `RESEND_API_KEY` = ваш API ключ от Resend
   - Добавьте `SITE_URL` = `https://hockey-stars.com` (или ваш домен)

### Вариант B: Другой SMTP провайдер

Если используете другой провайдер, обновите функции в:
- `supabase/functions/handle-child-registration/index.ts`
- `supabase/functions/verify-parental-consent/index.ts`

Замените вызовы Resend API на ваш провайдер.

## 🚀 Шаг 3: Деплой Edge Functions

```bash
# Установите Supabase CLI если еще не установлен
npm install -g supabase

# Войдите в Supabase
supabase login

# Свяжите проект
supabase link --project-ref ваш-project-ref

# Деплой функций
supabase functions deploy handle-child-registration
supabase functions deploy verify-parental-consent
```

Или через Supabase Dashboard:
1. Edge Functions → Create a new function
2. Скопируйте код из `supabase/functions/handle-child-registration/index.ts`
3. Повторите для `verify-parental-consent`

## 🌐 Шаг 4: Настройка веб-страницы подтверждения

Создайте страницу `website/verify-consent.html` (или настройте редирект на Edge Function).

Edge Function `verify-parental-consent` уже возвращает HTML страницу, но нужно настроить роутинг:

1. Если используете хостинг с PHP, создайте `verify-consent.php` который редиректит на Edge Function
2. Или настройте редирект на уровне веб-сервера

## 📱 Шаг 5: Обновление клиентского приложения

Обновите `app/register.tsx`:
- Добавьте проверку возраста при вводе даты рождения
- Если возраст < 13, покажите поле для email родителя
- Вызовите Edge Function `handle-child-registration` вместо обычной регистрации
- Покажите экран "Ожидание подтверждения родителя"

Обновите `app/login.tsx`:
- Проверяйте `status` пользователя после входа
- Если `status = 'pending_verification'`, покажите экран ожидания

## ✅ Шаг 6: Тестирование

1. **Создайте тестовый аккаунт ребенка (< 13 лет):**
   - Введите дату рождения, которая дает возраст < 13
   - Введите email родителя (можно использовать свой)
   - Проверьте, что приходит письмо

2. **Проверьте письмо родителя:**
   - Откройте письмо
   - Нажмите на ссылку подтверждения
   - Проверьте, что аккаунт активирован

3. **Проверьте второе письмо (Email-Plus):**
   - После подтверждения должно прийти второе письмо
   - Проверьте, что оно содержит информацию об активации

4. **Проверьте вход:**
   - Попробуйте войти с аккаунтом ребенка
   - До подтверждения должен показываться экран ожидания
   - После подтверждения должен работать обычный вход

## 📝 Шаг 7: Подготовка для App Store Review

В App Store Connect → Notes for Reviewer добавьте:

```
PARENTAL CONSENT TESTING:

1. Test Child Account:
   - Phone: +1234567890 (тестовый номер)
   - Age: 12 years old
   - Parent Email: parent-test@example.com

2. Registration Flow:
   - Child enters date of birth (< 13)
   - System requests parent email
   - Parent receives email with consent link
   - Parent clicks link to approve
   - Parent receives confirmation email (Email-Plus method)
   - Child account is activated

3. Login:
   - Before consent: Shows "Waiting for parent approval" screen
   - After consent: Normal login works

4. Privacy Policy:
   - Available at: https://hockey-stars.com/rules.html
   - Contains full COPPA compliance information
```

## 🔒 Безопасность

- Токены действительны только 24 часа
- Токены одноразовые (удаляются после использования)
- Все действия логируются в `parental_consent_logs`
- RLS политики предотвращают самовольную активацию

## 📊 Мониторинг

Проверяйте логи согласий:
```sql
SELECT * FROM parental_consent_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

Проверяйте ожидающие аккаунты:
```sql
SELECT id, name, parent_email, consent_token_expires_at 
FROM players 
WHERE status = 'pending_verification';
```

## 🆘 Troubleshooting

**Письма не отправляются:**
- Проверьте `RESEND_API_KEY` в Secrets
- Проверьте логи Edge Functions в Supabase Dashboard

**Токен не работает:**
- Проверьте срок действия: `consent_token_expires_at > NOW()`
- Проверьте, что токен не был использован ранее

**Аккаунт не активируется:**
- Проверьте логи функции `activate_player_by_consent`
- Убедитесь, что функция вызывается с правильным токеном

## 📚 Дополнительные ресурсы

- [COPPA Compliance Guide](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business)
- [App Store Review Guidelines - Kids Category](https://developer.apple.com/app-store/review/guidelines/#kids-category)


