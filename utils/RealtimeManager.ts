import { supabase } from './supabase';

interface RealtimeSubscription {
  channel: any;
  name: string;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private currentUserId: string | null = null;
  private notificationCountCallback: ((count: number) => void) | null = null;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  /**
   * Устанавливает callback для обновления счетчика уведомлений
   */
  setNotificationCountCallback(callback: (count: number) => void): void {
    this.notificationCountCallback = callback;
  }

  /**
   * Настраивает все Realtime подписки для пользователя
   */
  async setupSubscriptions(userId: string): Promise<void> {
    // Если подписки уже настроены для этого пользователя, не пересоздаем их
    if (this.currentUserId === userId && this.subscriptions.size > 0) {
      console.log('🔌 Realtime подписки уже настроены для пользователя:', userId);
      return;
    }

    // Отключаем старые подписки если есть
    await this.disconnect();

    this.currentUserId = userId;
    console.log('🔌 Настраиваем Realtime подписки для пользователя:', userId);

    try {
      // 1. Подписка на уведомления
      await this.setupNotificationsSubscription(userId);
      
      // 2. Подписка на счетчик уведомлений
      await this.setupNotificationCountSubscription(userId);
      
      // 3. Подписка на запросы в друзья
      await this.setupFriendRequestsSubscription(userId);

      console.log('✅ Все Realtime подписки настроены успешно');
    } catch (error) {
      console.error('❌ Ошибка настройки Realtime подписок:', error);
    }
  }

  /**
   * Настраивает подписку на уведомления
   */
  private async setupNotificationsSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Новое уведомление получено через Realtime!', payload);
          // Эмитируем событие для обновления UI
          this.emitNotificationUpdate();
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки notifications-updates:', status);
      });

    this.subscriptions.set('notifications-updates', {
      channel,
      name: 'notifications-updates'
    });
  }

  /**
   * Настраивает подписку на счетчик уведомлений
   */
  private async setupNotificationCountSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel('players-notifications-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Счетчик уведомлений изменен в БД через Realtime:', payload.new.unread_notifications_count);
          // Эмитируем событие для обновления UI
          this.emitNotificationCountUpdate(payload.new.unread_notifications_count || 0);
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки players-notifications-count:', status);
      });

    this.subscriptions.set('players-notifications-count', {
      channel,
      name: 'players-notifications-count'
    });
  }

  /**
   * Настраивает подписку на запросы в друзья
   */
  private async setupFriendRequestsSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel('friend-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          console.log('👥 Новый запрос в друзья получен через Realtime!', payload);
          this.emitFriendRequestUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
        },
        (payload) => {
          console.log('👥 Запрос в друзья обновлен через Realtime!', payload);
          this.emitFriendRequestUpdate();
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки friend-requests-changes:', status);
      });

    this.subscriptions.set('friend-requests-changes', {
      channel,
      name: 'friend-requests-changes'
    });
  }

  /**
   * Настраивает подписку на сообщения для конкретного чата
   */
  async setupChatSubscription(currentUserId: string, otherUserId: string): Promise<void> {
    const channelName = `messages-${currentUserId}-${otherUserId}`;
    
    // Если подписка уже существует, не создаем новую
    if (this.subscriptions.has(channelName)) {
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})`
        },
        (payload) => {
          console.log('🔔 Получено новое сообщение через Realtime:', payload);
          this.emitMessageUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Статус подписки ${channelName}:`, status);
      });

    this.subscriptions.set(channelName, {
      channel,
      name: channelName
    });
  }

  /**
   * Отключает подписку на сообщения для конкретного чата
   */
  async disconnectChatSubscription(currentUserId: string, otherUserId: string): Promise<void> {
    const channelName = `messages-${currentUserId}-${otherUserId}`;
    const subscription = this.subscriptions.get(channelName);
    
    if (subscription) {
      console.log('🔌 Отключаем Realtime подписку для сообщений:', channelName);
      await supabase.removeChannel(subscription.channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Отключает все подписки
   */
  async disconnect(): Promise<void> {
    if (this.subscriptions.size === 0) {
      return;
    }

    console.log('🔌 Отключаем все Realtime подписки');
    
    for (const [name, subscription] of this.subscriptions) {
      try {
        await supabase.removeChannel(subscription.channel);
        console.log(`✅ Подписка ${name} отключена`);
      } catch (error) {
        console.error(`❌ Ошибка отключения подписки ${name}:`, error);
      }
    }
    
    this.subscriptions.clear();
    this.currentUserId = null;
  }

  /**
   * Проверяет, настроены ли подписки для пользователя
   */
  isConnected(userId: string): boolean {
    return this.currentUserId === userId && this.subscriptions.size > 0;
  }

  // События для уведомления компонентов
  private emitNotificationUpdate(): void {
    // Можно использовать EventEmitter или другие механизмы
    // Пока просто логируем
  }

  private emitNotificationCountUpdate(count: number): void {
    if (this.notificationCountCallback) {
      this.notificationCountCallback(count);
    }
  }

  private emitFriendRequestUpdate(): void {
    // Можно использовать EventEmitter или другие механизмы
    // Пока просто логируем
  }

  private emitMessageUpdate(payload: any): void {
    // Можно использовать EventEmitter или другие механизмы
    // Пока просто логируем
  }
}

export const realtimeManager = RealtimeManager.getInstance();

