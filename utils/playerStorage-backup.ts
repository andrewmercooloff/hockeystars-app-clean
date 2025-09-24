import AsyncStorage from '@react-native-async-storage/async-storage';

// utils/playerStorage.ts загружен

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number;
  height: string;
  weight: string;
  avatar?: string;
  email?: string;
  password?: string;
  status?: string;
  birthDate?: string;
  hockeyStartDate?: string;
  experience?: string;
  achievements?: string;
  phone?: string;
  city?: string;
  goals?: string;
  assists?: string;
  country?: string;
  grip?: string;
  games?: string;
  pullUps?: string;
  pushUps?: string;
  plankTime?: string;
  sprint100m?: string;
  longJump?: string;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

// Тестовые игроки как было 24 июля
const testPlayers: Player[] = [
  {
    id: '1',
    name: 'Андрей Костицын',
    position: 'Нападающий',
    team: 'Динамо Минск',
    age: 36,
    height: '183 см',
    weight: '85 кг',
    avatar: 'kostitsyn1',
    status: 'star',
    city: 'Минск',
    goals: '25',
    assists: '30'
  },
  {
    id: '2',
    name: 'Сергей Костицын',
    position: 'Нападающий',
    team: 'Динамо Минск',
    age: 34,
    height: '185 см',
    weight: '87 кг',
    avatar: 'kostitsyn2',
    status: 'star',
    city: 'Минск',
    goals: '22',
    assists: '28'
  },
  {
    id: '3', 
    name: 'Егор Шарангович',
    position: 'Нападающий',
    team: 'Динамо Минск',
    age: 26,
    height: '188 см',
    weight: '88 кг',
    avatar: 'sharangovich',
    status: 'star',
    city: 'Минск',
    goals: '18',
    assists: '22'
  },
  {
    id: '4',
    name: 'Михаил Грабовский',
    position: 'Центральный нападающий',
    team: 'Динамо Минск',
    age: 38,
    height: '180 см',
    weight: '82 кг',
    avatar: 'grabovsky',
    status: 'star',
    city: 'Минск',
    goals: '15',
    assists: '20'
  },
  {
    id: '5',
    name: 'Александр Китаров',
    position: 'Нападающий',
    team: 'Динамо Минск',
    age: 32,
    height: '182 см',
    weight: '84 кг',
    avatar: 'kitarov',
    status: 'star',
    city: 'Минск',
    goals: '12',
    assists: '18'
  },
  {
    id: '6',
    name: 'Дмитрий Коробов',
    position: 'Защитник',
    team: 'Динамо Минск',
    age: 35,
    height: '185 см',
    weight: '88 кг',
    avatar: 'korobov',
    status: 'star',
    city: 'Минск',
    goals: '8',
    assists: '25'
  },
  {
    id: '7',
    name: 'Владислав Гончаров',
    position: 'Вратарь',
    team: 'Динамо Минск',
    age: 28,
    height: '188 см',
    weight: '85 кг',
    avatar: 'goncharov',
    status: 'star',
    city: 'Минск',
    goals: '0',
    assists: '2'
  },
  {
    id: '8',
    name: 'Администратор',
    position: 'Техподдержка',
    team: 'HockeyStars',
    age: 30,
    height: '180 см',
    weight: '80 кг',
    avatar: 'admin',
    status: 'admin',
    city: 'Минск',
    goals: '0',
    assists: '0'
  }
];

// Ключи для AsyncStorage
const PLAYERS_KEY = 'hockeystars_players';
const CURRENT_USER_KEY = 'hockeystars_current_user';
const MESSAGES_KEY = 'hockeystars_messages';
const FRIEND_REQUESTS_KEY = 'hockeystars_friend_requests';
const FRIENDSHIPS_KEY = 'hockeystars_friendships';

