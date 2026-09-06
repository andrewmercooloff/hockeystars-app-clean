/**
 * Dynamic Expo config.
 * Provider secrets are injected at build/runtime from env / EAS Secrets.
 * Never put real values in app.json (keep empty strings there).
 */
const appJson = require('./app.json');

function env(name, fallback = '') {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

module.exports = () => {
  const config = { ...appJson.expo };
  const webExport = process.env.HS_WEB_EXPORT === '1';
  const prev = config.extra || {};

  config.extra = {
    ...prev,
    // Public-ish IDs / display (still overridable)
    twilioFromNumber: env('TWILIO_PHONE_NUMBER', prev.twilioFromNumber || ''),
    twilioWhatsAppFrom: env('TWILIO_WHATSAPP_FROM', prev.twilioWhatsAppFrom || ''),
    rocketSmsSender: env('ROCKETSMS_SENDER', prev.rocketSmsSender || ''),
    rocketSmsMessageTemplate: env(
      'ROCKETSMS_MESSAGE_TEMPLATE',
      prev.rocketSmsMessageTemplate || ''
    ),
    notificoreOriginator: env('NOTIFICORE_ORIGINATOR', prev.notificoreOriginator || ''),
    notificoreServiceNameCyrl: env(
      'NOTIFICORE_SERVICE_NAME_CYRL',
      prev.notificoreServiceNameCyrl || ''
    ),
    notificore2faTemplateId: env(
      'NOTIFICORE_2FA_TEMPLATE_ID',
      prev.notificore2faTemplateId || ''
    ),

    // Secrets — set via EAS Secrets or local .env (gitignored)
    twilioAccountSid: env('TWILIO_ACCOUNT_SID', prev.twilioAccountSid || ''),
    twilioAuthToken: env('TWILIO_AUTH_TOKEN', prev.twilioAuthToken || ''),
    twilioVerifyServiceSid: env(
      'TWILIO_VERIFY_SERVICE_SID',
      prev.twilioVerifyServiceSid || ''
    ),
    smsByApiKey: env('SMSBY_API_KEY', prev.smsByApiKey || ''),
    smsRuApiKey: env('SMSRU_API_KEY', prev.smsRuApiKey || ''),
    rocketSmsLogin: env('ROCKETSMS_LOGIN', prev.rocketSmsLogin || ''),
    rocketSmsPassword: env('ROCKETSMS_PASSWORD', prev.rocketSmsPassword || ''),
    notificoreApiKey: env('NOTIFICORE_API_KEY', prev.notificoreApiKey || ''),
    notificoreTestApiKey: env('NOTIFICORE_TEST_API_KEY', prev.notificoreTestApiKey || ''),
    notificore2faJwt: env('NOTIFICORE_2FA_JWT', prev.notificore2faJwt || ''),
    resendApiKey: env('RESEND_API_KEY', prev.resendApiKey || ''),
  };

  if (webExport) {
    config.web = {
      ...(config.web || {}),
      output: 'static',
    };
  }

  return { expo: config };
};
