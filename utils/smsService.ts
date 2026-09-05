import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

// SMS Service - React Native Compatible (using Twilio)
// Note: Twilio не работает напрямую в React Native, используем fetch API

/** OTP для Twilio / sms.ru — только цифры (KZ и др. могут резать бренд). */
const plainOtpSmsBody = (code: string): string => code;

/** Беларусь (RocketSMS + HockstarsBy): шаблон с брендом — быстрее проходит по маршруту. */
const rocketSmsVerificationBody = (code: string): string => {
  const template =
    Constants.expoConfig?.extra?.rocketSmsMessageTemplate || 'Hockeystars code: {code}';
  return template.replace('{code}', code);
};

/** Notificore fixname (RU): в тексте обязательно название сервиса кириллицей (требование оператора). */
const getNotificoreServiceNameCyrl = (): string =>
  Constants.expoConfig?.extra?.notificoreServiceNameCyrl || 'ХоккейСтарс';

const notificoreVerificationSmsBody = (code: string): string =>
  `Код ${getNotificoreServiceNameCyrl()}: ${code}`;

/** Шаблон 2FA для кабинета Notificore (поддержка: «Код ХоккейСтарс: {code2fa}»). */
export const getNotificore2faTemplateText = (): string =>
  `Код ${getNotificoreServiceNameCyrl()}: {code2fa}`;

const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SMS_HTTP_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs = SMS_HTTP_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

let rocketSmsPasswordHashCache: string | null = null;

const getRocketSmsPasswordHash = async (password: string): Promise<string> => {
  if (rocketSmsPasswordHashCache) {
    return rocketSmsPasswordHashCache;
  }
  rocketSmsPasswordHashCache = (
    await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, password)
  ).toLowerCase();
  return rocketSmsPasswordHashCache;
};

/** 2FA Notificore: шаблон + live API key → JWT через /api/auth/login */
export const isNotificore2faConfigured = (): boolean =>
  !!(getNotificore2faTemplateId() && getNotificoreApiKey());

// Функция форматирования номера телефона
// Убираем все форматирующие символы (пробелы, скобки, дефисы), оставляем только + и цифры
const formatPhoneNumber = (phone: string): string => {
  // Убираем все символы кроме + и цифр
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Возвращаем очищенный номер (должен начинаться с +)
  return cleaned;
};

// Функция определения кода страны из номера телефона
const getCountryCode = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    // Извлекаем код страны (первые 1-3 цифры после +)
    const match = cleaned.match(/^\+(\d{1,3})/);
    return match ? match[1] : '';
  }
  return '';
};

// Функция выбора номера отправителя в зависимости от страны получателя
const getSenderNumber = (recipientPhone: string): string => {
  const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
  const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
  
  // Получаем номера отправителей из конфигурации
  const defaultFromNumber = Constants.expoConfig?.extra?.twilioFromNumber; // Шведский номер
  const usFromNumber = Constants.expoConfig?.extra?.twilioFromNumberUS; // Американский номер (если есть)
  
  // Определяем код страны получателя
  const countryCode = getCountryCode(recipientPhone);
  
  // Если получатель в США (+1) и есть американский номер - используем его
  if (countryCode === '1' && usFromNumber) {
    console.log('🇺🇸 Используем американский номер отправителя для США');
    return usFromNumber;
  }
  
  // Для всех остальных стран используем номер по умолчанию
  return defaultFromNumber || '';
};

// Функция отправки SMS через Twilio API
export const sendSMSViaTwilio = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем SMS через Twilio API');
    
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    
    if (!accountSid || !authToken) {
      // console.log('❌ Twilio credentials не найдены в конфигурации Expo');
      return false;
    }
    
    // Выбираем номер отправителя в зависимости от страны получателя
    const twilioPhoneNumber = getSenderNumber(phone);
    
    if (!twilioPhoneNumber) {
      console.error('❌ Номер отправителя не найден в конфигурации');
      return false;
    }
    
    // console.log('✅ Twilio credentials найдены в конфигурации Expo');

    const formattedPhone = formatPhoneNumber(phone);

    const message = plainOtpSmsBody(code);

    // Формируем тело запроса вручную для React Native совместимости
    // ВАЖНО: Добавляем RiskCheck=disable для легитимных сообщений (коды подтверждения)
    // Это предотвращает блокировку SMS Pumping Protection от Twilio
    const body = `From=${encodeURIComponent(twilioPhoneNumber)}&To=${encodeURIComponent(formattedPhone)}&Body=${encodeURIComponent(message)}&RiskCheck=disable`;
    
    console.log('📤 Отправляем запрос в Twilio:');
    console.log('   URL:', `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);
    console.log('   From:', twilioPhoneNumber);
    console.log('   To:', formattedPhone);
    console.log('   Body:', message);
    console.log('   RiskCheck: disable (легитимное сообщение)');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: body
      }
    );

    const responseData = await response.json();

    if (response.ok) {
      // Проверяем статус сообщения в ответе
      const messageStatus = responseData.status;
      const errorCode = responseData.error_code;
      const errorMessage = responseData.error_message;
      
      // Если есть ошибка доставки (например, 30453 - Message delivery blocked)
      if (errorCode) {
        console.error('❌ Twilio ошибка доставки:', {
          errorCode,
          errorMessage,
          status: messageStatus,
          sid: responseData.sid
        });
        console.error('❌ Сообщение заблокировано Twilio. Проверьте настройки аккаунта и номера.');
        return false;
      }
      
      // Проверяем, что статус не "failed" или "undelivered"
      if (messageStatus === 'failed' || messageStatus === 'undelivered') {
        console.error('❌ Twilio сообщение не доставлено:', {
          status: messageStatus,
          errorCode: responseData.error_code,
          errorMessage: responseData.error_message,
          sid: responseData.sid
        });
        return false;
      }
      
      console.log('✅ SMS отправлено успешно:', {
        sid: responseData.sid,
        status: messageStatus,
        to: formattedPhone
      });
      return true;
    } else {
      console.error('❌ Ошибка Twilio API:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки SMS:', error);
    return false;
  }
};

// Fallback функция для разработки (отправка в консоль)
export const sendSMSFallback = (phone: string, code: string): boolean => {
  console.log(`📱 [FALLBACK SMS] Номер: ${phone}, Код: ${code}`);
  return true;
};

// Функция отправки WhatsApp через Twilio API
export const sendWhatsAppViaTwilio = async (phoneNumber: string, code: string): Promise<boolean> => {
  try {
    console.log('💬 Отправляем WhatsApp через Twilio API');
    
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const whatsappFrom = Constants.expoConfig?.extra?.twilioWhatsAppFrom;
    
    if (!accountSid || !authToken || !whatsappFrom) {
      // console.log('❌ Twilio WhatsApp credentials не найдены в конфигурации Expo');
      return false;
    }
    
    // console.log('✅ Twilio WhatsApp credentials найдены в конфигурации');

    // Форматируем номер для WhatsApp
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('💬 Форматированный номер для WhatsApp:', formattedPhone);
    
    if (!formattedPhone || formattedPhone.length < 10) {
      console.error('❌ Неверный формат номера телефона для WhatsApp:', formattedPhone);
      return false;
    }
    
    const whatsappTo = `whatsapp:${formattedPhone}`;
    
    const message = plainOtpSmsBody(code);

    // Формируем тело запроса вручную для React Native совместимости
    // ВАЖНО: Добавляем RiskCheck=disable для легитимных сообщений (коды подтверждения)
    // Это предотвращает блокировку SMS Pumping Protection от Twilio
    const body = `From=${encodeURIComponent(whatsappFrom)}&To=${encodeURIComponent(whatsappTo)}&Body=${encodeURIComponent(message)}&RiskCheck=disable`;
    
    console.log('📤 Отправляем WhatsApp запрос в Twilio:');
    console.log('   URL:', `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);
    console.log('   From:', whatsappFrom);
    console.log('   To:', whatsappTo);
    console.log('   Body:', message);
    console.log('   RiskCheck: disable (легитимное сообщение)');
    console.log('   Body (encoded):', body);

    // Отправляем WhatsApp через Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Ошибка Twilio WhatsApp API:', result);
      return false;
    }

    // console.log('✅ WhatsApp отправлен через Twilio');
    console.log('💬 Message SID:', result.sid);
    return true;

  } catch (error) {
    console.error('❌ Ошибка отправки WhatsApp через Twilio:', error);
    return false;
  }
};

