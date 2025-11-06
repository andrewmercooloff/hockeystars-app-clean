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
import CachedBackground from '../../components/CachedBackground';

const iceBg = require('../../assets/images/led.jpg');

export default function ChatScreen() {
  const { t } = useLanguage();
  const { id, scrollToBottom } = useLocalSearchParams();
  const router = useRouter();
  const { refreshUser, currentUser: contextUser, setCurrentUser: setContextUser } = useUser();
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

  // Обработка автоматической прокрутки при переходе через deep link
  useEffect(() => {
    if (scrollToBottom === 'true' && messages.length > 0 && !loading) {
      console.log('🔗 Автоматическая прокрутка в чат через deep link');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'android' ? 300 : 200);
    }
  }, [scrollToBottom, messages.length, loading]);

  useEffect(() => {
    if (!currentUser || !otherPlayer || otherPlayer.id !== id) {
      return;
    }

    console.log('🔌 Создаем Realtime подписку для чата:', currentUser.id, '<->', otherPlayer.id);

    // Настраиваем Realtime подписку на изменения сообщений
    // Убираем фильтр на уровне подписки - слушаем все сообщения и фильтруем в коде
    const channel = supabase
      .channel(`messages-chat-${currentUser.id}-${otherPlayer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📨 Realtime: Получено событие INSERT для сообщения:', payload.new);
          
          const rawMessage = payload.new;
          
          // Проверяем, что сообщение для этого чата
          const isForThisChat = (
            (rawMessage.sender_id === currentUser.id && rawMessage.receiver_id === otherPlayer.id) ||
            (rawMessage.sender_id === otherPlayer.id && rawMessage.receiver_id === currentUser.id)
          );
          
          if (!isForThisChat) {
            console.log('⏭️ Сообщение не для этого чата, пропускаем');
            return;
          }
          
          console.log('✅ Сообщение для этого чата, обрабатываем');
          
          // Преобразуем данные из Supabase формата (snake_case) в формат Message (camelCase)
          const newMessage: Message = {
            id: rawMessage.id,
            senderId: rawMessage.sender_id,
            receiverId: rawMessage.receiver_id,
            text: rawMessage.text,
            timestamp: new Date(rawMessage.created_at),
            read: rawMessage.read
          };
          
          // Добавляем новое сообщение в состояние
          setMessages(prevMessages => {
            // Проверяем, что сообщение еще не добавлено
            const exists = prevMessages.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('⚠️ Сообщение уже существует в списке, пропускаем');
              return prevMessages;
            }
            
            // Удаляем временное сообщение, если оно есть (заменяем на реальное из базы)
            const filteredMessages = prevMessages.filter(msg => !msg.id.startsWith('temp-'));
            
            console.log('➕ Добавляем новое сообщение в список. Всего сообщений:', filteredMessages.length + 1);
            return [...filteredMessages, newMessage];
          });
          
          // Помечаем сообщение как прочитанное, так как чат открыт
          // Это предотвратит обновление счетчика непрочитанных сообщений
          if (newMessage.receiverId === currentUser.id && !newMessage.read) {
            setTimeout(async () => {
              try {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMessage.id);
                
                // Обновляем счетчик, уменьшая его на 1, так как сообщение прочитано
                const { getUnreadMessageCount } = await import('../../utils/playerStorage');
                const newCount = await getUnreadMessageCount(currentUser.id);
                
                // Обновляем счетчик в базе данных
                await supabase
                  .from('players')
                  .update({ 
                    unread_messages_count: Math.max(0, newCount),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', currentUser.id);
              } catch (error) {
                console.error('❌ Ошибка отметки сообщения как прочитанного в открытом чате:', error);
              }
            }, 100);
          }
          
          // Прокручиваем вниз после получения нового сообщения
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, Platform.OS === 'android' ? 200 : 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${otherPlayer.id}`
        },
        (payload) => {
          // Обновляем онлайн-статус другого пользователя при изменении
          if (payload.new) {
            const updatedPlayer = payload.new as any;
            if (updatedPlayer.is_online !== undefined || updatedPlayer.last_seen !== undefined) {
              setOtherPlayer(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  isOnline: updatedPlayer.is_online ?? prev.isOnline,
                  lastSeen: updatedPlayer.last_seen ?? prev.lastSeen
                };
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime подписка статус:', status);
      });

    // Polling убран - используем только Realtime подписку для обновления статуса
    // Это исключает лишнюю нагрузку на базу данных
    // Статус обновляется:
    // 1. При загрузке чата (свежие данные из базы)
    // 2. Через Realtime подписку (мгновенно при изменении)
    
    return () => {
      console.log('🔌 Удаляем Realtime подписку для чата');
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, otherPlayer?.id, id]);

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

  // Синхронизируем счетчик с глобальным контекстом после загрузки
  // useEffect(() => {
  //   if (currentUser && contextUser && currentUser.unreadMessagesCount !== contextUser.unreadMessagesCount) {
  //     // Обновляем глобальный контекст только если счетчики различаются
  //     if (currentUser.id === contextUser.id) {
  //       setContextUser({ ...contextUser, unreadMessagesCount: currentUser.unreadMessagesCount });
  //     }
  //   }
  // }, [currentUser, contextUser]);

  const loadChatData = async () => {
    try {
      if (id) {
        const otherPlayerData = await getPlayerById(id as string);
        const userData = await loadCurrentUser();
        
        // Редирект убран - проверка авторизации происходит в _layout.tsx
        if (!userData) {
          return;
        }

        setOtherPlayer(otherPlayerData);
        setCurrentUser(userData);
        
        if (otherPlayerData) {
          // Принудительно обновляем статус онлайн при загрузке чата
          // Получаем актуальные данные из базы напрямую
          try {
            const { data: freshPlayerData, error } = await supabase
              .from('players')
              .select('is_online, last_seen')
              .eq('id', otherPlayerData.id)
              .single();
            
            if (!error && freshPlayerData) {
              setOtherPlayer(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  isOnline: freshPlayerData.is_online ?? prev.isOnline,
                  lastSeen: freshPlayerData.last_seen ?? prev.lastSeen
                };
              });
            }
          } catch (statusError) {
            console.warn('⚠️ Не удалось обновить статус при загрузке чата:', statusError);
          }
          
          // Сразу загружаем сообщения
          const conversation = await getConversation(userData.id, otherPlayerData.id);
          setMessages(conversation);
          
          // Прокручиваем вниз после загрузки сообщений
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, Platform.OS === 'android' ? 300 : 100); // Больше времени для Android
          
          // Отмечаем сообщения как прочитанные
          await markMessagesAsRead(userData.id, otherPlayerData.id);
          
          // Обновляем локальное состояние
          setCurrentUser(userData);
          
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
            const incomingMessages = newMessages.filter(m => m.senderId !== currentUser.id);
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

    const messageText = newMessage.trim();
    setNewMessage(''); // Очищаем поле сразу для лучшего UX
    
    // Оптимистичное обновление - добавляем сообщение сразу в UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`, // Временный ID
      senderId: currentUser.id,
      receiverId: otherPlayer.id,
      text: messageText,
      timestamp: new Date(),
      read: false
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Прокручиваем вниз сразу
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
    
    // Устанавливаем флаг, что только что отправили сообщение
    justSentMessageRef.current = true;

    try {
      const success = await sendMessageSimple(currentUser.id, otherPlayer.id, messageText);
      if (success) {
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
        
        // Realtime подписка автоматически заменит временное сообщение на реальное
        // Но на всякий случай обновим список через небольшую задержку
        setTimeout(async () => {
          await loadMessages();
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }, 500);
      } else {
        // Если отправка не удалась - удаляем временное сообщение
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        setNewMessage(messageText); // Возвращаем текст обратно
        Alert.alert(t('chat.error'), t('chat.errorSendingMessage'));
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageText); // Возвращаем текст обратно
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

  // Ответ на сообщение
  const handleReplyToMessage = (message: Message) => {
    try {
      // Устанавливаем текст ответа в поле ввода
      const replyText = `> ${message.text}\n\n`;
      setNewMessage(replyText);
      
      // Прокручиваем к полю ввода
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        console.log('Ответ на сообщение:', message.text);
      }, 100);
    } catch (error) {
      console.error('Ошибка ответа на сообщение:', error);
    }
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

  // Рендер левой кнопки ответа при свайпе
  const renderLeftActions = (message: Message) => {
    return (
      <View style={styles.replyButton}>
        <Ionicons name="arrow-undo-outline" size={24} color="#fff" />
      </View>
    );
  };

  // Рендер правой кнопки удаления при свайпе
  const renderRightActions = () => {
    return (
      <View style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={24} color="#fa2f40" />
      </View>
    );
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('chat.loading')}</Text>
            </View>
          </View>
        </CachedBackground>
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
      <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
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
                <Text style={[
                  styles.headerStatus,
                  otherPlayer.isOnline ? styles.headerStatusOnline : styles.headerStatusOffline
                ]}>
                  {otherPlayer.isOnline ? (t('chat.online') || 'Онлайн') : (t('chat.offline') || 'Офлайн')}
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
                            renderLeftActions={() => renderLeftActions(message)}
                            renderRightActions={renderRightActions}
                            onSwipeableLeftOpen={() => handleReplyToMessage(message)}
                            onSwipeableRightOpen={() => handleDeleteMessage(message.id)}
                            overshootRight={false}
                            overshootLeft={false}
                            friction={2}
                            rightThreshold={40}
                            leftThreshold={40}
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
                placeholderTextColor="#fff"
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
      </CachedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(151, 175, 192, 0.6)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
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
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  headerStatusOnline: {
    color: '#4CAF50',
  },
  headerStatusOffline: {
    color: '#888',
  },
  clearChatButton: {
    // Убираем фон и отступы для компактности
  },
  chatContainer: {
    flex: 1,
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
  },
  messagesContainer: {
    flex: 1,
    paddingTop: 60, // Отступ для фиксированного заголовка
    paddingBottom: Platform.OS === 'android' ? 30 : 0, // Дополнительный отступ снизу для Android
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 60 : 20, // Еще больше отступ для Android чтобы сообщения не перекрывались
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    borderRadius: 15,
    marginHorizontal: 60,
    marginVertical: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: 'rgb(1,0,0)',
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
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
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
    shadowColor: 'rgb(1,0,0)',
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
    backgroundColor: 'rgb(1,0,0)',
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
    backgroundColor: 'transparent',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    marginBottom: -5,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.5)',
  },
  sendButton: {
    backgroundColor: '#fa2f40',
    opacity: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -2,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#fa2f40',
    opacity: 0.7,
  },
  replyButton: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
  },
  deleteButton: {
    backgroundColor: 'transparent',
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
    fontFamily: 'Gilroy-Regular',
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 