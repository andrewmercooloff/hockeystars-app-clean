import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

// SMS Service - React Native Compatible (using Twilio)
// Note: Twilio не работает напрямую в React Native, используем fetch API

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

    // Текст сообщения (упрощенный для многоязычности)
    const message = `Hockeystars code: ${code}`;

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
    
    // Текст сообщения
    const message = `Hockeystars code: ${code}`;

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

// Функция определения страны по номеру телефона
export const getCountryFromPhone = (phone: string): 'BY' | 'RU' | 'US' | 'CA' | 'OTHER' => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Беларусь: +375
  if (cleaned.startsWith('+375') || cleaned.startsWith('375')) {
    return 'BY';
  }
  
  // Россия: +7
  if (cleaned.startsWith('+7') || cleaned.startsWith('7')) {
    return 'RU';
  }
  
  // США и Канада: +1
  if (cleaned.startsWith('+1') || cleaned.startsWith('1')) {
    // Для простоты считаем все +1 как США (можно добавить более точное определение для Канады)
    return 'US';
  }
  
  return 'OTHER';
};

// Функция отправки SMS через RocketSMS API (Беларусь)
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

    // RocketSMS требует MD5-хеш пароля для авторизации (в нижнем регистре)
    const passwordHash = (await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      password
    )).toLowerCase();
    
    console.log('🔐 RocketSMS авторизация:', {
      login: login,
      passwordHashLength: passwordHash.length,
      passwordHashPreview: passwordHash.substring(0, 8) + '...'
    });

    // Форматируем номер для RocketSMS (поддерживаем Беларусь и Россию)
    const cleaned = phone.replace(/[^\d+]/g, '');
    let formattedPhone = cleaned;
    let fullPhone: string;

    // Беларусь: +375
    if (formattedPhone.startsWith('+375') || formattedPhone.startsWith('375')) {
      if (formattedPhone.startsWith('+375')) {
        formattedPhone = formattedPhone.substring(4);
      } else {
        formattedPhone = formattedPhone.substring(3);
      }
      if (formattedPhone.length !== 9) {
        console.error('❌ Неверный формат номера для Беларуси:', formattedPhone);
        return false;
      }
      fullPhone = `375${formattedPhone}`;
    }
    // Россия: +7
    else if (formattedPhone.startsWith('+7') || formattedPhone.startsWith('7')) {
      if (formattedPhone.startsWith('+7')) {
        formattedPhone = formattedPhone.substring(2);
      } else {
        formattedPhone = formattedPhone.substring(1);
      }
      if (formattedPhone.length !== 10) {
        console.error('❌ Неверный формат номера для России:', formattedPhone);
        return false;
      }
      fullPhone = `7${formattedPhone}`;
    } else {
      console.error('❌ RocketSMS поддерживает только Беларусь (+375) и Россию (+7)');
      return false;
    }

    const text = `Hockeystars code: ${code}`;

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

    console.log('📤 RocketSMS запрос:', {
      url: url.toString().replace(passwordHash, '***'),
      phone: fullPhone,
      hasSender: !!sender,
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json,text/plain,*/*',
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

    console.log('📥 RocketSMS ответ:', logData);

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
    
    const message = `Hockeystars code: ${code}`;
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
        
        if (endpoint.method === 'GET') {
          const url = new URL(endpoint.url);
          url.searchParams.append('token', apiKey);
          url.searchParams.append('message', message);
          url.searchParams.append('phone', fullPhone);
          // Добавляем sender только если он указан (может быть null для вариантов без альфа-имени)
          if (endpoint.sender) {
            url.searchParams.append('sender', endpoint.sender);
          }
          
          response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
        } else {
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
        }
        
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
    
    const message = `Hockeystars code: ${code}`;
    
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
  
  // Россия: используем только RocketSMS
  if (country === 'RU') {
    console.log('🇷🇺 Россия - используем RocketSMS');
    const success = await sendSMSViaRocketSMS(phone, code);
    if (!success) {
      console.log('⚠️ RocketSMS не сработал для России. Код только в консоли, Twilio отключен для RU.');
    }
    return success;
  }
  
  // США и Канада: не отправляем SMS, только email
  if (country === 'US' || country === 'CA') {
    console.log(`🇺🇸🇨🇦 ${country === 'US' ? 'США' : 'Канада'} - SMS отключены, используйте email`);
    return false; // Не отправляем SMS, только email
  }
  
  // Остальные страны: используем Twilio
  console.log('🌍 Другая страна - используем Twilio');
  return await sendSMSViaTwilio(phone, code);
};
