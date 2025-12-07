import Constants from 'expo-constants';

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
