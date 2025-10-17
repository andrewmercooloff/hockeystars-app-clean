// Быстрый тест Cloudflare Worker
const WORKER_URL = 'https://hockeystars-by-email.am654.workers.dev'; // Ваш реальный Worker URL

async function quickTest() {
  console.log('🚀 Быстрый тест Cloudflare Worker');
  console.log('🔗 URL:', WORKER_URL);
  
  if (WORKER_URL === 'ВСТАВЬТЕ_СЮДА_ВАШ_WORKER_URL') {
    console.log('❌ Обновите WORKER_URL в файле!');
    return;
  }
  
  const testEmail = 'your-email@example.com'; // ЗАМЕНИТЕ НА ВАШ EMAIL!
  const testCode = '123456';
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: testCode
      })
    });
    
    const result = await response.json();
    
    console.log('📡 Статус:', response.status);
    console.log('📋 Ответ:', result);
    
    if (response.ok && result.success) {
      console.log('✅ УСПЕХ! Проверьте почту (включая спам)');
    } else {
      console.log('❌ Ошибка:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

quickTest();
