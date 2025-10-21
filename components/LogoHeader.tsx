import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import HeaderAvatar from './HeaderAvatar';
import { useUser } from '../contexts/UserContext';

const logo = require('../assets/images/logo.png');

const LogoHeader = React.memo(() => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser, refreshUser, setAvatarLoading } = useUser();

  // Обновляем данные только при изменении параметров refresh
  useEffect(() => {
    if (params.refresh) {
      refreshUser(true); // Принудительное обновление
    }
  }, [params.refresh, refreshUser]);

  // Управляем состоянием загрузки аватарки
  useEffect(() => {
    if (currentUser) {
      if (currentUser.avatar) {
        setAvatarLoading(true); // Начинаем загрузку аватарки
      } else {
        setAvatarLoading(false); // Нет аватарки - сразу готово
      }
    } else {
      setAvatarLoading(false); // Нет пользователя - нет аватарки
    }
  }, [currentUser, setAvatarLoading]);

  return (
    <View style={{ 
      height: 128, 
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingBottom: 5,
      backgroundColor: '#000'
    }}>
      {/* Логотип приложения слева */}
      <View style={{ marginLeft: 57.5, marginBottom: -5 }}>
        <Image source={logo} style={{ width: 189, height: 63 }} resizeMode='contain' />
      </View>
      
      {/* Аватар справа */}
      <TouchableOpacity 
        style={{ alignItems: 'center', marginRight: 67.5 }}
        onPress={() => {
          if (currentUser) {
            router.push(`/player/${currentUser.id}`);
          } else {
            router.push('/login');
          }
        }}
      >
        <View style={{
          width: 56.1,
          height: 56.1,
          borderRadius: 28.05,
          backgroundColor: '#333',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#fff',
        }}>
              {currentUser?.avatar ? (
                <HeaderAvatar
                  uri={currentUser.avatar}
                  size={49.5}
                  fallbackIcon="person"
                  fallbackSize={27.5}
                  fallbackColor="#fff"
                  onLoadComplete={() => setAvatarLoading(false)}
                />
              ) : (
                <Ionicons name="person" size={27.5} color="#fff" />
              )}
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
});

LogoHeader.displayName = 'LogoHeader';

export default LogoHeader;