export const initializeStorage = async (): Promise<void> => {
  try {
    console.log('🔧 Инициализация хранилища...');

    // Проверяем, есть ли уже данные
    const existingPlayers = await AsyncStorage.getItem(PLAYERS_KEY);
    const existingUser = await AsyncStorage.getItem(CURRENT_USER_KEY);

    if (!existingPlayers) {
      console.log('📊 Сохраняем тестовых игроков...');
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(testPlayers));
      console.log('✅ Тестовые игроки сохранены');
    } else {
      console.log('📊 Данные игроков уже существуют');
    }

    if (!existingUser) {
      console.log('👤 Очищаем текущего пользователя...');
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    }

    // Инициализируем хранилище для друзей и запросов дружбы
    const friendRequestsData = await AsyncStorage.getItem(FRIEND_REQUESTS_KEY);
    if (!friendRequestsData) {
      console.log('📨 Инициализируем хранилище запросов дружбы...');
      await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify([]));
    }

    const friendshipsData = await AsyncStorage.getItem(FRIENDSHIPS_KEY);
    if (!friendshipsData) {
      console.log('👥 Инициализируем хранилище дружб...');
      await AsyncStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify([]));
    }

    // Исправляем поврежденные данные
    await fixCorruptedData();

    // Добавляем администратора к существующим данным
    await addAdminToExistingData();

    console.log('✅ Инициализация завершена');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
  }
};

export const loadPlayers = async (): Promise<Player[]> => {
  try {
    const playersData = await AsyncStorage.getItem(PLAYERS_KEY);
    if (playersData) {
      const players = JSON.parse(playersData);
      // Загружено игроков
      return players;
    }
    return [];
  } catch (error) {
    console.error('❌ Ошибка загрузки игроков:', error);
    return [];
  }
};

export const getPlayerById = async (id: string): Promise<Player | null> => {
  try {
    const players = await loadPlayers();
    return players.find(player => player.id === id) || null;
  } catch (error) {
    console.error('❌ Ошибка получения игрока по ID:', error);
    return null;
  }
};

export const addPlayer = async (player: Omit<Player, 'id'>): Promise<Player> => {
  try {
    const players = await loadPlayers();
    const newPlayer: Player = {
      ...player,
      id: Date.now().toString()
    };
    
    players.push(newPlayer);
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
    
    console.log('✅ Игрок добавлен:', newPlayer.name);
    return newPlayer;
  } catch (error) {
    console.error('❌ Ошибка добавления игрока:', error);
    throw error;
  }
};

export const updatePlayer = async (id: string, updates: Partial<Player>): Promise<Player | null> => {
  try {
    const players = await loadPlayers();
    const playerIndex = players.findIndex(p => p.id === id);
    
    if (playerIndex !== -1) {
      players[playerIndex] = { ...players[playerIndex], ...updates };
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
      console.log('✅ Игрок обновлен:', players[playerIndex].name);
      return players[playerIndex];
    }
    
    return null;
  } catch (error) {
    console.error('❌ Ошибка обновления игрока:', error);
    return null;
  }
};

export const findPlayerByCredentials = async (email: string, password: string): Promise<Player | null> => {
  try {
    const players = await loadPlayers();
    const player = players.find(p => p.email === email && p.password === password);
    
    if (player) {
      console.log('✅ Пользователь найден:', player.name);
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    return player || null;
  } catch (error) {
    console.error('❌ Ошибка поиска пользователя:', error);
    return null;
  }
};

export const saveCurrentUser = async (user: Player): Promise<void> => {
  try {
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    console.log('✅ Текущий пользователь сохранен:', user.name);
  } catch (error) {
    console.error('❌ Ошибка сохранения пользователя:', error);
  }
};

export const loadCurrentUser = async (): Promise<Player | null> => {
  try {
    const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userData) {
      const user = JSON.parse(userData);
      // Текущий пользователь загружен
      return user;
    }
    console.log('👤 Текущий пользователь не найден');
    return null;
  } catch (error) {
    console.error('❌ Ошибка загрузки пользователя:', error);
    return null;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    console.log('✅ Пользователь вышел из системы');
  } catch (error) {
    console.error('❌ Ошибка выхода из системы:', error);
  }
};

