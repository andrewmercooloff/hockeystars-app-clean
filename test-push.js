// Простой тест для проверки push-уведомлений
const { Notifications } = require('expo-notifications');
const { Platform } = require('react-native');
const { Device } = require('expo-device');

async function testPushNotifications() {
  try {
    console.log('🔔 Тестируем push-уведомления...');
    console.log('Platform:', Platform.OS);
    console.log('Device isDevice:', Device.isDevice);
    
    if (Platform.OS === 'android') {
      // На Android нужно создать канал уведомлений
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HockeyStars Notifications',
        description: 'Notifications for HockeyStars app',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fa2f40',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
      console.log('✅ Android notification channel created');
    }
    
    if (Device.isDevice) {
      // Проверяем разрешения
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Requested permission status:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Push notifications permission denied. Status:', finalStatus);
        return;
      }
      
      console.log('✅ Push notifications permission granted');
      
      // Получаем Expo push token
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: 'ccb608ca-e849-4a98-b337-d38863d3ebff',
      });
      
      console.log('✅ Push token получен:', expoPushToken.data);
      console.log('✅ Project ID:', 'ccb608ca-e849-4a98-b337-d38863d3ebff');
      
    } else {
      console.log('❌ Push notifications работают только на физических устройствах');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста push-уведомлений:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

testPushNotifications();