// Инструкция по настройке Twilio
export const getTwilioSetupInstructions = () => `
📱 НАСТРОЙКА TWILIO ДЛЯ HOCKEYSTARS

1. 🔐 Регистрация в Twilio:
   - Зарегистрируйтесь на https://twilio.com
   - Подтвердите номер телефона
   - Получите $15 бесплатного кредита

2. 📱 Получение номера телефона:
   - Купите номер телефона в Console
   - Выберите страну (Беларусь/Россия)
   - Стоимость: ~$1/месяц

3. 🔑 Получение credentials:
   - Account SID (начинается с AC...)
   - Auth Token (скрытый)
   - Phone Number (ваш номер)

4. 🌐 Настройка в app.json:
   "extra": {
     "twilioAccountSid": "AC...",
     "twilioAuthToken": "your_auth_token",
     "twilioFromNumber": "+375...",
     "twilioWhatsAppFrom": "whatsapp:+14155238886"
   }

5. 💬 WhatsApp (опционально):
   - Включите WhatsApp Sandbox
   - Используйте номер: +14155238886
   - Пользователи должны отправить "join <sandbox-code>"

6. ✅ Преимущества:
   - Поддержка Беларуси и России
   - Дешево: ~$0.0075 за SMS
   - WhatsApp поддержка
   - Высокая доставляемость
`;

// Проверка настройки Twilio
export const checkTwilioConfig = () => {
  const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
  const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
  const fromNumber = Constants.expoConfig?.extra?.twilioFromNumber;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.warn(`
    ⚠️ ВНИМАНИЕ: Twilio credentials не настроены в app.json
    
    Добавьте в app.json:
    "extra": {
      "twilioAccountSid": "AC...",
      "twilioAuthToken": "your_auth_token",
      "twilioFromNumber": "+375..."
    }
    
    Подробности: https://twilio.com
    `);
    return false;
  }
  return true;
};

/** Национальные 10 цифр после кода страны +7 (РФ и KZ делят +7). */
const getNationalDigitsAfterSeven = (phone: string): string | null => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  let national = '';
  if (cleaned.startsWith('+7')) {
    national = cleaned.slice(2);
  } else if (cleaned.startsWith('7') && cleaned.length === 11) {
    national = cleaned.slice(1);
  } else if (cleaned.startsWith('8') && cleaned.length === 11) {
    national = cleaned.slice(1);
  } else {
    return null;
  }
  return national.length === 10 ? national : null;
};

/** KZ и RU используют +7; мобильные РФ — 9xx, KZ — 6xx/7xx. */
const isKazakhstanMobileAfterSeven = (national10: string): boolean => {
  if (national10.startsWith('9')) return false;
  return national10.startsWith('6') || national10.startsWith('7');
};

// Функция определения страны по номеру телефона
export const getCountryFromPhone = (
  phone: string
): 'BY' | 'RU' | 'KZ' | 'US' | 'CA' | 'OTHER' => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+375') || cleaned.startsWith('375')) {
    return 'BY';
  }
  
  if (
    cleaned.startsWith('+7') ||
    (cleaned.startsWith('7') && cleaned.length === 11) ||
    (cleaned.startsWith('8') && cleaned.length === 11)
  ) {
    const national = getNationalDigitsAfterSeven(phone);
    if (national && isKazakhstanMobileAfterSeven(national)) {
      return 'KZ';
    }
    return 'RU';
  }
  
  if (cleaned.startsWith('+1') || cleaned.startsWith('1')) {
    return 'US';
  }
  
  return 'OTHER';
};

