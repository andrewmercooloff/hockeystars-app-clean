import { getSupabaseFunctionUrl, supabase, supabaseAnonKey, supabaseFetch } from './supabase';
// SMS провайдеры
import { sendSMSViaTwilio } from './smsService';
// Twilio Verify отключен - используем только проверку через БД

// Интерфейс для кода подтверждения
export interface VerificationCode {
  id?: number;
  email: string;
  code: string;
  created_at?: string;
  expires_at: string;
  used?: boolean;
  attempts?: number;
  max_attempts?: number;
}

// Генерация 6-значного кода
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/** Единый ключ для email/телефона в email_verification_codes (RU: 79001234567). */
export const normalizeVerificationContact = (contact: string): string => {
  const trimmed = contact.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const cleaned = trimmed.replace(/\s/g, '').replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+375') || cleaned.startsWith('375')) {
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
  if (cleaned.startsWith('+7')) {
    const national = cleaned.slice(2);
    if (national.length === 10) return `7${national}`;
  } else if (cleaned.startsWith('7') && cleaned.length === 11) {
    return cleaned;
  } else if (cleaned.startsWith('8') && cleaned.length === 11) {
    return `7${cleaned.slice(1)}`;
  }
  return trimmed.replace(/\s/g, '');
};

const NOTIFICORE_2FA_TTL_MS = 10 * 60 * 1000;
const notificore2faAuthByContact = new Map<string, { authId: string; expiresAt: number }>();

const rememberNotificore2faAuth = (contact: string, authId: string): void => {
  notificore2faAuthByContact.set(normalizeVerificationContact(contact), {
    authId,
    expiresAt: Date.now() + NOTIFICORE_2FA_TTL_MS,
  });
};

const recallNotificore2faAuth = (contact: string): string | null => {
  const key = normalizeVerificationContact(contact);
  const entry = notificore2faAuthByContact.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    notificore2faAuthByContact.delete(key);
    return null;
  }
  return entry.authId;
};

const extractNotificore2faAuthId = (savedCode: string): string | null => {
  if (!savedCode.startsWith('2FA:')) return null;
  const authId = savedCode.slice(4);
  // UUID auth id — если в БД VARCHAR(6), значение обрезано и бесполезно
  return authId.length >= 32 ? authId : null;
};

// Создание таблицы если её нет
let verificationTableVerified = false;

const ensureTableExists = async (): Promise<boolean> => {
  if (verificationTableVerified) {
    return true;
  }
  try {
    // Пробуем выполнить простой запрос к таблице
    const { error } = await supabase
      .from('email_verification_codes')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📊 Создаем таблицу email_verification_codes...');
      // Таблица не существует, но мы не можем создать её через JS
      // Возвращаем false чтобы показать инструкцию пользователю
      return false;
    }

    verificationTableVerified = true;
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки таблицы:', error);
    return false;
  }
};

// Сохранение кода подтверждения в базе данных
export const saveVerificationCode = async (email: string, code: string): Promise<boolean> => {
  try {
    const contactKey = normalizeVerificationContact(email);
    console.log('💾 Сохраняем код подтверждения для:', contactKey);
    
    // Проверяем существование таблицы
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      console.error('❌ Таблица email_verification_codes не существует!');
      console.log('📝 Создайте таблицу в Supabase Dashboard:');
      console.log(`
CREATE TABLE email_verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5
);
      `);
      return false;
    }
    
    // Удаляем старые коды для этого email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', contactKey);
    
    // Создаем новый код с истечением через 10 минут
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('email_verification_codes')
      .insert({
        email: contactKey,
        code,
        expires_at: expiresAt
      });
    
    if (error) {
      console.error('❌ Ошибка сохранения кода:', error);
      return false;
    }
    
    // console.log('✅ Код подтверждения сохранен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения кода подтверждения:', error);
    return false;
  }
};

// Проверка секретного кода администратора
// contact может быть phone или email (для США/Канады)
export const verifyAdminSecretCode = (contact: string, inputCode: string): { success: boolean; message: string; translationKey?: string } => {
  try {
    console.log('🔐 Проверяем секретный код администратора для:', contact);
    
    // Секретный код для тестирования (App Store ревьюеры)
    const secretCode = '291019';
    
    // Проверяем, является ли введенный код секретным кодом
    if (inputCode === secretCode) {
      return { 
        success: true, 
        message: 'auth.codeVerified',
        translationKey: 'auth.codeVerified'
      };
    }
    
    return { 
      success: false, 
      message: 'auth.codeInvalid',
      translationKey: 'auth.codeInvalid'
    };
    
  } catch (error) {
    console.error('❌ Ошибка проверки секретного кода:', error);
    return { 
      success: false, 
      message: 'auth.codeVerificationError',
      translationKey: 'auth.codeVerificationError'
    };
  }
};

