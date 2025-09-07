import { supabase } from './supabase';
// Email функции удалены - используется только SMS авторизация
import { sendSMSViaTwilio } from './smsService';

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

// Создание таблицы если её нет
const ensureTableExists = async (): Promise<boolean> => {
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
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка проверки таблицы:', error);
    return false;
  }
};

// Сохранение кода подтверждения в базе данных
export const saveVerificationCode = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log('💾 Сохраняем код подтверждения для:', email);
    
    // Проверяем существование таблицы
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      console.error('❌ Таблица email_verification_codes не существует!');
      console.log('📝 Создайте таблицу в Supabase Dashboard:');
      console.log(`
CREATE TABLE email_verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
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
      .eq('email', email);
    
    // Создаем новый код с истечением через 10 минут
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt
      });
    
    if (error) {
      console.error('❌ Ошибка сохранения кода:', error);
      return false;
    }
    
    console.log('✅ Код подтверждения сохранен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения кода подтверждения:', error);
    return false;
  }
};

// Проверка кода подтверждения
export const verifyCode = async (email: string, inputCode: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🔍 Проверяем код для:', email);
    
    // Ищем активный код для этого email (упрощенная версия)
    const { data: codes, error } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка поиска кода:', error);
      return { success: false, message: 'Ошибка проверки кода' };
    }
    
    if (!codes || codes.length === 0) {
      return { success: false, message: 'Код не найден или истек. Запросите новый код.' };
    }
    
    const verificationRecord = codes[0];
    
    // Проверяем код
    if (verificationRecord.code !== inputCode) {
      return { 
        success: false, 
        message: 'Неверный код. Попробуйте еще раз.' 
      };
    }
    
    // Код верный - удаляем запись (вместо пометки как использованная)
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('id', verificationRecord.id);
    
    console.log('✅ Код подтвержден успешно');
    return { success: true, message: 'Код подтвержден успешно' };
    
  } catch (error) {
    console.error('❌ Ошибка проверки кода:', error);
    return { success: false, message: 'Ошибка проверки кода' };
  }
};

// Отправка SMS с кодом подтверждения
export const sendVerificationSMS = async (phoneNumber: string, code: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем код подтверждения на:', phoneNumber);

    // Пробуем SMS через Twilio
    const smsSuccess = await sendSMSViaTwilio(phoneNumber, code);
    if (smsSuccess) {
      return true;
    }

    // Если SMS не работает, показываем fallback с кодом
    console.log('⚠️ SMS недоступен, показываем fallback');
    return await sendSMSFallback(phoneNumber, code);
  } catch (error) {
    console.error('❌ Ошибка отправки SMS:', error);
    return await sendSMSFallback(phoneNumber, code);
  }
};

// Функция sendVerificationEmail удалена - используется только SMS авторизация

// Email функции удалены - используется только SMS авторизация

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