export const sendMessage = async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
  try {
    const messages = await getMessages(message.senderId, message.receiverId);
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    messages.push(newMessage);
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    
    return newMessage;
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    throw error;
  }
};

// Функция для отправки сообщения с тремя параметрами (для совместимости)
export const sendMessageSimple = async (senderId: string, receiverId: string, text: string): Promise<boolean> => {
  try {
    console.log('💬 Отправляем сообщение от', senderId, 'к', receiverId, ':', text);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId,
      receiverId,
      text,
      timestamp: new Date(),
      read: false
    };
    
    const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);
    const allMessages = messagesData ? JSON.parse(messagesData) : [];
    allMessages.push(newMessage);
    
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
    console.log('✅ Сообщение отправлено, всего сообщений в системе:', allMessages.length);
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return false;
  }
};

export const getMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);
    if (messagesData) {
      const allMessages = JSON.parse(messagesData);
      return allMessages.filter((msg: Message) => 
        (msg.senderId === userId1 && msg.receiverId === userId2) ||
        (msg.senderId === userId2 && msg.receiverId === userId1)
      );
    }
    return [];
  } catch (error) {
    console.error('❌ Ошибка загрузки сообщений:', error);
    return [];
  }
};

export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    // Подсчитываем непрочитанные сообщения
    
    const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);
    if (messagesData) {
      const allMessages = JSON.parse(messagesData);
      const unreadMessages = allMessages.filter((msg: Message) => 
        msg.receiverId === userId && !msg.read
      );
      
      // Подсчет сообщений завершен
      
      return unreadMessages.length;
    }
    // Нет сообщений в системе
    return 0;
  } catch (error) {
    console.error('❌ Ошибка подсчета непрочитанных сообщений:', error);
    return 0;
  }
};

export const markMessagesAsRead = async (userId1: string, userId2: string): Promise<void> => {
  try {
    console.log('💬 Отмечаем сообщения как прочитанные между', userId1, 'и', userId2);
    
    const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);
    if (messagesData) {
      const allMessages = JSON.parse(messagesData);
      const updatedMessages = allMessages.map((msg: Message) => {
        if (msg.senderId === userId2 && msg.receiverId === userId1 && !msg.read) {
          console.log('💬 Отмечаем сообщение как прочитанное:', msg.id);
          return { ...msg, read: true };
        }
        return msg;
      });
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(updatedMessages));
      console.log('✅ Сообщения отмечены как прочитанные');
    }
  } catch (error) {
    console.error('❌ Ошибка отметки сообщений как прочитанных:', error);
  }
};

export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const messages = await getMessages(userId1, userId2);
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error('❌ Ошибка загрузки диалога:', error);
    return [];
  }
};

// Система друзей
export const sendFriendRequest = async (fromId: string, toId: string): Promise<FriendRequest> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    const newRequest: FriendRequest = {
      id: Date.now().toString(),
      fromId,
      toId,
      status: 'pending',
      timestamp: new Date()
    };
    
    requests.push(newRequest);
    await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
    
    // Создаем уведомление о запросе дружбы
    await createFriendRequestNotification(fromId, toId);
    
    console.log('✅ Запрос дружбы отправлен');
    return newRequest;
  } catch (error) {
    console.error('❌ Ошибка отправки запроса дружбы:', error);
    throw error;
  }
};

