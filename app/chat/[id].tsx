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
import Swipeable from 'react-native-gesture-handler/Swipeable';
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
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    // Очищаем сообщения при смене чата
    setMessages([]);
    setNewMessage('');
    setLoading(true);
    loadChatData();
    
    // Очищаем polling при смене чата
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [id]);

  useEffect(() => {
    if (!currentUser || !otherPlayer || otherPlayer.id !== id) {
      return;
    }

    // Настраиваем Realtime подписку на изменения сообщений
    console.log('🔧 Настраиваем Realtime подписку для чата:', currentUser.id, 'с', otherPlayer.id);
    const channel = supabase
      .channel(`messages-chat-${currentUser.id}-${otherPlayer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
          // Убираем фильтр - слушаем все сообщения и фильтруем в коде
        },
        (payload) => {
          console.log('💬 Новое сообщение получено в чате:', payload.new);
          
          // Проверяем, что сообщение для этого чата
          const newMessage = payload.new;
          const isForThisChat = (
            (newMessage.sender_id === currentUser.id && newMessage.receiver_id === otherPlayer.id) ||
            (newMessage.sender_id === otherPlayer.id && newMessage.receiver_id === currentUser.id)
          );
          
          if (isForThisChat) {
            console.log('💬 Сообщение для этого чата, добавляем');
            
            // Добавляем новое сообщение в состояние
            setMessages(prevMessages => {
              // Проверяем, что сообщение еще не добавлено
              const exists = prevMessages.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('💬 Сообщение уже существует, пропускаем');
                return prevMessages;
              }
              
              console.log('💬 Добавляем новое сообщение в чат');
              return [...prevMessages, newMessage];
            });
            
            // Прокручиваем вниз после получения нового сообщения
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, Platform.OS === 'android' ? 200 : 100);
          } else {
            console.log('💬 Сообщение не для этого чата, пропускаем');
          }
        }
      )
      .subscribe((status) => {
        console.log('🔧 Статус Realtime подписки в чате:', status);
      });

    // Запускаем polling как fallback для Realtime
    console.log('🔧 Запускаем polling для чата');
    pollingIntervalRef.current = setInterval(async () => {
      if (currentUser && otherPlayer && otherPlayer.id === id) {
        try {
          const conversation = await getConversation(currentUser.id, otherPlayer.id);
          const currentMessageIds = new Set(conversation.map(m => m.id));
          const newMessageIds = [...currentMessageIds].filter(id => !lastMessageIdsRef.current.has(id));
          
          if (newMessageIds.length > 0) {
            console.log('🔄 Polling: найдены новые сообщения:', newMessageIds.length);
            setMessages(conversation);
            lastMessageIdsRef.current = currentMessageIds;
            
            // Прокручиваем вниз
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        } catch (error) {
          console.error('❌ Ошибка polling:', error);
        }
      }
    }, 2000); // Проверяем каждые 2 секунды

    return () => {
      console.log('🔧 Отключаем Realtime подписку в чате');
      supabase.removeChannel(channel);
      
      if (pollingIntervalRef.current) {
        console.log('🔧 Останавливаем polling для чата');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
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
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, Platform.OS === 'android' ? 300 : 100); // Больше времени для Android
          
          // Отмечаем сообщения как прочитанные
          await markMessagesAsRead(userData.id, otherPlayerData.id);
          
          // Убираем лишние обновления - теперь счетчик управляется через БД и Realtime
          // setTimeout(async () => {
          //   console.log('🔄 Обновляем UserContext после markMessagesAsRead');
          //   await refreshUser(true);
          // }, 100);
          
          // setTimeout(async () => {
          //   console.log('🔄 Повторное обновление UserContext');
          //   await refreshUser(true);
          // }, 1000);
          
          // setTimeout(async () => {
          //   console.log('🔄 Автоматическое скрытие индикатора через 2 секунды после захода в чат');
          //   await refreshUser(true);
          // }, 2000);
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
          
          // Если только что отправили сообщение, не воспроизводим вибрацию получения
          if (justSentMessageRef.current) {
            justSentMessageRef.current = false;
          } else {
            // Вибрация при получении сообщений от других пользователей
            const incomingMessages = newMessages.filter(m => m.sender_id !== currentUser.id);
            if (incomingMessages.length > 0) {
              try {
                if (Platform.OS === 'ios') {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                  Vibration.vibrate(75);
                }
              } catch (vibError) {
                console.error('❌ Ошибка вибрации при получении:', vibError);
              }
            }
          }
          
          // Прокручиваем вниз при получении новых сообщений
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, Platform.OS === 'android' ? 200 : 100);
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
        
        // Вибрация при отправке сообщения
        try {
          if (Platform.OS === 'ios') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            Vibration.vibrate(50);
          }
        } catch (vibError) {
          console.error('❌ Ошибка вибрации при отправке:', vibError);
        }
        
        setNewMessage('');
        // Загружаем сообщения сразу без задержки
        await loadMessages();
        // Прокручиваем к последнему сообщению после загрузки
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === 'android' ? 200 : 100);
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

  // Функция для форматирования даты (сегодня/вчера/дата)
  const formatDate = (timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Функция для группировки сообщений по дням
  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.timestamp);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    
    return grouped;
  };

  // Удаление одного сообщения
  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Сначала удаляем из UI для плавной анимации
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Затем удаляем из базы данных в фоне
      setTimeout(async () => {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);
        
        if (error) {
          console.error('❌ Ошибка удаления сообщения:', error);
          // Если ошибка, возвращаем сообщение в UI
          loadMessages();
        } else {
        }
      }, 100);
    } catch (error) {
      console.error('❌ Ошибка удаления сообщения:', error);
    }
  };

  // Очистка всего чата
  const handleClearChat = async () => {
    Alert.alert(
      t('chat.clearChat'),
      t('chat.clearChatConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUser || !otherPlayer) return;
              
              // Сначала очищаем UI
              setMessages([]);
              
              // Затем удаляем все сообщения из базы данных
              const { error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherPlayer.id}),and(sender_id.eq.${otherPlayer.id},receiver_id.eq.${currentUser.id})`);
              
              if (error) {
                console.error('❌ Ошибка очистки чата:', error);
                // Если ошибка, загружаем сообщения обратно
                loadMessages();
              } else {
              }
            } catch (error) {
              console.error('❌ Ошибка очистки чата:', error);
            }
          }
        }
      ]
    );
  };

  // Рендер правой кнопки удаления при свайпе
  const renderRightActions = () => {
    return (
      <View style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={32} color="#fff" />
      </View>
    );
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
                  source={{ 
                    uri: otherPlayer.avatar || 'https://via.placeholder.com/40/333/fff?text=Player',
                    cache: 'force-cache',
                    headers: {
                      'Cache-Control': 'max-age=3600'
                    }
                  }} 
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
            
            {/* Кнопка очистки чата */}
            {messages.length > 0 && (
              <TouchableOpacity onPress={handleClearChat} style={styles.clearChatButton}>
                <Ionicons name="trash-outline" size={24} color="#fa2f40" />
              </TouchableOpacity>
            )}
          </View>

          {/* Сообщения */}
          <KeyboardAvoidingView 
            style={styles.chatContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 132 : 0}
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
                (() => {
                  const groupedMessages = groupMessagesByDate(messages);
                  const dateKeys = Object.keys(groupedMessages).sort((a, b) => {
                    // Сортируем даты: старые -> вчера -> сегодня (новые внизу)
                    if (a === 'Сегодня') return 1;
                    if (b === 'Сегодня') return -1;
                    if (a === 'Вчера') return 1;
                    if (b === 'Вчера') return -1;
                    return a.localeCompare(b); // Старые даты вверху
                  });

                  return dateKeys.map(dateKey => (
                    <View key={dateKey}>
                      {/* Заголовок даты */}
                      <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>{dateKey}</Text>
                      </View>
                      
                      {/* Сообщения за этот день */}
                      {groupedMessages[dateKey].map((message) => {
                        const isMyMessage = message.senderId === currentUser.id;
                        
                        return (
                          <Swipeable
                            key={message.id}
                            renderRightActions={renderRightActions}
                            onSwipeableOpen={() => handleDeleteMessage(message.id)}
                            overshootRight={false}
                            friction={2}
                            rightThreshold={40}
                          >
                            <View 
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
                          </Swipeable>
                        );
                      })}
                    </View>
                  ));
                })()
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
                  }, Platform.OS === 'android' ? 300 : 100);
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
  clearChatButton: {
    // Убираем фон и отступы для компактности
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingTop: 60, // Отступ для фиксированного заголовка
    paddingBottom: Platform.OS === 'android' ? 30 : 0, // Дополнительный отступ снизу для Android
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 60 : 20, // Еще больше отступ для Android чтобы сообщения не перекрывались
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
    paddingBottom: Platform.OS === 'android' ? 8 : 12, // Небольшой отступ снизу для Android
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
  deleteButton: {
    backgroundColor: '#fa2f40',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
  },
  dateHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 