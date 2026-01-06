import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    Image,
    ImageBackground,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
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
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const newMessageRef = useRef<string>(''); // актуальный текст (для сохранения черновика без зависимостей)
  const [loading, setLoading] = useState(true);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null); // Сообщение, на которое отвечаем
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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
  const [inputContainerHeight, setInputContainerHeight] = useState(80); // Высота поля ввода
  const [replyPreviewHeight, setReplyPreviewHeight] = useState(0); // Высота превью ответа
  const messageRefs = useRef<Map<string, View>>(new Map());
  const scrollViewRef = useRef<ScrollView>(null);
  const inputContainerRef = useRef<View>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const lastMessageCountRef = useRef<number>(0);
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const justSentMessageRef = useRef<boolean>(false);
  const isInitialLoadRef = useRef<boolean>(true); // Флаг первой загрузки чата
  const savedScrollPositionRef = useRef<number | null>(null); // Сохраненная позиция прокрутки
  const wasNearBottomRef = useRef<boolean>(true); // Был ли пользователь внизу перед уходом
  const chatMenuButtonRef = useRef<View>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBlockedCheckedRef = useRef<boolean>(false); // Флаг проверки блокировки
  const chatDataLoadedRef = useRef<boolean>(false); // Флаг загрузки данных чата
  const touchStartYRef = useRef<number | null>(null); // Позиция начала касания для определения тапа/скролла


  // Функция сохранения черновика (с временем для сортировки)
  const saveDraft = async (chatId: string, text: string) => {
    try {
      const draftKey = `chat_draft_${chatId}`;
      if (text.trim()) {
        // Сохраняем текст и время для правильной сортировки в списке чатов
        const draftData = JSON.stringify({
          text: text,
          timestamp: Date.now()
        });
        await AsyncStorage.setItem(draftKey, draftData);
      } else {
        await AsyncStorage.removeItem(draftKey);
      }
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
    }
  };

  // Функция загрузки черновика
  const loadDraft = async (chatId: string) => {
    try {
      const draftKey = `chat_draft_${chatId}`;
      const draftRaw = await AsyncStorage.getItem(draftKey);
      if (draftRaw) {
        // Поддержка старого формата (просто текст) и нового (JSON)
        try {
          const draftData = JSON.parse(draftRaw);
          if (draftData.text) {
            newMessageRef.current = draftData.text;
            setNewMessage(draftData.text);
          }
        } catch {
          // Старый формат - просто текст
          newMessageRef.current = draftRaw;
          setNewMessage(draftRaw);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки черновика:', error);
    }
  };

  // Быстрое сохранение черновика при наборе (чтобы в Messages список обновлялся без задержки)
  const handleDraftTextChange = useCallback((text: string) => {
    newMessageRef.current = text;
    setNewMessage(text);

    if (!id) return;

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(id as string, text);
    }, 300);
  }, [id]);

  useEffect(() => {
    // Очищаем сообщения при смене чата
    setMessages([]);
    setNewMessage('');
    newMessageRef.current = '';
    setLoading(true);
    setReplyingToMessage(null); // Очищаем сообщение для ответа при смене чата
    setContextMenuVisible(false); // Закрываем меню при смене чата
    setContextMenuMessage(null);
    messageRefs.current.clear(); // Очищаем refs сообщений
    isInitialLoadRef.current = true; // Сбрасываем флаг при смене чата
    isBlockedCheckedRef.current = false; // Сбрасываем флаг проверки блокировки
    chatDataLoadedRef.current = false; // Сбрасываем флаг загрузки данных
    
    // Загружаем черновик для этого чата
    if (id) {
      loadDraft(id as string);
    }
    savedScrollPositionRef.current = null; // Сбрасываем сохраненную позицию при смене чата
    wasNearBottomRef.current = true; // Сбрасываем флаг при смене чата
    loadChatData();
  }, [id]);

  // Сбрасываем высоту reply preview при его закрытии
  useEffect(() => {
    if (!replyingToMessage && replyPreviewHeight > 0) {
      setReplyPreviewHeight(0);
    }
  }, [replyingToMessage, replyPreviewHeight]);

  // Слушатель клавиатуры для прокрутки к последнему сообщению
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const height = event.endCoordinates?.height || 0;
        console.log('⌨️ Клавиатура открыта - высота:', height);
        setKeyboardHeight(height);
        setKeyboardVisible(true);
        // Прокручиваем к последнему сообщению при открытии клавиатуры
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === 'android' ? 150 : 50);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('⌨️ Клавиатура закрыта - paddingBottom: 20');
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

  // Автопрокрутка вниз ТОЛЬКО при первом входе в чат
  // Используем useLayoutEffect для синхронной прокрутки до отрисовки
  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && scrollViewRef.current && isInitialLoadRef.current) {
      // Прокручиваем синхронно в useLayoutEffect
      scrollViewRef.current.scrollToEnd({ animated: false });
      setIsNearBottom(true);
      wasNearBottomRef.current = true;
      isInitialLoadRef.current = false;
    }
  }, [loading, messages.length, id]);
  
  // Дополнительная проверка через useEffect на случай, если useLayoutEffect не сработал
  useEffect(() => {
    if (!loading && messages.length > 0 && scrollViewRef.current && isInitialLoadRef.current) {
      setTimeout(() => {
        if (scrollViewRef.current && isInitialLoadRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
          setIsNearBottom(true);
          wasNearBottomRef.current = true;
          isInitialLoadRef.current = false;
        }
      }, Platform.OS === 'android' ? 150 : 100);
    }
  }, [loading, messages.length, id]);

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
            
            // Прокручиваем вниз ТОЛЬКО если пользователь был внизу (иначе мешает читать старые сообщения)
            if (wasNearBottomRef.current) {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
                setIsNearBottom(true);
                wasNearBottomRef.current = true; // Обновляем флаг при прокрутке вниз
              }, Platform.OS === 'android' ? 200 : 100);
            }
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

  // Функция загрузки сообщений - определена до useFocusEffect чтобы избежать ошибки "Cannot access before initialization"
  const loadMessages = useCallback(async (skipBlockCheck = false) => {
    if (currentUser && otherPlayer && otherPlayer.id === id) {
      try {
        // Проверяем блокировку только один раз при первой загрузке
        if (!skipBlockCheck && !isBlockedCheckedRef.current) {
          const isBlockedByThem = await isUserBlocked(otherPlayer.id, currentUser.id);
          isBlockedCheckedRef.current = true;
          if (isBlockedByThem) {
            Alert.alert(
              t('common.error') || 'Ошибка',
              'Вы не можете видеть сообщения этого пользователя.'
            );
            router.push('/messages');
            return;
          }
        }
        
        console.log('📨 Загружаем свежие сообщения из БД для чата:', currentUser.id, '<->', otherPlayer.id);
        const conversation = await getConversation(currentUser.id, otherPlayer.id);
        console.log('📨 Загружено сообщений из БД:', conversation.length);
        const now = Date.now();
        
        const currentMessageIds = new Set(conversation.map(m => m.id));
        const newMessageIds = [...currentMessageIds].filter(msgId => !lastMessageIdsRef.current.has(msgId));
        
        // Парсим информацию об ответе для всех сообщений
        const parsedConversation = conversation.map(msg => {
          let text = msg.text;
          let replyToId: string | undefined = msg.replyToId;
          let replyToText: string | undefined = msg.replyToText;
          let replyToSenderId: string | undefined = msg.replyToSenderId;
          
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
          
          return { ...msg, text, replyToId, replyToText, replyToSenderId };
        });
        
        setMessages(prevMessages => {
          if (parsedConversation.length !== prevMessages.length) {
            console.log(`📨 Обновление сообщений: было ${prevMessages.length}, стало ${parsedConversation.length}`);
            return parsedConversation;
          }
          
          const prevMessageIds = new Set(prevMessages.map(m => m.id));
          const hasNewMessages = parsedConversation.some(msg => !prevMessageIds.has(msg.id));
          
          if (hasNewMessages) {
            console.log(`📨 Обнаружены новые сообщения при обновлении`);
            return parsedConversation;
          }
          
          return parsedConversation;
        });
        
        lastMessageIdsRef.current = currentMessageIds;
        
        if (newMessageIds.length > 0 && now - lastLoadTimeRef.current > 1000) {
          lastLoadTimeRef.current = now;
          
          const newMessages = conversation.filter(m => newMessageIds.includes(m.id));
          
          if (justSentMessageRef.current) {
            justSentMessageRef.current = false;
          } else {
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
          
          // Автоскролл только если пользователь был внизу
          if (wasNearBottomRef.current) {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
              setIsNearBottom(true);
              wasNearBottomRef.current = true;
            }, Platform.OS === 'android' ? 200 : 100);
          }
        }

      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
      }
    }
  }, [currentUser, otherPlayer, id, t, router]);

  // Обработка системной кнопки "назад" и восстановление позиции при возврате в чат
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.push('/messages');
        return true; // Предотвращаем стандартное поведение
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // ВАЖНО: При возврате в чат загружаем свежие сообщения только если данные еще не загружены
      // Это нужно, чтобы увидеть сообщения, которые пришли через push-уведомления
      // Используем небольшую задержку, чтобы убедиться, что currentUser и otherPlayer загружены
      const loadMessagesOnFocus = async () => {
        // Если данные уже загружены через loadChatData, не загружаем повторно
        if (chatDataLoadedRef.current) {
          console.log('📱 Чат в фокусе - данные уже загружены, пропускаем повторную загрузку');
          return;
        }
        
        if (currentUser && otherPlayer && otherPlayer.id === id) {
          console.log('📱 Чат в фокусе - загружаем свежие сообщения из БД');
          await loadMessages(true); // Пропускаем проверку блокировки, т.к. она уже выполнена
        } else {
          // Если данные еще не загружены, ждем немного и пробуем снова
          setTimeout(() => {
            if (currentUser && otherPlayer && otherPlayer.id === id && !chatDataLoadedRef.current) {
              console.log('📱 Чат в фокусе (повторная попытка) - загружаем свежие сообщения из БД');
              loadMessages(true);
            }
          }, 300);
        }
      };
      
      loadMessagesOnFocus();

      // При уходе из чата сохраняем текущую позицию и черновик
      return () => {
        backHandler.remove();
        // Позиция уже сохранена в onScroll
        // Сохраняем черновик при выходе
        if (draftSaveTimeoutRef.current) {
          clearTimeout(draftSaveTimeoutRef.current);
          draftSaveTimeoutRef.current = null;
        }
        if (id) {
          saveDraft(id as string, newMessageRef.current);
        }
      };
    }, [currentUser, otherPlayer, id, loadMessages, router])
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
            (async () => {
              try {
                const { data, error } = await supabase
                  .from('players')
                  .select('is_online, last_seen')
                  .eq('id', otherPlayerData.id)
                  .single();
                return { data, error };
              } catch (err) {
                return { data: null, error: err as any };
              }
            })()
          ]);
          
          // Обновляем статус онлайн если получен
          if (statusResult.data && !statusResult.error) {
            const statusData = statusResult.data as any;
            setOtherPlayer(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                isOnline: statusData?.is_online ?? prev.isOnline,
                lastSeen: statusData?.last_seen ?? prev.lastSeen
              };
            });
          }
          
          // Парсим сообщения один раз при загрузке
          const parsedConversation = conversation.map(msg => {
            let text = msg.text;
            let replyToId: string | undefined = msg.replyToId;
            let replyToText: string | undefined = msg.replyToText;
            let replyToSenderId: string | undefined = msg.replyToSenderId;
            
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
            
            return { ...msg, text, replyToId, replyToText, replyToSenderId };
          });
          
          // Устанавливаем сообщения
          console.log(`✅ Загружено ${parsedConversation.length} сообщений в диалоге`);
          if (parsedConversation.length > 0) {
            console.log(`📨 Примеры сообщений:`, parsedConversation.slice(0, 3).map(m => ({ id: m.id, text: m.text.substring(0, 30) })));
          }
          setMessages(parsedConversation);
          setIsNearBottom(true);
          chatDataLoadedRef.current = true; // Отмечаем, что данные загружены
          lastMessageIdsRef.current = new Set(parsedConversation.map(m => m.id));
          
          // Прокручиваем вниз после установки сообщений
          if (parsedConversation.length > 0 && isInitialLoadRef.current) {
            // Используем несколько попыток для гарантии прокрутки
            setTimeout(() => {
              if (scrollViewRef.current && isInitialLoadRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: false });
                setIsNearBottom(true);
                wasNearBottomRef.current = true;
              }
            }, 100);
            setTimeout(() => {
              if (scrollViewRef.current && isInitialLoadRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: false });
                setIsNearBottom(true);
                wasNearBottomRef.current = true;
                isInitialLoadRef.current = false;
              }
            }, 300);
          }
          
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !otherPlayer) {
      return;
    }

    const messageText = newMessage.trim();
    const replyingTo = replyingToMessage;
    setNewMessage(''); // Очищаем поле сразу для лучшего UX
      newMessageRef.current = '';
    setReplyingToMessage(null); // Очищаем сообщение для ответа
    
    // Удаляем черновик после отправки
    if (otherPlayer?.id) {
      saveDraft(otherPlayer.id, '');
    }
    
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
  
  const handleContextMenuAction = async (action: 'reply' | 'forward' | 'delete' | 'copy') => {
    if (!contextMenuMessage) return;
    
    handleCloseContextMenu();
    
    if (action === 'reply') {
      handleReplyToMessage(contextMenuMessage);
    } else if (action === 'forward') {
      handleForwardMessage(contextMenuMessage);
    } else if (action === 'delete') {
      handleDeleteMessage(contextMenuMessage.id);
    } else if (action === 'copy') {
      try {
        await Clipboard.setStringAsync(contextMenuMessage.text);
        // Вибрация для обратной связи
        if (Platform.OS === 'ios') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Vibration.vibrate(50);
        }
      } catch (error) {
        console.error('Ошибка копирования:', error);
      }
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
                onPress={() => router.push({
                  pathname: `/player/${otherPlayer.id}`,
                  params: { returnTo: 'chat', chatId: id }
                })}
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 132 : 0}
          >
            <ScrollView 
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={[
                  styles.messagesContent,
                  // Добавляем достаточный отступ снизу когда клавиатура открыта
                  // KeyboardAvoidingView уже учитывает высоту клавиатуры на iOS
                  // Добавляем только высоту поля ввода + высоту reply preview + отступ
                  { paddingBottom: keyboardVisible 
                    ? inputContainerHeight + replyPreviewHeight - 60 
                    : 20 
                  }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onTouchStart={(e) => {
                  // Сохраняем позицию начала касания
                  touchStartYRef.current = e.nativeEvent.pageY;
                }}
                onTouchEnd={(e) => {
                  // Проверяем, был ли это тап (небольшое перемещение) или скролл
                  if (touchStartYRef.current !== null) {
                    const deltaY = Math.abs(e.nativeEvent.pageY - touchStartYRef.current);
                    // Если перемещение меньше 10px - это тап, закрываем клавиатуру
                    if (deltaY < 10 && keyboardVisible) {
                      Keyboard.dismiss();
                    }
                    touchStartYRef.current = null;
                  }
                }}
                onScrollBeginDrag={() => {
                  // Пользователь начал ручную прокрутку — закрываем клавиатуру
                  Keyboard.dismiss();
                  touchStartYRef.current = null; // Сбрасываем при скролле
                  // (флаг "внизу" обновится в onScroll)
                }}
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

                  return dateKeys.map((dateKey, dateIndex) => (
                    <View key={dateKey}>
                      {/* Заголовок даты */}
                      <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>{dateKey}</Text>
                      </View>
                      
                      {/* Сообщения за этот день */}
                      {groupedMessages[dateKey].map((message, messageIndex) => {
                        const isMyMessage = message.senderId === currentUser.id;
                        // Определяем, является ли это последним сообщением (последнее в последней группе)
                        const isLastDateGroup = dateIndex === dateKeys.length - 1;
                        const isLastMessage = messageIndex === groupedMessages[dateKey].length - 1;
                        const isLastMessageOverall = isLastDateGroup && isLastMessage;
                        
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
                              onPress={(e) => {
                                // Предотвращаем закрытие клавиатуры при нажатии на сообщение
                                e.stopPropagation();
                              }}
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
                                  isMyMessage ? styles.myMessage : styles.otherMessage,
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
                                </View>
                                <View style={[
                                  styles.messageTimeContainer,
                                  isMyMessage ? styles.myMessageTimeContainer : styles.otherMessageTimeContainer
                                ]}>
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
                            </TouchableOpacity>
                          </Swipeable>
                        );
                      })}
                    </View>
                  ));
                })()
              ) : null}
            </ScrollView>

            {/* Поле ввода - фиксировано внизу */}
            <View 
              ref={inputContainerRef}
              style={styles.inputContainer}
              onStartShouldSetResponder={() => true}
              onTouchStart={(e) => {
                // Предотвращаем закрытие клавиатуры при нажатии на поле ввода
                e.stopPropagation();
              }}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                if (height > 0) {
                  // Обновляем высоту сразу при изменении
                  const newHeight = Math.ceil(height);
                  if (newHeight !== inputContainerHeight) {
                    console.log('📏 Высота поля ввода обновлена:', inputContainerHeight, '→', newHeight);
                    setInputContainerHeight(newHeight);
                    // Прокручиваем вниз после обновления высоты
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }
                }
              }}
            >
              {/* Отображение ответа на сообщение */}
              {replyingToMessage && (
                <View 
                  style={styles.replyPreviewContainer}
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    if (height > 0) {
                      setReplyPreviewHeight(Math.ceil(height));
                    }
                  }}
                >
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
                    onPress={() => {
                      setReplyingToMessage(null);
                      setReplyPreviewHeight(0); // Сбрасываем высоту при закрытии
                    }}
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
                  onChangeText={handleDraftTextChange}
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
                  onPress={() => handleContextMenuAction('copy')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={18} color="#fff" style={styles.contextMenuIcon} />
                  <Text style={styles.contextMenuText}>{t('chat.copy') || 'Копировать'}</Text>
                </TouchableOpacity>
                <View style={styles.contextMenuDivider} />
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
                          <CachedAvatar
                            playerId={friend.id}
                            fallbackAvatarUrl={friend.avatar}
                            size={36}
                            style={styles.forwardModalItemAvatar}
                            status={friend.status}
                          />
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
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    // paddingBottom устанавливается динамически в зависимости от состояния клавиатуры
    // Минимальный отступ 90-100px для поля ввода (включая reply preview)
    overflow: 'visible', // Позволяем сообщениям выходить за пределы при свайпе
    // Важно: НЕ прижимаем контент к низу через flex-end,
    // иначе ScrollView может "держать" внизу и мешать читать старые сообщения.
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100, // Отступ сверху для учета заголовка
    paddingBottom: 80, // Отступ снизу для поля ввода
    minHeight: 400, // Минимальная высота чтобы контент не обрезался
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
    flexShrink: 0, // Позволяем контейнеру расширяться для длинных сообщений
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
    flexShrink: 0, // Позволяем баблу расширяться по высоте для длинных сообщений
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
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
    flexShrink: 0, // Убираем ограничение, чтобы длинные сообщения показывались полностью
    marginBottom: 4,
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
    marginTop: 2,
    flexShrink: 0,
  },
  myMessageTimeContainer: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherMessageTimeContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
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
    // Поле ввода фиксировано внизу, paddingBottom на ScrollView создает пространство выше
    // Важно: поле ввода должно быть вне ScrollView, чтобы не перекрывать сообщения
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