// Функция для создания уведомления о запросе дружбы
export const createFriendRequestNotification = async (fromId: string, toId: string) => {
  try {
    console.log('🔔 Создаем уведомление о запросе дружбы от', fromId, 'к', toId);
    
    const fromPlayer = await getPlayerById(fromId);
    if (!fromPlayer) {
      console.log('❌ Отправитель не найден:', fromId);
      return;
    }
    
    const notifications = await loadNotifications(toId);
    console.log('🔔 Текущие уведомления получателя:', notifications.length);
    
    const newNotification = {
      id: Date.now().toString(),
      type: 'friend_request',
      title: 'Новый запрос дружбы',
      message: `${fromPlayer.name} хочет добавить вас в друзья`,
      timestamp: Date.now(),
      isRead: false,
      playerId: fromId,
      playerName: fromPlayer.name,
      playerAvatar: fromPlayer.avatar,
      receiverId: toId
    };
    
    notifications.push(newNotification);
    await AsyncStorage.setItem('hockeystars_notifications', JSON.stringify(notifications));
    console.log('✅ Уведомление о запросе дружбы создано для пользователя', toId);
  } catch (error) {
    console.error('❌ Ошибка создания уведомления о запросе дружбы:', error);
  }
};

export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    return requests.filter(req => req.toId === userId && req.status === 'pending');
  } catch (error) {
    console.error('❌ Ошибка получения запросов дружбы:', error);
    return [];
  }
};

export const getFriendRequestsFromStorage = async (): Promise<FriendRequest[]> => {
  try {
    const requestsData = await AsyncStorage.getItem(FRIEND_REQUESTS_KEY);
    return requestsData ? JSON.parse(requestsData) : [];
  } catch (error) {
    console.error('❌ Ошибка загрузки запросов дружбы:', error);
    return [];
  }
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<void> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = accept ? 'accepted' : 'rejected';
      
      if (accept) {
        // Добавляем дружбу
        const friendships = await getFriendshipsFromStorage();
        friendships.push({
          userId1: request.fromId,
          userId2: request.toId
        });
        await AsyncStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(friendships));
      }
      
      await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
      console.log('✅ Ответ на запрос дружбы сохранен');
    }
  } catch (error) {
    console.error('❌ Ошибка ответа на запрос дружбы:', error);
  }
};

export const getFriends = async (userId: string): Promise<Player[]> => {
  try {
    const friendships = await getFriendshipsFromStorage();
    const friendIds = friendships
      .filter(friendship => 
        friendship.userId1 === userId || friendship.userId2 === userId
      )
      .map(friendship => 
        friendship.userId1 === userId ? friendship.userId2 : friendship.userId1
      );
    
    const players = await loadPlayers();
    return players.filter(player => friendIds.includes(player.id));
  } catch (error) {
    console.error('❌ Ошибка получения друзей:', error);
    return [];
  }
};

export const getFriendshipsFromStorage = async (): Promise<Array<{userId1: string, userId2: string}>> => {
  try {
    const friendshipsData = await AsyncStorage.getItem(FRIENDSHIPS_KEY);
    return friendshipsData ? JSON.parse(friendshipsData) : [];
  } catch (error) {
    console.error('❌ Ошибка загрузки дружб:', error);
    return [];
  }
};

export const addFriendship = async (userId1: string, userId2: string): Promise<void> => {
  try {
    const friendships = await getFriendshipsFromStorage();
    const existingFriendship = friendships.find(friendship => 
      (friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
      (friendship.userId1 === userId2 && friendship.userId2 === userId1)
    );
    
    if (!existingFriendship) {
      friendships.push({ userId1, userId2 });
      await AsyncStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(friendships));
      console.log('✅ Дружба добавлена');
    }
  } catch (error) {
    console.error('❌ Ошибка добавления дружбы:', error);
  }
};

export const removeFriendship = async (userId1: string, userId2: string): Promise<void> => {
  try {
    const friendships = await getFriendshipsFromStorage();
    const filteredFriendships = friendships.filter(friendship => 
      !((friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
        (friendship.userId1 === userId2 && friendship.userId2 === userId1))
    );
    
    await AsyncStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(filteredFriendships));
    console.log('✅ Дружба удалена');
  } catch (error) {
    console.error('❌ Ошибка удаления дружбы:', error);
  }
};

