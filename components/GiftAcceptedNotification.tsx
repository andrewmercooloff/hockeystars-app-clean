import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GiftAcceptedNotificationProps {
  starName: string; // Имя звезды, которая одобрила подарок
  starAvatar?: string; // Аватар звезды
  itemTypeName: string; // Название типа подарка (уже переведенное)
  message: string; // Текст сообщения (уже переведенный)
  formattedTime: string; // Отформатированное время
  acknowledgeButtonText: string; // Текст кнопки "Супер!"
  onAcknowledge: () => void; // Функция для кнопки "Супер!"
}

const GiftAcceptedNotification: React.FC<GiftAcceptedNotificationProps> = ({
  starName,
  starAvatar,
  itemTypeName,
  message,
  formattedTime,
  acknowledgeButtonText,
  onAcknowledge,
}) => {

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {starAvatar ? (
          <Image source={{ 
            uri: starAvatar,
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'max-age=3600'
            }
          }} style={styles.playerAvatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={28} color="#666" />
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.playerName} numberOfLines={1}>
              {starName}
            </Text>
            <Text style={styles.time}>
              {formattedTime}
            </Text>
          </View>
        </View>

        <View style={styles.requestItem}>
          <View style={styles.messageRow}>
            <View style={styles.textContainer}>
              <Text style={styles.actionText}>
                {message}
              </Text>
            </View>
            
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acknowledgeButton]}
                onPress={onAcknowledge}
                activeOpacity={0.7}
              >
                <Text style={styles.acknowledgeButtonText}>{acknowledgeButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4', // Cyan for gift accepted
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FFF',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  requestItem: {
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  actionText: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  acknowledgeButton: {
    backgroundColor: '#FF4444', // Red like other action buttons
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
});

export default GiftAcceptedNotification;

