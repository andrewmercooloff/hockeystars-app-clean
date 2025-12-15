import Constants from 'expo-constants';

/**
 * Twilio Verify Service
 * Использует Verify API вместо обычного Messaging для отправки кодов верификации
 * 
 * Преимущества:
 * - Встроенная защита от fraud (SMS Pumping)
 * - Автоматическое управление кодами
 * - Дешевле для верификации
 * - Логи в разделе Verify
 */

// Форматирование номера телефона
const formatPhoneNumber = (phone: string): string => {
  // Убираем все символы кроме + и цифр
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Отправка кода верификации через Twilio Verify API
 * @param phone - Номер телефона в формате E.164 (+1234567890)
 * @returns Promise<boolean> - true если код отправлен успешно
 */
export const sendVerificationCode = async (phone: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const verifyServiceSid = Constants.expoConfig?.extra?.twilioVerifyServiceSid;
    
    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error('❌ Twilio Verify credentials не настроены');
      return { success: false, error: 'Twilio not configured' };
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log('📱 Отправляем код через Twilio Verify API');
    console.log('   To:', formattedPhone);
    console.log('   Service:', verifyServiceSid);
    
    // Twilio Verify API - создание верификации
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: `To=${encodeURIComponent(formattedPhone)}&Channel=sms`
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.status === 'pending') {
      console.log('✅ Код верификации отправлен через Twilio Verify');
      console.log('   SID:', data.sid);
      console.log('   Status:', data.status);
      return { success: true };
    } else {
      console.error('❌ Ошибка Twilio Verify:', data);
      return { 
        success: false, 
        error: data.message || 'Failed to send verification' 
      };
    }
  } catch (error) {
    console.error('❌ Ошибка отправки кода:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Проверка кода верификации через Twilio Verify API
 * @param phone - Номер телефона в формате E.164
 * @param code - Код введённый пользователем
 * @returns Promise<{ success: boolean; error?: string }>
 */
export const checkVerificationCode = async (
  phone: string, 
  code: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const verifyServiceSid = Constants.expoConfig?.extra?.twilioVerifyServiceSid;
    
    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error('❌ Twilio Verify credentials не настроены');
      return { success: false, error: 'Twilio not configured' };
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log('🔐 Проверяем код через Twilio Verify API');
    console.log('   To:', formattedPhone);
    console.log('   Code:', code);
    
    // Twilio Verify API - проверка кода
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: `To=${encodeURIComponent(formattedPhone)}&Code=${encodeURIComponent(code)}`
      }
    );
    
    const data = await response.json();
    
    if (response.ok && data.status === 'approved') {
      console.log('✅ Код подтверждён через Twilio Verify');
      return { success: true };
    } else if (data.status === 'pending') {
      console.log('❌ Неверный код');
      return { success: false, error: 'Invalid code' };
    } else {
      console.error('❌ Ошибка проверки:', data);
      return { 
        success: false, 
        error: data.message || 'Verification failed' 
      };
    }
  } catch (error) {
    console.error('❌ Ошибка проверки кода:', error);
    return { success: false, error: 'Network error' };
  }
};

/**
 * Проверка настройки Twilio Verify
 */
export const checkTwilioVerifyConfig = (): boolean => {
  const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
  const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
  const verifyServiceSid = Constants.expoConfig?.extra?.twilioVerifyServiceSid;
  
  if (!accountSid || !authToken || !verifyServiceSid) {
    console.warn('⚠️ Twilio Verify не настроен. Добавьте twilioVerifyServiceSid в app.json');
    return false;
  }
  
  console.log('✅ Twilio Verify настроен');
  return true;
};