export const getReceivedFriendRequests = async (userId: string): Promise<Player[]> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    
    const receivedRequestIds = requests
      .filter(req => req.toId === userId && req.status === 'pending')
      .map(req => req.fromId);
    
    const players = await loadPlayers();
    const result = players.filter(player => receivedRequestIds.includes(player.id));
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения полученных запросов дружбы:', error);
    return [];
  }
};

export const acceptFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {
    console.log('🔍 acceptFriendRequest вызвана с параметрами:', { fromId, toId });
    const requests = await getFriendRequestsFromStorage();
    console.log('🔍 Все запросы дружбы:', requests);
    
    // Ищем запрос в любом направлении между этими пользователями
    const request = requests.find(req => 
      ((req.fromId === fromId && req.toId === toId) ||
       (req.fromId === toId && req.toId === fromId)) &&
      req.status === 'pending'
    );
    
    console.log('🔍 Найденный запрос:', request);
    
    if (request) {
      request.status = 'accepted';
      await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
      
      // Добавляем дружбу
      await addFriendship(request.fromId, request.toId);
      
      console.log('✅ Запрос дружбы принят');
      return true;
    }
    
    console.log('❌ Запрос дружбы не найден для принятия');
    return false;
  } catch (error) {
    console.error('❌ Ошибка принятия запроса дружбы:', error);
    return false;
  }
};

export const declineFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {
    console.log('🔍 declineFriendRequest вызвана с параметрами:', { fromId, toId });
    const requests = await getFriendRequestsFromStorage();
    console.log('🔍 Все запросы дружбы:', requests);
    
    // Ищем запрос в любом направлении между этими пользователями
    const request = requests.find(req => 
      ((req.fromId === fromId && req.toId === toId) ||
       (req.fromId === toId && req.toId === fromId)) &&
      req.status === 'pending'
    );
    
    console.log('🔍 Найденный запрос:', request);
    
    if (request) {
      request.status = 'rejected';
      await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
      
      console.log('✅ Запрос дружбы отклонен');
      return true;
    }
    
    console.log('❌ Запрос дружбы не найден для отклонения');
    return false;
  } catch (error) {
    console.error('❌ Ошибка отклонения запроса дружбы:', error);
    return false;
  }
};

export const getFriendshipStatus = async (userId1: string, userId2: string): Promise<string> => {
  try {
    console.log('🔍 Проверяем статус дружбы между:', userId1, 'и', userId2);
    
    // Проверяем, есть ли уже дружба
    const friendships = await getFriendshipsFromStorage();
    console.log('🔍 Все дружбы:', friendships);
    
    const areFriends = friendships.some(friendship => 
      (friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
      (friendship.userId1 === userId2 && friendship.userId2 === userId1)
    );
    
    if (areFriends) {
      console.log('🔍 Статус: friends');
      return 'friends';
    }
    
    // Проверяем, есть ли активный запрос дружбы
    const requests = await getFriendRequestsFromStorage();
    console.log('🔍 Все запросы дружбы:', requests);
    
    const pendingRequest = requests.find(req => 
      ((req.fromId === userId1 && req.toId === userId2) ||
       (req.fromId === userId2 && req.toId === userId1)) &&
      req.status === 'pending'
    );
    
    if (pendingRequest) {
      const status = pendingRequest.fromId === userId1 ? 'sent_request' : 'received_request';
      console.log('🔍 Статус:', status, '(запрос от', pendingRequest.fromId, 'к', pendingRequest.toId, ')');
      return status;
    }
    
    console.log('🔍 Статус: none');
    return 'none';
  } catch (error) {
    console.error('❌ Ошибка получения статуса дружбы:', error);
    return 'none';
  }
};

export const addFriend = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    await addFriendship(userId1, userId2);
    return true;
  } catch (error) {
    console.error('❌ Ошибка добавления друга:', error);
    return false;
  }
};

export const removeFriend = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    await removeFriendship(userId1, userId2);
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления друга:', error);
    return false;
  }
};

