import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useScreenContext } from '../contexts/ScreenContext';
import {
    Alert,
    Image,
    ImageBackground,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
    getPlayerById,
    getUserConversations,
    Message,
    Player
} from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../contexts/UserContext';

const iceBg = require('../assets/images/led.jpg');

interface ChatPreview {
  player: Player;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser } = useUser();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Функция для загрузки чатов (основная логика)
  const loadChatsData = useCallback(async () => {
    try {
      if (!currentUser) {
        router.replace('/login');
        return;
      }

      // Загружаем чаты для пользователя
      const conversations = await getUserConversations(currentUser.id);
      
      const chatPreviews: ChatPreview[] = [];
      
      for (const [otherUserId, messages] of Object.entries(conversations)) {
        if (messages.length > 0) {
          const otherPlayer = await getPlayerById(otherUserId);
          if (otherPlayer) {
            const lastMessage = messages[messages.length - 1];
            
            // Подсчитываем непрочитанные сообщения только для этой беседы
            const unreadCount = messages.filter(m => 
              m.receiverId === currentUser.id && !m.read
            ).length;
            
            chatPreviews.push({
              player: otherPlayer,
              lastMessage,
              unreadCount
            });
          }
        }
      }
      
      // Сортируем по времени последнего сообщения
      chatPreviews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        const aTime = a.lastMessage.timestamp instanceof Date ? a.lastMessage.timestamp.getTime() : a.lastMessage.timestamp;
        const bTime = b.lastMessage.timestamp instanceof Date ? b.lastMessage.timestamp.getTime() : b.lastMessage.timestamp;
        return bTime - aTime;
      });
      
      setChats(chatPreviews);
    } catch (error) {
      console.error('❌ Ошибка загрузки чатов:', error);
      // Не показываем ошибку, просто оставляем пустой список
      // Это позволит показать кешированные данные если они есть
    }
  }, [router, currentUser]);

  // Проверяем авторизацию пользователя
  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    setLoading(false);
  }, [currentUser, router]);

  // Загрузка чатов с индикатором
  const loadChats = useCallback(async () => {
    try {
      await loadChatsData();
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      // Не показываем Alert при ошибке, чтобы не мешать работе с кешированными данными
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadChatsData]);

  // Тихая загрузка чатов (без индикатора)
  const silentLoadChats = useCallback(async () => {
    try {
      await loadChatsData();
    } catch (error) {
      console.error('❌ Ошибка тихой загрузки чатов:', error);
    }
  }, [loadChatsData]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Realtime подписка на новые сообщения
  useEffect(() => {
    if (!currentUser) return;


    // Подписываемся на INSERT события когда текущий пользователь - получатель
    const channel = supabase
      .channel('messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          silentLoadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, silentLoadChats]);

  // Обновляем список сообщений при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      setCurrentScreen('messages');
      console.log('💬 СООБЩЕНИЯ: Устанавливаем currentScreen = messages');
      loadChats();
      return () => {
        setCurrentScreen(null);
        console.log('💬 СООБЩЕНИЯ: Устанавливаем currentScreen = null');
      };
    }, [loadChats, setCurrentScreen])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const openChat = (playerId: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: playerId } });
  };

  const formatTime = (timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return t('messages.yesterday');
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const formatLastMessage = (message: Message, currentUserId: string) => {
    const isMyMessage = message.senderId === currentUserId;
    const prefix = isMyMessage ? t('messages.you') : '';
    const text = message.text.length > 30 
      ? message.text.substring(0, 30) + '...' 
      : message.text;
    return prefix + text;
  };

  if (loading && chats.length === 0) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('messages.title')}</Text>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('messages.loading')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Если пользователь не авторизован, не отображаем контент экрана во время редиректа
  if (!currentUser) {
    return null;
  }

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('messages.title')}</Text>
          </View>
          
          {/* Список чатов */}
          <ScrollView 
            style={styles.chatsContainer}
            contentContainerStyle={styles.chatsContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fa2f40"
                colors={["#fa2f40"]}
              />
            }
            removeClippedSubviews={true}
            decelerationRate="fast"
          >
            {chats.length === 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyContent}>
                  <Ionicons name="chatbubble-outline" size={64} color="#fa2f40" />
                  <Text style={styles.emptyTitle}>{t('messages.noMessages')}</Text>
                  <Text style={styles.emptySubtitle}>
                    {t('messages.startConversation')}
                  </Text>
                </View>
              </View>
            ) : chats.length > 0 ? (
              chats.map((chat) => (
                <TouchableOpacity
                  key={chat.player.id}
                  style={styles.chatItem}
                  onPress={() => openChat(chat.player.id)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ 
                      uri: chat.player.avatar || 'https://via.placeholder.com/50/333/fff?text=Player' 
                    }} 
                    style={styles.chatAvatar}
                    defaultSource={require('../assets/images/default-avatar.png')}
                    onError={() => {
                      // Fallback для аватарки при ошибке загрузки
                      console.log('Ошибка загрузки аватарки для:', chat.player.name);
                    }}
                  />
                  
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      {chat.player.status !== 'scout' && (
                        <Text style={styles.chatName}>
                          {chat.player.name?.toUpperCase()}
                        </Text>
                      )}
                      {chat.lastMessage && (
                        <Text style={styles.chatTime}>
                          {formatTime(chat.lastMessage.timestamp)}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.chatPreview}>
                      <Text style={styles.chatLastMessage}>
                        {chat.lastMessage 
                          ? formatLastMessage(chat.lastMessage, currentUser!.id)
                          : t('messages.noMessages')
                        }
                      </Text>
                      
                      {chat.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.chatStatus}>
                      {chat.player.status === 'player' ? t('profile.player') : 
                       chat.player.status === 'coach' ? t('profile.coach') : 
                       chat.player.status === 'scout' ? t('profile.scout') : 
                       chat.player.status === 'admin' ? t('profile.admin') : t('profile.star')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : null}
          </ScrollView>
        </View>
      </ImageBackground>
    </Animated.View>
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
    backgroundColor: '#000', // Черный фон для предотвращения белого экрана при загрузке
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 47, 64, 0.3)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },
  chatsContainer: {
    flex: 1,
    paddingTop: 60, // Отступ для фиксированного заголовка
  },
  chatsContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20, // Уменьшили с 40 до 20 (в 2 раза)
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16, // Такая же ширина как у элементов чатов
  },
  emptyTitle: {
    color: '#FFFFFF', // Изменили с #fa2f40 на #FFFFFF (белый)
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#FFFFFF', // Изменили с #fa2f40 на #FFFFFF (белый)
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    paddingHorizontal: 20, // Уменьшили с 40 до 20 (в 2 раза)
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  chatTime: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatLastMessage: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#fa2f40',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Gilroy-Bold',
  },
  chatStatus: {
    color: '#fa2f40',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
  },
}); 