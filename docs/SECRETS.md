# Secrets (HockeyStars)

API keys **must exist** for SMS / email / deploy — but they must **never** live in git.

## Where secrets live

| Secret | Store here | Not here |
|--------|------------|----------|
| Twilio, SMS.by, SMS.ru, RocketSMS, Notificore, Resend | **EAS Secrets** (app builds) + server `website/config.local.php` / host env | `app.json`, commits, chat, screenshots |
| Supabase **anon** | App / website (public by design; protect with RLS) | — |
| Supabase **service_role** | Server / CI env only | App, git, EAS public env |
| VPS SSH / root password | Password manager + server | git, deploy scripts |

## Local development

1. Copy `.env.example` → `.env` and fill values.
2. `.env` is gitignored. Never commit it.
3. For the website on a VPS: copy `website/config.local.example.php` → `website/config.local.php`.

## EAS / production builds

Set the same names as in `.env.example` as **EAS Secrets** (Project → Secrets), e.g.:

```bash
eas secret:create --name TWILIO_AUTH_TOKEN --value '…' --type string
eas secret:create --name NOTIFICORE_API_KEY --value '…' --type string
# …repeat for each key in .env.example
```

`app.config.js` reads them into `extra` at build time. Keep `app.json` fields empty.

## After a leak

1. **Rotate** every exposed key in the provider dashboard (old values are burned).
2. Put **new** values only into EAS Secrets / `config.local.php` / `.env`.
3. Do not paste keys into GitHub issues, PRs, or commits.

## Architecture note

Embedding SMS provider tokens inside the mobile binary is convenient but not ideal: a determined user can extract them. Prefer sending OTP through your backend (`website/api/send-otp.php`) long-term. Until then, treat EAS Secrets + rotation as mandatory hygiene.
