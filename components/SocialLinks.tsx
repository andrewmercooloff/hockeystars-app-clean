import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface SocialLinksProps {
  instagram?: string;
  tiktok?: string;
  vk?: string;
  website?: string;
}

export default function SocialLinks({ instagram, tiktok, vk, website }: SocialLinksProps) {
  const { t } = useLanguage();

  const socialLinks = [
    {
      key: 'instagram',
      url: instagram,
      icon: 'logo-instagram',
      color: '#8B2F47' // Instagram розовый смешанный с темно-красным
    },
    {
      key: 'tiktok',
      url: tiktok,
      icon: 'logo-tiktok',
      color: '#4A1A1A' // TikTok черный смешанный с темно-красным
    },
    {
      key: 'vk',
      url: vk,
      icon: 'logo-vk',
      color: '#3D4A6B' // VK синий смешанный с темно-красным
    },
    {
      key: 'website',
      url: website,
      icon: 'globe-outline',
      color: '#2A4A2A' // Зеленый смешанный с темно-красным
    }
  ].filter(link => link.url && link.url.trim() !== '');

  const handleLinkPress = async (url: string, platform: string) => {
    try {
      // Добавляем протокол, если его нет
      let formattedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (platform === 'website') {
          formattedUrl = `https://${url}`;
        } else {
          // Для социальных сетей добавляем соответствующие префиксы
          switch (platform) {
            case 'instagram':
              formattedUrl = `https://instagram.com/${url.replace('@', '').replace('instagram.com/', '')}`;
              break;
            case 'tiktok':
              formattedUrl = `https://tiktok.com/@${url.replace('@', '').replace('tiktok.com/@', '')}`;
              break;
            case 'vk':
              formattedUrl = `https://vk.com/${url.replace('vk.com/', '').replace('@', '')}`;
              break;
            default:
              formattedUrl = `https://${url}`;
          }
        }
      }

      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert(
          t('socialLinks.error'),
          t('socialLinks.cannotOpenLink', { platform })
        );
      }
    } catch (error) {
      console.error('Ошибка открытия ссылки:', error);
      Alert.alert(
        t('socialLinks.error'),
        t('socialLinks.openError')
      );
    }
  };

  // Если нет социальных ссылок, не показываем компонент
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Социальные ссылки */}
      {socialLinks.map((link) => (
        <TouchableOpacity
          key={link.key}
          style={[styles.linkButton, { backgroundColor: link.color }]}
          onPress={() => handleLinkPress(link.url!, link.key)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={link.icon as any} 
            size={16} 
            color="#fff"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  linkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
});
