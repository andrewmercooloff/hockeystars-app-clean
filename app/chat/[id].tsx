import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    getConversation,
    getPlayerById,
    loadCurrentUser,
    markMessagesAsRead,
    Message,
    Player,
    sendMessageSimple
} from '../../utils/playerStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { playOutgoingMessageSound, playIncomingMessageSound } from '../../utils/soundService';
import { supabase } from '../../utils/supabase';

const iceBg = require('../../assets/images/led.jpg');

export default function ChatScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser } = useUser();
  const [otherPlayer, setOtherPlayer] = useState<Player | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const justSentMessageRef = useRef<boolean>(false);


  useEffect(() => {
    // Очищаем сообщения при смене чата
    setMessages([]);
    setNewMessage('');
    setLoading(true);
    loadChatData();
  }, [id]);

  useEffect(() => {
    if (!currentUser || !otherPlayer || otherPlayer.id !== id) {
      return;
    }

    // Настраиваем Realtime подписку на изменения сообщений
    const channel = supabase
      .channel(`messages-${currentUser.id}-${otherPlayer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id})`
        },
        (payload) => {
          console.log('🔔 Получено новое сообщение через Realtime:', payload);
          // Загружаем сообщения только при получении нового сообщения
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Отключаем Realtime подписку для сообщений');
      supabase.removeChannel(channel);
    };
  }, [currentUser, otherPlayer, id]);

  // Обработка системной кнопки "назад"
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.push('/messages');
        return true; // Предотвращаем стандартное поведение
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [])
  );

  const loadChatData = async () => {
    try {
      if (id) {
        const otherPlayerData = await getPlayerById(id as string);
        const userData = await loadCurrentUser();
        
        if (!userData) {
          router.replace('/login');
          return;
        }

        setOtherPlayer(otherPlayerData);
        setCurrentUser(userData);
        
        if (otherPlayerData) {
          // Сразу загружаем сообщения
          const conversation = await getConversation(userData.id, otherPlayerData.id);
          setMessages(conversation);
          
          // Прокручиваем вниз после загрузки сообщений
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }, 100);
          
          // Отмечаем сообщения как прочитанные
          await markMessagesAsRead(userData.id, otherPlayerData.id);
          
          // Обновляем UserContext для обновления счетчика в нижнем меню
          await refreshUser(true);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных чата:', error);
      Alert.alert(t('chat.error'), t('chat.errorLoadingChat'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (currentUser && otherPlayer && otherPlayer.id === id) {
      try {
        const conversation = await getConversation(currentUser.id, otherPlayer.id);
        const now = Date.now();
        
        // Проверяем, есть ли действительно новые сообщения по ID
        const currentMessageIds = new Set(conversation.map(m => m.id));
        const newMessageIds = [...currentMessageIds].filter(id => !lastMessageIdsRef.current.has(id));
        
        // Обновляем состояние сообщений
        setMessages(conversation);
        
        // Обновляем отслеживаемые ID сообщений
        lastMessageIdsRef.current = currentMessageIds;
        
        // Проверяем, есть ли действительно новые сообщения и прошло ли достаточно времени
        if (newMessageIds.length > 0 && now - lastLoadTimeRef.current > 1000) {
          lastLoadTimeRef.current = now;
          
          // Находим новые сообщения по ID
          const newMessages = conversation.filter(m => newMessageIds.includes(m.id));
          
          // Если только что отправили сообщение, не воспроизводим звук получения
          if (justSentMessageRef.current) {
            console.log('🔊 Пропускаем звук получения - только что отправили сообщение');
            justSentMessageRef.current = false;
          } else {
            // Воспроизводим звук получения только для сообщений от других пользователей
            const incomingMessages = newMessages.filter(m => m.sender_id !== currentUser.id);
            if (incomingMessages.length > 0) {
              console.log('🔊 Воспроизводим звук получения для', incomingMessages.length, 'новых сообщений от других пользователей');
              try {
                await playIncomingMessageSound();
              } catch (soundError) {
                console.error('❌ Ошибка воспроизведения звука получения:', soundError);
              }
            } else {
              console.log('🔊 Пропускаем звук получения - все новые сообщения от текущего пользователя');
            }
          }
          
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else if (newMessageIds.length === 0) {
          console.log('🔊 Нет новых сообщений - пропускаем звук');
        } else {
          console.log('🔊 Слишком рано для звука - пропускаем');
        }

      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !otherPlayer) {
      return;
    }

    try {
      const success = await sendMessageSimple(currentUser.id, otherPlayer.id, newMessage.trim());
      if (success) {
        // Устанавливаем флаг, что только что отправили сообщение
        justSentMessageRef.current = true;
        
        // Воспроизводим звук отправки сообщения
        try {
          await playOutgoingMessageSound();
        } catch (soundError) {
          console.error('❌ Ошибка воспроизведения звука отправки:', soundError);
        }
        
        setNewMessage('');
        // Небольшая задержка для сохранения сообщения в базе данных
        setTimeout(async () => {
          await loadMessages();
          // Прокручиваем к последнему сообщению после загрузки
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 500);
      } else {
        Alert.alert(t('chat.error'), t('chat.errorSendingMessage'));
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    }
  };

  const formatTime = (timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('chat.loading')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (!otherPlayer) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок чата */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push('/messages')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <TouchableOpacity 
                onPress={() => router.push(`/player/${otherPlayer.id}`)}
                style={styles.avatarButton}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: otherPlayer.avatar || 'https://via.placeholder.com/40/333/fff?text=Player' }} 
                  style={styles.headerAvatar}
                />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{otherPlayer.name?.toUpperCase()}</Text>
                <Text style={styles.headerStatus}>
                  {otherPlayer.status === 'player' ? t('chat.player') : 
                   otherPlayer.status === 'coach' ? t('chat.coach') : 
                   otherPlayer.status === 'scout' ? t('chat.scout') : 
                   otherPlayer.status === 'admin' ? t('chat.admin') : t('chat.star')}
                </Text>
              </View>
            </View>
          </View>

          {/* Сообщения */}
          <KeyboardAvoidingView 
            style={styles.chatContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 132 : 20}
          >
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {!loading && messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#fff" />
                  <Text style={styles.emptyText}>{t('chat.startConversation', { name: otherPlayer.name?.toUpperCase() })}</Text>
                </View>
              ) : !loading ? (
                messages.map((message) => {
                  const isMyMessage = message.senderId === currentUser.id;
                  

                  
                  return (
                    <View 
                      key={message.id} 
                      style={[
                        styles.messageContainer,
                        isMyMessage ? styles.myMessage : styles.otherMessage
                      ]}
                    >
                      <View style={[
                        styles.messageBubble,
                        isMyMessage ? styles.myBubble : styles.otherBubble
                      ]}>
                        <Text style={[
                          styles.messageText,
                          isMyMessage ? styles.myMessageText : styles.otherMessageText
                        ]}>
                          {message.text}
                          {'  '}
                          <Text style={[
                            styles.messageTime,
                            isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                          ]}>
                            {formatTime(message.timestamp)}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : null}
            </ScrollView>

            {/* Поле ввода */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={t('chat.enterMessage')}
                placeholderTextColor="#888"
                multiline
                maxLength={500}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  !newMessage.trim() && styles.sendButtonDisabled
                ]} 
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarButton: {
    // Стиль для кнопки аватарки - прозрачный фон
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  headerStatus: {
    color: '#FF4444',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingTop: 60, // Отступ для фиксированного заголовка
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    marginHorizontal: 60,
    marginVertical: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: 6,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#FF4444',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#000',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 24,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherMessageTime: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.3)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendButton: {
    backgroundColor: '#FF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.5)',
  },
}); 