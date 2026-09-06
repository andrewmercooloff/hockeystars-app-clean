/**
 * Dynamic Expo config.
 * Secrets come from env / EAS Secrets — never commit real values in app.json.
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
    twilioAccountSid: env('TWILIO_ACCOUNT_SID', prev.twilioAccountSid || ''),
    twilioAuthToken: env('TWILIO_AUTH_TOKEN', prev.twilioAuthToken || ''),
    twilioFromNumber: env('TWILIO_PHONE_NUMBER', prev.twilioFromNumber || ''),
    twilioWhatsAppFrom: env('TWILIO_WHATSAPP_FROM', prev.twilioWhatsAppFrom || ''),
    twilioVerifyServiceSid: env('TWILIO_VERIFY_SERVICE_SID', prev.twilioVerifyServiceSid || ''),
    smsByApiKey: env('SMSBY_API_KEY', prev.smsByApiKey || ''),
    smsRuApiKey: env('SMSRU_API_KEY', prev.smsRuApiKey || ''),
    rocketSmsLogin: env('ROCKETSMS_LOGIN', prev.rocketSmsLogin || ''),
    rocketSmsPassword: env('ROCKETSMS_PASSWORD', prev.rocketSmsPassword || ''),
    notificoreApiKey: env('NOTIFICORE_API_KEY', prev.notificoreApiKey || ''),
    notificoreTestApiKey: env('NOTIFICORE_TEST_API_KEY', prev.notificoreTestApiKey || ''),
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
