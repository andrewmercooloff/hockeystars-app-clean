const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin для удаления BOOT_COMPLETED receivers от expo-av/expo-audio
 * Это необходимо для совместимости с Android 15+, где BOOT_COMPLETED не может запускать foreground services
 * 
 * КРИТИЧЕСКИ ВАЖНО: Этот плагин должен быть ПОСЛЕ expo-av в списке plugins в app.json
 * 
 * Использует два подхода:
 * 1. withAndroidManifest - удаляет receivers во время генерации манифеста
 * 2. withDangerousMod - удаляет receivers из финального манифеста после всех плагинов
 */
const withRemoveBootCompletedReceivers = (config) => {
  // Первый подход: удаление через withAndroidManifest
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    const application = manifest.application[0];

    // Список классов BootReceiver, которые нужно удалить (все возможные варианты)
    const bootReceiverClasses = [
      'expo.modules.audio.service.AudioControlsService$BootReceiver',
      'expo.modules.audio.service.AudioRecordingService$BootReceiver',
      'expo.modules.av.AudioControlsService$BootReceiver',
      'expo.modules.av.AudioRecordingService$BootReceiver',
      'expo.modules.audio.AudioControlsService$BootReceiver',
      'expo.modules.audio.AudioRecordingService$BootReceiver',
      'expo.modules.audio.service.AudioControlsService.BootReceiver',
      'expo.modules.audio.service.AudioRecordingService.BootReceiver',
      'expo.modules.av.AudioControlsService.BootReceiver',
      'expo.modules.av.AudioRecordingService.BootReceiver',
    ];

    // Функция для проверки, содержит ли receiver BOOT_COMPLETED intent
    const hasBootCompletedIntent = (receiver) => {
      if (!receiver['intent-filter']) {
        return false;
      }

      const intentFilters = Array.isArray(receiver['intent-filter'])
        ? receiver['intent-filter']
        : [receiver['intent-filter']];

      for (const intentFilter of intentFilters) {
        if (!intentFilter.action) {
          continue;
        }

        const actions = Array.isArray(intentFilter.action)
          ? intentFilter.action
          : [intentFilter.action];

        for (const action of actions) {
          const actionName = action.$?.['android:name'];
          if (actionName === 'android.intent.action.BOOT_COMPLETED') {
            return true;
          }
        }
      }

      return false;
    };

    // Функция для проверки, является ли receiver от expo audio модулей
    const isExpoAudioReceiver = (receiverName) => {
      if (!receiverName) {
        return false;
      }
      
      // Проверяем все возможные варианты имен
      return (
        receiverName.includes('expo.modules.audio') ||
        receiverName.includes('expo.modules.av') ||
        receiverName.includes('AudioControlsService') ||
        receiverName.includes('AudioRecordingService')
      );
    };

    // Агрессивно удаляем все receivers, которые:
    // 1. Имеют имя класса из списка bootReceiverClasses
    // 2. ИЛИ слушают BOOT_COMPLETED И являются expo audio receivers
    if (application.receiver) {
      const receivers = Array.isArray(application.receiver)
        ? application.receiver
        : [application.receiver];

      const filteredReceivers = receivers.filter((receiver) => {
        const receiverName = receiver.$?.['android:name'];
        
        // Удаляем receivers с указанными именами классов
        if (receiverName && bootReceiverClasses.some(className => receiverName.includes(className) || receiverName === className)) {
          console.log(`[withRemoveBootCompletedReceivers] Удаляем receiver: ${receiverName}`);
          return false;
        }

        // Удаляем receivers, которые слушают BOOT_COMPLETED и связаны с expo audio
        if (hasBootCompletedIntent(receiver) && isExpoAudioReceiver(receiverName)) {
          console.log(`[withRemoveBootCompletedReceivers] Удаляем BOOT_COMPLETED receiver: ${receiverName}`);
          return false;
        }

        return true;
      });

      // Обновляем массив receivers
      if (filteredReceivers.length === 0) {
        delete application.receiver;
      } else if (Array.isArray(application.receiver)) {
        application.receiver = filteredReceivers;
      } else {
        application.receiver = filteredReceivers[0];
      }
    }

    // Также удаляем screenOrientation из MainActivity для совместимости с Android 15+
    if (application.activity) {
      const activities = Array.isArray(application.activity)
        ? application.activity
        : [application.activity];

      for (const activity of activities) {
        const activityName = activity.$?.['android:name'];
        if (activityName === '.MainActivity' || activityName === 'by.hockeystars.app.MainActivity') {
          // Удаляем screenOrientation атрибут
          if (activity.$?.['android:screenOrientation']) {
            delete activity.$['android:screenOrientation'];
          }
        }
      }
    }

    return config;
  });

  // Второй подход: прямое редактирование финального манифеста через withDangerousMod
  // Это гарантирует удаление receivers даже если они добавятся после применения плагинов
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      console.log('[withRemoveBootCompletedReceivers] 🚀 Запуск withDangerousMod для удаления BootReceiver...');
      console.log('[withRemoveBootCompletedReceivers] 📂 platformProjectRoot:', config.modRequest.platformProjectRoot);
      
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'AndroidManifest.xml'
      );

      console.log('[withRemoveBootCompletedReceivers] 📄 Ищем манифест по пути:', manifestPath);

      if (!fs.existsSync(manifestPath)) {
        console.log('[withRemoveBootCompletedReceivers] ⚠️ AndroidManifest.xml не найден, пропускаем');
        return config;
      }

      console.log('[withRemoveBootCompletedReceivers] ✅ Манифест найден, начинаем обработку...');
      let manifestContent = fs.readFileSync(manifestPath, 'utf8');
      let modified = false;
      
      // Проверяем, есть ли receivers в манифесте
      const receiverMatches = manifestContent.match(/<receiver[^>]*>/gi);
      console.log(`[withRemoveBootCompletedReceivers] 🔍 Найдено receivers в манифесте: ${receiverMatches ? receiverMatches.length : 0}`);
      
      if (manifestContent.includes('BOOT_COMPLETED')) {
        console.log('[withRemoveBootCompletedReceivers] ⚠️ Обнаружен BOOT_COMPLETED в манифесте!');
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Удаляем receivers из манифестов библиотек expo-av ДО merge
      // Это критически важно, так как они добавляются из библиотек во время merge манифестов
      // Пробуем несколько путей к node_modules
      const possibleNodeModulesPaths = [
        path.join(config.modRequest.platformProjectRoot, '..', '..', 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
        path.resolve('node_modules'),
      ];
      
      const expoAvManifestPaths = [];
      possibleNodeModulesPaths.forEach(nodeModulesPath => {
        if (fs.existsSync(nodeModulesPath)) {
          expoAvManifestPaths.push(
            path.join(nodeModulesPath, 'expo-av', 'android', 'src', 'main', 'AndroidManifest.xml'),
            path.join(nodeModulesPath, 'expo-audio', 'android', 'src', 'main', 'AndroidManifest.xml')
          );
        }
      });
      
      console.log(`[withRemoveBootCompletedReceivers] 📦 Проверяем ${expoAvManifestPaths.length} возможных путей к манифестам библиотек...`);
      
      expoAvManifestPaths.forEach(libManifestPath => {
        console.log(`[withRemoveBootCompletedReceivers] 🔍 Проверяем: ${libManifestPath}`);
        if (fs.existsSync(libManifestPath)) {
          console.log(`[withRemoveBootCompletedReceivers] ✅ Найден манифест библиотеки: ${libManifestPath}`);
          try {
            let libManifestContent = fs.readFileSync(libManifestPath, 'utf8');
            const originalLibContent = libManifestContent;
            
            const receiversBefore = (libManifestContent.match(/<receiver[^>]*>/gi) || []).length;
            console.log(`[withRemoveBootCompletedReceivers] 📊 Receivers в манифесте библиотеки: ${receiversBefore}`);
            
            // Удаляем все receivers с BOOT_COMPLETED
            libManifestContent = libManifestContent.replace(
              /<receiver[^>]*>[\s\S]*?android\.intent\.action\.BOOT_COMPLETED[\s\S]*?<\/receiver>/gi,
              ''
            );
            
            // Удаляем receivers с BootReceiver в имени
            libManifestContent = libManifestContent.replace(
              /<receiver[^>]*android:name=["'][^"']*BootReceiver[^"']*["'][^>]*>[\s\S]*?<\/receiver>/gi,
              ''
            );
            
            // Более агрессивное удаление - любой receiver с audio и BOOT_COMPLETED
            libManifestContent = libManifestContent.replace(/<receiver[^>]*>([\s\S]*?)<\/receiver>/gi, (match, content) => {
              if ((content.includes('android.intent.action.BOOT_COMPLETED') || content.includes('BOOT_COMPLETED')) &&
                  (match.includes('expo.modules') || match.includes('audio') || match.includes('av'))) {
                console.log(`[withRemoveBootCompletedReceivers] 🗑️ Удаляем receiver из библиотеки: ${match.substring(0, 100)}...`);
                return '';
              }
              return match;
            });
            
            if (libManifestContent !== originalLibContent) {
              fs.writeFileSync(libManifestPath, libManifestContent, 'utf8');
              const receiversAfter = (libManifestContent.match(/<receiver[^>]*>/gi) || []).length;
              console.log(`[withRemoveBootCompletedReceivers] ✅ Обновлен манифест библиотеки: ${libManifestPath}`);
              console.log(`[withRemoveBootCompletedReceivers] 📊 Receivers до: ${receiversBefore}, после: ${receiversAfter}`);
            } else {
              console.log(`[withRemoveBootCompletedReceivers] ℹ️ Манифест библиотеки не требовал изменений: ${libManifestPath}`);
            }
          } catch (e) {
            console.log(`[withRemoveBootCompletedReceivers] ⚠️ Не удалось обновить манифест библиотеки ${libManifestPath}: ${e.message}`);
          }
        } else {
          console.log(`[withRemoveBootCompletedReceivers] ❌ Манифест библиотеки не найден: ${libManifestPath}`);
        }
      });

      // Удаляем все receivers с BOOT_COMPLETED от expo audio модулей
      // Используем регулярные выражения для более надежного удаления
      const bootReceiverPatterns = [
        // Полный receiver блок с именем класса
        /<receiver[^>]*android:name=["']expo\.modules\.(audio|av)\.service\.(AudioControlsService|AudioRecordingService)\$?BootReceiver["'][^>]*>[\s\S]*?<\/receiver>/gi,
        // Receiver блок с BOOT_COMPLETED intent-filter от expo audio
        /<receiver[^>]*>[\s\S]*?<intent-filter[\s\S]*?<action[^>]*android:name=["']android\.intent\.action\.BOOT_COMPLETED["'][^>]*\/>[\s\S]*?<\/intent-filter>[\s\S]*?<\/receiver>/gi,
      ];

      for (const pattern of bootReceiverPatterns) {
        const matches = manifestContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Проверяем, что это receiver от expo audio модулей
            if (match.includes('expo.modules.audio') || 
                match.includes('expo.modules.av') ||
                match.includes('AudioControlsService') ||
                match.includes('AudioRecordingService')) {
              console.log('[withRemoveBootCompletedReceivers] Удаляем receiver из манифеста:', match.substring(0, 100));
              manifestContent = manifestContent.replace(match, '');
              modified = true;
            }
          });
        }
      }

      // Более агрессивный подход: удаляем все receiver блоки, содержащие BOOT_COMPLETED
      // и связанные с audio сервисами
      const aggressivePattern = /<receiver[^>]*>([\s\S]*?)<\/receiver>/gi;
      manifestContent = manifestContent.replace(aggressivePattern, (match, content) => {
        // Проверяем, содержит ли receiver BOOT_COMPLETED (в любом виде)
        if (content.includes('android.intent.action.BOOT_COMPLETED') || 
            content.includes('BOOT_COMPLETED') ||
            match.includes('BootReceiver')) {
          // Проверяем, связан ли он с expo audio (расширенная проверка)
          if (match.includes('expo.modules.audio') || 
              match.includes('expo.modules.av') ||
              match.includes('AudioControlsService') ||
              match.includes('AudioRecordingService') ||
              match.includes('audio.service') ||
              match.includes('av.service')) {
            console.log('[withRemoveBootCompletedReceivers] Агрессивное удаление receiver');
            modified = true;
            return '';
          }
        }
        return match;
      });
      
      // Дополнительная проверка: удаляем любые receivers с BootReceiver в имени класса
      manifestContent = manifestContent.replace(/<receiver[^>]*android:name=["'][^"']*BootReceiver[^"']*["'][^>]*>[\s\S]*?<\/receiver>/gi, (match) => {
        if (match.includes('expo.modules') || match.includes('audio') || match.includes('av')) {
          console.log('[withRemoveBootCompletedReceivers] Удален receiver с BootReceiver в имени класса');
          modified = true;
          return '';
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(manifestPath, manifestContent, 'utf8');
        console.log('[withRemoveBootCompletedReceivers] ✅ AndroidManifest.xml обновлен');
      } else {
        console.log('[withRemoveBootCompletedReceivers] ℹ️ AndroidManifest.xml не требовал изменений');
      }

      console.log('[withRemoveBootCompletedReceivers] ✅ Завершена обработка манифестов');
      return config;
    },
  ]);

  return config;
};

module.exports = withRemoveBootCompletedReceivers;