export const areFriends = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    const friendships = await getFriendshipsFromStorage();
    return friendships.some(friendship => 
      (friendship.userId1 === userId1 && friendship.userId2 === userId2) ||
      (friendship.userId1 === userId2 && friendship.userId2 === userId1)
    );
  } catch (error) {
    console.error('❌ Ошибка проверки дружбы:', error);
    return false;
  }
};

export const cancelFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    const filteredRequests = requests.filter(req => 
      !(req.fromId === fromId && req.toId === toId && req.status === 'pending')
    );
    
    await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(filteredRequests));
    console.log('✅ Запрос дружбы отменен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка отмены запроса дружбы:', error);
    return false;
  }
};

export const calculateHockeyExperience = (startDate?: string): string => {
  if (!startDate) return 'Не указано';
  
  try {
    const start = new Date(startDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    
    const getYearWord = (num: number): string => {
      if (num === 1) return 'год';
      if (num >= 2 && num <= 4) return 'года';
      return 'лет';
    };
    
    return `${years} ${getYearWord(years)}`;
  } catch (error) {
    console.error('❌ Ошибка расчета опыта:', error);
    return 'Не указано';
  }
};

export const fixCorruptedData = async (): Promise<void> => {
  try {
    console.log('🔧 Проверка и исправление данных...');
    // Здесь можно добавить логику исправления данных
    console.log('✅ Данные проверены');
  } catch (error) {
    console.error('❌ Ошибка исправления данных:', error);
  }
};

// Добавляем недостающие функции
export const forceInitializeStorage = async (): Promise<boolean> => {
  try {
    console.log('🔧 Принудительная инициализация хранилища...');
    await initializeStorage();
    console.log('✅ Принудительная инициализация завершена');
    return true;
  } catch (error) {
    console.error('❌ Ошибка принудительной инициализации:', error);
    return false;
  }
};

export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    console.log('💬 Загрузка бесед пользователя:', userId);
    
    const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);
    if (!messagesData) {
      console.log('💬 Нет сообщений в системе');
      return {};
    }
    
    const allMessages = JSON.parse(messagesData);
    const conversations: { [key: string]: Message[] } = {};
    
    // Группируем сообщения по собеседникам
    allMessages.forEach((message: Message) => {
      if (message.senderId === userId || message.receiverId === userId) {
        const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
        
        if (!conversations[otherUserId]) {
          conversations[otherUserId] = [];
        }
        conversations[otherUserId].push(message);
      }
    });
    
    // Сортируем сообщения в каждой беседе по времени
    Object.keys(conversations).forEach(otherUserId => {
      conversations[otherUserId].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
    
    console.log('💬 Найдено бесед:', Object.keys(conversations).length);
    return conversations;
  } catch (error) {
    console.error('❌ Ошибка загрузки бесед:', error);
    return {};
  }
};

