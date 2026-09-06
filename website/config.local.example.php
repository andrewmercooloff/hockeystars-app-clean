<?php
/**
 * Copy to config.local.php on the VPS — never commit that file.
 * Fill only the providers you use; leave others as empty strings.
 */

// Notificore (BY / CIS SMS)
define('HS_NOTIFICORE_API_KEY', getenv('NOTIFICORE_API_KEY') ?: '');
define('HS_NOTIFICORE_ORIGINATOR', 'HockeyStars');
define('HS_NOTIFICORE_SERVICE_NAME', 'ХоккейСтарс');
define('HS_NOTIFICORE_2FA_TEMPLATE_ID', 211);

// Twilio (intl SMS / WhatsApp / Verify)
define('HS_TWILIO_ACCOUNT_SID', getenv('TWILIO_ACCOUNT_SID') ?: '');
define('HS_TWILIO_AUTH_TOKEN', getenv('TWILIO_AUTH_TOKEN') ?: '');
define('HS_TWILIO_FROM', getenv('TWILIO_PHONE_NUMBER') ?: '');

// RocketSMS
define('HS_ROCKETSMS_LOGIN', getenv('ROCKETSMS_LOGIN') ?: '');
define('HS_ROCKETSMS_PASSWORD', getenv('ROCKETSMS_PASSWORD') ?: '');
define('HS_ROCKETSMS_SENDER', 'HockstarsBy');
define('HS_ROCKETSMS_TEMPLATE', 'Hockeystars code: {code}');

// Optional: Resend (transactional email)
define('HS_RESEND_API_KEY', getenv('RESEND_API_KEY') ?: '');

// Optional: Supabase service role — server-only, never ship to the app
define('HS_SUPABASE_SERVICE_ROLE_KEY', getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
