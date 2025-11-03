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
  private messagesCountCallback: ((count: number) => void) | null = null;

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
   * Устанавливает callback для обновления счетчика сообщений
   */
  setMessagesCountCallback(callback: (count: number) => void): void {
    this.messagesCountCallback = callback;
  }

  /**
   * Настраивает все Realtime подписки для пользователя
   */
  async setupSubscriptions(userId: string): Promise<void> {
    // Если подписки уже настроены для этого пользователя, не пересоздаем их
    if (this.currentUserId === userId && this.subscriptions.size > 0) {
      console.log('⏭️ Realtime подписки уже настроены для пользователя:', userId);
      return;
    }

    // Отключаем старые подписки если есть
    await this.disconnect();

    this.currentUserId = userId;

    try {
      // 1. Подписка на уведомления
      await this.setupNotificationsSubscription(userId);
      
      // 2. Подписка на счетчик уведомлений
      await this.setupNotificationCountSubscription(userId);
      
      // 3. Подписка на счетчик сообщений
      await this.setupMessagesCountSubscription(userId);
      
      // 4. Подписка на запросы в друзья
      await this.setupFriendRequestsSubscription(userId);
      
      // 5. Подписка на изменения аватаров всех игроков
      await this.setupAvatarUpdateSubscription();
      
      // 6. Подписка на новые сообщения для push уведомлений (отключена - используем прямую отправку)
      // await this.setupMessagesSubscription(userId);

      // console.log('✅ Realtime подписки настроены для пользователя:', userId);
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
          // Эмитируем событие для обновления UI
          this.emitNotificationUpdate();
        }
      )
      .subscribe();

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
          // Эмитируем событие для обновления UI
          this.emitNotificationCountUpdate(payload.new.unread_notifications_count || 0);
        }
      )
      .subscribe();

    this.subscriptions.set('players-notifications-count', {
      channel,
      name: 'players-notifications-count'
    });
  }

  /**
   * Настраивает подписку на счетчик сообщений
   */
  private async setupMessagesCountSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel('players-messages-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          // Эмитируем событие для обновления UI
          this.emitMessagesCountUpdate(payload.new.unread_messages_count || 0);
        }
      )
      .subscribe();

    this.subscriptions.set('players-messages-count', {
      channel,
      name: 'players-messages-count'
    });
  }

  /**
   * Настраивает подписку на новые сообщения для отправки push уведомлений
   */
  private async setupMessagesSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel('messages-push-notifications-global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Проверяем, является ли текущий пользователь получателем
          const receiverId = payload.new.receiver_id;
          if (receiverId !== userId) {
            return;
          }
          
          // Отправляем push уведомление
          try {
            const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
            const { getPlayerById } = await import('./playerStorage');
            
            const senderId = payload.new.sender_id;
            const messageText = payload.new.text;
            
            // Получаем данные отправителя
            const senderPlayer = await getPlayerById(senderId);
            if (!senderPlayer) {
              return;
            }
            
            // Получаем токены получателя
            const receiverTokens = await getUserPushTokens(userId);
            if (receiverTokens.length > 0) {
              await sendMessageNotification(
                receiverTokens,
                senderPlayer.name || 'Пользователь',
                messageText,
                senderId
              );
            }
            
          } catch (error) {
            console.error('❌ Ошибка отправки push через Realtime:', error);
          }
        }
      )
      .subscribe();

    this.subscriptions.set('messages-push-notifications-global', {
      channel,
      name: 'messages-push-notifications-global'
    });
    
    // console.log('✅ Подписка на сообщения создана для пользователя:', userId);
  }

  /**
   * Настраивает подписку на изменения аватаров всех игроков
   * Обновляет кеш только при реальном изменении аватара, не при других обновлениях профиля
   */
  private async setupAvatarUpdateSubscription(): Promise<void> {
    const channel = supabase
      .channel('players-avatar-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players'
        },
        async (payload) => {
          const playerData = payload.new as any;
          const oldPlayerData = payload.old as any;
          const playerId = playerData.id;
          const newAvatar = playerData.avatar;
          const oldAvatar = oldPlayerData?.avatar;
          
          // Обновляем кеш аватара только если аватар действительно изменился
          if (newAvatar && playerId && newAvatar !== oldAvatar) {
            try {
              const { avatarCache } = await import('./AvatarCache');
              
              // ВАЖНО: Всегда обновляем кеш при изменении аватара через Realtime
              // Это гарантирует, что используется только последний актуальный аватар
              // setAvatar предзагрузит новое изображение для мгновенного отображения
              await avatarCache.setAvatar(playerId, newAvatar);
              console.log('🔄 Обновлен аватар в кеше через Realtime:', { 
                playerId, 
                oldAvatar: oldAvatar?.substring(0, 50) || 'нет', 
                newAvatar: newAvatar.substring(0, 50) 
              });
            } catch (error) {
              console.error('❌ Ошибка обновления аватара в кеше:', error);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('players-avatar-updates', {
      channel,
      name: 'players-avatar-updates'
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
      .subscribe();

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
          this.emitMessageUpdate(payload);
        }
      )
      .subscribe();

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

    
    for (const [name, subscription] of this.subscriptions) {
      try {
        await supabase.removeChannel(subscription.channel);
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

  private emitMessagesCountUpdate(count: number): void {
    if (this.messagesCountCallback) {
      this.messagesCountCallback(count);
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

