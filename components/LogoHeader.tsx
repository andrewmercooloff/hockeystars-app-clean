import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { loadCurrentUser, Player } from '../utils/playerStorage';

const logo = require('../assets/images/logo.png');

const LogoHeader = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentUser, setCurrentUser] = useState<Player | null>(null);

  const loadUser = async () => {
    try {
      const user = await loadCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Обновляем данные при возврате на экран
  useFocusEffect(
    React.useCallback(() => {
      loadUser();
    }, [])
  );

  // Обновляем данные при изменении параметров
  useEffect(() => {
    if (params.refresh) {
      loadUser();
    }
  }, [params.refresh]);

  return (
    <View style={{ 
      height: 128, 
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      gap: 40
    }}>
      <Image source={logo} style={{ width: 180, height: 60 }} resizeMode='contain' />
      
      <TouchableOpacity 
        style={{ alignItems: 'center', marginTop: -8 }}
        onPress={() => {
          if (currentUser) {
            router.push(`/player/${currentUser.id}`);
          } else {
            router.push('/login');
          }
        }}
      >
        <View style={{
          width: 51,
          height: 51,
          borderRadius: 25.5,
          backgroundColor: '#333',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#fff',
        }}>
          {(() => {
            return currentUser?.avatar ? (
              <Image 
                source={{ uri: currentUser.avatar }}
                style={{
                  width: 45,
                  height: 45,
                  borderRadius: 22.5,
                }}
                resizeMode='cover'
                onError={(error) => {
                  // Ошибка загрузки изображения - логируем только в development
                  if (__DEV__) {
                    console.error('❌ Заголовок - Ошибка загрузки изображения:', error);
                  }
                }}
              />
            ) : (
              <Ionicons name="person" size={25} color="#fff" />
            );
          })()}
        </View>
        {currentUser && currentUser.name && currentUser.name.trim() !== '' && (
          <Text style={{
            color: '#fff',
            fontSize: 12,
            fontFamily: 'Gilroy-Regular',
            marginTop: 2,
          }}>
{(currentUser?.name || 'Пользователь').toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default LogoHeader;
