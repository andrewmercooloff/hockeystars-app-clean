// Resend Email Service - React Native Compatible (using fetch API)
// Note: Библиотека 'resend' не работает в React Native, используем fetch API
import Constants from 'expo-constants';

// Функция отправки email через Resend API
export const sendEmailViaResend = async (email: string, code: string): Promise<boolean> => {
  try {
    console.log('📧 Отправляем email через Resend API (fetch)');
    
    const apiKey = Constants.expoConfig?.extra?.resendApiKey;
    if (!apiKey) {
      // console.log('❌ RESEND_API_KEY не найден в конфигурации Expo');
      return false;
    }
    
    // console.log('✅ Resend API ключ найден в конфигурации');

    // HTML шаблон для email
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fa2f40; margin: 0;">🏒 HockeyStars</h1>
          <p style="color: #666; margin: 5px 0 0 0;">I'm gonna be a hockey star</p>
        </div>
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Код подтверждения</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">Ваш код подтверждения:</p>
          <h1 style="color: #fa2f40; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px;">${code}</h1>
        </div>
        
        <p style="color: #666; text-align: center; margin: 20px 0;">
          Код действителен <strong>10 минут</strong>.<br>
          Если вы не запрашивали этот код, просто проигнорируйте это письмо.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            С уважением,<br>
            Команда HockeyStars
          </p>
        </div>
      </div>
    </div>`;

    // Отправляем email через Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HockeyStars <onboarding@resend.dev>',
        to: [email],
        subject: 'Код подтверждения HockeyStars',
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Ошибка Resend API:', result);
      return false;
    }

    // console.log('✅ Email отправлен через Resend API');
    console.log('📧 Message ID:', result.id);
    return true;

  } catch (error) {
    console.error('❌ Ошибка отправки email через Resend:', error);
    return false;
  }
};

// Инструкция по настройке Resend API
export const getResendSetupInstructions = () => `
📧 НАСТРОЙКА RESEND API ДЛЯ HOCKEYSTARS

1. 🔐 Получение API ключа:
   - Зарегистрируйтесь на https://resend.com
   - Создайте API ключ в Dashboard
   - Скопируйте ключ (начинается с re_)

2. 🌐 Настройка переменных окружения:
   export RESEND_API_KEY=re_your_api_key_here

3. ✅ Преимущества Resend:
   - Работает в React Native (через fetch API)
   - Простой API
   - Хорошая доставляемость
   - Бесплатный план: 3000 писем/месяц

4. 📱 Для мобильного приложения:
   - Добавьте API ключ в переменные окружения
   - Или используйте Supabase Edge Function
`;

// Проверка настройки Resend API
export const checkResendConfig = () => {
  const apiKey = Constants.expoConfig?.extra?.resendApiKey;
  if (!apiKey) {
    console.warn(`
    ⚠️ ВНИМАНИЕ: RESEND_API_KEY не настроен в app.json
    
    Добавьте в app.json:
    "extra": {
      "resendApiKey": "re_your_api_key_here"
    }
    
    Или используйте Supabase Edge Function
    `);
    return false;
  }
  return true;
};