// Формат msisdn для Notificore (+7): 79001234567, без «+»
const formatRussianMsisdn = (phone: string): string | null => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  let digits = cleaned;
  if (digits.startsWith('+7')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('7') && digits.length === 11) {
    digits = digits.substring(1);
  } else if (digits.startsWith('8') && digits.length === 11) {
    digits = digits.substring(1);
  }
  if (digits.length !== 10) {
    return null;
  }
  return `7${digits}`;
};

// Notificore SMS API (Россия) — https://api.notificore.ru/v1.0/sms/create
const parseNotificoreResponse = (responseData: any): { ok: boolean; errorCode?: unknown; errorDescription?: string } => {
  const errorCode = responseData?.result?.error ?? responseData?.error;
  const errorDescription =
    responseData?.result?.errorDescription ?? responseData?.errorDescription;
  const ok = errorCode === 0 || errorCode === '0';
  return { ok, errorCode, errorDescription };
};

const NOTIFICORE_SMS_URL = 'https://api.notificore.ru/v1.0/sms/create';
const NOTIFICORE_2FA_BASE = 'https://one-api.notificore.ru/api/2fa/authentications';
const NOTIFICORE_AUTH_LOGIN_URL = 'https://one-api.notificore.ru/api/auth/login';
const NOTIFICORE_AUTH_REFRESH_URL = 'https://one-api.notificore.ru/api/auth/refresh';
const NOTIFICORE_2FA_OTP_URL = `${NOTIFICORE_2FA_BASE}/otp`;
const NOTIFICORE_2FA_VERIFY_URL = `${NOTIFICORE_2FA_BASE}/otp`;
/** Префикс в БД: код генерирует Notificore 2FA, не приложение. */
export const NOTIFICORE_2FA_CODE_PREFIX = '2FA:';

let pendingNotificore2faAuthId: string | null = null;
let cachedNotificoreBearer: { token: string; expiresAtMs: number } | null = null;

const getNotificoreApiKey = (): string | null => {
  const live = Constants.expoConfig?.extra?.notificoreApiKey;
  return typeof live === 'string' && live.trim().length > 10 ? live.trim() : null;
};

