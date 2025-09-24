import AsyncStorage from '@react-native-async-storage/async-storage';

// Конфигурация API
const API_BASE_URL = 'http://192.168.1.10:3000/api';
const SOCKET_URL = 'http://192.168.1.10:3000';

// Типы для API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  birthDate: string;
  status: 'player' | 'coach' | 'scout';
  country?: string;
  team?: string;
  position?: string;
}

export interface Player {
  _id: string;
  username: string;
  name: string;
  status: 'player' | 'coach' | 'scout' | 'star';
  birthDate: string;
  country: string;
  city?: string;
  team?: string;
  position?: string;
  number?: string;
  grip?: string;
  height?: number;
  weight?: number;
  games?: number;
  goals?: number;
  assists?: number;
  points?: number;
  pullUps?: number;
  pushUps?: number;
  plankTime?: number;
  sprint100m?: number;
  longJump?: number;
  hockeyStartDate?: string;
  favoriteGoals?: string[];
  avatar?: string;
  photos?: string[];
  bio?: string;
  friends?: Player[];
  followers?: Player[];
  following?: Player[];
  isPublic: boolean;
  allowMessages: boolean;
  allowFriendRequests: boolean;
  isVerified: boolean;
  isOnline: boolean;
  lastSeen: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
  age?: number;
  hockeyExperience?: string;
}

// Класс для работы с API
class ApiClient {
  private baseURL: string;
  private socketURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.socketURL = SOCKET_URL;
  }

  // Получение токена из AsyncStorage
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Сохранение токена в AsyncStorage
  private async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  // Удаление токена из AsyncStorage
  private async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Базовый запрос к API с таймаутом
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API запрос: ${this.baseURL}${endpoint}`);
      
      // Создаем промис с таймаутом
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      const fetchPromise = fetch(`${this.baseURL}${endpoint}`, config);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Аутентификация
  async login(username: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    birthDate: string;
    status: string;
    country?: string;
    team?: string;
    position?: string;
  }) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.token) {
      await this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.removeToken();
    }
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  async updateProfile(profileData: any) {
    return await this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Игроки
  async getPlayers() {
    return await this.request('/players');
  }

  async searchPlayers(query: string, filters?: any) {
    const params = new URLSearchParams({ q: query, ...filters });
    return await this.request(`/players/search?${params}`);
  }

  async getStars() {
    return await this.request('/players/stars');
  }

  async getPlayerById(id: string) {
    return await this.request(`/players/${id}`);
  }

  // Друзья
  async sendFriendRequest(recipientId: string) {
    return await this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    });
  }

  async acceptFriendRequest(senderId: string) {
    return await this.request(`/friends/accept/${senderId}`, {
      method: 'POST',
    });
  }

  async rejectFriendRequest(senderId: string) {
    return await this.request(`/friends/reject/${senderId}`, {
      method: 'POST',
    });
  }

  async getFriends() {
    return await this.request('/friends');
  }

  async removeFriend(friendId: string) {
    return await this.request(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  // Сообщения
  async getMessages(recipientId: string) {
    return await this.request(`/messages/${recipientId}`);
  }

  async sendMessage(recipientId: string, content: string, type: string = 'text') {
    return await this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content, type }),
    });
  }

  async markMessagesAsRead(recipientId: string) {
    return await this.request(`/messages/${recipientId}/read`, {
      method: 'PUT',
    });
  }

  // Уведомления
  async getNotifications() {
    return await this.request('/notifications');
  }

  async markNotificationAsRead(notificationId: string) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return await this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: string) {
    return await this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Загрузка файлов
  async uploadFile(file: any) {
    const token = await this.getToken();
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
  }

  // Получение URL для Socket.IO
  getSocketURL(): string {
    return this.socketURL;
  }

  // Проверка здоровья API
  async healthCheck() {
    return await this.request('/health');
  }
}

export default new ApiClient();

// Экспорт типов
export type { Player, LoginRequest, RegisterRequest, ApiResponse }; 