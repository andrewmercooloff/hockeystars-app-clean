// Простой тест для проверки звуков
const { Audio } = require('expo-av');

async function testSounds() {
  try {
    console.log('🔊 Тестируем звуки...');
    
    // Настраиваем аудио режим
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });
    
    console.log('✅ Аудио режим настроен');
    
    // Загружаем звук уведомления
    const { sound } = await Audio.Sound.createAsync(
      require('./assets/not.m4a'),
      { shouldPlay: false, volume: 0.9 }
    );
    
    console.log('✅ Звук уведомления загружен');
    
    // Воспроизводим звук
    await sound.playAsync();
    console.log('🔊 Звук воспроизведен');
    
    // Ждем 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Останавливаем и выгружаем
    await sound.stopAsync();
    await sound.unloadAsync();
    
    console.log('✅ Тест завершен успешно');
    
  } catch (error) {
    console.error('❌ Ошибка теста звуков:', error);
  }
}

testSounds();
