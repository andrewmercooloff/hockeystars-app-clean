import Constants from 'expo-constants';

// SMS Service - React Native Compatible (using Twilio)
// Note: Twilio не работает напрямую в React Native, используем fetch API

// Функция форматирования номера телефона
const formatPhoneNumber = (phone: string): string => {
  // Удаляем все символы, кроме цифр
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Если номер начинается с 80 или 375, заменяем на +375
  if (cleanPhone.startsWith('80') || cleanPhone.startsWith('375')) {
    return `+375${cleanPhone.slice(-9)}`;
  }
  
  // Если номер уже международный, возвращаем как есть
  if (cleanPhone.startsWith('+')) {
    return phone;
  }
  
  // Если номер локальный, добавляем код страны
  return `+375${cleanPhone}`;
};

// Функция отправки SMS через Twilio API
export const sendSMSViaTwilio = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем SMS через Twilio API');
    
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const twilioPhoneNumber = Constants.expoConfig?.extra?.twilioFromNumber;
    
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.log('❌ Twilio credentials не найдены в конфигурации Expo');
      return false;
    }
    
    console.log('✅ Twilio credentials найдены в конфигурации Expo');

    const formattedPhone = formatPhoneNumber(phone);

    // Текст сообщения (упрощенный для многоязычности)
    const message = `Hockeystars code: ${code}`;

    // Формируем тело запроса вручную для React Native совместимости
    const body = `From=${encodeURIComponent(twilioPhoneNumber)}&To=${encodeURIComponent(formattedPhone)}&Body=${encodeURIComponent(message)}`;
    
    console.log('📤 Отправляем запрос в Twilio:');
    console.log('   URL:', `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);
    console.log('   From:', twilioPhoneNumber);
    console.log('   To:', formattedPhone);
    console.log('   Body:', message);

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
      console.log('✅ SMS отправлено успешно:', responseData);
      return true;
    } else {
      console.error('❌ Ошибка Twilio API:', responseData);
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
      console.log('❌ Twilio WhatsApp credentials не найдены в конфигурации Expo');
      return false;
    }
    
    console.log('✅ Twilio WhatsApp credentials найдены в конфигурации');

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
    const body = `From=${encodeURIComponent(whatsappFrom)}&To=${encodeURIComponent(whatsappTo)}&Body=${encodeURIComponent(message)}`;
    
    console.log('📤 Отправляем WhatsApp запрос в Twilio:');
    console.log('   URL:', `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);
    console.log('   From:', whatsappFrom);
    console.log('   To:', whatsappTo);
    console.log('   Body:', message);
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

    console.log('✅ WhatsApp отправлен через Twilio');
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
