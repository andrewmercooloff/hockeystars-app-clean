import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../utils/supabase';

interface Recipient {
  id: string;
  name: string;
  avatar: string | null;
}

export default function MassMessageScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currentUser } = useUser();
  const params = useLocalSearchParams();
  
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const playerIds = JSON.parse((params.playerIds as string) || '[]');
        
        if (playerIds.length === 0) {
          Alert.alert('Ошибка', 'Нет выбранных пользователей');
          router.back();
          return;
        }

        // Загружаем информацию о пользователях
        const { data, error } = await supabase
          .from('players')
          .select('id, name, avatar')
          .in('id', playerIds);

        if (error) {
          console.error('Ошибка загрузки пользователей:', error);
          Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
          router.back();
          return;
        }

        setRecipients((data || []) as Recipient[]);
      } catch (error) {
        console.error('Ошибка парсинга параметров:', error);
        router.back();
      }
    };

    loadPlayerData();
  }, [params.playerIds]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Внимание', 'Введите текст сообщения');
      return;
    }

    if (!currentUser) {
      Alert.alert('Ошибка', 'Вы не авторизованы');
      return;
    }

    setSending(true);

    try {
      // Создаем сообщения для каждого получателя
      // Используем текущее время для отправки
      const messages = recipients.map(recipient => ({
        sender_id: currentUser.id,
        receiver_id: recipient.id,
        text: message,
        created_at: new Date().toISOString(),
      }));

      // Вставляем все сообщения
      const { error } = await supabase
        .from('messages')
        .insert(messages);

      if (error) {
        throw error;
      }

      // Небольшая задержка, чтобы вставка сообщений завершилась
      await new Promise(resolve => setTimeout(resolve, 500));

      // Пересчитываем счетчики для каждого уникального получателя
      // Это гарантирует корректные значения, даже если триггер срабатывал несколько раз
      const uniqueRecipientIds = [...new Set(recipients.map(r => r.id))];
      
      for (const recipientId of uniqueRecipientIds) {
        // Подсчитываем фактическое количество непрочитанных сообщений
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', recipientId)
          .eq('read', false);
        
        // Обновляем счетчик и updated_at - это всегда вызовет UPDATE event для Realtime
        await supabase
          .from('players')
          .update({ 
            unread_messages_count: count || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipientId);
      }

      // Небольшая задержка для распространения Realtime событий
      await new Promise(resolve => setTimeout(resolve, 300));

      // Отправляем push-уведомления всем получателям
      for (const recipient of recipients) {
        try {
          const { sendNotificationToUser } = await import('../../utils/notificationService');
          await sendNotificationToUser(
            recipient.id,
            `💬 ${currentUser.name}`,
            message.length > 50 ? message.substring(0, 50) + '...' : message,
            {
              type: 'new_message',
              screen: 'messages',
              tab: 'messages',
              senderId: currentUser.id
            }
          );
        } catch (error) {
          console.warn(`Не удалось отправить push-уведомление пользователю ${recipient.name}:`, error);
        }
      }

      Alert.alert('Успешно', `Сообщение отправлено ${recipients.length} пользователям`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Ошибка отправки сообщений:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщения');
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('messages.massSend') || 'Массовая отправка'}
          </Text>
        </View>

        {/* Recipients List */}
        <ScrollView 
          style={styles.recipientsContainer}
          contentContainerStyle={styles.recipientsContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.recipientsTitle}>
            {t('messages.recipients') || 'Получатели'} ({recipients.length})
          </Text>
          {recipients.map(recipient => (
            <View key={recipient.id} style={styles.recipientItem}>
              <Ionicons name="person-circle" size={24} color="#fa2f40" />
              <Text style={styles.recipientName}>{recipient.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder={t('messages.typeMessage') || 'Введите сообщение...'}
            placeholderTextColor="#888"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity 
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>
                  {t('messages.send') || 'Отправить'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 26, 0.96)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  recipientsContainer: {
    flex: 1,
    padding: 20,
  },
  recipientsContentContainer: {
    paddingBottom: 20,
  },
  recipientsTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 12,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 12,
  },
  messageInputContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 8,
  },
});

