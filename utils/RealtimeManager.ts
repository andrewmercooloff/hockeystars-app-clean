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
  private lastNotificationCount: number | null = null;
  private lastMessagesCount: number | null = null;
  private lastInitializeTime: number = 0; // Время последней инициализации счётчиков
  private loadNotificationCountCallback: ((userId: string) => Promise<void>) | null = null; // Callback для загрузки счетчика из БД

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
   * Устанавливает callback для загрузки счетчика уведомлений из БД
   * Используется для принудительной перезагрузки при получении нового уведомления
   */
  setLoadNotificationCountCallback(callback: (userId: string) => Promise<void>): void {
    this.loadNotificationCountCallback = callback;
  }

  /**
   * Инициализирует последние значения счетчиков
   * Используется для синхронизации при настройке подписок
   */
  initializeCounts(notificationCount: number, messagesCount: number): void {
    this.lastNotificationCount = notificationCount;
    this.lastMessagesCount = messagesCount;
    this.lastInitializeTime = Date.now(); // Запоминаем время инициализации
  }

  getConnectedUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Настраивает все Realtime подписки для пользователя
   * ОПТИМИЗАЦИЯ: Объединены подписки на players таблицу в один канал для снижения нагрузки
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
      
      // 2. ОПТИМИЗАЦИЯ: Объединенная подписка на все изменения в players (счетчики + аватары + профили)
      await this.setupUnifiedPlayersSubscription(userId);
      
      // 3. Подписка на запросы в друзья
      await this.setupFriendRequestsSubscription(userId);
      
      // УДАЛЕНЫ отдельные подписки (объединены в setupUnifiedPlayersSubscription):
      // - setupNotificationCountSubscription
      // - setupMessagesCountSubscription  
      // - setupAvatarUpdateSubscription
      // - setupProfileUpdateSubscription

      console.log('✅ [PERFORMANCE] Realtime подписки оптимизированы (3 канала вместо 7)');
    } catch (error) {
      console.error('❌ Ошибка настройки Realtime подписок:', error);
    }
  }

  /**
   * Настраивает подписку на уведомления
   */
  private async setupNotificationsSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel(`notifications-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          try {
            const notificationType = payload.new?.type;
            const eventType = payload.eventType;
            console.log('🔔 Realtime: Изменение уведомления:', {
              event: eventType,
              type: notificationType,
              userId: payload.new?.user_id,
              notificationId: payload.new?.id,
              isRead: payload.new?.is_read,
            });
            
            if (this.loadNotificationCountCallback && this.currentUserId) {
              setTimeout(() => {
                try {
                  this.loadNotificationCountCallback!(this.currentUserId!).catch(error => {
                    console.error('❌ Ошибка загрузки счетчика уведомлений:', error);
                  });
                } catch (e) {
                  console.error('❌ Realtime notifications: callback crash:', e);
                }
              }, eventType === 'INSERT' ? 500 : 150);
            }
          } catch (e) {
            console.error('❌ Realtime notifications handler crashed:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          try {
            const isRead = payload.new?.is_read === true && payload.old?.is_read !== true;
            if (!isRead) return;
            if (this.loadNotificationCountCallback && this.currentUserId) {
              setTimeout(() => {
                try {
                  this.loadNotificationCountCallback!(this.currentUserId!).catch(error => {
                    console.error('❌ Ошибка загрузки счетчика после прочтения:', error);
                  });
                } catch (e) {
                  console.error('❌ Realtime notifications update handler crashed:', e);
                }
              }, 150);
            }
          } catch (e) {
            console.error('❌ Realtime notifications UPDATE handler crashed:', e);
          }
        }
      )
      .subscribe((status) => {
        try {
          console.log('🔔 Realtime: Статус подписки на уведомления:', status);
        } catch (e) {
          console.error('❌ Realtime notifications status handler crashed:', e);
        }
      });

    this.subscriptions.set('notifications-updates', {
      channel,
      name: 'notifications-updates'
    });
  }

  /**
   * ОПТИМИЗАЦИЯ: Объединенная подписка на все изменения в таблице players
   * Заменяет отдельные подписки: notifications-count, messages-count, avatar-updates, profile-updates
   */
  private async setupUnifiedPlayersSubscription(userId: string): Promise<void> {
    const channel = supabase
      .channel(`players-unified-${userId}`)
      // Подписка на изменения текущего пользователя (счетчики)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          try {
            const playerData = payload.new as any;
            const oldPlayerData = payload.old as any;
            
            // players.unread_notifications_count может отставать — пересчитываем по notifications.
            const newNotifCount = playerData?.unread_notifications_count || 0;
            const oldNotifCount = oldPlayerData?.unread_notifications_count || 0;
            if (newNotifCount !== oldNotifCount) {
              if (this.loadNotificationCountCallback && this.currentUserId) {
                void this.loadNotificationCountCallback(this.currentUserId).catch(() => {});
              } else {
                this.emitNotificationCountUpdate(newNotifCount);
              }
            }
            
            // Счётчик сообщений: сверяемся с messages, т.к. players.unread_messages_count может рассинхрониться с read.
            const newMsgCount = playerData?.unread_messages_count ?? 0;
            const oldMsgCount = oldPlayerData?.unread_messages_count ?? 0;
            if (newMsgCount !== oldMsgCount) {
              this.syncMessagesCountFromMessagesTable(userId);
            }
          } catch (e) {
            console.error('❌ Realtime players(self) handler crashed:', e);
          }
        }
      )
      // Подписка на изменения всех игроков (аватары и профили)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players'
        },
        async (payload) => {
          try {
            const playerData = payload.new as any;
            const oldPlayerData = payload.old as any;
            const playerId = playerData?.id;
            
            // Обработка изменения аватара
            const newAvatar = playerData?.avatar;
            const oldAvatar = oldPlayerData?.avatar;
            if (newAvatar && playerId && newAvatar !== oldAvatar) {
              try {
                const { avatarCache } = await import('./AvatarCache');
                await avatarCache.setAvatar(playerId, newAvatar);
              } catch (error) {
                console.error('❌ Ошибка обновления аватара в кеше:', error);
              }
            }
            
            // Обработка изменения профиля
            const favoriteGoalsChanged = playerData?.favorite_goals !== oldPlayerData?.favorite_goals;
            const galleryPhotosChanged = playerData?.gallery_photos !== oldPlayerData?.gallery_photos;
            const achievementsChanged = playerData?.achievements !== oldPlayerData?.achievements;
            const exerciseStatsChanged = playerData?.exercise_stats !== oldPlayerData?.exercise_stats;
            const normativesChanged = playerData?.normatives !== oldPlayerData?.normatives;
            const puckSpeedMaxChanged = playerData?.puck_speed_max !== oldPlayerData?.puck_speed_max;
          
          if (playerId && (favoriteGoalsChanged || galleryPhotosChanged || achievementsChanged || 
              exerciseStatsChanged || normativesChanged || puckSpeedMaxChanged)) {
            try {
              const { clearPlayerCache, clearPlayerMemoryCache } = await import('./playerStorage');
              clearPlayerMemoryCache(playerId);
              await clearPlayerCache(playerId);
            } catch (error) {
              console.error('❌ Ошибка очистки кеша профиля:', error);
            }
          }
          } catch (e) {
            console.error('❌ Realtime players(all) handler crashed:', e);
          }
        }
      )
      .subscribe((status) => {
        try {
          console.log('📊 [PERFORMANCE] Unified players subscription status:', status);
        } catch (e) {
          console.error('❌ Realtime players status handler crashed:', e);
        }
      });

    this.subscriptions.set('players-unified', {
      channel,
      name: 'players-unified'
    });
  }

  /**
   * @deprecated Заменено на setupUnifiedPlayersSubscription
   */
  private async setupNotificationCountSubscription(userId: string): Promise<void> {
    // Оставлено для совместимости, но больше не используется
  }

  /**
   * @deprecated Заменено на setupUnifiedPlayersSubscription
   */
  private async setupMessagesCountSubscription(userId: string): Promise<void> {
    // Оставлено для совместимости, но больше не используется
  }

  /**
   * Настраивает подписку на новые сообщения для отправки push уведомлений
   */
  private async setupMessagesSubscription(userId: string): Promise<void> {
    // Push-уведомления для сообщений теперь отправляются только из sendMessageSimple
    // Это устраняет дублирование уведомлений, которое происходило когда:
    // 1. sendMessageSimple отправляла push при отправке сообщения
    // 2. RealtimeManager на устройстве получателя также пытался отправить push
    // Подписка на сообщения оставлена для возможных будущих нужд (обновление UI и т.д.)
    
    const channel = supabase
      .channel('messages-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          // Просто логируем для отладки, push НЕ отправляем
          // Push уведомления отправляются централизованно из sendMessageSimple
          const receiverId = payload.new.receiver_id;
          const senderId = payload.new.sender_id;
          
          if (receiverId === userId) {
            console.log(`📨 Realtime: получено новое сообщение от ${senderId} для ${userId}`);
            // Push НЕ отправляем здесь - это делает sendMessageSimple
          }
        }
      )
      .subscribe();

    this.subscriptions.set('messages-realtime-updates', {
      channel,
      name: 'messages-realtime-updates'
    });
  }

  /**
   * @deprecated Заменено на setupUnifiedPlayersSubscription
   * Настраивает подписку на изменения аватаров всех игроков
   */
  private async setupAvatarUpdateSubscription(): Promise<void> {
    // Функционал перенесён в setupUnifiedPlayersSubscription для оптимизации
  }

  /**
   * @deprecated Заменено на setupUnifiedPlayersSubscription
   * Настраивает подписку на изменения профилей игроков (видео, фото и др.)
   */
  private async setupProfileUpdateSubscription(): Promise<void> {
    // Функционал перенесён в setupUnifiedPlayersSubscription для оптимизации
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
    // Сбрасываем последние значения счетчиков при отключении
    this.lastNotificationCount = null;
    this.lastMessagesCount = null;
  }

  /**
   * Проверяет, настроены ли подписки для пользователя
   */
  isConnected(userId: string): boolean {
    return this.currentUserId === userId && this.subscriptions.size > 0;
  }

  // События для уведомления компонентов
  private emitNotificationUpdate(): void {
    // ВАЖНО: При получении нового уведомления нужно обновить счетчик
    // Вызываем callback для обновления счетчика, если он установлен
    // Это заставит UI перезагрузить счетчик из БД
    if (this.notificationCountCallback && this.lastNotificationCount !== null) {
      // Вызываем callback с текущим значением + 1 (предполагаем, что счетчик увеличился)
      // Но лучше перезагрузить из БД, поэтому используем специальный флаг
      this.emitNotificationCountUpdate(this.lastNotificationCount + 1);
    }
  }

  private emitNotificationCountUpdate(count: number): void {
    // ВАЖНО: Уменьшаем задержку до 500ms, чтобы не пропускать обновления
    // Игнорируем Realtime обновления только в течение 500ms после инициализации
    // чтобы избежать race condition с loadNotificationCount
    const timeSinceInit = Date.now() - this.lastInitializeTime;
    if (timeSinceInit < 500) {
      // Если прошло меньше 500ms, все равно обновляем, но с небольшой задержкой
      // чтобы дать время loadNotificationCount завершиться
      setTimeout(() => {
        if (this.notificationCountCallback && count !== this.lastNotificationCount) {
          this.lastNotificationCount = count;
          this.notificationCountCallback(count);
        }
      }, 300);
      return;
    }
    
    // Обновляем только если значение действительно изменилось
    if (this.notificationCountCallback && count !== this.lastNotificationCount) {
      this.lastNotificationCount = count;
      this.notificationCountCallback(count);
    }
  }

  private emitMessagesCountUpdate(count: number): void {
    // Игнорируем Realtime обновления в течение 2 секунд после инициализации
    const timeSinceInit = Date.now() - this.lastInitializeTime;
    if (timeSinceInit < 2000) {
      return;
    }
    
    if (this.messagesCountCallback) {
      this.messagesCountCallback(count);
    }
  }

  /** Фактическое число непрочитанных по таблице messages (совпадает с loadUser / бейдж). */
  private syncMessagesCountFromMessagesTable(userId: string): void {
    void (async () => {
      try {
        const { getUnreadMessageCount } = await import('./playerStorage');
        const trueCount = await getUnreadMessageCount(userId);
        if (trueCount !== this.lastMessagesCount) {
          this.lastMessagesCount = trueCount;
          this.emitMessagesCountUpdate(trueCount);
        }
      } catch (e) {
        console.error('❌ Ошибка синхронизации счётчика сообщений из БД:', e);
      }
    })();
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