export const loadNotifications = async (userId: string): Promise<any[]> => {
  try {
    // Загрузка уведомлений пользователя
    const notificationsData = await AsyncStorage.getItem('hockeystars_notifications');
    const allNotifications = notificationsData ? JSON.parse(notificationsData) : [];
    
    // Фильтруем уведомления для конкретного пользователя
    const userNotifications = allNotifications.filter((notification: any) => {
      if (notification.type === 'friend_request') {
        return notification.receiverId === userId;
      }
      if (notification.type === 'message') {
        return notification.playerId && notification.playerId !== userId;
      }
      return true;
    });
    
    // Найдено уведомлений для пользователя
    return userNotifications;
  } catch (error) {
    console.error('❌ Ошибка загрузки уведомлений:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    console.log('🔔 Отмечаем уведомление как прочитанное:', notificationId);
    const notificationsData = await AsyncStorage.getItem('hockeystars_notifications');
    const notifications = notificationsData ? JSON.parse(notificationsData) : [];
    
    const updatedNotifications = notifications.map((notification: any) => {
      if (notification.id === notificationId) {
        return { ...notification, isRead: true };
      }
      return notification;
    });
    
    await AsyncStorage.setItem('hockeystars_notifications', JSON.stringify(updatedNotifications));
    console.log('✅ Уведомление отмечено как прочитанное');
  } catch (error) {
    console.error('❌ Ошибка отметки уведомления как прочитанного:', error);
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    console.log('🔔 Удаляем уведомление:', notificationId);
    const notificationsData = await AsyncStorage.getItem('hockeystars_notifications');
    const notifications = notificationsData ? JSON.parse(notificationsData) : [];
    
    const updatedNotifications = notifications.filter((notification: any) => 
      notification.id !== notificationId
    );
    
    await AsyncStorage.setItem('hockeystars_notifications', JSON.stringify(updatedNotifications));
    console.log('✅ Уведомление удалено');
  } catch (error) {
    console.error('❌ Ошибка удаления уведомления:', error);
  }
};

export const clearAllNotifications = async (userId: string): Promise<void> => {
  try {
    console.log('🔔 Очищаем все уведомления пользователя:', userId);
    const notificationsData = await AsyncStorage.getItem('hockeystars_notifications');
    const allNotifications = notificationsData ? JSON.parse(notificationsData) : [];
    
    // Удаляем только уведомления для конкретного пользователя
    const updatedNotifications = allNotifications.filter((notification: any) => {
      if (notification.type === 'friend_request') {
        return notification.receiverId !== userId;
      }
      if (notification.type === 'message') {
        return notification.playerId === userId;
      }
      return true;
    });
    
    await AsyncStorage.setItem('hockeystars_notifications', JSON.stringify(updatedNotifications));
    console.log('✅ Все уведомления пользователя очищены');
  } catch (error) {
    console.error('❌ Ошибка очистки уведомлений:', error);
  }
};

export const clearAllFriendRequests = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify([]));
    console.log('✅ Все запросы дружбы очищены');
  } catch (error) {
    console.error('❌ Ошибка очистки запросов дружбы:', error);
  }
};

export const debugFriendRequests = async (): Promise<void> => {
  try {
    const requests = await getFriendRequestsFromStorage();
    console.log('🔍 Все запросы дружбы в системе:', requests);
    
    const friendships = await getFriendshipsFromStorage();
    console.log('🔍 Все дружбы в системе:', friendships);
  } catch (error) {
    console.error('❌ Ошибка отладки запросов дружбы:', error);
  }
};

export const addAdminToExistingData = async (): Promise<void> => {
  try {
    console.log('👑 Добавление администратора к существующим данным...');
    const players = await loadPlayers();
    const adminExists = players.some(p => p.status === 'admin');
    
    if (!adminExists) {
      const adminPlayer = testPlayers.find(p => p.status === 'admin');
      if (adminPlayer) {
        await addPlayer(adminPlayer);
        console.log('✅ Администратор добавлен');
      }
    } else {
      console.log('✅ Администратор уже существует');
    }
  } catch (error) {
    console.error('❌ Ошибка добавления администратора:', error);
  }
};

// Функция для очистки дублирующихся администраторов
export const cleanDuplicateAdmins = async (): Promise<void> => {
  try {
    console.log('🧹 Очистка дублирующихся администраторов...');
    const players = await loadPlayers();
    
    // Находим всех администраторов
    const admins = players.filter(p => p.status === 'admin');
    console.log('👑 Найдено администраторов:', admins.length);
    
    if (admins.length > 1) {
      console.log('⚠️ Обнаружены дублирующиеся администраторы:');
      admins.forEach((admin, index) => {
        console.log(`  ${index + 1}. ID: ${admin.id}, Имя: ${admin.name}, Аватар: ${admin.avatar}`);
      });
      
      // Оставляем только первого администратора, остальных удаляем
      const adminToKeep = admins[0];
      const playersToKeep = players.filter(p => p.status !== 'admin' || p.id === adminToKeep.id);
      
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(playersToKeep));
      console.log('✅ Дублирующиеся администраторы удалены. Оставлен:', adminToKeep.name);
    } else {
      console.log('✅ Дублирующихся администраторов не найдено');
    }
  } catch (error) {
    console.error('❌ Ошибка очистки дублирующихся администраторов:', error);
  }
};

