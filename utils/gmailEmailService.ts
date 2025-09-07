// Gmail Email Service - React Native Compatible Version
// Note: nodemailer не работает в React Native, поэтому используем заглушку

// Функция отправки verification email через Gmail SMTP
export const sendEmailViaGmail = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log('📧 Gmail SMTP недоступен в React Native окружении');
    
    console.warn(`
    ⚠️ ВНИМАНИЕ: Gmail SMTP не может работать в мобильном приложении!
    
    Причины:
    1. nodemailer требует Node.js модули (events, crypto, etc.)
    2. React Native не поддерживает Node.js стандартную библиотеку
    3. SMTP соединения должны выполняться на сервере
    
    Решения:
    1. Используйте Cloudflare Worker (уже настроен)
    2. Используйте Supabase Edge Function
    3. Создайте собственный API endpoint
    4. Используйте Resend API или SendGrid
    
    Подробности: https://docs.expo.dev/workflow/using-libraries/
    `);
    
    // Возвращаем false чтобы перейти к fallback
    return false;
    
  } catch (error) {
    console.error('❌ Ошибка Gmail SMTP:', error);
    return false;
  }
};

// Инструкция по настройке (для серверного использования)
export const getGmailSMTPInstructions = () => `
📧 НАСТРОЙКА GMAIL SMTP ДЛЯ HOCKEYSTARS (СЕРВЕРНАЯ ВЕРСИЯ)

⚠️ ВАЖНО: Этот код предназначен для серверного использования!

1. 🔐 Создание App Password:
   - Включите двухфакторную аутентификацию
   - Создайте App Password в Google Account
   - Скопируйте 16-значный пароль

2. 🌐 Настройка переменных окружения:
   export GMAIL_APP_PASSWORD=ваш_app_password

3. 🚀 Установка зависимостей (только на сервере):
   npm install nodemailer @types/nodemailer

4. 📱 Для мобильного приложения используйте:
   - Cloudflare Worker (рекомендуется)
   - Supabase Edge Function
   - Собственный API endpoint
`;

// Проверка корректности настройки
export const checkGmailSMTPConfig = () => {
  console.warn(`
  ⚠️ Gmail SMTP недоступен в React Native окружении
  
  Используйте альтернативные решения:
  1. Cloudflare Worker (уже настроен)
  2. Supabase Edge Function
  3. Собственный API endpoint
  `);
  return false;
};