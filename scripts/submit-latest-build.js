#!/usr/bin/env node

/**
 * Скрипт для отправки последней сборки iOS в TestFlight
 * Использование: node scripts/submit-latest-build.js
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

// Проверка наличия команды
function checkCommand(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// Выполнение команды
function execCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'ignore' : 'inherit',
      ...options,
    });
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('\n🚀 Отправка последней сборки в TestFlight...\n');

  // 1. Проверка EAS CLI
  log('Проверка EAS CLI...');
  if (!checkCommand('eas')) {
    warn('EAS CLI не установлен. Устанавливаем...');
    const installResult = execCommand('npm install -g eas-cli', { silent: false });
    if (!installResult.success) {
      error('Не удалось установить EAS CLI');
    }
  }

  const versionResult = execCommand('eas --version', { silent: true });
  if (versionResult.success) {
    log(`EAS CLI версия: ${versionResult.output.trim()}`);
  }
  console.log();

  // 2. Проверка авторизации
  log('Проверка авторизации в EAS...');
  const whoamiResult = execCommand('eas whoami', { silent: true });
  if (!whoamiResult.success) {
    error('Не авторизован в EAS. Выполните: eas login');
  }
  log('✓ Авторизован в EAS');
  console.log();

  // 3. Чтение конфигурации
  log('Чтение конфигурации...');
  const easJsonPath = path.join(process.cwd(), 'eas.json');
  let easConfig;
  try {
    easConfig = JSON.parse(readFileSync(easJsonPath, 'utf-8'));
  } catch (err) {
    error(`Не удалось прочитать eas.json: ${err.message}`);
  }

  const ascAppId = easConfig?.submit?.production?.ios?.ascAppId;
  if (ascAppId) {
    log(`App Store Connect App ID: ${ascAppId}`);
  }
  console.log();

  // 4. Поиск последней сборки
  log('Поиск последней сборки iOS...');
  const buildListResult = execCommand('eas build:list --platform ios --limit 1 --json', { silent: true });
  
  if (buildListResult.success) {
    try {
      const builds = JSON.parse(buildListResult.output);
      if (builds && builds.length > 0) {
        const latestBuild = builds[0];
        log(`Последняя сборка: ${latestBuild.id}`);
        log(`Статус: ${latestBuild.status}`);
        log(`Версия: ${latestBuild.appVersion || 'N/A'}`);
        log(`Build Number: ${latestBuild.buildNumber || 'N/A'}`);
        
        if (latestBuild.status !== 'finished') {
          warn(`⚠️  Последняя сборка еще не завершена (статус: ${latestBuild.status})`);
          warn('Скрипт попытается найти последнюю завершенную сборку...');
        }
      }
    } catch (err) {
      warn('Не удалось получить информацию о сборках');
    }
  }
  console.log();

  // 5. Отправка в TestFlight
  warn('⚠️  ВАЖНО: Используется последняя сборка iOS с профилем production');
  warn('⚠️  Если сборка еще не завершена, скрипт найдет последнюю завершенную');
  console.log();

  log('Отправка последней сборки в TestFlight...');
  const submitResult = execCommand(
    'eas submit --platform ios --profile production --latest --non-interactive',
    { silent: false }
  );

  if (submitResult.success) {
    console.log();
    log('✅ Сборка успешно отправлена в TestFlight!');
    console.log();
    if (ascAppId) {
      info(`📱 Проверьте статус в App Store Connect:`);
      console.log(`   https://appstoreconnect.apple.com/apps/${ascAppId}/testflight/ios`);
    } else {
      info('📱 Проверьте статус в App Store Connect');
    }
    console.log();
  } else {
    console.log();
    error('❌ Ошибка при отправке сборки');
    console.log();
    info('💡 Возможные причины:');
    console.log('   - Нет завершенных сборок');
    console.log('   - Сборка еще обрабатывается');
    console.log('   - Проблемы с credentials');
    console.log();
    info('💡 Попробуйте:');
    console.log('   1. Проверить статус сборок: eas build:list --platform ios');
    console.log('   2. Дождаться завершения сборки');
    console.log('   3. Проверить credentials: eas credentials');
    process.exit(1);
  }

  console.log();
  log('✅ Готово!');
  console.log();
}

main().catch((err) => {
  error(`Неожиданная ошибка: ${err.message}`);
  process.exit(1);
});






