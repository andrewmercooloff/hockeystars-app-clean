import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
    getConversation,
    getPlayerById,
    loadCurrentUser,
    markMessagesAsRead,
    Message,
    Player,
    sendMessageSimple,
    blockUser,
    unblockUser,
    isUserBlocked,
    getFriends
} from '../../utils/playerStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../utils/supabase';
import CachedBackground from '../../components/CachedBackground';
import CachedAvatar from '../../components/CachedAvatar';
import { addActivityPoints } from '../../services/activityService';

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
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null); // Сообщение, на которое отвечаем
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false); // Флаг для скрытия контента до прокрутки
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isReportingChat, setIsReportingChat] = useState(false);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [chatMenuPosition, setChatMenuPosition] = useState({ x: 0, y: 0 });
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isUserBlockedState, setIsUserBlockedState] = useState(false);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [friendsList, setFriendsList] = useState<Player[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const messageRefs = useRef<Map<string, View>>(new Map());
  const scrollViewRef = useRef<ScrollView>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const justSentMessageRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true); // Флаг первой загрузки чата
  const savedScrollPositionRef = useRef<number | null>(null); // Сохраненная позиция прокрутки
  const wasNearBottomRef = useRef<boolean>(true); // Был ли пользователь внизу перед уходом
  const chatMenuButtonRef = useRef<View>(null);


  useEffect(() => {
    // Очищаем сообщения при смене чата
    setMessages([]);
    setNewMessage('');
    setLoading(true);
    setReplyingToMessage(null); // Очищаем сообщение для ответа при смене чата
    setContextMenuVisible(false); // Закрываем меню при смене чата
    setContextMenuMessage(null);
    messageRefs.current.clear(); // Очищаем refs сообщений
    isInitialLoadRef.current = true; // Сбрасываем флаг при смене чата
    savedScrollPositionRef.current = null; // Сбрасываем сохраненную позицию при смене чата
    wasNearBottomRef.current = true; // Сбрасываем флаг при смене чата
    setIsScrolledToBottom(false); // Сбрасываем флаг прокрутки
    loadChatData();
  }, [id]);

  // Обработка автоматической прокрутки при переходе через deep link
  useEffect(() => {
    if (scrollToBottom === 'true' && messages.length > 0 && !loading && scrollViewRef.current) {
      console.log('🔗 Автоматическая прокрутка в чат через deep link');
      // При первой загрузке - без анимации, сразу вниз
      if (isInitialLoadRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: false });
        setIsNearBottom(true);
        isInitialLoadRef.current = false;
      }
    }
  }, [scrollToBottom, messages.length, loading]);

  // Убираем прокрутку - контент сразу будет внизу через contentContainerStyle

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
          
          // Парсим информацию об ответе из текста сообщения
          let text = rawMessage.text;
          let replyToId: string | undefined;
          let replyToText: string | undefined;
          let replyToSenderId: string | undefined;
          
          const replyDataMatch = text.match(/^\[REPLY_DATA:(.+?)\](.*)$/);
          if (replyDataMatch) {
            try {
              const replyData = JSON.parse(replyDataMatch[1]);
              if (replyData.replyTo) {
                replyToId = replyData.replyTo.id;
                replyToText = replyData.replyTo.text;
                replyToSenderId = replyData.replyTo.senderId;
                text = replyDataMatch[2];
              }
            } catch (e) {
              console.error('Ошибка парсинга replyTo данных:', e);
            }
          }
          
          // Преобразуем данные из Supabase формата (snake_case) в формат Message (camelCase)
          const newMessage: Message = {
            id: rawMessage.id,
            senderId: rawMessage.sender_id,
            receiverId: rawMessage.receiver_id,
            text: text,
            timestamp: new Date(rawMessage.created_at),
            read: rawMessage.read,
            replyToId,
            replyToText,
            replyToSenderId
          };
          
            // Добавляем новое сообщение в состояние
            setMessages(prevMessages => {
              // Проверяем, что сообщение еще не добавлено
              const exists = prevMessages.some(msg => msg.id === newMessage.id);
              if (exists) {
                // Если сообщение уже существует, обновляем его (например, статус прочтения)
                console.log('⚠️ Сообщение уже существует в списке, обновляем его');
                return prevMessages.map(msg => {
                  if (msg.id === newMessage.id) {
                    return {
                      ...msg,
                      read: rawMessage.read || false,
                      text: rawMessage.text || msg.text
                    };
                  }
                  return msg;
                });
              }
              
            // Удаляем временное сообщение, если оно есть (заменяем на реальное из базы)
            // Ищем временное сообщение с таким же текстом и отправителем
            const filteredMessages = prevMessages.filter(msg => {
              if (msg.id.startsWith('temp-')) {
                // Если это временное сообщение от текущего пользователя с таким же текстом
                // и временем отправки близким к текущему, заменяем его
                if (msg.senderId === newMessage.senderId && 
                    msg.text === newMessage.text &&
                    Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 5000) {
                  return false; // Удаляем временное сообщение
                }
              }
              return true;
            });
            
            console.log('➕ Добавляем новое сообщение в список. Всего сообщений:', filteredMessages.length + 1);
            return [...filteredMessages, newMessage];
            });
            
            // Помечаем сообщение как прочитанное, так как чат открыт
            // Это предотвратит обновление счетчика непрочитанных сообщений
          if (newMessage.receiverId === currentUser.id && !newMessage.read) {
              // Сразу обновляем локальное состояние для мгновенного отображения
              setMessages(prevMessages => {
                return prevMessages.map(msg => {
                  if (msg.id === newMessage.id) {
                    return { ...msg, read: true };
                  }
                  return msg;
                });
              });
              
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
                  // Откатываем изменение в случае ошибки
                  setMessages(prevMessages => {
                    return prevMessages.map(msg => {
                      if (msg.id === newMessage.id) {
                        return { ...msg, read: false };
                      }
                      return msg;
                    });
                  });
                }
              }, 100);
            }
            
            // Прокручиваем вниз после получения нового сообщения
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
              setIsNearBottom(true);
              wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
            }, Platform.OS === 'android' ? 200 : 100);
          }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📨 Realtime: Получено событие UPDATE для сообщения:', payload.new);
          
          const rawMessage = payload.new;
          
          // Проверяем, что сообщение для этого чата
          const isForThisChat = (
            (rawMessage.sender_id === currentUser.id && rawMessage.receiver_id === otherPlayer.id) ||
            (rawMessage.sender_id === otherPlayer.id && rawMessage.receiver_id === currentUser.id)
          );
          
          if (!isForThisChat) {
            return;
          }
          
          // Обновляем статус прочтения сообщения в локальном состоянии
          setMessages(prevMessages => {
            return prevMessages.map(msg => {
              if (msg.id === rawMessage.id) {
                return {
                  ...msg,
                  read: rawMessage.read || false
                };
              }
              return msg;
            });
          });
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

  // Обработка системной кнопки "назад" и восстановление позиции при возврате в чат
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.push('/messages');
        return true; // Предотвращаем стандартное поведение
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // При возврате в чат восстанавливаем позицию или прокручиваем вниз
      if (messages.length > 0 && !loading && scrollViewRef.current) {
        // Небольшая задержка для рендеринга контента
        setTimeout(() => {
          if (isInitialLoadRef.current) {
            // При первой загрузке прокручиваем вниз
            scrollViewRef.current?.scrollToEnd({ animated: false });
            setIsNearBottom(true);
            wasNearBottomRef.current = true;
            isInitialLoadRef.current = false;
          } else if (savedScrollPositionRef.current !== null && !wasNearBottomRef.current) {
            // Восстанавливаем сохраненную позицию, если не был внизу
            scrollViewRef.current.scrollTo({
              y: savedScrollPositionRef.current,
              animated: false
            });
            setIsNearBottom(false);
          } else if (wasNearBottomRef.current) {
            // Если был внизу, прокручиваем вниз
            scrollViewRef.current?.scrollToEnd({ animated: false });
            setIsNearBottom(true);
          }
        }, Platform.OS === 'android' ? 100 : 50);
      }

      // При уходе из чата сохраняем текущую позицию
      return () => {
        backHandler.remove();
        // Позиция уже сохранена в onScroll
      };
    }, [messages.length, loading])
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
        // Загружаем данные параллельно для ускорения
        const [otherPlayerData, userData] = await Promise.all([
          getPlayerById(id as string),
          loadCurrentUser()
        ]);
        
        // Редирект убран - проверка авторизации происходит в _layout.tsx
        if (!userData) {
          setLoading(false);
          return;
        }

        setOtherPlayer(otherPlayerData);
        setCurrentUser(userData);
        
        if (otherPlayerData) {
          // Загружаем сообщения и статус онлайн параллельно
          const [conversation, statusResult] = await Promise.all([
            getConversation(userData.id, otherPlayerData.id).catch(err => {
              console.error('❌ Ошибка загрузки диалога:', err);
              return [];
            }),
            supabase
              .from('players')
              .select('is_online, last_seen')
              .eq('id', otherPlayerData.id)
              .single()
              .then(({ data, error }) => ({ data, error }))
              .catch(err => ({ data: null, error: err }))
          ]);
          
          // Обновляем статус онлайн если получен
          if (statusResult.data && !statusResult.error) {
            setOtherPlayer(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                isOnline: statusResult.data.is_online ?? prev.isOnline,
                lastSeen: statusResult.data.last_seen ?? prev.lastSeen
              };
            });
          }
          
          // Устанавливаем сообщения
          console.log(`✅ Загружено ${conversation.length} сообщений в диалоге`);
          if (conversation.length > 0) {
            console.log(`📨 Примеры сообщений:`, conversation.slice(0, 3).map(m => ({ id: m.id, text: m.text.substring(0, 30) })));
          }
          setMessages(conversation);
          setIsNearBottom(true);
          // useLayoutEffect обработает прокрутку синхронно
          
          // Отмечаем сообщения как прочитанные асинхронно (не блокируем UI)
          markMessagesAsRead(userData.id, otherPlayerData.id).catch(err => {
            console.error('⚠️ Ошибка отметки сообщений как прочитанных (не критично):', err);
          });
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных чата:', error);
      console.error('❌ Детали ошибки:', error instanceof Error ? error.message : String(error));
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
      Alert.alert(t('chat.error'), t('chat.errorLoadingChat'));
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Жалоба на чат
  const reportChat = React.useCallback(async () => {
    // Нельзя пожаловаться на чат с админом или быть админом и жаловаться на чат
    if (!currentUser || !otherPlayer || isReportingChat || 
        otherPlayer.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    setIsReportingChat(true);

    try {
      const { data: admins, error: adminsError } = await supabase
        .from('players')
        .select('id, name')
        .eq('status', 'admin');

      if (adminsError || !admins || admins.length === 0) {
        console.error('❌ Ошибка получения списка админов для жалобы на чат:', adminsError);
        Alert.alert(t('common.error') || 'Ошибка', t('admin.error') || 'Ошибка');
        return;
      }

      const adminIds = admins.map(admin => admin.id);
      const { data: pushTokens, error: tokensError } = await supabase
        .from('push_tokens')
        .select('user_id, token')
        .in('user_id', adminIds);

      if (tokensError) {
        console.error('❌ Ошибка получения push токенов админов:', tokensError);
      }

      const tokensMap = new Map<string, string[]>();
      if (pushTokens) {
        pushTokens.forEach(pt => {
          if (!tokensMap.has(pt.user_id)) {
            tokensMap.set(pt.user_id, []);
          }
          tokensMap.get(pt.user_id)!.push(pt.token);
        });
      }

      const generateUUID = (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const timestamp = new Date().toISOString();
      const notificationMessage =
        t('admin.reportChatNotification', {
          reporterName: currentUser.name,
          reportedName: otherPlayer.name,
        }) || `${currentUser.name} пожаловался на чат с ${otherPlayer.name}`;

      const notifications = admins.map(admin => ({
        id: generateUUID(),
        user_id: admin.id,
        type: 'user_report',
        title: notificationMessage,
        message: notificationMessage,
        data: {
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          reporterAvatar: currentUser.avatar,
          reportedId: otherPlayer.id,
          reportedName: otherPlayer.name,
          reportedAvatar: otherPlayer.avatar,
          context: 'chat',
          timestamp,
        },
        created_at: timestamp,
        is_read: false,
      }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('❌ Ошибка создания уведомлений о жалобе на чат:', notificationError);
          Alert.alert(t('common.error') || 'Ошибка', t('admin.error') || 'Ошибка');
          return;
        }

        for (const admin of admins) {
          const adminTokens = tokensMap.get(admin.id);
          if (adminTokens && adminTokens.length > 0) {
            try {
              const { sendNotificationToUser } = await import('../../utils/notificationService');
              await sendNotificationToUser(
                admin.id,
                notificationMessage,
                '',
                {
                  type: 'user_report',
                  reporterId: currentUser.id,
                  reportedId: otherPlayer.id,
                  context: 'chat',
                }
              );
            } catch (error) {
              console.warn(`Не удалось отправить push-уведомление админу ${admin.name}:`, error);
            }
          }
        }
      }

      Alert.alert(
        t('admin.reportUserTitle') || 'Жалоба отправлена',
        t('admin.reportUserMessage') || 'Жалоба отправлена администратору. Мы свяжемся с Вами, если нужны будут подробности.'
      );
    } catch (error) {
      console.error('❌ Ошибка отправки жалобы на чат:', error);
      Alert.alert(t('common.error') || 'Ошибка', t('admin.error') || 'Ошибка');
    } finally {
      setIsReportingChat(false);
    }
  }, [currentUser, otherPlayer, isReportingChat, t]);

  const handleReportChat = React.useCallback(() => {
    // Нельзя пожаловаться на чат с админом или быть админом и жаловаться на чат
    if (!currentUser || !otherPlayer || 
        otherPlayer.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    Alert.alert(
      t('chat.reportChat') || t('admin.reportUser') || 'Пожаловаться',
      t('chat.reportChatConfirm') || 'Вы уверены, что хотите пожаловаться на этот чат?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'OK', onPress: () => reportChat() }
      ]
    );
  }, [currentUser, otherPlayer, reportChat, t]);

  // Проверка блокировки пользователя
  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!currentUser || !otherPlayer) {
        return;
      }
      const blocked = await isUserBlocked(currentUser.id, otherPlayer.id);
      setIsUserBlockedState(blocked);
    };
    checkBlockedStatus();
  }, [currentUser, otherPlayer]);

  // Обработчик открытия меню чата
  const handleOpenChatMenu = () => {
    if (!chatMenuButtonRef.current) {
      return;
    }
    chatMenuButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
      setChatMenuPosition({ x: pageX + width, y: pageY + height });
      setChatMenuVisible(true);
    });
  };

  // Обработчик закрытия меню чата
  const handleCloseChatMenu = () => {
    setChatMenuVisible(false);
  };

  // Обработчик блокировки пользователя из чата
  const handleBlockUserFromChat = React.useCallback(async () => {
    if (!currentUser || !otherPlayer || isBlockingUser) {
      return;
    }

    handleCloseChatMenu();

    Alert.alert(
      t('profile.blockUser') || 'Заблокировать пользователя',
      t('profile.blockUserConfirm', { name: otherPlayer.name }) || `Вы уверены, что хотите заблокировать ${otherPlayer.name}?`,
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        { 
          text: t('profile.block') || 'Заблокировать', 
          style: 'destructive',
          onPress: async () => {
            setIsBlockingUser(true);
            try {
              const success = await blockUser(currentUser.id, otherPlayer.id);
              if (success) {
                setIsUserBlockedState(true);
                Alert.alert(
                  t('profile.blockUserTitle') || 'Пользователь заблокирован',
                  t('profile.blockUserMessage') || 'Пользователь был заблокирован. Вы больше не будете видеть его сообщения и профиль.'
                );
                router.push('/messages');
              } else {
                Alert.alert(t('common.error') || 'Ошибка', t('profile.blockUserError') || 'Не удалось заблокировать пользователя');
              }
            } catch (error) {
              console.error('❌ Ошибка блокировки пользователя:', error);
              Alert.alert(t('common.error') || 'Ошибка', t('profile.blockUserError') || 'Не удалось заблокировать пользователя');
            } finally {
              setIsBlockingUser(false);
            }
          }
        }
      ]
    );
  }, [currentUser, otherPlayer, isBlockingUser, t, router]);

  // Обработчик разблокировки пользователя из чата
  const handleUnblockUserFromChat = React.useCallback(async () => {
    // Нельзя разблокировать админа или быть админом и разблокировать кого-то
    if (!currentUser || !otherPlayer || isBlockingUser || 
        otherPlayer.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    handleCloseChatMenu();

    Alert.alert(
      t('profile.unblockUser') || 'Разблокировать пользователя',
      t('profile.unblockUserConfirm', { name: otherPlayer.name }) || `Вы уверены, что хотите разблокировать ${otherPlayer.name}?`,
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        { 
          text: t('profile.unblock') || 'Разблокировать', 
          style: 'default',
          onPress: async () => {
            setIsBlockingUser(true);
            try {
              const success = await unblockUser(currentUser.id, otherPlayer.id);
              if (success) {
                setIsUserBlockedState(false);
                Alert.alert(
                  t('profile.unblockUserTitle') || 'Пользователь разблокирован',
                  t('profile.unblockUserMessage') || 'Пользователь был разблокирован.'
                );
              } else {
                Alert.alert(t('common.error') || 'Ошибка', t('profile.unblockUserError') || 'Не удалось разблокировать пользователя');
              }
            } catch (error) {
              console.error('❌ Ошибка разблокировки пользователя:', error);
              Alert.alert(t('common.error') || 'Ошибка', t('profile.unblockUserError') || 'Не удалось разблокировать пользователя');
            } finally {
              setIsBlockingUser(false);
            }
          }
        }
      ]
    );
  }, [currentUser, otherPlayer, isBlockingUser, t]);

  // Обработчик жалобы из меню чата
  const handleReportFromChatMenu = React.useCallback(() => {
    handleCloseChatMenu();
    handleReportChat();
  }, [handleReportChat]);

  const loadMessages = async () => {
    if (currentUser && otherPlayer && otherPlayer.id === id) {
      try {
        // Проверяем, не заблокировал ли нас другой пользователь
        const isBlockedByThem = await isUserBlocked(otherPlayer.id, currentUser.id);
        if (isBlockedByThem) {
          // Если нас заблокировали, не показываем сообщения и редиректим
          Alert.alert(
            t('common.error') || 'Ошибка',
            'Вы не можете видеть сообщения этого пользователя.'
          );
          router.push('/messages');
          return;
        }
        
        const conversation = await getConversation(currentUser.id, otherPlayer.id);
        const now = Date.now();
        
        // Проверяем, есть ли действительно новые сообщения по ID
        const currentMessageIds = new Set(conversation.map(m => m.id));
        const newMessageIds = [...currentMessageIds].filter(id => !lastMessageIdsRef.current.has(id));
        
        // Парсим информацию об ответе для всех сообщений
        const parsedConversation = conversation.map(msg => {
          let text = msg.text;
          let replyToId: string | undefined = msg.replyToId;
          let replyToText: string | undefined = msg.replyToText;
          let replyToSenderId: string | undefined = msg.replyToSenderId;
          
          // Если replyTo данные не были распарсены при загрузке, парсим из текста
          if (!replyToId) {
            const replyDataMatch = text.match(/^\[REPLY_DATA:(.+?)\](.*)$/);
            if (replyDataMatch) {
              try {
                const replyData = JSON.parse(replyDataMatch[1]);
                if (replyData.replyTo) {
                  replyToId = replyData.replyTo.id;
                  replyToText = replyData.replyTo.text;
                  replyToSenderId = replyData.replyTo.senderId;
                  text = replyDataMatch[2];
                }
              } catch (e) {
                console.error('Ошибка парсинга replyTo данных:', e);
              }
            }
          }
          
          return {
            ...msg,
            text,
            replyToId,
            replyToText,
            replyToSenderId
          };
        });
        
        // Обновляем состояние сообщений
        setMessages(parsedConversation);
        
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
            setIsNearBottom(true);
            wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
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
    const replyingTo = replyingToMessage;
    setNewMessage(''); // Очищаем поле сразу для лучшего UX
    setReplyingToMessage(null); // Очищаем сообщение для ответа
    
    // Оптимистичное обновление - добавляем сообщение сразу в UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`, // Временный ID
      senderId: currentUser.id,
      receiverId: otherPlayer.id,
      text: messageText,
      timestamp: new Date(),
      read: false,
      replyToId: replyingTo?.id,
      replyToText: replyingTo?.text,
      replyToSenderId: replyingTo?.senderId
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Прокручиваем вниз сразу
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      setIsNearBottom(true);
      wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
    }, 50);
    
        // Устанавливаем флаг, что только что отправили сообщение
        justSentMessageRef.current = true;
        
    try {
      const success = await sendMessageSimple(
        currentUser.id, 
        otherPlayer.id, 
        messageText,
        replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        } : undefined
      );
      if (success) {
        // Начисляем 1 звездочку за отправку сообщения
        try {
          await addActivityPoints(currentUser.id, 'MESSAGE_SEND');
        } catch (error) {
          console.error('❌ Ошибка начисления очков активности за сообщение (не критично):', error);
        }
        
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
          setIsNearBottom(true);
          wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
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
      // Сохраняем сообщение для ответа
      setReplyingToMessage(message);
      
      // Прокручиваем к полю ввода
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        setIsNearBottom(true);
        wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
        console.log('Ответ на сообщение:', message.text);
      }, 100);
    } catch (error) {
      console.error('Ошибка ответа на сообщение:', error);
    }
  };

  // Обработка долгого нажатия на сообщение
  const handleLongPressMessage = (message: Message) => {
    const messageRef = messageRefs.current.get(message.id);
    if (!messageRef) {
      console.warn('Message ref not found for message:', message.id);
      return;
    }
    
    // Получаем позицию сообщения на экране
    messageRef.measure((x, y, width, height, pageX, pageY) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      
      // Позиционируем меню прямо под сообщением
      const isMyMessage = message.senderId === currentUser?.id;
      const menuWidth = 160;
      const menuHeight = 120; // 3 пункта меню
      
      // Вычисляем позицию меню
      let menuX: number;
      let menuY: number;
      
      // Для моих сообщений (справа) - меню справа от сообщения
      // Для чужих сообщений (слева) - меню слева от сообщения
      if (isMyMessage) {
        // Мое сообщение - меню справа от него, выровнено по правому краю
        menuX = Math.max(10, pageX + width - menuWidth);
      } else {
        // Чужое сообщение - меню слева от него, выровнено по левому краю
        menuX = Math.min(screenWidth - menuWidth - 10, pageX);
      }
      
      // Вертикальная позиция - прямо под сообщением
      menuY = Math.min(screenHeight - menuHeight - 10, pageY + height + 5);
      
      setContextMenuPosition({ x: menuX, y: menuY });
      setContextMenuMessage(message);
      setContextMenuVisible(true);
      
      // Вибрация при открытии меню
      try {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Vibration.vibrate(50);
        }
      } catch (e) {
        // Игнорируем ошибки вибрации
      }
    });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenuVisible(false);
    setContextMenuMessage(null);
  };
  
  const handleContextMenuAction = (action: 'reply' | 'forward' | 'delete') => {
    if (!contextMenuMessage) return;
    
    handleCloseContextMenu();
    
    if (action === 'reply') {
      handleReplyToMessage(contextMenuMessage);
    } else if (action === 'forward') {
      handleForwardMessage(contextMenuMessage);
    } else if (action === 'delete') {
      handleDeleteMessage(contextMenuMessage.id);
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

  // Пересылка сообщения
  const handleForwardMessage = async (message: Message) => {
    if (!currentUser) return;
    
    setForwardMessage(message);
    setLoadingFriends(true);
    setForwardModalVisible(true);
    
    try {
      const friends = await getFriends(currentUser.id);
      // Исключаем текущего собеседника из списка
      const filteredFriends = friends.filter(f => f.id !== otherPlayer?.id);
      setFriendsList(filteredFriends);
    } catch (error) {
      console.error('❌ Ошибка загрузки друзей:', error);
      setFriendsList([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Отправка пересланного сообщения
  const handleSendForwardedMessage = async (recipient: Player) => {
    if (!currentUser || !forwardMessage) return;
    
    try {
      // Формируем текст пересланного сообщения
      const senderName = forwardMessage.senderId === currentUser.id 
        ? currentUser.name 
        : otherPlayer?.name || 'Unknown';
      const forwardedText = `[FWD]${senderName}:\n${forwardMessage.text}`;
      
      await sendMessageSimple(currentUser.id, recipient.id, forwardedText);
      
      setForwardModalVisible(false);
      setForwardMessage(null);
      
      Alert.alert(
        t('chat.messageForwarded') || 'Сообщение переслано',
        `${t('chat.forwardedTo') || 'Переслано'}: ${recipient.name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Ошибка пересылки сообщения:', error);
      Alert.alert(
        t('common.error') || 'Ошибка',
        t('chat.forwardError') || 'Не удалось переслать сообщение'
      );
    }
  };

  // Очистка всего чата
  const handleClearChat = async () => {
    // Нельзя очистить чат с админом или быть админом и очищать чат
    if (!currentUser || !otherPlayer || 
        otherPlayer.status === 'admin' || currentUser.status === 'admin') {
      return;
    }
    
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
          <BlurView
            intensity={20}
            tint="dark"
            style={styles.headerBlur}
          >
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
                <CachedAvatar
                  playerId={otherPlayer.id}
                  fallbackAvatarUrl={otherPlayer.avatar || 'https://via.placeholder.com/40/333/fff?text=Player'}
                  size={40}
                  style={styles.headerAvatar}
                  status={otherPlayer.status}
                />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.headerName}>
                  {otherPlayer.status === 'scout' ? t('profile.scout')?.toUpperCase() || 'SCOUT' : otherPlayer.name?.toUpperCase()}
                </Text>
                <Text style={[
                  styles.headerStatus,
                  otherPlayer.isOnline ? styles.headerStatusOnline : styles.headerStatusOffline
                ]}>
                  {otherPlayer.isOnline ? (t('chat.online') || 'Онлайн') : (t('chat.offline') || 'Офлайн')}
                </Text>
              </View>
            </View>
            
            {/* Кнопка с 3 точками - НЕ показывается для админов */}
            {/* НЕ показывается если другой пользователь - админ или текущий пользователь - админ */}
            {otherPlayer && currentUser && 
             otherPlayer.status !== 'admin' && 
             currentUser.status !== 'admin' && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  ref={chatMenuButtonRef}
                  onPress={handleOpenChatMenu}
                  style={styles.headerActionButton}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  accessibilityLabel="Menu"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color="#fff"
                    style={styles.headerActionIcon}
                  />
                </TouchableOpacity>
              </View>
            )}
            </View>
          </BlurView>

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
              onScroll={(event) => {
                const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                const paddingToBottom = 100; // Порог для определения "внизу"
                const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
                setIsNearBottom(isAtBottom);
                // Сохраняем текущую позицию прокрутки
                savedScrollPositionRef.current = contentOffset.y;
                wasNearBottomRef.current = isAtBottom;
              }}
              scrollEventThrottle={400}
              onContentSizeChange={(contentWidth, contentHeight) => {
                if (messages.length > 0 && !loading && scrollViewRef.current) {
                  if (isInitialLoadRef.current) {
                    // При первой загрузке просто отмечаем, что контент загружен
                    // Прокрутка не нужна - контент уже внизу через justifyContent: 'flex-end'
                    setIsNearBottom(true);
                    setIsScrolledToBottom(true);
                    wasNearBottomRef.current = true;
                    isInitialLoadRef.current = false;
                  } else if (savedScrollPositionRef.current !== null && !wasNearBottomRef.current) {
                    // Восстанавливаем сохраненную позицию, если не был внизу
                    scrollViewRef.current.scrollTo({
                      y: savedScrollPositionRef.current,
                      animated: false
                    });
                    setIsNearBottom(false);
                  }
                }
              }}
            >
              {!loading && messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="chatbubble-outline" size={64} color="#fa2f40" />
                    <Text style={styles.emptyTitle}>
                      {t('chat.startConversation', { 
                        name: otherPlayer.status === 'scout' 
                          ? t('profile.scout')?.toUpperCase() || 'SCOUT' 
                          : otherPlayer.name?.toUpperCase() 
                      })}
                    </Text>
                  </View>
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
                            onSwipeableLeftOpen={() => handleReplyToMessage(message)}
                            overshootLeft={false}
                            friction={2}
                            leftThreshold={40}
                          >
                            <TouchableOpacity
                              activeOpacity={1}
                              onLongPress={() => handleLongPressMessage(message)}
                              delayLongPress={500}
                            >
                              <View 
                                ref={(ref) => {
                                  if (ref) {
                                    messageRefs.current.set(message.id, ref);
                                  } else {
                                    messageRefs.current.delete(message.id);
                                  }
                                }}
                                style={[
                                  styles.messageContainer,
                                  isMyMessage ? styles.myMessage : styles.otherMessage
                                ]}
                              >
                              <View style={[
                                styles.messageBubble,
                                isMyMessage ? styles.myBubble : styles.otherBubble
                              ]}>
                                {/* Превью сообщения, на которое отвечаем */}
                                {message.replyToId && message.replyToText && (
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      // Прокручиваем к сообщению, на которое отвечаем
                                      const replyToMessage = messages.find(m => m.id === message.replyToId);
                                      if (replyToMessage) {
                                        // Можно добавить подсветку сообщения
                                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                                      }
                                    }}
                                    style={styles.replyPreviewInMessage}
                                  >
                                    <View style={[
                                      styles.replyPreviewLineInMessage,
                                      isMyMessage ? styles.replyPreviewLineInMyMessage : styles.replyPreviewLineInOtherMessage
                                    ]} />
                                    <View style={styles.replyPreviewContentInMessage}>
                                      <Text style={[
                                        styles.replyPreviewNameInMessage,
                                        isMyMessage ? styles.replyPreviewNameInMyMessage : styles.replyPreviewNameInOtherMessage
                                      ]}>
                                        {message.replyToSenderId === currentUser.id
                                          ? (currentUser?.name?.toUpperCase() || t('chat.you')?.toUpperCase() || 'YOU')
                                          : (otherPlayer?.name?.toUpperCase() || t('chat.user')?.toUpperCase() || 'USER')}
                                      </Text>
                                      <Text style={styles.replyPreviewTextInMessage} numberOfLines={1}>
                                        {message.replyToText}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                                <View style={styles.messageContentContainer}>
                                  {message.text.startsWith('[FWD]') ? (
                                    <View style={styles.forwardedMessageContent}>
                                      <View style={styles.forwardedHeader}>
                                        <Ionicons name="arrow-redo-outline" size={14} color={isMyMessage ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"} />
                                        <Text style={[
                                          styles.forwardedSenderName,
                                          isMyMessage ? styles.myMessageText : styles.otherMessageText
                                        ]}>
                                          {message.text.substring(5).split(':\n')[0]}:
                                        </Text>
                                      </View>
                                      <Text style={[
                                        styles.messageText,
                                        isMyMessage ? styles.myMessageText : styles.otherMessageText
                                      ]}>
                                        {message.text.substring(5).split(':\n').slice(1).join(':\n')}
                                      </Text>
                                    </View>
                                  ) : (
                                    <Text style={[
                                      styles.messageText,
                                      isMyMessage ? styles.myMessageText : styles.otherMessageText
                                    ]}>
                                      {message.text}
                                    </Text>
                                  )}
                                  <View style={styles.messageTimeContainer}>
                                    <Text style={[
                                      styles.messageTime,
                                      isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                                    ]}>
                                      {formatTime(message.timestamp)}
                                    </Text>
                                    {isMyMessage && (
                                      <Ionicons
                                        name={message.read ? "checkmark-done" : "checkmark"}
                                        size={12}
                                        color={message.read ? "#fff" : "rgba(255, 255, 255, 0.5)"}
                                        style={styles.readIndicator}
                                      />
                                    )}
                                  </View>
                                </View>
                              </View>
                            </View>
                            </TouchableOpacity>
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
              {/* Отображение ответа на сообщение */}
              {replyingToMessage && (
                <View style={styles.replyPreviewContainer}>
                  <View style={styles.replyPreviewContent}>
                    <View style={styles.replyPreviewLine} />
                    <View style={styles.replyPreviewTextContainer}>
                      <Text style={styles.replyPreviewName}>
                        {replyingToMessage.senderId === currentUser?.id
                          ? (currentUser?.name?.toUpperCase() || t('chat.you')?.toUpperCase() || 'YOU')
                          : (otherPlayer?.name?.toUpperCase() || t('chat.user')?.toUpperCase() || 'USER')}
                      </Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>
                        {replyingToMessage.text}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setReplyingToMessage(null)}
                    style={styles.replyPreviewClose}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.textInputContainer}>
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
                      setIsNearBottom(true);
                      wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
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
            </View>
          </KeyboardAvoidingView>

          {/* Кастомное меню в стиле Telegram */}
          <Modal
            visible={contextMenuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCloseContextMenu}
          >
            <TouchableOpacity
              style={styles.contextMenuOverlay}
              activeOpacity={1}
              onPress={handleCloseContextMenu}
            >
              <View
                style={[
                  styles.contextMenu,
                  {
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => handleContextMenuAction('reply')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                  <Text style={styles.contextMenuText}>{t('chat.reply') || 'Ответить'}</Text>
                </TouchableOpacity>
                <View style={styles.contextMenuDivider} />
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => handleContextMenuAction('forward')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                  <Text style={styles.contextMenuText}>{t('chat.forward') || 'Переслать'}</Text>
                </TouchableOpacity>
                <View style={styles.contextMenuDivider} />
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => handleContextMenuAction('delete')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#fa2f40" style={styles.contextMenuIcon} />
                  <Text style={[styles.contextMenuText, styles.contextMenuDeleteText]}>
                    {t('common.delete') || 'Удалить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Меню чата */}
          <Modal
            visible={chatMenuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCloseChatMenu}
          >
            <TouchableOpacity
              style={styles.contextMenuOverlay}
              activeOpacity={1}
              onPress={handleCloseChatMenu}
            >
              <View
                style={[
                  styles.contextMenu,
                  {
                    left: chatMenuPosition.x - 150,
                    top: chatMenuPosition.y + 5,
                  }
                ]}
              >
                {isUserBlockedState ? (
                  <>
                    <TouchableOpacity
                      style={styles.contextMenuItem}
                      onPress={handleUnblockUserFromChat}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                      <Text style={styles.contextMenuText}>
                        {t('profile.unblock') || 'Разблокировать'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.contextMenuDivider} />
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.contextMenuItem}
                      onPress={handleBlockUserFromChat}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ban-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                      <Text style={styles.contextMenuText}>
                        {t('profile.block') || 'Заблокировать'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.contextMenuDivider} />
                  </>
                )}
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={handleReportFromChatMenu}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                  <Text style={styles.contextMenuText}>
                    {t('admin.reportUser') || 'Пожаловаться'}
                  </Text>
                </TouchableOpacity>
                {messages.length > 0 && (
                  <>
                    <View style={styles.contextMenuDivider} />
                    <TouchableOpacity
                      style={styles.contextMenuItem}
                      onPress={() => {
                        handleCloseChatMenu();
                        handleClearChat();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fa2f40" style={styles.contextMenuIcon} />
                      <Text style={[styles.contextMenuText, styles.contextMenuDeleteText]}>
                        {t('chat.clearChat') || 'Очистить чат'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Модальное окно пересылки сообщения */}
          <Modal
            visible={forwardModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setForwardModalVisible(false);
              setForwardMessage(null);
            }}
          >
            <View style={styles.forwardModalOverlay}>
              <View style={styles.forwardModalContainer}>
                <View style={styles.forwardModalHeader}>
                  <Text style={styles.forwardModalTitle}>
                    {t('chat.forwardTo') || 'Переслать кому'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setForwardModalVisible(false);
                      setForwardMessage(null);
                    }}
                    style={styles.forwardModalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                {loadingFriends ? (
                  <View style={styles.forwardModalLoading}>
                    <Text style={styles.forwardModalLoadingText}>
                      {t('common.loading') || 'Загрузка...'}
                    </Text>
                  </View>
                ) : friendsList.length === 0 ? (
                  <View style={styles.forwardModalEmpty}>
                    <Ionicons name="people-outline" size={48} color="#666" />
                    <Text style={styles.forwardModalEmptyText}>
                      {t('chat.noFriendsToForward') || 'Нет друзей для пересылки'}
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={styles.forwardModalList}>
                    {friendsList.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={styles.forwardModalItem}
                        onPress={() => handleSendForwardedMessage(friend)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.forwardModalItemAvatarContainer}>
                          {friend.avatar ? (
                            <Image
                              source={{ uri: friend.avatar }}
                              style={styles.forwardModalItemAvatar}
                            />
                          ) : (
                            <View style={[styles.forwardModalItemAvatar, styles.forwardModalItemAvatarPlaceholder]}>
                              <Ionicons name="person" size={18} color="#fff" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.forwardModalItemName} numberOfLines={1}>{friend.name}</Text>
                        <Text style={styles.forwardModalItemStatus}>
                          {friend.status === 'star' ? t('chat.star') || 'Звезда' : 
                           friend.status === 'coach' ? t('chat.coach') || 'Тренер' :
                           friend.status === 'scout' ? t('chat.scout') || 'Скаут' :
                           t('chat.player') || 'Игрок'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#666" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          {/* Кнопка прокрутки вниз - вне KeyboardAvoidingView, чтобы всегда была видна */}
          {!isNearBottom && messages.length > 0 && (
            <TouchableOpacity
              style={styles.scrollToBottomButton}
              onPress={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
                setTimeout(() => {
                  setIsNearBottom(true);
                  wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
                }, 300);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
          )}
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
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerActionButton: {
    marginLeft: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonDisabled: {
    opacity: 0.5,
  },
  headerActionIcon: {
    opacity: 0.6,
  },
  headerActionIconDisabled: {
    opacity: 0.4,
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
    flexGrow: 1, // Позволяет контенту растягиваться
    justifyContent: 'flex-end', // Контент сразу прижат к низу, без прокрутки
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContent: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Gilroy-Regular',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  messageContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexWrap: 'nowrap',
  },
  forwardedMessageContent: {
    flexDirection: 'column',
  },
  forwardedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  forwardedSenderName: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 20,
    flexShrink: 1,
    marginRight: 6,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2,
    flexShrink: 0,
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
  readIndicator: {
    marginLeft: 3,
  },
  inputContainer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'android' ? 8 : 12, // Небольшой отступ снизу для Android
    backgroundColor: 'transparent',
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#fa2f40',
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewLine: {
    width: 3,
    height: 40,
    backgroundColor: '#fa2f40',
    borderRadius: 2,
    marginRight: 10,
  },
  replyPreviewTextContainer: {
    flex: 1,
  },
  replyPreviewName: {
    color: '#fa2f40',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 2,
  },
  replyPreviewText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    opacity: 0.8,
  },
  replyPreviewClose: {
    padding: 4,
    marginLeft: 8,
  },
  replyPreviewInMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  replyPreviewLineInMessage: {
    width: 3,
    height: 35,
    borderRadius: 2,
    marginRight: 8,
  },
  replyPreviewLineInMyMessage: {
    backgroundColor: '#fff',
  },
  replyPreviewLineInOtherMessage: {
    backgroundColor: '#fa2f40',
  },
  replyPreviewContentInMessage: {
    flex: 1,
  },
  replyPreviewNameInMessage: {
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 2,
  },
  replyPreviewNameInMyMessage: {
    color: '#fff',
  },
  replyPreviewNameInOtherMessage: {
    color: '#fa2f40',
  },
  replyPreviewTextInMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingBottom: 4,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  contextMenuIcon: {
    marginRight: 10,
  },
  contextMenuText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  contextMenuDeleteText: {
    color: '#fa2f40',
  },
  contextMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 2,
  },
  // Стили для модального окна пересылки
  forwardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  forwardModalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  forwardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  forwardModalTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  forwardModalCloseButton: {
    padding: 4,
  },
  forwardModalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  forwardModalLoadingText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  forwardModalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  forwardModalEmptyText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Gilroy-Regular',
  },
  forwardModalList: {
    maxHeight: 400,
  },
  forwardModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  forwardModalItemAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  forwardModalItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  forwardModalItemAvatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardModalItemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 10,
  },
  forwardModalItemStatus: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Gilroy-Regular',
    marginRight: 6,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
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