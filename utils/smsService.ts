// SMS Service - React Native Compatible (using Twilio)
// Note: Twilio не работает напрямую в React Native, используем fetch API
import Constants from 'expo-constants';

// Функция отправки SMS через Twilio API
export const sendSMSViaTwilio = async (phoneNumber: string, code: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем SMS через Twilio API');
    
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const fromNumber = Constants.expoConfig?.extra?.twilioFromNumber;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.log('❌ Twilio credentials не найдены в конфигурации Expo');
      return false;
    }
    
    console.log('✅ Twilio credentials найдены в конфигурации');

    // Форматируем номер телефона (добавляем +375 для Беларуси, если нужно)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('📱 Форматированный номер для SMS:', formattedPhone);
    
    if (!formattedPhone || formattedPhone.length < 10) {
      console.error('❌ Неверный формат номера телефона:', formattedPhone);
      return false;
    }
    
    // Текст сообщения (упрощенный для многоязычности)
    const message = `Hockeystars code: ${code}`;

    // Формируем тело запроса вручную для React Native совместимости
    const body = `From=${encodeURIComponent(fromNumber)}&To=${encodeURIComponent(formattedPhone)}&Body=${encodeURIComponent(message)}`;
    
    console.log('📤 Отправляем запрос в Twilio:');
    console.log('   URL:', `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`);
    console.log('   From:', fromNumber);
    console.log('   To:', formattedPhone);
    console.log('   Body:', message);
    console.log('   Body (encoded):', body);

    // Отправляем SMS через Twilio API
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
      console.error('❌ Ошибка Twilio API:', result);
      return false;
    }

    console.log('✅ SMS отправлено через Twilio');
    console.log('📱 Message SID:', result.sid);
    return true;

  } catch (error) {
    console.error('❌ Ошибка отправки SMS через Twilio:', error);
    return false;
  }
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
    const message = `🏒 *HockeyStars*\n\nВаш код подтверждения: *${code}*\n\nКод действителен 10 минут.\n\nЕсли вы не запрашивали этот код, проигнорируйте сообщение.`;

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

// Функция форматирования номера телефона
const formatPhoneNumber = (phone: string): string => {
  console.log('🔍 Форматируем номер:', phone);
  
  // Убираем все нецифровые символы
  const cleaned = phone.replace(/\D/g, '');
  console.log('🧹 Очищенный номер:', cleaned);
  
  // Если номер уже начинается с +, возвращаем как есть
  if (phone.startsWith('+')) {
    console.log('✅ Номер уже с +:', phone);
    return phone;
  }
  
  // Если номер начинается с 375 (Беларусь), добавляем +
  if (cleaned.startsWith('375') && cleaned.length === 12) {
    const formatted = `+${cleaned}`;
    console.log('🇧🇾 Белорусский номер:', formatted);
    return formatted;
  }
  
  // Если номер начинается с 7 (Россия), заменяем на +7
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    const formatted = `+${cleaned}`;
    console.log('🇷🇺 Российский номер:', formatted);
    return formatted;
  }
  
  // Если номер начинается с 80 (Беларусь без кода страны)
  if (cleaned.startsWith('80') && cleaned.length === 11) {
    const formatted = `+375${cleaned.substring(2)}`;
    console.log('🇧🇾 Белорусский номер (80):', formatted);
    return formatted;
  }
  
  // Если номер короткий (9 цифр), добавляем +375
  if (cleaned.length === 9) {
    const formatted = `+375${cleaned}`;
    console.log('🇧🇾 Короткий белорусский номер:', formatted);
    return formatted;
  }
  
  // По умолчанию добавляем +375 для белорусских номеров
  const formatted = `+375${cleaned}`;
  console.log('🔧 Номер по умолчанию:', formatted);
  return formatted;
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