// Проверка кода подтверждения
export const verifyCode = async (email: string, inputCode: string): Promise<{ success: boolean; message: string; translationKey?: string }> => {
  try {
    const contactKey = normalizeVerificationContact(email);
    
    // Сначала проверяем, не является ли это секретным кодом администратора
    const adminCheck = verifyAdminSecretCode(contactKey, inputCode);
    if (adminCheck.success) {
      return adminCheck;
    }
    
    // Ищем активный код для этого email (упрощенная версия)
    const { data: codes, error } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', contactKey)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка поиска кода:', error);
      return { success: false, message: 'auth.codeVerificationError', translationKey: 'auth.codeVerificationError' };
    }
    
    if (!codes || codes.length === 0) {
      const cachedAuthId = recallNotificore2faAuth(contactKey);
      if (cachedAuthId) {
        const { verifyNotificore2faOtp } = await import('./smsService');
        const verified = await verifyNotificore2faOtp(cachedAuthId, inputCode);
        if (verified) {
          notificore2faAuthByContact.delete(contactKey);
          return { success: true, message: 'auth.codeVerified', translationKey: 'auth.codeVerified' };
        }
        return {
          success: false,
          message: 'auth.codeInvalid',
          translationKey: 'auth.codeInvalid',
        };
      }
      return { success: false, message: 'auth.codeNotFoundOrExpired', translationKey: 'auth.codeNotFoundOrExpired' };
    }
    
    const verificationRecord = codes[0];
    const savedCode = verificationRecord.code;

    // Notificore 2FA: код генерирует провайдер, проверяем через их API
    const authIdFromDb = extractNotificore2faAuthId(savedCode);
    const authId = authIdFromDb ?? recallNotificore2faAuth(contactKey);
    if (authId) {
      const { verifyNotificore2faOtp } = await import('./smsService');
      const verified = await verifyNotificore2faOtp(authId, inputCode);
      if (!verified) {
        return {
          success: false,
          message: 'auth.codeInvalid',
          translationKey: 'auth.codeInvalid',
        };
      }
      notificore2faAuthByContact.delete(contactKey);
      await supabase.from('email_verification_codes').delete().eq('id', verificationRecord.id);
      return { success: true, message: 'auth.codeVerified', translationKey: 'auth.codeVerified' };
    }

    // Проверяем код
    // Поддерживаем два варианта:
    // 1. Полный код (6 цифр) - для обычных SMS
    // 2. Последние 4 цифры - для Callcheck (звонок через sms.ru)
    const isFullCodeMatch = savedCode === inputCode;
    const isLast4DigitsMatch = savedCode.length >= 4 && savedCode.slice(-4) === inputCode;
    
    if (!isFullCodeMatch && !isLast4DigitsMatch) {
      return { 
        success: false, 
        message: 'auth.codeInvalid',
        translationKey: 'auth.codeInvalid'
      };
    }
    
    // Код верный - удаляем запись (вместо пометки как использованная)
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('id', verificationRecord.id);
    
    // console.log('✅ Код подтвержден успешно');
    return { success: true, message: 'auth.codeVerified', translationKey: 'auth.codeVerified' };
    
  } catch (error) {
    console.error('❌ Ошибка проверки кода:', error);
    return { success: false, message: 'auth.codeVerificationError', translationKey: 'auth.codeVerificationError' };
  }
};

// Проверка СНГ номера (дорогой Verify)
const isCISNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  const cisCountryCodes = ['+375', '+7', '+380', '+992', '+993', '+994', '+995', '+996', '+998', '+373', '+374'];
  
  for (const code of cisCountryCodes) {
    if (cleaned.startsWith(code)) return true;
  }
  
  // Без + (для России/Беларуси)
  if (cleaned.startsWith('375') || cleaned.startsWith('7') || cleaned.startsWith('380')) return true;
  
  return false;
};

// Отправка кода подтверждения
// BY → RocketSMS, RU → Notificore (NTF), KZ → Twilio, остальные → Twilio
const dispatchVerificationSms = async (
  phoneNumber: string,
  code: string,
  country: ReturnType<typeof import('./smsService').getCountryFromPhone>
): Promise<void> => {
  try {
    const { sendSMSViaProvider } = await import('./smsService');
    const smsSuccess = await sendSMSViaProvider(phoneNumber, code);
    if (smsSuccess) {
      console.log('✅ SMS принят провайдером');
      return;
    }
    const provider = country === 'BY' ? 'RocketSMS' : country === 'RU' ? 'Notificore' : 'Twilio';
    console.warn(
      `⚠️ ${provider} не принял SMS (код уже сохранён в БД — можно нажать «Отправить снова»)`
    );
  } catch (error) {
    console.warn('⚠️ Фоновая отправка SMS:', error);
  }
};

