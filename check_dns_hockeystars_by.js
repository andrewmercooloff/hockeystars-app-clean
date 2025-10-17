// Проверка DNS записей для hockeystars.by
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function checkDNS() {
  console.log('🔍 Проверяем DNS записи для hockeystars.by...\n');
  
  const checks = [
    {
      name: 'SPF запись',
      command: 'dig TXT hockeystars.by +short',
      expected: 'relay.mailchannels.net',
      critical: true
    },
    {
      name: 'DMARC запись', 
      command: 'dig TXT _dmarc.hockeystars.by +short',
      expected: 'DMARC1',
      critical: false
    },
    {
      name: 'Основная A запись',
      command: 'dig A hockeystars.by +short',
      expected: 'IP адрес',
      critical: false
    }
  ];
  
  let allGood = true;
  
  for (const check of checks) {
    try {
      console.log(`📋 Проверяем: ${check.name}`);
      console.log(`💻 Команда: ${check.command}`);
      
      const { stdout, stderr } = await execAsync(check.command);
      
      if (stderr) {
        console.error(`❌ Ошибка: ${stderr}`);
        if (check.critical) allGood = false;
        continue;
      }
      
      const result = stdout.trim();
      console.log(`📝 Результат: ${result || 'Не найдено'}`);
      
      if (result && result.includes(check.expected)) {
        console.log(`✅ ${check.name}: OK\n`);
      } else {
        console.log(`❌ ${check.name}: ${check.critical ? 'КРИТИЧНО!' : 'Рекомендуется'}\n`);
        if (check.critical) allGood = false;
      }
      
    } catch (error) {
      console.error(`❌ Ошибка выполнения команды: ${error.message}`);
      if (check.critical) allGood = false;
    }
  }
  
  console.log('='.repeat(50));
  
  if (allGood) {
    console.log('🎉 Отлично! DNS записи настроены правильно');
    console.log('✅ Можно создавать и тестировать Cloudflare Worker');
  } else {
    console.log('⚠️  Нужно добавить критичные DNS записи');
    console.log('📚 Инструкции: HOCKEYSTARS_BY_EMAIL_SETUP.md');
  }
  
  console.log('\n💡 Следующие шаги:');
  console.log('1. Создайте Cloudflare Worker');
  console.log('2. Загрузите код из cloudflare-worker/email-sender.js');
  console.log('3. Протестируйте отправку email');
}

// Альтернативная проверка через Node.js DNS
async function checkDNSNode() {
  console.log('\n🔄 Альтернативная проверка через Node.js DNS...');
  
  const dns = require('dns').promises;
  
  try {
    const txtRecords = await dns.resolveTxt('hockeystars.by');
    console.log('📋 TXT записи hockeystars.by:');
    
    let spfFound = false;
    txtRecords.forEach((record, index) => {
      const recordStr = record.join('');
      console.log(`   ${index + 1}. ${recordStr}`);
      
      if (recordStr.includes('spf1') && recordStr.includes('mailchannels.net')) {
        console.log('   ✅ SPF запись найдена!');
        spfFound = true;
      }
    });
    
    if (!spfFound) {
      console.log('   ❌ SPF запись для MailChannels не найдена');
    }
    
  } catch (error) {
    console.error('❌ Ошибка DNS запроса:', error.message);
  }
}

// Проверка доступности dig команды
async function checkDigAvailability() {
  try {
    await execAsync('dig -v');
    return true;
  } catch (error) {
    console.log('⚠️  Команда dig недоступна');
    console.log('💡 На macOS: brew install bind');
    console.log('💡 На Windows: используйте nslookup или онлайн инструменты');
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🚀 Проверка DNS настроек для hockeystars.by\n');
  
  const digAvailable = await checkDigAvailability();
  
  if (digAvailable) {
    await checkDNS();
  } else {
    console.log('📋 Используем Node.js DNS вместо dig...');
  }
  
  await checkDNSNode();
  
  console.log('\n📚 Полные инструкции: HOCKEYSTARS_BY_EMAIL_SETUP.md');
}

main().catch(console.error);
