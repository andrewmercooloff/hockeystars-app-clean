import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useScreenContext } from '../contexts/ScreenContext';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from '../components/BlurOrSolid';
import CachedAvatar from '../components/CachedAvatar';
import { platformCardShadow } from '../utils/androidShadow';
// Убираем все анимации переходов
import {
    getPlayersByIdsInBatches,
    fetchPlayersInboxFieldsByIds,
    getUserConversations,
    mergeRawMessageRowsIntoConversations,
    countNewRawMessageIdsInBatch,
    fetchInboxMessagesPage,
    INBOX_LIST_BATCH_SIZE,
    type InboxMessagesPageState,
    Message,
    Player,
    getBlockedUsers,
    isUserBlocked,
    searchMessagesAcrossAllDialogs
} from '../utils/playerStorage';
import { updateAvatarGlobally } from '../utils/AvatarCache';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../contexts/UserContext';
import CachedBackground from '../components/CachedBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';

const iceBg = require('../assets/images/led.jpg');

/** Пауза между пачками по 20 сообщений (плавная догрузка списка диалогов). */
const INBOX_DRAIN_PAUSE_MS = 48;
/** Не вызывать rebuildChatPreviews на каждой пачке — там тяжёлые запросы по сотням peer id. */
const INBOX_DRAIN_REBUILD_EVERY_BATCHES = 10;

interface ChatPreview {
  player: Player;
  lastMessage: Message | null;
  unreadCount: number;
}