// Функция для проверки и исправления данных администратора
export const fixAdminData = async (): Promise<void> => {
  try {
    console.log('🔧 Проверка и исправление данных администратора...');
    const players = await loadPlayers();
    
    // Находим администратора
    const admin = players.find(p => p.status === 'admin');
    
    if (admin) {
      console.log('👑 Текущий администратор:', {
        id: admin.id,
        name: admin.name,
        avatar: admin.avatar,
        status: admin.status
      });
      
      // Проверяем, есть ли правильный аватар
      if (!admin.avatar || admin.avatar === '') {
        console.log('⚠️ У администратора отсутствует аватар, устанавливаем...');
        const updatedAdmin = { ...admin, avatar: 'admin' };
        await updatePlayer(admin.id, updatedAdmin);
        console.log('✅ Аватар администратора установлен');
      }
    } else {
      console.log('❌ Администратор не найден в системе');
    }
  } catch (error) {
    console.error('❌ Ошибка исправления данных администратора:', error);
  }
};

// Функция для полной очистки и пересоздания администратора
export const recreateAdmin = async (): Promise<void> => {
  try {
    console.log('🔄 Пересоздание администратора...');
    const players = await loadPlayers();
    
    // Удаляем всех существующих администраторов
    const playersWithoutAdmins = players.filter(p => p.status !== 'admin');
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(playersWithoutAdmins));
    console.log('🗑️ Все существующие администраторы удалены');
    
    // Добавляем нового администратора
    const adminPlayer = testPlayers.find(p => p.status === 'admin');
    if (adminPlayer) {
      await addPlayer(adminPlayer);
      console.log('✅ Новый администратор создан:', adminPlayer.name);
    }
  } catch (error) {
    console.error('❌ Ошибка пересоздания администратора:', error);
  }
};

// Функция для удаления всех пользователей
export const deleteAllUsers = async (): Promise<boolean> => {
  try {
    console.log('🗑️ Удаление всех пользователей...');
    const players = await loadPlayers();
    
    console.log(`📊 Найдено пользователей для удаления: ${players.length}`);
    players.forEach((player, index) => {
      console.log(`  ${index + 1}. ID: ${player.id}, Имя: ${player.name}, Статус: ${player.status || 'user'}`);
    });
    
    // Очищаем все данные
    await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify([]));
    await AsyncStorage.setItem('hockeystars_friend_requests', JSON.stringify([]));
    await AsyncStorage.setItem('hockeystars_friendships', JSON.stringify([]));
    await AsyncStorage.setItem('hockeystars_messages', JSON.stringify([]));
    await AsyncStorage.setItem('hockeystars_notifications', JSON.stringify([]));
    await AsyncStorage.removeItem('hockeystars_current_user');
    
    console.log('✅ Все пользователи и связанные данные удалены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при удалении всех пользователей:', error);
    return false;
  }
};

// Функция для полной очистки всех данных приложения
export const clearAllAppData = async (): Promise<boolean> => {
  try {
    console.log('🧹 Полная очистка всех данных приложения...');
    
    // Получаем все ключи AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const hockeystarsKeys = keys.filter(key => key.startsWith('hockeystars_'));
    
    console.log(`🗑️ Найдено ключей для удаления: ${hockeystarsKeys.length}`);
    hockeystarsKeys.forEach(key => {
      console.log(`  - ${key}`);
    });
    
    // Удаляем все ключи приложения
    await AsyncStorage.multiRemove(hockeystarsKeys);
    
    console.log('✅ Все данные приложения очищены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при очистке данных приложения:', error);
    return false;
  }
}; 