// Скрипт для тестирования Gmail SMTP
const nodemailer = require('nodemailer');

// Настройки SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true для 465, false для других портов
  auth: {
    user: 'hockeystars.by@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD // Используем переменную окружения
  },
  tls: {
    rejectUnauthorized: false // Только для разработки, в production должно быть true
  }
});

async function testGmailSMTP() {
  console.log('🧪 Тестируем Gmail SMTP для HockeyStars\n');

  // Проверяем наличие App Password
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.error(`
    ❌ ОШИБКА: Не установлен App Password
    
    Установите переменную окружения:
    export GMAIL_APP_PASSWORD=ваш_16_значный_пароль
    
    Как получить App Password:
    1. Включите двухфакторную аутентификацию
    2. Перейдите в настройки Google Account
    3. Создайте App Password для приложения
    `);
    process.exit(1);
  }

  const testEmail = 'test@example.com';
  const testCode = '123456';

  try {
    console.log('📧 Отправляем тестовый email...');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Код:', testCode);

    // HTML шаблон для email
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF4444; margin: 0;">🏒 HockeyStars</h1>
          <p style="color: #666; margin: 5px 0 0 0;">I'm gonna be a hockey star</p>
        </div>
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Код подтверждения</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">Ваш код подтверждения:</p>
          <h1 style="color: #FF4444; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px;">${testCode}</h1>
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

    // Отправляем email
    const info = await transporter.sendMail({
      from: '"HockeyStars" <hockeystars.by@gmail.com>',
      to: testEmail,
      subject: 'Код подтверждения HockeyStars',
      html: htmlContent
    });

    console.log('\n📊 Результат отправки:');
    console.log('✅ Email успешно отправлен');
    console.log('📧 Message ID:', info.messageId);
    console.log('📨 Accepted:', info.accepted);
    console.log('📭 Rejected:', info.rejected);

    console.log('\n🎉 Gmail SMTP настроен успешно!');
    console.log('Проверьте почту на наличие тестового письма.');

  } catch (error) {
    console.error('\n❌ ОШИБКА отправки email:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Возможные причины ошибки:');
      console.log('1. Неправильный App Password');
      console.log('2. Двухфакторная аутентификация не включена');
      console.log('3. Доступ приложения заблокирован');
    }
  }
}

// Запуск теста
testGmailSMTP();