/** Текст для поиска по превью: убираем служебные префиксы, как в отображении. */
function normalizeLastMessageTextForSearch(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = raw;
  const replyMatch = text.match(/^\[REPLY_DATA:(.+?)\]([\s\S]*)$/);
  if (replyMatch) {
    text = replyMatch[2] ?? '';
  }
  if (text.startsWith('✏️')) {
    text = text.replace(/^✏️\s*/, '');
  }
  return text.trim().toLowerCase();
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, isUserLoading, refreshUser } = useUser();
  
  // Убираем все анимации - простое мгновенное переключение
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /** Совпадения по всей истории (peerId → самое свежее сообщение с подстрокой). null — поиск по истории не запускали (короткий запрос или сброс). */
  const [historyMatchesByPeerId, setHistoryMatchesByPeerId] = useState<Map<string, Message> | null>(null);
  const [historySearchLoading, setHistorySearchLoading] = useState(false);
  /** Диалоги, найденные только в истории и ещё не попавшие в подгруженный список чатов. */
  const [extraSearchChats, setExtraSearchChats] = useState<ChatPreview[]>([]);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silentLoadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Накопитель сообщений для списка чатов (первая страница — новые, дальше подгрузка к старым). */
  const conversationsAccRef = useRef<Record<string, Message[]>>({});
  /** Следующая страница списка диалогов: курсор (RPC) или номер страницы (OFFSET fallback). */
  /** null = новых страниц нет (догрузили всё). Первая страница: { mode: 'cursor', cursor: null }. */
  const nextInboxPageStateRef = useRef<InboxMessagesPageState | null>({
    mode: 'cursor',
    cursor: null
  });
  const hasMorePagesRef = useRef(true);
  const loadMoreInFlightRef = useRef(false);
  const listViewportHeightRef = useRef(0);
  const drainGenerationRef = useRef(0);
  const drainRunningRef = useRef(false);
  const contentSizeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRebuildLogPeerCountRef = useRef<number>(-1);

  /** Кэш игроков для списка диалогов — догружаем только новые peer id. */
  const inboxPlayerCacheRef = useRef<Map<string, Player>>(new Map());
  /** Уже проверены на «peer заблокировал меня» (инкрементально между шагами drain). */
  const inboxReverseBlockCheckedRef = useRef<Set<string>>(new Set());
  const inboxReverseBlockedThemRef = useRef<Set<string>>(new Set());

  const resetInboxListAuxCaches = useCallback(() => {
    inboxPlayerCacheRef.current.clear();
    inboxReverseBlockCheckedRef.current.clear();
    inboxReverseBlockedThemRef.current.clear();
  }, []);

  /**
   * Одна пачка из INBOX_LIST_BATCH_SIZE сообщений. `gen` — поколение загрузки;
   * при обновлении списка устаревшие ответы не мержатся.
   */
  const appendNextInboxBatch = useCallback(
    async (gen: number): Promise<boolean> => {
      if (!currentUser || drainGenerationRef.current !== gen) return false;
      const inboxState = nextInboxPageStateRef.current;
      if (inboxState == null || !hasMorePagesRef.current) return false;

      const batch = await fetchInboxMessagesPage(
        currentUser.id,
        inboxState,
        INBOX_LIST_BATCH_SIZE
      );
      if (drainGenerationRef.current !== gen) return false;
      if (batch.error || !batch.rows.length) {
        hasMorePagesRef.current = false;
        nextInboxPageStateRef.current = null;
        return false;
      }
      const freshIds = countNewRawMessageIdsInBatch(conversationsAccRef.current, batch.rows);
      if (freshIds === 0) {
        console.warn(
          '⚠️ Inbox: страница без новых сообщений (курсор или тип id в fetch_inbox_messages_page). Пагинация остановлена.'
        );
        hasMorePagesRef.current = false;
        nextInboxPageStateRef.current = null;
        return false;
      }
      conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
        currentUser.id,
        conversationsAccRef.current,
        batch.rows
      );
      nextInboxPageStateRef.current = batch.nextState;
      hasMorePagesRef.current = batch.hasMore && batch.nextState != null;
      return hasMorePagesRef.current;
    },
    [currentUser]
  );

  const rebuildChatPreviews = useCallback(
    async (options?: { includeDrafts?: boolean }) => {
    if (!currentUser) {
      return;
    }
    const includeDrafts = options?.includeDrafts !== false;
    const conversations = conversationsAccRef.current;
    try {
      const peerCount = Object.keys(conversations).length;
      if (__DEV__ && peerCount !== lastRebuildLogPeerCountRef.current) {
        lastRebuildLogPeerCountRef.current = peerCount;
        console.log(`📨 rebuildChatPreviews: диалогов в аккумуляторе ${peerCount}`);
      }

      const blockedUsers = await getBlockedUsers(currentUser.id);
      const blockedSet = new Set(blockedUsers);

      const chatPreviews: ChatPreview[] = [];

      const userIds = Object.keys(conversations).filter(userId => conversations[userId].length > 0);

      const missingPlayerIds = userIds.filter(id => !inboxPlayerCacheRef.current.has(id));
      if (missingPlayerIds.length > 0) {
        const freshPlayers = await getPlayersByIdsInBatches(missingPlayerIds);
        freshPlayers.forEach((player, id) => {
          inboxPlayerCacheRef.current.set(id, player);
        });
      }

      const placeholderPlayer = (peerId: string): Player => ({
        id: peerId,
        name: 'Пользователь',
        position: '',
        team: '',
        age: 0,
        height: '',
        weight: '',
      });

      if (userIds.length > 0) {
        const lightRows = await fetchPlayersInboxFieldsByIds(userIds);
        lightRows.forEach((row, peerId) => {
          const cur = inboxPlayerCacheRef.current.get(peerId);
          const base = cur ?? placeholderPlayer(peerId);
          const nextAvatar = row.avatar ?? base.avatar;
          const avatarChanged = Boolean(row.avatar && row.avatar !== base.avatar);
          inboxPlayerCacheRef.current.set(peerId, {
            ...base,
            name: row.name || base.name,
            avatar: nextAvatar,
            status: row.status ?? base.status,
          });
          if (avatarChanged && row.avatar) {
            void updateAvatarGlobally(peerId, row.avatar);
          }
        });
      }

      if (includeDrafts) {
        inboxReverseBlockCheckedRef.current.clear();
        inboxReverseBlockedThemRef.current.clear();
      }

      const userIdsToCheck = userIds.filter(userId => !blockedSet.has(userId));
      const toVerifyReverse = userIdsToCheck.filter(
        id => !inboxReverseBlockCheckedRef.current.has(id)
      );

      const IN_CHUNK = 100;
      if (toVerifyReverse.length > 0) {
        try {
          for (let i = 0; i < toVerifyReverse.length; i += IN_CHUNK) {
            const idChunk = toVerifyReverse.slice(i, i + IN_CHUNK);
            const { data: reverseBlockedData, error: reverseError } = await supabase
              .from('blocked_users')
              .select('blocker_id')
              .eq('blocked_id', currentUser.id)
              .in('blocker_id', idChunk);
            idChunk.forEach(id => inboxReverseBlockCheckedRef.current.add(id));
            if (!reverseError && reverseBlockedData) {
              reverseBlockedData.forEach((item: any) => {
                inboxReverseBlockedThemRef.current.add(item.blocker_id);
              });
            }
          }
        } catch (blockError) {
          console.warn('⚠️ Ошибка батч-проверки блокировок, используем последовательную проверку:', blockError);
          const checkPromises = toVerifyReverse.map(async (userId) => {
            const isBlocked = await isUserBlocked(userId, currentUser.id);
            return isBlocked ? userId : null;
          });
          const blockedIds = (await Promise.all(checkPromises)).filter(Boolean) as string[];
          toVerifyReverse.forEach(id => inboxReverseBlockCheckedRef.current.add(id));
          blockedIds.forEach(id => inboxReverseBlockedThemRef.current.add(id));
        }
      }

      const blockedByThemSet = inboxReverseBlockedThemRef.current;
      
      // Формируем превью чатов
      for (const [otherUserId, messages] of Object.entries(conversations)) {
        if (messages.length > 0) {
          // Проверяем, не заблокирован ли этот пользователь
          // Если текущий пользователь заблокировал другого - показываем (с индикатором)
          // Если другой пользователь заблокировал текущего - скрываем
          const isBlockedByMe = blockedSet.has(otherUserId);
          const isBlockedByThem = blockedByThemSet.has(otherUserId);
          
          // Скрываем, если нас заблокировали
          if (isBlockedByThem) {
            continue;
          }
          
          const otherPlayer =
            inboxPlayerCacheRef.current.get(otherUserId) ?? placeholderPlayer(otherUserId);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(
            m => m.receiverId === currentUser.id && !m.read
          ).length;
          chatPreviews.push({
            player: otherPlayer,
            lastMessage,
            unreadCount
          });
        }
      }
      
      if (includeDrafts) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const draftKeys = allKeys.filter(key => key.startsWith('chat_draft_'));

        const draftPairs = await AsyncStorage.multiGet(draftKeys);
        
        // Сначала обрабатываем существующие чаты (быстро, без загрузки игроков)
        const newDraftChats: Array<{ playerId: string; draftText: string; draftTime: number }> = [];
        
        for (const [draftKey, draftRaw] of draftPairs) {
          if (draftRaw && draftRaw.trim()) {
            const playerId = draftKey.replace('chat_draft_', '');
            
            // Парсим черновик (поддержка старого и нового формата)
            let draftText = '';
            let draftTime = Date.now();
            try {
              const draftData = JSON.parse(draftRaw);
              if (draftData.text) {
                draftText = draftData.text;
                draftTime = draftData.timestamp || Date.now();
              }
            } catch {
              // Старый формат - просто текст
              draftText = draftRaw;
            }
            
            if (!draftText.trim()) continue;
            
            // Проверяем, есть ли уже этот чат в списке
            const existingChatIndex = chatPreviews.findIndex(c => c.player.id === playerId);
            
            if (existingChatIndex !== -1) {
              // Чат существует - проверяем, новее ли черновик
              const existingChat = chatPreviews[existingChatIndex];
              const existingTime = existingChat.lastMessage?.timestamp instanceof Date 
                ? existingChat.lastMessage.timestamp.getTime() 
                : (existingChat.lastMessage?.timestamp || 0);
              
              // Если черновик новее последнего сообщения - показываем черновик
              if (draftTime > existingTime) {
                chatPreviews[existingChatIndex] = {
                  ...existingChat,
                  lastMessage: {
                    id: 'draft',
                    senderId: currentUser.id,
                    receiverId: playerId,
                    text: `✏️ ${draftText.substring(0, 30)}${draftText.length > 30 ? '...' : ''}`,
                    timestamp: new Date(draftTime),
                    read: true
                  }
                };
              }
            } else {
              // Чат не существует - добавляем в список для параллельной загрузки
              newDraftChats.push({ playerId, draftText, draftTime });
            }
          }
        }
        
        if (newDraftChats.length > 0) {
          const draftPlayerIds = newDraftChats.map(d => d.playerId);
          const draftPlayersMap = await getPlayersByIdsInBatches(draftPlayerIds);
          draftPlayersMap.forEach((player, id) => {
            inboxPlayerCacheRef.current.set(id, player);
          });
          newDraftChats.forEach(({ playerId, draftText, draftTime }) => {
            if (blockedSet.has(playerId) || blockedByThemSet.has(playerId)) return;
            const player = draftPlayersMap.get(playerId) ?? placeholderPlayer(playerId);
            chatPreviews.push({
              player,
              lastMessage: {
                id: 'draft',
                senderId: currentUser.id,
                receiverId: playerId,
                text: `✏️ ${draftText.substring(0, 30)}${draftText.length > 30 ? '...' : ''}`,
                timestamp: new Date(draftTime),
                read: true
              },
              unreadCount: 0
            });
          });
        }
      } catch (draftError) {
        console.warn('⚠️ Ошибка загрузки черновиков:', draftError);
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
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error('❌ Ошибка загрузки чатов:', error);
    }
  },
  [currentUser]
  );

  const loadChatsData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!currentUser) return;
      const silent = opts?.silent === true;
      try {
        drainGenerationRef.current += 1;
        const myGen = drainGenerationRef.current;

        if (silent) {
          const silentRes = await fetchInboxMessagesPage(
            currentUser.id,
            { mode: 'cursor', cursor: null },
            INBOX_LIST_BATCH_SIZE
          );
          if (drainGenerationRef.current !== myGen) return;
          if (!silentRes.error && silentRes.rows.length) {
            conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
              currentUser.id,
              conversationsAccRef.current,
              silentRes.rows
            );
          }
          await rebuildChatPreviews();
          return;
        }

        conversationsAccRef.current = {};
        resetInboxListAuxCaches();
        hasMorePagesRef.current = true;
        nextInboxPageStateRef.current = { mode: 'cursor', cursor: null };

        const first = await fetchInboxMessagesPage(
          currentUser.id,
          { mode: 'cursor', cursor: null },
          INBOX_LIST_BATCH_SIZE
        );
        if (drainGenerationRef.current !== myGen) return;
        if (first.error) {
          conversationsAccRef.current = await getUserConversations(currentUser.id);
          hasMorePagesRef.current = false;
          nextInboxPageStateRef.current = null;
          await rebuildChatPreviews();
          return;
        }

        conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
          currentUser.id,
          {},
          first.rows
        );
        nextInboxPageStateRef.current = first.nextState;
        hasMorePagesRef.current = first.hasMore && first.nextState != null;
        await rebuildChatPreviews();

        /** Фон: плавно догружаем пачками по 20 до конца истории (прерывается при новом refresh / смене gen). */
        const runDrain = async () => {
          drainRunningRef.current = true;
          setLoadingMoreChats(true);
          let drainIterations = 0;
          let batchesSinceRebuild = 0;
          try {
            while (
              drainGenerationRef.current === myGen &&
              hasMorePagesRef.current &&
              nextInboxPageStateRef.current != null &&
              drainIterations < 200000
            ) {
              drainIterations++;
              const more = await appendNextInboxBatch(myGen);
              batchesSinceRebuild++;
              if (!more || batchesSinceRebuild >= INBOX_DRAIN_REBUILD_EVERY_BATCHES) {
                await rebuildChatPreviews({ includeDrafts: false });
                batchesSinceRebuild = 0;
              }
              if (!more) break;
              await new Promise<void>(resolve => setTimeout(resolve, INBOX_DRAIN_PAUSE_MS));
            }
            if (drainIterations > 0) {
              await rebuildChatPreviews({ includeDrafts: true });
            }
          } catch (e) {
            console.error('❌ Ошибка фоновой догрузки чатов:', e);
          } finally {
            drainRunningRef.current = false;
            if (drainGenerationRef.current === myGen) {
              setLoadingMoreChats(false);
            }
          }
        };
        void runDrain();
      } catch (error) {
        console.error('❌ Ошибка загрузки чатов:', error);
      }
    },
    [currentUser, rebuildChatPreviews, appendNextInboxBatch, resetInboxListAuxCaches]
  );

  const loadOlderChatsPage = useCallback(async () => {
    if (!currentUser || !hasMorePagesRef.current) return;
    if (searchQuery.trim().length > 0) return;
    if (loadMoreInFlightRef.current || drainRunningRef.current) return;

    const inboxState = nextInboxPageStateRef.current;
    if (inboxState == null) {
      hasMorePagesRef.current = false;
      return;
    }

    const gen = drainGenerationRef.current;
    loadMoreInFlightRef.current = true;
    setLoadingMoreChats(true);
    try {
      await appendNextInboxBatch(gen);
      await rebuildChatPreviews();
    } catch (e) {
      console.error('❌ Ошибка подгрузки страницы чатов:', e);
      hasMorePagesRef.current = false;
      nextInboxPageStateRef.current = null;
    } finally {
      loadMoreInFlightRef.current = false;
      if (!drainRunningRef.current) {
        setLoadingMoreChats(false);
      }
    }
  }, [currentUser, rebuildChatPreviews, searchQuery, appendNextInboxBatch]);

  useEffect(() => {
    return () => {
      if (contentSizeLoadTimerRef.current) {
        clearTimeout(contentSizeLoadTimerRef.current);
      }
    };
  }, []);

  // Поиск по тексту во всех сообщениях (debounce + запрос к БД)
  useEffect(() => {
    const rawQ = searchQuery.trim();
    if (rawQ.length < 2) {
      setHistoryMatchesByPeerId(null);
      setHistorySearchLoading(false);
      return;
    }
    if (!currentUser?.id) {
      setHistoryMatchesByPeerId(null);
      setHistorySearchLoading(false);
      return;
    }

    setHistorySearchLoading(true);
    let cancelled = false;
    const tid = setTimeout(async () => {
      const { matchesByPeerId, error } = await searchMessagesAcrossAllDialogs(currentUser.id, rawQ);
      if (cancelled) return;
      if (error) {
        setHistoryMatchesByPeerId(new Map());
      } else {
        setHistoryMatchesByPeerId(matchesByPeerId);
      }
      setHistorySearchLoading(false);
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [searchQuery, currentUser?.id]);

  // Догружаем игроков для диалогов, которые есть только в результатах поиска по истории
  useEffect(() => {
    const rawQ = searchQuery.trim();
    if (!historyMatchesByPeerId || rawQ.length < 2 || !currentUser?.id) {
      setExtraSearchChats([]);
      return;
    }

    const inList = new Set(chats.map((c) => c.player.id));
    const missing: string[] = [];
    historyMatchesByPeerId.forEach((_, peerId) => {
      if (!inList.has(peerId)) missing.push(peerId);
    });

    if (missing.length === 0) {
      setExtraSearchChats([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const blocked = await getBlockedUsers(currentUser.id);
        const blockedSet = new Set(blocked);
        const allowed = missing.filter((id) => !blockedSet.has(id));
        if (allowed.length === 0) {
          if (!cancelled) setExtraSearchChats([]);
          return;
        }
        const playersMap = await getPlayersByIdsInBatches(allowed);
        if (cancelled) return;
        const previews: ChatPreview[] = [];
        for (const id of allowed) {
          const p = playersMap.get(id);
          if (!p) continue;
          const hit = historyMatchesByPeerId.get(id);
          previews.push({
            player: p,
            lastMessage: hit ?? null,
            unreadCount: 0,
          });
        }
        setExtraSearchChats(previews);
      } catch {
        if (!cancelled) setExtraSearchChats([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyMatchesByPeerId, chats, searchQuery, currentUser?.id]);

  // Фильтрация чатов по поиску (имя, последнее сообщение, любое сообщение в диалоге)
  const filteredChats = useMemo(() => {
    const rawQ = searchQuery.trim();
    if (!rawQ) {
      return chats;
    }

    const searchLower = rawQ.toLowerCase();
    const hist = historyMatchesByPeerId;

    const peerInHistory = (pid: string) =>
      hist != null && rawQ.length >= 2 && hist.has(pid);

    const withHistoryPreview = (chat: ChatPreview): ChatPreview => {
      const hit = hist?.get(chat.player.id);
      if (!hit || rawQ.length < 2) return chat;
      const hitOk = normalizeLastMessageTextForSearch(hit.text).includes(searchLower);
      const lastOk = normalizeLastMessageTextForSearch(chat.lastMessage?.text).includes(searchLower);
      if (hitOk && !lastOk) return { ...chat, lastMessage: hit };
      return chat;
    };

    const out: ChatPreview[] = [];
    const seen = new Set<string>();

    for (const chat of chats) {
      const matchesName = chat.player.name?.toLowerCase().includes(searchLower);
      const matchesMessage = normalizeLastMessageTextForSearch(chat.lastMessage?.text).includes(searchLower);
      if (matchesName || matchesMessage || peerInHistory(chat.player.id)) {
        out.push(withHistoryPreview(chat));
        seen.add(chat.player.id);
      }
    }

    for (const ex of extraSearchChats) {
      if (!seen.has(ex.player.id)) {
        out.push(ex);
        seen.add(ex.player.id);
      }
    }

    return out;
  }, [chats, searchQuery, historyMatchesByPeerId, extraSearchChats]);

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

  // Запускаем загрузку только когда пользователь авторизован
  // ОПТИМИЗАЦИЯ: Показываем кешированные данные сразу, затем обновляем
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (currentUser && !isUserLoading) {
      // Если есть кешированные чаты и уже была загрузка - показываем их сразу, затем обновляем
      if (chats.length > 0 && hasLoadedOnceRef.current) {
        setLoading(false); // Скрываем loading сразу
        // Обновляем в фоне
        loadChatsData().catch(err => {
          console.error('❌ Ошибка фонового обновления чатов:', err);
        });
      } else {
        // Первая загрузка - показываем loading
        hasLoadedOnceRef.current = true;
        loadChats();
      }
    } else if (!isUserLoading && currentUser === null) {
      // Если загрузка завершена и пользователь не авторизован
      setLoading(false);
      hasLoadedOnceRef.current = false;
    }
  }, [currentUser, isUserLoading, loadChats, loadChatsData]);

  // Тихая загрузка чатов (без индикатора)
  // Debounced версия для realtime обновлений (предотвращает частые загрузки)
  const silentLoadChats = useCallback(() => {
    if (silentLoadDebounceRef.current) {
      clearTimeout(silentLoadDebounceRef.current);
    }
    silentLoadDebounceRef.current = setTimeout(async () => {
    try {
      await loadChatsData({ silent: true });
    } catch (error) {
      console.error('❌ Ошибка тихой загрузки чатов:', error);
    }
    }, 150); // Уменьшен debounce до 150мс для быстрого появления чатов
  }, [loadChatsData]);

  // Быстро применяем черновики к уже загруженному списку чатов (без ожидания загрузки из БД)
  const applyDraftsToExistingChats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const draftKeys = allKeys.filter(key => key.startsWith('chat_draft_'));
      if (draftKeys.length === 0) return;

      const draftPairs = await AsyncStorage.multiGet(draftKeys);
      const draftMap = new Map<string, { text: string; timestamp: number }>();

      for (const [key, raw] of draftPairs) {
        if (!raw) continue;
        const playerId = key.replace('chat_draft_', '');

        let draftText = '';
        let draftTime = Date.now();
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.text) {
            draftText = parsed.text;
            draftTime = parsed.timestamp || Date.now();
          }
        } catch {
          draftText = raw;
        }

        if (!draftText.trim()) continue;
        draftMap.set(playerId, { text: draftText, timestamp: draftTime });
      }

      if (draftMap.size === 0) return;

      setChats(prev => {
        let changed = false;
        const next = prev.map(chat => {
          const draft = draftMap.get(chat.player.id);
          if (!draft) return chat;

          const existingTime = chat.lastMessage?.timestamp instanceof Date
            ? chat.lastMessage.timestamp.getTime()
            : (chat.lastMessage?.timestamp || 0);

          if (draft.timestamp <= existingTime) return chat;

          changed = true;
          return {
            ...chat,
            lastMessage: {
              id: 'draft',
              senderId: currentUser.id,
              receiverId: chat.player.id,
              text: `✏️ ${draft.text.substring(0, 30)}${draft.text.length > 30 ? '...' : ''}`,
              timestamp: new Date(draft.timestamp),
              read: true
            }
          };
        });

        if (!changed) return prev;

        next.sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          const aTime = a.lastMessage.timestamp instanceof Date ? a.lastMessage.timestamp.getTime() : a.lastMessage.timestamp;
          const bTime = b.lastMessage.timestamp instanceof Date ? b.lastMessage.timestamp.getTime() : b.lastMessage.timestamp;
          return bTime - aTime;
        });

        return next;
      });
    } catch (e) {
      console.warn('⚠️ Ошибка быстрого применения черновиков:', e);
    }
  }, [currentUser]);

  // Realtime подписка на новые сообщения (входящие И исходящие для обновления UI чатов)
  useEffect(() => {
    if (!currentUser) return;

    // Подписываемся на INSERT события для обновления списка чатов
    // Слушаем как входящие (receiver_id), так и исходящие (sender_id) сообщения
    const incomingChannel = supabase
      .channel('messages-incoming-ui')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('💬 Входящее сообщение для UI обновления:', payload.new);
          silentLoadChats();
          // Дебаунсинг для обновления UserContext
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => refreshUser(true), 500);
        }
      )
      .subscribe();

    // Подписка на исходящие сообщения (когда я отправляю)
    const outgoingChannel = supabase
      .channel('messages-outgoing-ui')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('💬 Исходящее сообщение для UI обновления:', payload.new);
          silentLoadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (silentLoadDebounceRef.current) {
        clearTimeout(silentLoadDebounceRef.current);
      }
    };
  }, [currentUser, silentLoadChats, refreshUser]);

  // Обновляем список сообщений при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      setCurrentScreen('messages');
      // Сразу поднимаем чаты с черновиками, не дожидаясь загрузки диалогов из БД
      applyDraftsToExistingChats();
      
      // Если чаты уже загружены - обновляем в фоне без loading
      // Если это первая загрузка - показываем loading
      if (chats.length > 0) {
        silentLoadChats(); // Фоновое обновление без индикатора загрузки
      } else {
        loadChats(); // Первая загрузка с индикатором
      }
      
      
      // Автоматически скрываем индикатор сообщений через 5 секунд
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      autoHideTimeoutRef.current = setTimeout(async () => {
        // Убираем refreshUser - теперь счетчик управляется через БД и Realtime
        // await refreshUser(true);
      }, 5000);
      
      return () => {
        setCurrentScreen(null);
        if (autoHideTimeoutRef.current) {
          clearTimeout(autoHideTimeoutRef.current);
        }
      };
    }, [loadChats, silentLoadChats, chats.length, setCurrentScreen, refreshUser, applyDraftsToExistingChats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChats();
  }, [loadChats]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const openChat = useCallback(
    (playerId: string) => {
      router.push({ pathname: '/chat/[id]', params: { id: playerId } });
    },
    [router]
  );

  const formatTime = useCallback(
    (timestamp: Date | number) => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      if (diffInHours < 48) {
        return t('messages.yesterday');
      }
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      });
    },
    [t]
  );

  const formatLastMessage = useCallback(
    (message: Message, uid: string) => {
      const isMyMessage = message.senderId === uid;
      const prefix = isMyMessage ? t('messages.you') : '';

      let text = message.text;
      const replyDataMatch = text.match(/^\[REPLY_DATA:(.+?)\](.*)$/);
      if (replyDataMatch) {
        text = replyDataMatch[2];
      }

      text =
        text.length > 30 ? text.substring(0, 30) + '...' : text;

      return prefix + text;
    },
    [t]
  );

  const renderChatItem = useCallback(
    ({ item }: { item: ChatPreview }) => {
      if (!currentUser) {
        return null;
      }
      return (
        <MessagesChatRowMemo
          chat={item}
          currentUserId={currentUser.id}
          onOpen={openChat}
          formatTime={formatTime}
          formatLastMessage={formatLastMessage}
          t={t}
          language={language}
        />
      );
    },
    [currentUser, openChat, formatTime, formatLastMessage, t, language]
  );

  const keyExtractor = useCallback((item: ChatPreview) => item.player.id, []);

  // Empty component
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Ionicons name="chatbubble-outline" size={64} color="#fa2f40" />
        <Text style={styles.emptyTitle}>{t('messages.noMessages')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('messages.startConversation')}
        </Text>
      </View>
    </View>
  ), [t]);

  const onChatsContentSizeChange = useCallback(
    (_w: number, h: number) => {
      if (searchQuery.trim()) return;
      if (!hasMorePagesRef.current || loadMoreInFlightRef.current || drainRunningRef.current) return;
      const vh = listViewportHeightRef.current;
      if (vh < 1 || h < 1) return;
      if (h >= vh - 24) return;
      if (contentSizeLoadTimerRef.current) clearTimeout(contentSizeLoadTimerRef.current);
      contentSizeLoadTimerRef.current = setTimeout(() => {
        contentSizeLoadTimerRef.current = null;
        if (!hasMorePagesRef.current || loadMoreInFlightRef.current || drainRunningRef.current) return;
        loadOlderChatsPage();
      }, 85);
    },
    [searchQuery, loadOlderChatsPage]
  );

  const listFooterElement = useMemo(
    () =>
      loadingMoreChats ? (
        <View style={styles.chatsListFooter}>
          <ActivityIndicator color="#fa2f40" />
        </View>
      ) : null,
    [loadingMoreChats]
  );

  // Редирект убран - проверка авторизации происходит в _layout.tsx
  // Если пользователь не авторизован, показываем loading
  if (currentUser === null) {
    return (
      <CachedBackground 
        source={iceBg} 
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </CachedBackground>
    );
  }

  // Если загружается пользователь ИЛИ данные, показываем один loading screen
  if (isUserLoading || currentUser === undefined || (loading && filteredChats.length === 0)) {
    return (
      <View style={styles.container}>
        <CachedBackground 
          source={iceBg} 
          style={styles.background} 
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('messages.title')}</Text>
            </View>
            <View style={styles.loadingCenter}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </View>
        </CachedBackground>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
    >
      <CachedBackground 
        source={iceBg} 
        style={styles.background} 
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Заголовок страницы с поиском */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('messages.title')}</Text>
          </View>
          
          {/* Строка поиска */}
          <View style={styles.searchContainer}>
            <BlurOrSolid
              intensity={20}
              tint="dark"
              style={styles.searchInputBlur}
            >
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('messages.searchPlaceholder')}
                  placeholderTextColor="#888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
            </BlurOrSolid>
          </View>

          {searchQuery.trim().length >= 2 && historySearchLoading && (
            <View style={styles.historySearchHint}>
              <ActivityIndicator size="small" color="#fa2f40" style={styles.historySearchSpinner} />
              <Text style={styles.historySearchHintText}>{t('messages.searchHistoryLoading')}</Text>
            </View>
          )}
          
          {/* Список чатов - FlatList для виртуализации и производительности */}
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={keyExtractor}
            style={styles.chatsContainer}
            contentContainerStyle={filteredChats.length === 0 ? styles.emptyListContent : styles.chatsContent}
            ListEmptyComponent={!loading ? ListEmptyComponent : null}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#fa2f40"
                colors={["#fa2f40"]}
              />
            }
            removeClippedSubviews={false}
            maxToRenderPerBatch={12}
            windowSize={21}
            initialNumToRender={14}
            updateCellsBatchingPeriod={80}
            onLayout={(e) => {
              listViewportHeightRef.current = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={onChatsContentSizeChange}
            onEndReached={loadOlderChatsPage}
            onEndReachedThreshold={0.55}
            ListFooterComponent={listFooterElement}
          />
        </View>
      </CachedBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87A3B1',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: 'rgba(135, 163, 177, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
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
    paddingTop: 91, // Отступ для заголовка + поиска (еще на 1px выше)
  },
  chatsContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatsListFooter: {
    paddingVertical: 16,
    alignItems: 'center',
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
    padding: 20, // Уменьшили с 40 до 20 (в 2 раза)
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    marginHorizontal: 16, // Такая же ширина как у элементов чатов
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }),
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
  chatItemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  chatItemOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(250, 47, 64, 0.2)',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#800000',
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
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
  // Стили для поиска
  searchContainer: {
    position: 'absolute',
    top: 41, // Еще на 1px выше
    left: 0,
    right: 0,
    zIndex: 1001,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
  },
  searchInputBlur: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(1, 0, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: '#fa2f40',
    height: 40,
    width: '100%',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: 24,
    textAlignVertical: 'center',
    paddingVertical: 0,
    fontFamily: 'Gilroy-Regular',
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  historySearchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  historySearchSpinner: {
    marginRight: 8,
  },
  historySearchHintText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
  },
  chatGradientShadow: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 8,
    }),
  },
});

