import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import HeaderAvatar from './HeaderAvatar';
import { useUser } from '../contexts/UserContext';

const logo = require('../assets/images/logo.png');

const LogoHeader = React.memo(() => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { currentUser, refreshUser } = useUser();

  // Обновляем данные только при изменении параметров refresh
  useEffect(() => {
    if (params.refresh) {
      refreshUser(true); // Принудительное обновление
    }
  }, [params.refresh, refreshUser]);

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
      <View style={{ marginLeft: 61.5, marginBottom: -5 }}>
        <Image source={logo} style={{ width: 189, height: 63 }} resizeMode='contain' />
      </View>
      
      {/* Аватар справа */}
      <TouchableOpacity 
        style={{ alignItems: 'center', marginRight: 66.5, minHeight: 70, marginBottom: -6 }}
        onPress={() => {
          if (!currentUser) {
            router.push('/login');
          } else {
            // Если текущий экран - профиль пользователя, возвращаемся на главную
            if (pathname.startsWith(`/player/${currentUser.id}`)) {
              router.replace('/');
            } else {
              // В противном случае переходим в профиль
              router.push(`/player/${currentUser.id}`);
            }
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
          {currentUser?.avatar ? (
            <HeaderAvatar
              uri={currentUser.avatar}
              size={45}
              fallbackIcon="person"
              fallbackSize={25}
              fallbackColor="#fff"
            />
          ) : (
            <Ionicons name="person" size={25} color="#fff" />
          )}
        </View>
        {currentUser && currentUser.name && currentUser.name.trim() !== '' ? (
          <Text style={{
            color: '#fff',
            fontSize: 12,
            fontFamily: 'Gilroy-Regular',
            marginTop: 2,
          }}>
{(currentUser?.name || 'Пользователь').toUpperCase()}
          </Text>
        ) : (
          <View style={{ height: 16, marginTop: 2 }} />
        )}
      </TouchableOpacity>
    </View>
  );
});

LogoHeader.displayName = 'LogoHeader';

export default LogoHeader;