const getNotificore2faTemplateId = (): number | null => {
  const id = Constants.expoConfig?.extra?.notificore2faTemplateId;
  if (id === undefined || id === null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const storeNotificoreBearer = (bearer: string): string => {
  cachedNotificoreBearer = {
    token: bearer,
    // JWT ~1 ч; обновляем за 5 мин до истечения
    expiresAtMs: Date.now() + 55 * 60 * 1000,
  };
  return bearer;
};

/** API 2.0: JWT через POST /api/auth/login { api_key: live_… } — см. help.notificore.ru/article/67056 */
const fetchNotificoreBearer = async (forceLogin = false): Promise<string | null> => {
  const staticBearer = Constants.expoConfig?.extra?.notificore2faJwt;
  if (
    typeof staticBearer === 'string' &&
    staticBearer.trim().length > 20 &&
    staticBearer.includes('.')
  ) {
    return staticBearer.trim();
  }

  const now = Date.now();
  if (
    !forceLogin &&
    cachedNotificoreBearer &&
    cachedNotificoreBearer.expiresAtMs > now + 60_000
  ) {
    return cachedNotificoreBearer.token;
  }

  if (!forceLogin && cachedNotificoreBearer?.token) {
    try {
      const refreshRes = await fetchWithTimeout(NOTIFICORE_AUTH_REFRESH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${cachedNotificoreBearer.token}`,
        },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (typeof refreshData?.bearer === 'string' && refreshData.bearer.length > 20) {
          return storeNotificoreBearer(refreshData.bearer);
        }
      }
    } catch {
      /* login ниже */
    }
  }

  const apiKey = getNotificoreApiKey();
  if (!apiKey) return null;

  try {
    const loginRes = await fetchWithTimeout(NOTIFICORE_AUTH_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && typeof loginData?.bearer === 'string' && loginData.bearer.length > 20) {
      console.log('✅ Notificore 2FA: JWT получен через /api/auth/login');
      return storeNotificoreBearer(loginData.bearer);
    }
    console.warn('⚠️ Notificore auth/login:', loginRes.status, loginData);
  } catch (error) {
    console.warn('⚠️ Notificore auth/login error:', error);
  }
  return null;
};

export const takeNotificore2faAuthId = (): string | null => {
  const id = pendingNotificore2faAuthId;
  pendingNotificore2faAuthId = null;
  return id;
};

const postNotificore2fa = async (
  path: string,
  body: Record<string, unknown>,
  retryOn401 = true
): Promise<{ ok: boolean; status: number; data: any }> => {
  const jwt = await fetchNotificoreBearer();
  if (!jwt) return { ok: false, status: 0, data: null };

  const doPost = async (token: string) => {
    const response = await fetchWithTimeout(`${NOTIFICORE_2FA_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return { ok: response.ok, status: response.status, data };
  };

  try {
    const result = await doPost(jwt);
    if (result.status === 401 && retryOn401) {
      cachedNotificoreBearer = null;
      const fresh = await fetchNotificoreBearer(true);
      if (fresh) return doPost(fresh);
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, data: { message } };
  }
};

/** 2FA OTP — шаблон 211, см. https://help.notificore.ru/article/67201 */
const sendSMSViaNotificore2FA = async (phone: string): Promise<boolean> => {
  const templateId = getNotificore2faTemplateId();
  const sender = Constants.expoConfig?.extra?.notificoreOriginator || 'HockeyStars';

  if (!templateId) {
    return false;
  }

  const msisdn = formatRussianMsisdn(phone);
  if (!msisdn) {
    console.error('❌ Notificore 2FA: неверный номер RU:', phone);
    return false;
  }

  console.log('🇷🇺 Notificore 2FA OTP:', { msisdn, templateId, sender });

  const { ok, status, data } = await postNotificore2fa('/otp', {
    recipient: msisdn,
    channel: 'sms',
    sender,
    template_id: templateId,
    code_digits: 6,
    code_lifetime: 300,
    code_max_tries: 5,
  });

  const authId = data?.data?.id;
  if (ok && authId && data?.data?.status === 'pending') {
    pendingNotificore2faAuthId = String(authId);
    console.log('✅ Notificore 2FA: OTP отправлен, auth id:', authId);
    return true;
  }

  console.warn('⚠️ Notificore 2FA не отправил OTP:', { status, response: data });
  if (status === 401) {
    console.warn('💡 2FA API 401: проверьте live API key и шаблон в кабинете Notificore.');
  } else if (status === 422) {
    console.warn(`💡 Шаблон 2FA (RU): «${getNotificore2faTemplateText()}» — статус Approved.`);
  }
  return false;
};

/** Проверка кода через Notificore 2FA API (код генерирует Notificore, не приложение). */
export const verifyNotificore2faOtp = async (
  authId: string,
  accessCode: string
): Promise<boolean> => {
  const jwt = await fetchNotificoreBearer();
  if (!jwt || !authId) return false;

  const digits = accessCode.replace(/\D/g, '');
  if (!digits) return false;

  try {
    const response = await fetchWithTimeout(`${NOTIFICORE_2FA_VERIFY_URL}/${authId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ access_code: digits }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn('⚠️ Notificore 2FA verify HTTP', response.status, data?.errors ?? data);
      return false;
    }
    const verified = data?.data?.status === 'verified';
    if (verified) {
      console.log('✅ Notificore 2FA: код подтверждён');
      return true;
    }
    console.warn('⚠️ Notificore 2FA verify:', data?.errors ?? data);
    return false;
  } catch (error) {
    console.warn('⚠️ Notificore 2FA verify error:', error);
    return false;
  }
};

const NOTIFICORE_DELIVERY_OK = new Set(['delivered', 'sent']);
const NOTIFICORE_DELIVERY_FAIL = new Set(['rejected', 'undeliverable', 'expired']);

const fetchNotificoreSmsStatus = async (
  apiKey: string,
  smsId: string
): Promise<string | null> => {
  try {
    const response = await fetch(`${NOTIFICORE_SMS_URL.replace('/create', '')}/${smsId}`, {
      headers: { Accept: 'application/json', 'X-API-KEY': apiKey },
    });
    const data = await response.json();
    if (data?.error !== 0 && data?.error !== '0') return null;
    return typeof data?.status === 'string' ? data.status.toLowerCase() : null;
  } catch {
    return null;
  }
};

/** Фоновая проверка DLR — только для логов, не блокирует UI. */
const logNotificoreDeliveryLater = (apiKey: string, smsId: string): void => {
  void (async () => {
    const result = await waitNotificoreDelivery(apiKey, smsId);
    if (result === 'delivered') {
      console.log('✅ Notificore DLR: доставлено', { id: smsId });
    } else if (result === 'failed') {
      console.warn('❌ Notificore DLR: отклонено (rejected)', { id: smsId });
    } else {
      console.warn('⚠️ Notificore DLR: статус не получен', { id: smsId });
    }
  })();
};

const waitNotificoreDelivery = async (
  apiKey: string,
  smsId: string
): Promise<'delivered' | 'failed' | 'timeout'> => {
  const delaysMs = [3000, 5000, 8000, 10000, 15000, 20000, 30000, 30000];
  for (const delay of delaysMs) {
    await sleepMs(delay);
    const status = await fetchNotificoreSmsStatus(apiKey, smsId);
    if (!status) continue;
    if (NOTIFICORE_DELIVERY_OK.has(status)) return 'delivered';
    if (NOTIFICORE_DELIVERY_FAIL.has(status)) return 'failed';
    // accepted / scheduled — в очереди или на модерации, ещё не финал
  }
  const last = await fetchNotificoreSmsStatus(apiKey, smsId);
  if (last && NOTIFICORE_DELIVERY_FAIL.has(last)) return 'failed';
  // Принято оператором, но DLR ещё нет — не считаем ошибкой (SMS может идти 1–5 мин)
  if (last === 'accepted' || last === 'scheduled') return 'delivered';
  return 'timeout';
};

const postNotificoreSms = async (
  apiKey: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; responseData: any; status: number; networkError?: string }> => {
  try {
    const response = await fetchWithTimeout(NOTIFICORE_SMS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.warn(`⚠️ Notificore: не JSON ответ:`, responseText.slice(0, 300));
      return { ok: false, responseData: null, status: response.status };
    }

    const parsed = parseNotificoreResponse(responseData);
    return { ok: response.ok && parsed.ok, responseData, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ Notificore: сетевая ошибка:', message);
    return { ok: false, responseData: null, status: 0, networkError: message };
  }
};

export const sendSMSViaNotificore = async (phone: string, code: string): Promise<boolean> => {
  // 2FA + утверждённый шаблон — рекомендуемый способ OTP для РФ
  if (isNotificore2faConfigured()) {
    const twoFaOk = await sendSMSViaNotificore2FA(phone);
    if (twoFaOk) return true;
    console.log('⚠️ Notificore 2FA не сработал, пробуем обычный SMS API…');
  }

  console.log('🇷🇺 Отправляем SMS через Notificore SMS API');

  const liveKey = Constants.expoConfig?.extra?.notificoreApiKey;
  const originator = Constants.expoConfig?.extra?.notificoreOriginator || 'HockeyStars';

  if (!liveKey) {
    console.error('❌ Notificore Live API key не найден в конфигурации');
    return false;
  }

  const msisdn = formatRussianMsisdn(phone);
  if (!msisdn) {
    console.error('❌ Неверный формат номера для Notificore (RU):', phone);
    return false;
  }

  const body = notificoreVerificationSmsBody(code);
  const reference = `hs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    destination: 'phone',
    originator,
    body,
    msisdn,
    reference,
    // Notificore: validity в часах (1–72), не в секундах. 600 → error 5.
    validity: '1',
    tariff: '0',
  };

  console.log('📤 Notificore запрос (live):', { msisdn, originator, reference, body });

  const { ok, responseData, status, networkError } = await postNotificoreSms(liveKey, payload);
  if (ok) {
    const smsId = String(responseData?.result?.id ?? '');
    console.log('✅ Notificore принял SMS:', {
      msisdn,
      id: smsId || undefined,
      reference: responseData?.result?.reference ?? reference,
    });
    // Не ждём DLR в UI — SMS уходит 5–120 сек, пользователь видит экран ввода сразу
    if (smsId) {
      logNotificoreDeliveryLater(liveKey, smsId);
    }
    return true;
  }

  const parsed = parseNotificoreResponse(responseData ?? {});
  console.warn('⚠️ Notificore live не отправил SMS:', {
    status,
    error: parsed.errorCode,
    errorDescription: parsed.errorDescription,
    networkError,
    response: responseData,
  });

  // Подсказки по типичным причинам (кабинет Notificore не настроен)
  const err = Number(parsed.errorCode);
  if (err === 5 || err === 8) {
    console.warn(
      '💡 Notificore error 5: часто неверный validity (нужны часы 1–72, не секунды) или маршрут/баланс. ' +
        'Error 8 — пополните баланс live-ключа.'
    );
  } else if (err === 25 || err === 32) {
    console.warn(
      '💡 Notificore: отправитель — латиница до 11 символов (HockeyStars), не NTF. Кабинет 2FA → настройки.'
    );
  }

  return false;
};

// Функция отправки SMS через RocketSMS API (BY + KZ + international; RU — Notificore)
// Документация: https://rocketsms.by/storage/rocketsms_api.pdf
// По документации используется HTTP POST на /simple/send с параметрами в query string.
export const sendSMSViaRocketSMS = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('🚀 Отправляем SMS через RocketSMS API');

    const login = Constants.expoConfig?.extra?.rocketSmsLogin;
    const password = Constants.expoConfig?.extra?.rocketSmsPassword;
    const sender = Constants.expoConfig?.extra?.rocketSmsSender;

    if (!login || !password) {
      console.error('❌ RocketSMS login или password не найдены в конфигурации');
      return false;
    }

    const passwordHash = await getRocketSmsPasswordHash(password);

    // RocketSMS: международный формат без «+» (375…, 48…, 370… и т.д.)
    const cleaned = phone.replace(/[^\d+]/g, '');
    let fullPhone: string;

    if (cleaned.startsWith('+375') || (cleaned.startsWith('375') && cleaned.length === 12)) {
      const national = cleaned.startsWith('+375') ? cleaned.substring(4) : cleaned.substring(3);
      if (national.length !== 9) {
        console.error('❌ Неверный формат номера для Беларуси:', national);
        return false;
      }
      fullPhone = `375${national}`;
    } else if (cleaned.startsWith('+')) {
      fullPhone = cleaned.substring(1);
    } else if (/^\d{10,15}$/.test(cleaned)) {
      fullPhone = cleaned;
    } else {
      const ruMsisdn = formatRussianMsisdn(phone);
      if (!ruMsisdn) {
        console.error('❌ RocketSMS: неподдерживаемый формат номера:', phone);
        return false;
      }
      fullPhone = ruMsisdn;
    }

    if (!/^\d{10,15}$/.test(fullPhone)) {
      console.error('❌ RocketSMS: неверный msisdn:', fullPhone);
      return false;
    }

    const text = rocketSmsVerificationBody(code);

    const baseUrl = 'https://api.rocketsms.by/simple/send';
    
    // Рабочий вариант: query string с username (не login!) и password (MD5-хеш)
    const url = new URL(baseUrl);
    url.searchParams.append('username', login);
    url.searchParams.append('password', passwordHash);
    url.searchParams.append('phone', fullPhone);
    url.searchParams.append('text', text);
    if (sender) {
      url.searchParams.append('sender', sender);
    }
    // OTP: priority=true — по доке RocketSMS SMS уходит мимо очереди (коды, пароли)
    url.searchParams.append('priority', 'true');

    console.log('📤 RocketSMS запрос:', {
      url: url.toString().replace(passwordHash, '***'),
      phone: fullPhone,
      sender: sender || '(default)',
      textPreview: text.replace(/\d{4,6}/, '******'),
      priority: true,
    });

    const t0 = Date.now();
    const response = await fetchWithTimeout(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      const isHtml = responseText.trim().startsWith('<');
      if (isHtml && responseText.length > 200) {
        responseData = {
          raw: responseText.substring(0, 200) + '... (HTML обрезан)',
          isHtml: true,
          fullLength: responseText.length,
        };
      } else {
        responseData = { raw: responseText };
      }
    }

    const logData: any = {
      status: response.status,
      statusText: response.statusText,
    };

    if (responseData.error) {
      logData.error = responseData.error;
    } else if (responseData.status) {
      logData.status_api = responseData.status;
    } else if (responseData.raw) {
      logData.response =
        typeof responseData.raw === 'string' && responseData.raw.length > 100
          ? responseData.raw.substring(0, 100) + '...'
          : responseData.raw;
    } else {
      logData.data = responseData;
    }

    console.log('📥 RocketSMS ответ:', { ...logData, apiMs: Date.now() - t0 });

    if (!response.ok) {
      return false;
    }

    // Проверяем успешность ответа
    const isSuccess =
      responseData.status === 'ok' ||
      responseData.status === 'OK' ||
      responseData.status === 'success' ||
      responseData.status === 'SENT' ||
      responseData.success === true ||
      responseData.result === 'success' ||
      (responseData.id && responseData.id > 0) ||
      (responseData.message_id && responseData.message_id > 0);

    if (isSuccess) {
      console.log('✅ SMS отправлено через RocketSMS:', {
        messageId: responseData.id || responseData.message_id,
        to: fullPhone,
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Ошибка отправки SMS через RocketSMS:', error);
    return false;
  }
};

// Функция отправки SMS через sms.by API (Беларусь)
// ВАЖНО: Требуется регистрация альфа-имени "hockeystars" в sms.by
// После одобрения заявки на альфа-имя можно включить эту функцию
export const sendSMSViaSmsBy = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('🇧🇾 Отправляем SMS через sms.by API');
    console.log('ℹ️ Пробуем варианты с альфа-именем и без него (на случай работы до одобрения)');
    
    const apiKey = Constants.expoConfig?.extra?.smsByApiKey;
    
    if (!apiKey) {
      console.error('❌ sms.by API key не найден в конфигурации');
      return false;
    }
    
    // Форматируем номер для Беларуси (убираем +375, оставляем только цифры)
    const cleaned = phone.replace(/[^\d+]/g, '');
    let formattedPhone = cleaned;
    
    // Убираем +375 или 375, оставляем только номер
    if (formattedPhone.startsWith('+375')) {
      formattedPhone = formattedPhone.substring(4);
    } else if (formattedPhone.startsWith('375')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    // Формат для sms.by: 291234567 (9 цифр без кода страны)
    if (formattedPhone.length !== 9) {
      console.error('❌ Неверный формат номера для Беларуси:', formattedPhone);
      return false;
    }
    
    const message = plainOtpSmsBody(code);
    const fullPhone = `375${formattedPhone}`; // Полный номер с кодом страны (375296549728)
    const fullPhoneWithPlus = `+375${formattedPhone}`; // Полный номер с кодом страны и знаком + (+375296549728)
    
    // Пробуем разные варианты endpoints и методов для sms.by
    // Также пробуем с числовым отправителем (без альфа-имени) и без sender
    // ВАЖНО: Все endpoints возвращают 404. Возможно, нужен другой домен или формат.
    // После одобрения альфа-имени "Hockeystars" нужно проверить правильный endpoint в документации sms.by
    // Пробуем разные варианты endpoints sms.by
    // API ключ: REDACTED_HEX_SECRET
    // Документация: https://app.sms.by/api/docs
    const endpoints = [
      // Попробуем sendQuickSMS с системным именем SMSBY_DAY и номером со знаком +
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: 'SMSBY_DAY', useJson: true, useAlphaname: true, useBearerAuth: false, usePlusInPhone: true },
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: null, useJson: true, useAlphaname: false, useBearerAuth: false, usePlusInPhone: true },
      // Попробуем sendQuickSMS с авторизацией через заголовок Authorization: Bearer
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: null, useJson: true, useAlphaname: false, useBearerAuth: true, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: 'Hockeystars', useJson: true, useAlphaname: true, useBearerAuth: true, usePlusInPhone: false },
      // Попробуем sendQuickSMS с параметром token в теле
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: null, useJson: true, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: 'Hockeystars', useJson: true, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuickSMS', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuick', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/sendQuick', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      // Попробуем разные варианты доменов и путей
      { url: 'https://app.sms.by/v1/send', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/v1/send', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://sms.by/api/v1/send', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://sms.by/api/v1/send', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://api.sms.by/v1/send', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://api.sms.by/v1/send', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      // Стандартные варианты
      { url: 'https://app.sms.by/api/v1/send', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/send', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/send', method: 'POST' as const, sender: 'hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      // Альтернативный endpoint без версии
      { url: 'https://app.sms.by/api/send', method: 'POST' as const, sender: null, useJson: false, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/send', method: 'POST' as const, sender: 'Hockeystars', useJson: false, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false },
      // Попробуем JSON формат
      { url: 'https://app.sms.by/api/v1/send', method: 'POST' as const, sender: null, useJson: true, useAlphaname: false, useBearerAuth: false, usePlusInPhone: false },
      { url: 'https://app.sms.by/api/v1/send', method: 'POST' as const, sender: 'Hockeystars', useJson: true, useAlphaname: true, useBearerAuth: false, usePlusInPhone: false }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📤 Пробуем ${endpoint.method} ${endpoint.url}...`);
        
        let response: Response;
        
          // Пробуем разные форматы параметров для POST запроса
          let requestBody: string;
          let headers: Record<string, string>;
          
          // Выбираем формат номера телефона
          const phoneNumber = endpoint.usePlusInPhone ? fullPhoneWithPlus : fullPhone;
          
          if (endpoint.useJson) {
            // JSON формат
            const jsonData: any = {
              message: message,
              phone: phoneNumber
            };
            // Добавляем token только если не используем Bearer авторизацию
            if (!endpoint.useBearerAuth) {
              jsonData.token = apiKey;
            }
            // Используем alphaname вместо sender, если указан флаг useAlphaname
            if (endpoint.sender && endpoint.useAlphaname) {
              jsonData.alphaname = endpoint.sender;
            } else if (endpoint.sender) {
              jsonData.sender = endpoint.sender;
            }
            requestBody = JSON.stringify(jsonData);
            headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            };
            // Добавляем Bearer авторизацию, если указан флаг
            if (endpoint.useBearerAuth) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
          } else {
            // Form-urlencoded формат
            const formData = new URLSearchParams();
            // Добавляем token только если не используем Bearer авторизацию
            if (!endpoint.useBearerAuth) {
              formData.append('token', apiKey);
            }
            formData.append('message', message);
            formData.append('phone', phoneNumber);
            // Используем alphaname вместо sender, если указан флаг useAlphaname
            if (endpoint.sender && endpoint.useAlphaname) {
              formData.append('alphaname', endpoint.sender);
            } else if (endpoint.sender) {
              formData.append('sender', endpoint.sender);
            }
            requestBody = formData.toString();
            headers = {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            };
            // Добавляем Bearer авторизацию, если указан флаг
            if (endpoint.useBearerAuth) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }
          }
          
          console.log(`📤 sms.by POST запрос:`, {
            url: endpoint.url,
            body: requestBody,
            sender: endpoint.sender || 'не указан',
            format: endpoint.useJson ? 'JSON' : 'form-urlencoded',
            paramName: endpoint.useAlphaname ? 'alphaname' : 'sender',
            auth: endpoint.useBearerAuth ? 'Bearer token' : 'token in body'
          });
          
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: headers,
            body: requestBody
          });
        
        const responseText = await response.text();
        let responseData: any;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          // Если это HTML, обрезаем его для логов
          const isHtml = responseText.trim().startsWith('<');
          if (isHtml && responseText.length > 200) {
            responseData = { 
              raw: responseText.substring(0, 200) + '... (HTML обрезан)',
              isHtml: true,
              fullLength: responseText.length
            };
          } else {
            responseData = { raw: responseText };
          }
        }
        
        // Логируем только важную информацию
        const logData: any = {
          status: response.status,
          statusText: response.statusText
        };
        
        if (responseData.error) {
          logData.error = responseData.error;
        } else if (responseData.status) {
          logData.status_api = responseData.status;
        } else if (responseData.raw) {
          logData.response = typeof responseData.raw === 'string' && responseData.raw.length > 100 
            ? responseData.raw.substring(0, 100) + '...' 
            : responseData.raw;
        } else {
          logData.data = responseData;
        }
        
        console.log(`📥 sms.by ответ (${endpoint.method} ${endpoint.url}):`, logData);
        
        // Если получили 404, пробуем следующий endpoint
        if (response.status === 404) {
          console.log(`❌ ${endpoint.method} ${endpoint.url} вернул 404, пробуем следующий...`);
          continue;
        }
        
        // Если получили успешный ответ
        if (response.ok) {
          const isSuccess = responseData.status === 'ok' || 
                           responseData.status === 'OK' ||
                           responseData.success === true ||
                           responseData.success === 'true' ||
                           (responseData.message_id && responseData.message_id > 0) ||
                           (responseData.id && responseData.id > 0);
          
          if (isSuccess) {
            console.log(`✅ SMS отправлено через sms.by (${endpoint.method} ${endpoint.url}):`, {
              messageId: responseData.message_id || responseData.id,
              to: fullPhone
            });
            return true;
          }
        }
        
        // Если ответ не 404 и не успешный, но и не критическая ошибка - пробуем следующий
        if (response.status < 500) {
          console.log(`⚠️ ${endpoint.method} ${endpoint.url} вернул ${response.status}, пробуем следующий...`);
          continue;
        }
      } catch (error) {
        console.log(`❌ Ошибка при ${endpoint.method} ${endpoint.url}:`, error);
        continue;
      }
    }
    
    console.error('❌ Все варианты endpoints sms.by не сработали. Возможно, нужен другой API ключ или формат запроса.');
    return false;
  } catch (error) {
    console.error('❌ Ошибка отправки SMS через sms.by:', error);
    return false;
  }
};

// Функция отправки SMS через sms.ru API (Россия)
export const sendSMSViaSmsRu = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('🇷🇺 Отправляем SMS через sms.ru API');
    
    const apiKey = Constants.expoConfig?.extra?.smsRuApiKey;
    
    if (!apiKey) {
      console.error('❌ sms.ru API key не найден в конфигурации');
      return false;
    }
    
    // Форматируем номер для России (убираем +7, оставляем только цифры)
    const cleaned = phone.replace(/[^\d+]/g, '');
    let formattedPhone = cleaned;
    
    // Убираем +7 или 7, оставляем только номер
    if (formattedPhone.startsWith('+7')) {
      formattedPhone = formattedPhone.substring(2);
    } else if (formattedPhone.startsWith('7')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Формат для sms.ru: 9123456789 (10 цифр без кода страны)
    if (formattedPhone.length !== 10) {
      console.error('❌ Неверный формат номера для России:', formattedPhone);
      return false;
    }
    
    const message = plainOtpSmsBody(code);
    
    // Получаем номер отправителя из конфигурации (если указан)
    // ВАЖНО: По умолчанию НЕ передаем параметр from - sms.ru использует бесплатный канал
    const fromNumber = Constants.expoConfig?.extra?.smsRuFromNumber;
    
    // Формируем параметры запроса
    // ВАЖНО: sms.ru принимает номер в формате 79015919901 (с 7, но без +)
    const fullPhoneNumber = `7${formattedPhone}`;
    
    const params: Record<string, string> = {
      api_id: apiKey,
      to: fullPhoneNumber, // Полный номер с кодом страны: 79015919901
      msg: message,
      json: '1' // Получить ответ в JSON формате
    };
    
    // Пробуем использовать числовой отправитель, если указан
    // Если не указан, пробуем без from (бесплатный канал)
    // ВАЖНО: sms.ru может требовать буквенного отправителя для некоторых аккаунтов
    if (fromNumber && fromNumber.trim() !== '') {
      params.from = fromNumber.trim();
      console.log('📞 Используем указанный числовой отправитель:', fromNumber);
    } else {
      // Пробуем без параметра from - sms.ru должен использовать бесплатный канал
      // Но если это не работает (ошибка 221), нужно будет указать числовой отправитель в конфигурации
      console.log('ℹ️ Параметр from не передается - sms.ru использует бесплатный канал (без согласования имени)');
      console.log('💡 Если получаете ошибку 221, укажите числовой отправитель в app.json: smsRuFromNumber');
    }
    
    // API sms.ru
    const requestBody = new URLSearchParams(params).toString();
    console.log('📤 sms.ru запрос:', {
      url: 'https://sms.ru/sms/send',
      method: 'POST',
      body: requestBody
    });
    
    const response = await fetch('https://sms.ru/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody
    });
    
    const responseText = await response.text();
    console.log('📥 sms.ru raw ответ:', responseText);
    
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON ответа sms.ru:', e);
      console.error('📄 Raw ответ:', responseText);
      return false;
    }
    
    console.log('📥 sms.ru parsed ответ:', JSON.stringify(responseData, null, 2));
    
    // sms.ru может возвращать HTTP 200 даже при ошибках, проверяем status в ответе
    // Формат ответа: { status: "OK" | "ERROR", status_code: число, sms: { "79991234567": { status: "OK", ... } } }
    
    if (response.ok) {
      // Проверяем общий статус ответа
      if (responseData.status === 'OK') {
        // Проверяем статус каждого SMS
        // sms.ru возвращает ключ в том же формате, что мы отправили (79015919901)
        const phoneKey = fullPhoneNumber;
        const smsStatus = responseData.sms?.[phoneKey];
        
        if (smsStatus) {
          // Проверяем статус конкретного SMS
          // status_code 100 = успешно, другие коды = ошибки
          if (smsStatus.status === 'OK' || smsStatus.status_code === 100) {
            console.log('✅ SMS отправлено через sms.ru:', {
              messageId: smsStatus.sms_id,
              status: smsStatus.status,
              statusCode: smsStatus.status_code,
              to: phoneKey
            });
            return true;
          } else {
            console.error('❌ Ошибка отправки SMS через sms.ru:', {
              status: smsStatus.status,
              statusCode: smsStatus.status_code,
              statusText: smsStatus.status_text,
              phoneKey: phoneKey
            });
            return false;
          }
        } else {
          // Если нет sms объекта для нашего номера
          console.error('❌ SMS объект не найден в ответе для номера:', phoneKey);
          console.error('📋 Доступные ключи в sms:', Object.keys(responseData.sms || {}));
          return false;
        }
      } else {
        // Общий статус ERROR
        const statusCode = responseData.status_code;
        const statusText = responseData.status_text || responseData.error?.status_text;
        
        console.error('❌ Ошибка sms.ru API (общий статус ERROR):', {
          status: responseData.status,
          statusCode: statusCode,
          statusText: statusText,
          fullResponse: responseData
        });
        
        return false;
      }
    } else {
      // HTTP ошибка
      console.error('❌ HTTP ошибка sms.ru API:', {
        httpStatus: response.status,
        httpStatusText: response.statusText,
        response: responseData
      });
      
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки SMS через sms.ru:', error);
    return false;
  }
};

// Функция отправки кода через Callcheck (звонок) sms.ru
// Это альтернатива SMS, которая не требует согласования имени отправителя
export const sendSMSViaSmsRuCallcheck = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('📞 Отправляем код через sms.ru Callcheck (звонок)');
    
    const apiKey = Constants.expoConfig?.extra?.smsRuApiKey;
    
    if (!apiKey) {
      console.error('❌ sms.ru API key не найден в конфигурации');
      return false;
    }
    
    // Форматируем номер для России (убираем +7, оставляем только цифры)
    const cleaned = phone.replace(/[^\d+]/g, '');
    let formattedPhone = cleaned;
    
    // Убираем +7 или 7, оставляем только номер
    if (formattedPhone.startsWith('+7')) {
      formattedPhone = formattedPhone.substring(2);
    } else if (formattedPhone.startsWith('7')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Формат для sms.ru: 9123456789 (10 цифр без кода страны)
    if (formattedPhone.length !== 10) {
      console.error('❌ Неверный формат номера для России:', formattedPhone);
      return false;
    }
    
    // API sms.ru Callcheck - отправка кода через звонок
    // ВАЖНО: Callcheck требует код из 4 цифр, обрезаем 6-значный код до 4 последних цифр
    const callcheckCode = code.length >= 4 ? code.slice(-4) : code;
    
    console.log(`📞 Callcheck: используем 4-значный код (последние 4 цифры из ${code.length}-значного): ${callcheckCode}`);
    
    const response = await fetch('https://sms.ru/code/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_id: apiKey,
        phone: `7${formattedPhone}`, // Полный номер с кодом страны
        code: callcheckCode, // Код из 4 цифр, который будет продиктован в звонке
        json: '1' // Получить ответ в JSON формате
      }).toString()
    });
    
    const responseData = await response.json();
    
    if (response.ok && responseData.status === 'OK') {
      console.log('✅ Код отправлен через sms.ru Callcheck (звонок):', {
        callId: responseData.call_id,
        to: `7${formattedPhone}`
      });
      return true;
    } else {
      console.error('❌ Ошибка sms.ru Callcheck API:', {
        status: response.status,
        error: responseData
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки кода через sms.ru Callcheck:', error);
    return false;
  }
};

// Умная функция отправки SMS с выбором провайдера по стране
export const sendSMSViaProvider = async (phone: string, code: string): Promise<boolean> => {
  const country = getCountryFromPhone(phone);
  console.log(`🌍 Определена страна для ${phone}: ${country}`);

  // Беларусь: используем только RocketSMS
  if (country === 'BY') {
    console.log('🇧🇾 Беларусь - используем RocketSMS');
    const success = await sendSMSViaRocketSMS(phone, code);
    if (!success) {
      console.log('⚠️ RocketSMS не сработал для Беларуси. Код только в консоли, Twilio отключен для BY.');
    }
    return success;
  }
  
  // Россия: Notificore (2FA или SMS API, отправитель HockeyStars)
  if (country === 'RU') {
    console.log('🇷🇺 Россия - используем Notificore');
    const notificoreOk = await sendSMSViaNotificore(phone, code);
    if (!notificoreOk) {
      console.log('⚠️ Notificore не доставил SMS для России.');
    }
    return notificoreOk;
  }

  // США и Канада: не отправляем SMS, только email
  if (country === 'US' || country === 'CA') {
    console.log(`🇺🇸🇨🇦 ${country === 'US' ? 'США' : 'Канада'} - SMS отключены, используйте email`);
    return false; // Не отправляем SMS, только email
  }

  // KZ + остальные страны: RocketSMS (Twilio отключён)
  console.log(
    country === 'KZ'
      ? '🇰🇿 Казахстан - RocketSMS'
      : '🌍 Другая страна - RocketSMS'
  );
  return await sendSMSViaRocketSMS(phone, code);
};