export const sendVerificationSMS = async (phoneNumber: string, _code?: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем код подтверждения на:', phoneNumber);

    const code = _code || generateVerificationCode();
    const { sendSMSViaProvider, getCountryFromPhone, takeNotificore2faAuthId, isNotificore2faConfigured } =
      await import('./smsService');
    const country = getCountryFromPhone(phoneNumber);

    // Notificore 2FA: код генерирует провайдер — нужен синхронный ответ API
    if (country === 'RU' && isNotificore2faConfigured()) {
      const smsSuccess = await sendSMSViaProvider(phoneNumber, code);
      if (smsSuccess) {
        const notificore2faAuthId = takeNotificore2faAuthId();
        if (notificore2faAuthId) {
          rememberNotificore2faAuth(phoneNumber, notificore2faAuthId);
          const saved = await saveVerificationCode(phoneNumber, `2FA:${notificore2faAuthId}`);
          if (!saved) {
            console.warn(
              '⚠️ 2FA auth id не сохранился в БД (ALTER code VARCHAR(64)) — проверка через кэш приложения'
            );
          }
        } else {
          console.warn('⚠️ Notificore 2FA без auth id — сохраняем локальный код (проверка может не сработать)');
          await saveVerificationCode(phoneNumber, code);
        }
        console.log('✅ Код отправлен успешно (Notificore 2FA)');
        return true;
      }
      console.log('⚠️ Notificore 2FA не сработал для России, Twilio ОТКЛЮЧЕН. Показываем код только в консоли.');
      return await sendSMSFallback(phoneNumber, code);
    }

    // Быстрый путь: сохраняем код в БД и сразу показываем экран ввода; SMS — в фоне
    const saved = await saveVerificationCode(phoneNumber, code);
    if (!saved) {
      console.error('❌ Не удалось сохранить код в БД');
      return false;
    }

    void dispatchVerificationSms(phoneNumber, code, country);
    console.log('✅ Код сохранён, SMS отправляется в фоне');
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
    return await sendSMSFallback(phoneNumber, _code || '------');
  }
};

// Проверка SMS кода через БД (Twilio Verify отключен)
export const verifySMSCode = async (
  phoneNumber: string, 
  inputCode: string
): Promise<{ success: boolean; message: string; translationKey?: string }> => {
  try {
    console.log('🔐 Проверяем код через БД для:', phoneNumber);
    // Всегда используем проверку через БД (коды сохраняются при отправке через SMS)
    return await verifyCode(phoneNumber, inputCode);
    
  } catch (error) {
    console.error('❌ Ошибка проверки кода:', error);
    return { 
      success: false, 
      message: 'auth.codeVerificationError', 
      translationKey: 'auth.codeVerificationError' 
    };
  }
};

// Отправка email через Supabase Edge Function (используем существующую функцию send-verification-email)
export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log('📧 Отправляем код подтверждения на email:', email);
    
    // Используем Supabase SDK для вызова Edge Function (как в parentalConsentService)
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        email,
        code,
        subject: 'HockeyStars Verification Code'
      }
    });
    
    if (error) {
      console.error('❌ Ошибка вызова Edge Function:', error);
      // Пробуем прямой fetch как fallback
      return await sendVerificationEmailFallback(email, code);
    }
    
    if (data && data.success) {
      console.log('✅ Email отправлен успешно через Edge Function');
      return true;
    } else {
      console.error('❌ Ошибка отправки email:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error);
    // Пробуем прямой fetch как fallback
    return await sendVerificationEmailFallback(email, code);
  }
};

// Fallback: прямой вызов через fetch (если SDK не работает)
const sendVerificationEmailFallback = async (email: string, code: string): Promise<boolean> => {
  try {
    const response = await supabaseFetch(getSupabaseFunctionUrl('send-email'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        subject: 'HockeyStars Verification Code'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Email отправлен успешно через fallback');
      return true;
    } else {
      console.error('❌ Ошибка отправки email (fallback):', result);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки email (fallback):', error);
    return false;
  }
};

// Fallback функция для показа SMS кода в консоли
const sendSMSFallback = async (phoneNumber: string, code: string): Promise<boolean> => {
  console.log(`
  ═══════════════════════════════════
  🎯 РЕЖИМ РАЗРАБОТКИ - КОД В КОНСОЛИ
  ═══════════════════════════════════
  📱 PHONE: ${phoneNumber}
  🔑 КОД ПОДТВЕРЖДЕНИЯ: ${code}
  ⏰ Действителен 10 минут
  
  ⚠️  Все методы отправки SMS недоступны
  ✅ Используйте код выше для входа в приложение
  
  💡 Для настройки production отправки:
  1. Twilio SMS (рекомендуется) - настройте в app.json
  2. Twilio WhatsApp (опционально)
  3. Другие SMS провайдеры
  
  ═══════════════════════════════════
  `);

  await saveVerificationCode(phoneNumber, code);
  return true;
};

// Email fallback функция удалена - используется только SMS авторизация



// Очистка старых кодов (можно вызывать периодически)
export const cleanupExpiredCodes = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('email_verification_codes')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('❌ Ошибка очистки старых кодов:', error);
    } else {
      console.log('🧹 Старые коды очищены');
    }
  } catch (error) {
    console.error('❌ Ошибка очистки старых кодов:', error);
  }
};
