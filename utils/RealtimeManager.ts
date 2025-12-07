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
      
      // 6. Подписка на изменения профилей игроков (видео, фото и др.)
      await this.setupProfileUpdateSubscription();
      
      // 7. Подписка на новые сообщения для push уведомлений (отключена - используем прямую отправку)
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
          const notificationType = payload.new?.type;
          console.log('🔔 Realtime: Получено новое уведомление:', {
            type: notificationType,
            userId: payload.new?.user_id,
            notificationId: payload.new?.id
          });
          
          // ИСПРАВЛЕНО: Убрано оптимистичное обновление счетчика
          // Счетчик уже обновлен через SQL функцию increment_unread_notifications при создании уведомления
          // Realtime подписка на изменения в таблице players автоматически обновит счетчик через setupNotificationCountSubscription
          // Оптимистичное обновление приводило к двойному увеличению (1 → 2 → 3)
          
          // Просто загружаем актуальный счетчик из БД через небольшую задержку
          // Это нужно для синхронизации после того, как SQL функция обновила счетчик
          if (this.loadNotificationCountCallback && this.currentUserId) {
            setTimeout(() => {
              console.log('🔔 Realtime: Загружаем актуальный счетчик из БД после создания уведомления');
              this.loadNotificationCountCallback!(this.currentUserId!).catch(error => {
                console.error('❌ Ошибка загрузки счетчика уведомлений:', error);
              });
            }, 500);
          } else if (this.notificationCountCallback && this.lastNotificationCount === null) {
            // Если счетчик еще не инициализирован, загружаем из БД
            if (this.loadNotificationCountCallback && this.currentUserId) {
              setTimeout(() => {
                this.loadNotificationCountCallback!(this.currentUserId!).catch(error => {
                  console.error('❌ Ошибка загрузки счетчика уведомлений:', error);
                });
              }, 200);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime: Статус подписки на уведомления:', status);
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
      .channel(`players-notifications-count-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const newCount = payload.new.unread_notifications_count || 0;
          const oldCount = payload.old?.unread_notifications_count || 0;
          
          console.log('🔔 Realtime: Обновление счетчика уведомлений в players:', {
            oldCount,
            newCount,
            lastKnown: this.lastNotificationCount,
            userId
          });
          
          // ВАЖНО: Вызываем callback если счетчик уведомлений изменился
          // Обновляем даже если значение совпадает с lastNotificationCount,
          // так как это может быть синхронизация после создания уведомления
          if (newCount !== oldCount) {
            this.emitNotificationCountUpdate(newCount);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime: Статус подписки на счетчик уведомлений:', status);
      });

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
          const newCount = payload.new.unread_messages_count || 0;
          const oldCount = payload.old?.unread_messages_count || 0;
          
          // Вызываем callback только если счетчик сообщений действительно изменился
          // и значение отличается от последнего известного
          if (newCount !== oldCount && newCount !== this.lastMessagesCount) {
            this.lastMessagesCount = newCount;
            this.emitMessagesCountUpdate(newCount);
          }
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
   * Настраивает подписку на изменения профилей игроков (видео, фото и др.)
   * Очищает кеш профиля при изменениях, чтобы друзья видели обновления сразу
   */
  private async setupProfileUpdateSubscription(): Promise<void> {
    const channel = supabase
      .channel('players-profile-updates')
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
          
          // Проверяем изменение важных полей профиля
          const favoriteGoalsChanged = playerData.favorite_goals !== oldPlayerData?.favorite_goals;
          const galleryPhotosChanged = playerData.gallery_photos !== oldPlayerData?.gallery_photos;
          const achievementsChanged = playerData.achievements !== oldPlayerData?.achievements;
          const exerciseStatsChanged = playerData.exercise_stats !== oldPlayerData?.exercise_stats;
          const normativesChanged = playerData.normatives !== oldPlayerData?.normatives;
          const puckSpeedMaxChanged = playerData.puck_speed_max !== oldPlayerData?.puck_speed_max;
          
          // Если изменились важные поля профиля, очищаем кеш этого игрока
          if (playerId && (favoriteGoalsChanged || galleryPhotosChanged || achievementsChanged || 
              exerciseStatsChanged || normativesChanged || puckSpeedMaxChanged)) {
            try {
              const { clearPlayerCache, clearPlayerMemoryCache } = await import('./playerStorage');
              
              // Очищаем кеш профиля игрока
              clearPlayerMemoryCache(playerId);
              await clearPlayerCache(playerId);
              
              console.log('🔄 Realtime: Кеш профиля очищен при изменении данных:', { 
                playerId,
                favoriteGoalsChanged,
                galleryPhotosChanged,
                achievementsChanged,
                exerciseStatsChanged
              });
            } catch (error) {
              console.error('❌ Ошибка очистки кеша профиля через Realtime:', error);
            }
          }
        }
      )
      .subscribe();

    this.subscriptions.set('players-profile-updates', {
      channel,
      name: 'players-profile-updates'
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