function inboxMessageTimestampMs(msg: Message | null | undefined): number {
  if (!msg?.timestamp) return 0;
  return msg.timestamp instanceof Date
    ? msg.timestamp.getTime()
    : new Date(msg.timestamp as string | number).getTime();
}

function areMessagesChatRowPropsEqual(
  prev: MessagesChatRowProps,
  next: MessagesChatRowProps
): boolean {
  if (prev.onOpen !== next.onOpen) return false;
  if (prev.formatTime !== next.formatTime) return false;
  if (prev.formatLastMessage !== next.formatLastMessage) return false;
  if (prev.t !== next.t) return false;
  if (prev.language !== next.language) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  if (prev.chat.player.id !== next.chat.player.id) return false;
  if (prev.chat.unreadCount !== next.chat.unreadCount) return false;
  if (prev.chat.player.name !== next.chat.player.name) return false;
  if (prev.chat.player.avatar !== next.chat.player.avatar) return false;
  if (prev.chat.player.status !== next.chat.player.status) return false;
  const a = prev.chat.lastMessage;
  const b = next.chat.lastMessage;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.text === b.text &&
    inboxMessageTimestampMs(a) === inboxMessageTimestampMs(b)
  );
}

type MessagesChatRowProps = {
  chat: ChatPreview;
  currentUserId: string;
  onOpen: (id: string) => void;
  formatTime: (timestamp: Date | number) => string;
  formatLastMessage: (message: Message, currentUserId: string) => string;
  t: (key: string) => string;
  language: string;
};

