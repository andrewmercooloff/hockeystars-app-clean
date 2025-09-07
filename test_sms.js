// Тест отправки SMS через Twilio
const { sendVerificationSMS } = require('./utils/emailService');

async function testSMS() {
  console.log('🧪 Тестируем отправку SMS...');
  
  // Замените на ваш номер телефона для тестирования
  const testPhone = '+375291234567'; // Замените на реальный номер
  const testCode = '123456';
  
  try {
    const result = await sendVerificationSMS(testPhone, testCode);
    console.log('✅ Результат:', result);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testSMS();