const MessagesChatRowMemo = React.memo(function MessagesChatRow({
  chat,
  currentUserId,
  onOpen,
  formatTime,
  formatLastMessage,
  t,
  language: _language,
}: MessagesChatRowProps) {
  return (
    <TouchableOpacity onPress={() => onOpen(chat.player.id)} activeOpacity={0.8}>
      <View style={styles.chatGradientShadow}>
        <BlurOrSolid intensity={20} tint="dark" style={styles.chatItemBlur}>
          <View style={styles.chatItemOverlay}>
            <CachedAvatar
              playerId={chat.player.id}
              fallbackAvatarUrl={
                chat.player.avatar || 'https://via.placeholder.com/50/333/fff?text=Player'
              }
              size={50}
              style={styles.chatAvatar}
              status={chat.player.status}
              onError={
                __DEV__
                  ? () => console.log('Ошибка загрузки аватарки для:', chat.player.name)
                  : undefined
              }
            />

            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>
                  {chat.player.status === 'scout'
                    ? t('profile.scout')?.toUpperCase() || 'SCOUT'
                    : chat.player.name?.toUpperCase()}
                </Text>
                {chat.lastMessage ? (
                  <Text style={styles.chatTime}>{formatTime(chat.lastMessage.timestamp)}</Text>
                ) : null}
              </View>

              <View style={styles.chatPreview}>
                <Text style={styles.chatLastMessage}>
                  {chat.lastMessage
                    ? formatLastMessage(chat.lastMessage, currentUserId)
                    : t('messages.noMessages')}
                </Text>

                {chat.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.chatStatus}>
                {chat.player.status === 'player'
                  ? t('profile.player')
                  : chat.player.status === 'coach'
                    ? t('profile.coach')
                    : chat.player.status === 'scout'
                      ? t('profile.scout')
                      : chat.player.status === 'admin'
                        ? t('profile.admin')
                        : t('profile.star')}
              </Text>
            </View>
          </View>
        </BlurOrSolid>
      </View>
    </TouchableOpacity>
  );
}, areMessagesChatRowPropsEqual);
