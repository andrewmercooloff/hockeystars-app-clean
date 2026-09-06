import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
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
import SkeletonList from '../components/SkeletonList';
import EmptyState from '../components/EmptyState';
import { displayName } from '../utils/displayName';
import { colors } from '../theme/colors';
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
    type InboxMessagesPageState,
    Message,
    Player,
    getBlockedUsers,
    isUserBlocked,
    searchMessagesAcrossAllDialogs
} from '../utils/playerStorage';
import { avatarCache, seedPlayerAvatarUrls } from '../utils/AvatarCache';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabase';
import { useUser } from '../contexts/UserContext';
import CachedBackground from '../components/CachedBackground';
import { useIsDesktopLayout } from '../hooks/useIsDesktopLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerTabScrollHandler } from '../utils/tabScrollRegistry';

const iceBg = require('../assets/images/led.jpg');

/** Первая порция — быстрый показ списка. */
const INBOX_FIRST_BATCH_SIZE = 100;
/** Фоновые пачки сообщений. */
const INBOX_BG_BATCH_SIZE = 200;
/** Как часто обновлять UI при фоновой догрузке. */
const INBOX_BG_REBUILD_EVERY = 3;
const INBOX_FIRST_BATCH_TIMEOUT_MS = 18000;
const INBOX_BG_BATCH_TIMEOUT_MS = 25000;
const INBOX_BG_PAUSE_MS = 40;
const INBOX_SPINNER_MAX_MS = 20000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let tid: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    tid = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
  });
  return Promise.race([p.finally(() => { if (tid) clearTimeout(tid); }), timeout]);
}

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

function sortChatsByTime(list: ChatPreview[]): ChatPreview[] {
  return [...list].sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    const aTime =
      a.lastMessage.timestamp instanceof Date
        ? a.lastMessage.timestamp.getTime()
        : a.lastMessage.timestamp;
    const bTime =
      b.lastMessage.timestamp instanceof Date
        ? b.lastMessage.timestamp.getTime()
        : b.lastMessage.timestamp;
    return bTime - aTime;
  });
}

function mergePlayerStable(prev: Player, next: Player): Player {
  return {
    ...next,
    name:
      next.name && next.name.trim() && next.name !== 'Пользователь'
        ? next.name
        : prev.name || next.name,
    avatar: next.avatar || prev.avatar,
    status: next.status ?? prev.status,
  };
}

/** Обновление списка без «усохания» и без сброса аватаров. */
function applyInboxChatListUpdate(
  prev: ChatPreview[],
  chatPreviews: ChatPreview[],
  mode: 'merge' | 'ifMore'
): ChatPreview[] {
  if (chatPreviews.length === 0 && prev.length > 0) return prev;

  const prevById = new Map(prev.map((c) => [c.player.id, c]));
  const nextById = new Map(chatPreviews.map((c) => [c.player.id, c]));

  if (mode === 'ifMore' && prev.length > 0) {
    let changed = false;
    const updated = prev.map((old) => {
      const neu = nextById.get(old.player.id);
      if (!neu) return old;
      const merged: ChatPreview = {
        ...neu,
        player: mergePlayerStable(old.player, neu.player),
      };
      if (
        old.unreadCount !== merged.unreadCount ||
        old.lastMessage?.id !== merged.lastMessage?.id ||
        old.lastMessage?.text !== merged.lastMessage?.text ||
        old.player.avatar !== merged.player.avatar ||
        old.player.name !== merged.player.name
      ) {
        changed = true;
        return merged;
      }
      return old;
    });

    const added = chatPreviews
      .filter((c) => !prevById.has(c.player.id))
      .map((c) => ({
        ...c,
        player: mergePlayerStable(c.player, c.player),
      }));

    if (!changed && added.length === 0) return prev;
    return sortChatsByTime([...updated, ...added]);
  }

  const enriched = chatPreviews.map((c) => {
    const old = prevById.get(c.player.id);
    return old ? { ...c, player: mergePlayerStable(old.player, c.player) } : c;
  });

  if (enriched.length >= prev.length || prev.length === 0) {
    return sortChatsByTime(enriched);
  }

  const ids = new Set(enriched.map((c) => c.player.id));
  const merged = [...enriched];
  for (const old of prev) {
    if (!ids.has(old.player.id)) merged.push(old);
  }
  return sortChatsByTime(merged);
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, isUserLoading } = useUser();
  const isFocused = useIsFocused();
  const isDesktop = useIsDesktopLayout();
  
  // Убираем все анимации - простое мгновенное переключение
  const [chats, setChats] = useState<ChatPreview[]>([]);
  /** true — первый кадр уже показан (кэш или первая пачка). Блокирующий спиннер больше не нужен. */
  const [inboxReady, setInboxReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /** Совпадения по всей истории (peerId → самое свежее сообщение с подстрокой). null — поиск по истории не запускали (короткий запрос или сброс). */
  const [historyMatchesByPeerId, setHistoryMatchesByPeerId] = useState<Map<string, Message> | null>(null);
  const [historySearchLoading, setHistorySearchLoading] = useState(false);
  /** Диалоги, найденные только в истории и ещё не попавшие в подгруженный список чатов. */
  const [extraSearchChats, setExtraSearchChats] = useState<ChatPreview[]>([]);
  /** Фоновая догрузка старых диалогов — маленький спиннер внизу, не блокирует экран. */
  const [syncingMore, setSyncingMore] = useState(false);
  const chatsListRef = useRef<FlatList<ChatPreview>>(null);
  const silentLoadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgSyncRunningRef = useRef(false);

  const conversationsAccRef = useRef<Record<string, Message[]>>({});
  const loadGenerationRef = useRef(0);
  const nextInboxPageRef = useRef<InboxMessagesPageState | null>({ mode: 'cursor', cursor: null });
  const hasMoreInboxRef = useRef(true);
  const inboxUseOffsetRef = useRef(false);
  const lastRebuildLogPeerCountRef = useRef<number>(-1);
  const inboxPreviewsCacheKey = useMemo(
    () => (currentUser?.id ? `hs_inbox_previews_v1_${currentUser.id}` : null),
    [currentUser?.id]
  );
  const chatsRef = useRef<ChatPreview[]>([]);
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  /** Кэш игроков для списка диалогов — догружаем только новые peer id. */
  const inboxPlayerCacheRef = useRef<Map<string, Player>>(new Map());
  /** Уже проверены на «peer заблокировал меня» (инкрементально между шагами drain). */
  const inboxReverseBlockCheckedRef = useRef<Set<string>>(new Set());
  const inboxReverseBlockedThemRef = useRef<Set<string>>(new Set());
  /** Мой список блокировок: кэшируем, чтобы rebuildChatPreviews не бил БД на каждый batch. */
  const blockedByMeSetRef = useRef<Set<string> | null>(null);
  const setSyncingMoreStable = useCallback((visible: boolean) => {
    if (visible) {
      if (syncingHideTimerRef.current) {
        clearTimeout(syncingHideTimerRef.current);
        syncingHideTimerRef.current = null;
      }
      setSyncingMore(true);
      return;
    }
    if (syncingHideTimerRef.current) clearTimeout(syncingHideTimerRef.current);
    syncingHideTimerRef.current = setTimeout(() => {
      syncingHideTimerRef.current = null;
      setSyncingMore(false);
    }, 400);
  }, []);

  const resetInboxListAuxCaches = useCallback(() => {
    inboxPlayerCacheRef.current.clear();
    inboxReverseBlockCheckedRef.current.clear();
    inboxReverseBlockedThemRef.current.clear();
    blockedByMeSetRef.current = null;
  }, []);

  /** Сохраняем имена/аватары из уже показанного списка при rebuild (не затираем при сбое сети). */
  const seedInboxPlayerCacheFromChats = useCallback(() => {
    for (const chat of chatsRef.current) {
      const p = chat.player;
      if (!p?.id) continue;
      const existing = inboxPlayerCacheRef.current.get(p.id);
      if (!existing) {
        inboxPlayerCacheRef.current.set(p.id, p);
      } else if (
        (p.name && p.name !== 'Пользователь' && (!existing.name || existing.name === 'Пользователь')) ||
        (p.avatar && !existing.avatar)
      ) {
        inboxPlayerCacheRef.current.set(p.id, { ...existing, name: p.name || existing.name, avatar: p.avatar || existing.avatar });
      }
    }
    seedPlayerAvatarUrls(chatsRef.current.map((c) => c.player).filter((p) => p?.id && p.avatar));
  }, []);

  /** Мгновенно поднимаем превью из AsyncStorage — без сетевых запросов. */
  const hydrateInboxFromCache = useCallback(async (): Promise<boolean> => {
    if (!inboxPreviewsCacheKey || chatsRef.current.length > 0) return false;
    try {
      const raw = await AsyncStorage.getItem(inboxPreviewsCacheKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { chats?: any[] } | null;
      const cached = Array.isArray(parsed?.chats) ? parsed!.chats : [];
      if (cached.length === 0) return false;
      const revived: ChatPreview[] = cached.map((c: any) => ({
        ...c,
        lastMessage: c.lastMessage
          ? {
              ...c.lastMessage,
              timestamp: new Date(c.lastMessage.timestamp),
            }
          : null,
      }));
      chatsRef.current = revived;
      setChats(revived);
      setInboxReady(true);
      return true;
    } catch {
      return false;
    }
  }, [inboxPreviewsCacheKey, currentUser?.id]);

  const rebuildChatPreviews = useCallback(
    async (options?: {
      includeDrafts?: boolean;
      skipReverseBlockCheck?: boolean;
      /** always — полное обновление; ifMore — только дополнение / правки без дергания */
      updateList?: 'always' | 'ifMore';
    }) => {
    if (!currentUser) {
      return;
    }
    const includeDrafts = options?.includeDrafts !== false;
    const skipReverseBlockCheck = options?.skipReverseBlockCheck === true;
    const conversations = conversationsAccRef.current;
    seedInboxPlayerCacheFromChats();
    try {
      const peerCount = Object.keys(conversations).length;
      if (__DEV__ && peerCount !== lastRebuildLogPeerCountRef.current) {
        lastRebuildLogPeerCountRef.current = peerCount;
        console.log(`📨 rebuildChatPreviews: диалогов в аккумуляторе ${peerCount}`);
      }

      // Важно: на больших аккаунтах rebuildChatPreviews вызывается много раз (пагинация),
      // поэтому блокировки кэшируем. Обновляем их только на "полной" сборке (includeDrafts),
      // т.к. это триггерится при первом построении и в конце drain.
      if (!blockedByMeSetRef.current || includeDrafts) {
        try {
          const blockedUsers = await withTimeout(
            getBlockedUsers(currentUser.id),
            8000,
            'inbox_blocked_users'
          );
          blockedByMeSetRef.current = new Set(blockedUsers);
        } catch {
          blockedByMeSetRef.current = blockedByMeSetRef.current ?? new Set<string>();
        }
      }
      const blockedSet = blockedByMeSetRef.current ?? new Set<string>();

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

      const peersNeedingFields = userIds.filter((id) => {
        const p = inboxPlayerCacheRef.current.get(id);
        return !p?.avatar || !p.name || p.name === 'Пользователь';
      });
      if (peersNeedingFields.length > 0) {
        const lightRows = await fetchPlayersInboxFieldsByIds(peersNeedingFields);
        lightRows.forEach((row, peerId) => {
          const cur = inboxPlayerCacheRef.current.get(peerId);
          const base = cur ?? placeholderPlayer(peerId);
          const nextName =
            row.name && row.name.trim() && row.name !== 'Пользователь'
              ? row.name
              : base.name;
          const nextAvatar = row.avatar || base.avatar;
          inboxPlayerCacheRef.current.set(peerId, {
            ...base,
            name: nextName,
            avatar: nextAvatar,
            status: row.status ?? base.status,
          });
          if (row.avatar && row.avatar !== base.avatar) {
            void avatarCache.setAvatar(peerId, row.avatar);
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
      if (!skipReverseBlockCheck && toVerifyReverse.length > 0) {
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
                    text: `✏️ ${draftText}`,
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
                text: `✏️ ${draftText}`,
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
      
      const updateMode = options?.updateList ?? 'merge';
      setChats((prev) =>
        applyInboxChatListUpdate(
          prev,
          chatPreviews,
          updateMode === 'ifMore' ? 'ifMore' : 'merge'
        )
      );
      if (inboxPreviewsCacheKey) {
        try {
          const snapshot = chatPreviews.map((c) => ({
            ...c,
            lastMessage: c.lastMessage
              ? {
                  ...c.lastMessage,
                  timestamp:
                    c.lastMessage.timestamp instanceof Date
                      ? c.lastMessage.timestamp.toISOString()
                      : c.lastMessage.timestamp,
                }
              : null,
          }));
          void AsyncStorage.setItem(inboxPreviewsCacheKey, JSON.stringify({ chats: snapshot })).catch(
            () => {}
          );
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки чатов:', error);
    }
  },
  [currentUser, inboxPreviewsCacheKey, seedInboxPlayerCacheFromChats]
  );

  const markInitialPaintDone = useCallback(() => {
    setInboxReady(true);
  }, []);

  /** Следующая пачка сообщений для фоновой догрузки. */
  const fetchNextInboxBatch = useCallback(
    async (gen: number): Promise<boolean> => {
      if (!currentUser || loadGenerationRef.current !== gen) return false;
      if (!hasMoreInboxRef.current || nextInboxPageRef.current == null) return false;

      let state = nextInboxPageRef.current;
      let batch: Awaited<ReturnType<typeof fetchInboxMessagesPage>> | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (loadGenerationRef.current !== gen) return false;
        try {
          batch = await withTimeout(
            fetchInboxMessagesPage(currentUser.id, state, INBOX_BG_BATCH_SIZE),
            INBOX_BG_BATCH_TIMEOUT_MS,
            'inbox_bg_batch'
          );
        } catch {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            continue;
          }
          return false;
        }
        if (!batch.error) break;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        return false;
      }

      if (!batch || loadGenerationRef.current !== gen) return false;
      if (!batch.rows.length) {
        hasMoreInboxRef.current = false;
        nextInboxPageRef.current = null;
        return false;
      }

      const freshIds = countNewRawMessageIdsInBatch(conversationsAccRef.current, batch.rows);
      if (freshIds === 0) {
        if (state.mode === 'cursor' && !inboxUseOffsetRef.current) {
          inboxUseOffsetRef.current = true;
          const loaded = Object.values(conversationsAccRef.current).reduce(
            (s, a) => s + a.length,
            0
          );
          const pageIndex = Math.max(1, Math.floor(loaded / INBOX_BG_BATCH_SIZE));
          nextInboxPageRef.current = { mode: 'offset', pageIndex };
          hasMoreInboxRef.current = true;
          return true;
        }
        if (state.mode === 'offset') {
          const nextPage = state.pageIndex + 1;
          if (nextPage > 300) {
            hasMoreInboxRef.current = false;
            nextInboxPageRef.current = null;
            return false;
          }
          nextInboxPageRef.current = { mode: 'offset', pageIndex: nextPage };
          hasMoreInboxRef.current = true;
          return true;
        }
        hasMoreInboxRef.current = false;
        nextInboxPageRef.current = null;
        return false;
      }

      conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
        currentUser.id,
        conversationsAccRef.current,
        batch.rows
      );
      nextInboxPageRef.current = batch.nextState;
      hasMoreInboxRef.current = batch.hasMore && batch.nextState != null;
      return hasMoreInboxRef.current;
    },
    [currentUser]
  );

  const runBackgroundInboxSync = useCallback(
    async (gen: number) => {
      if (!currentUser || bgSyncRunningRef.current) return;
      bgSyncRunningRef.current = true;
      setSyncingMoreStable(true);
      let batchesSinceRebuild = 0;
      let peersAtLastRebuild = Object.keys(conversationsAccRef.current).length;

      try {
        while (
          loadGenerationRef.current === gen &&
          hasMoreInboxRef.current &&
          nextInboxPageRef.current != null
        ) {
          const more = await fetchNextInboxBatch(gen);
          batchesSinceRebuild++;
          const peerCount = Object.keys(conversationsAccRef.current).length;

          if (
            !more ||
            batchesSinceRebuild >= INBOX_BG_REBUILD_EVERY ||
            peerCount - peersAtLastRebuild >= 10
          ) {
            await rebuildChatPreviews({
              includeDrafts: false,
              skipReverseBlockCheck: true,
              updateList: peerCount > peersAtLastRebuild ? 'always' : 'ifMore',
            });
            batchesSinceRebuild = 0;
            peersAtLastRebuild = peerCount;
          }

          if (!more) break;
          await new Promise<void>((r) => setTimeout(r, INBOX_BG_PAUSE_MS));
        }

        if (loadGenerationRef.current === gen) {
          await rebuildChatPreviews({ includeDrafts: true, updateList: 'always' });
        }
      } catch (e) {
        console.error('❌ Фоновая догрузка диалогов:', e);
      } finally {
        bgSyncRunningRef.current = false;
        if (loadGenerationRef.current === gen) {
          setSyncingMoreStable(false);
        }
      }
    },
    [currentUser, fetchNextInboxBatch, rebuildChatPreviews, setSyncingMoreStable]
  );

  const loadChatsData = useCallback(
    async (opts?: { silent?: boolean; forceReset?: boolean }) => {
      if (!currentUser) return;
      const silent = opts?.silent === true;
      const forceReset = opts?.forceReset === true;

      if (!silent) {
        loadGenerationRef.current += 1;
      }
      const myGen = loadGenerationRef.current;

      try {
        if (!silent) {
          await hydrateInboxFromCache();
          if (chatsRef.current.length > 0) {
            markInitialPaintDone();
          }
        }

        if (forceReset) {
          conversationsAccRef.current = {};
        }

        if (silent) {
          const silentRes = await withTimeout(
            fetchInboxMessagesPage(
              currentUser.id,
              { mode: 'cursor', cursor: null },
              INBOX_FIRST_BATCH_SIZE
            ),
            INBOX_FIRST_BATCH_TIMEOUT_MS,
            'inbox_silent_batch'
          );
          if (loadGenerationRef.current !== myGen) return;
          if (!silentRes.error && silentRes.rows.length) {
            conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
              currentUser.id,
              conversationsAccRef.current,
              silentRes.rows
            );
          }
          await rebuildChatPreviews({
            includeDrafts: false,
            skipReverseBlockCheck: true,
            updateList: 'ifMore',
          });
          if (hasMoreInboxRef.current && nextInboxPageRef.current && !bgSyncRunningRef.current) {
            void runBackgroundInboxSync(myGen);
          }
          return;
        }

        inboxUseOffsetRef.current = false;
        hasMoreInboxRef.current = true;
        nextInboxPageRef.current = { mode: 'cursor', cursor: null };

        let first: Awaited<ReturnType<typeof fetchInboxMessagesPage>>;
        try {
          first = await withTimeout(
            fetchInboxMessagesPage(
              currentUser.id,
              { mode: 'cursor', cursor: null },
              INBOX_FIRST_BATCH_SIZE
            ),
            INBOX_FIRST_BATCH_TIMEOUT_MS,
            'inbox_first_batch'
          );
        } catch (fetchErr) {
          console.warn('⚠️ Первая пачка не загрузилась, fallback getUserConversations:', fetchErr);
          try {
            const fallback = await withTimeout(
              getUserConversations(currentUser.id),
              60000,
              'inbox_fallback_full'
            );
            if (loadGenerationRef.current !== myGen) return;
            if (Object.keys(fallback).length > 0) {
              conversationsAccRef.current = fallback;
              hasMoreInboxRef.current = false;
              nextInboxPageRef.current = null;
            }
          } catch {
            /* оставляем кэш */
          }
          await rebuildChatPreviews({ includeDrafts: true, updateList: 'always' });
          markInitialPaintDone();
          return;
        }

        if (loadGenerationRef.current !== myGen) return;

        if (first.error || !first.rows.length) {
          try {
            const fallback = await withTimeout(
              getUserConversations(currentUser.id),
              60000,
              'inbox_fallback_full'
            );
            if (loadGenerationRef.current !== myGen) return;
            if (Object.keys(fallback).length > 0) {
              conversationsAccRef.current = fallback;
            }
          } catch {
            /* keep cache */
          }
          hasMoreInboxRef.current = false;
          nextInboxPageRef.current = null;
          await rebuildChatPreviews({ includeDrafts: true, updateList: 'always' });
          markInitialPaintDone();
          return;
        }

        conversationsAccRef.current = mergeRawMessageRowsIntoConversations(
          currentUser.id,
          forceReset ? {} : conversationsAccRef.current,
          first.rows
        );
        nextInboxPageRef.current = first.nextState;
        hasMoreInboxRef.current = first.hasMore && first.nextState != null;

        if (!hasMoreInboxRef.current && first.rows.length >= INBOX_FIRST_BATCH_SIZE) {
          const last = first.rows[first.rows.length - 1];
          if (last?.created_at != null && last?.id != null) {
            hasMoreInboxRef.current = true;
            nextInboxPageRef.current = {
              mode: 'cursor',
              cursor: {
                created_at:
                  typeof last.created_at === 'string'
                    ? last.created_at
                    : new Date(last.created_at).toISOString(),
                id: String(last.id),
              },
            };
          }
        }

        await rebuildChatPreviews({ includeDrafts: true, updateList: 'always' });
        markInitialPaintDone();

        if (hasMoreInboxRef.current && nextInboxPageRef.current) {
          void runBackgroundInboxSync(myGen);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки чатов:', error);
        markInitialPaintDone();
      }
    },
    [
      currentUser,
      rebuildChatPreviews,
      hydrateInboxFromCache,
      markInitialPaintDone,
      runBackgroundInboxSync,
    ]
  );

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

  // Загрузка чатов с индикатором и страховкой от «вечного» спиннера
  const loadChats = useCallback(async () => {
    try {
      await loadChatsData({ forceReset: true });
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadChatsData]);

  const inboxUserIdRef = useRef<string | null>(null);
  // Запускаем загрузку только когда пользователь авторизован
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (isUserLoading) return;

    if (!currentUser) {
      setInboxReady(true);
      hasLoadedOnceRef.current = false;
      inboxUserIdRef.current = null;
      return;
    }

    const userId = currentUser.id;
    const userChanged = inboxUserIdRef.current !== userId;
    if (userChanged) {
      inboxUserIdRef.current = userId;
      hasLoadedOnceRef.current = false;
      loadGenerationRef.current += 1;
      conversationsAccRef.current = {};
      chatsRef.current = [];
      resetInboxListAuxCaches();
      hasMoreInboxRef.current = true;
      nextInboxPageRef.current = { mode: 'cursor', cursor: null };
      inboxUseOffsetRef.current = false;
      bgSyncRunningRef.current = false;
      setSyncingMoreStable(false);
      setChats([]);
      setInboxReady(false);
    }

    let cancelled = false;
    void (async () => {
      const hadCache = await hydrateInboxFromCache();
      if (cancelled) return;

      const safetyTimer = setTimeout(() => {
        if (!cancelled) setInboxReady(true);
      }, INBOX_SPINNER_MAX_MS);

      try {
        if (hasLoadedOnceRef.current && chatsRef.current.length > 0 && !userChanged) {
          await loadChatsData({ silent: true });
        } else {
          await loadChatsData({ forceReset: false });
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки чатов:', err);
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) {
          setInboxReady(true);
          hasLoadedOnceRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, isUserLoading, loadChatsData, hydrateInboxFromCache, resetInboxListAuxCaches, setSyncingMoreStable]);

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
    }, 600);
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
              text: `✏️ ${draft.text}`,
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
      if (silentLoadDebounceRef.current) {
        clearTimeout(silentLoadDebounceRef.current);
      }
    };
  }, [currentUser, silentLoadChats]);

  useFocusEffect(
    React.useCallback(() => {
      registerTabScrollHandler('messages', () => {
        chatsListRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      return () => registerTabScrollHandler('messages', null);
    }, []),
  );

  // Обновляем список сообщений при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      setCurrentScreen('messages');
      let cancelled = false;
      void (async () => {
        await hydrateInboxFromCache();
        if (cancelled) return;
        applyDraftsToExistingChats();
        if (
          inboxReady &&
          hasMoreInboxRef.current &&
          nextInboxPageRef.current &&
          !bgSyncRunningRef.current
        ) {
          void runBackgroundInboxSync(loadGenerationRef.current);
        } else if (inboxReady && chatsRef.current.length > 0) {
          silentLoadChats();
        }
      })();

      return () => {
        cancelled = true;
        setCurrentScreen(null);
      };
    }, [
      silentLoadChats,
      setCurrentScreen,
      applyDraftsToExistingChats,
      hydrateInboxFromCache,
      inboxReady,
      runBackgroundInboxSync,
    ])
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
    !inboxReady ? (
      // Top-aligned: a centered column overflows upward under the fixed header.
      <View style={styles.skeletonContainer}>
        <SkeletonList rows={5} rowHeight={76} />
      </View>
    ) : (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="chatbubble-outline"
          title={t('messages.noMessages')}
          subtitle={t('messages.startConversation')}
        />
      </View>
    )
  ), [t, inboxReady]);

  const listFooterElement = useMemo(
    () =>
      syncingMore && chats.length > 0 ? (
        <View style={styles.chatsListFooter}>
          <ActivityIndicator color="#fa2f40" size="small" />
        </View>
      ) : null,
    [syncingMore, chats.length]
  );

  // Редирект убран - проверка авторизации происходит в _layout.tsx
  // Если пользователь не авторизован — не зависаем на вечной загрузке.
  // Важно: не рисовать карточку «Вход», когда вкладка не в фокусе —
  // иначе на mobile web при /ru/player/... она перекрывает профиль гостя.
  if (currentUser === null) {
    if (!isFocused) {
      return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
    }
    return (
      <CachedBackground 
        source={iceBg} 
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('messages.title')}</Text>
          </View>
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="person-circle-outline"
              title={t('auth.login') || 'Войти'}
              actionLabel={t('auth.login') || 'Войти'}
              onAction={() => router.push('/login')}
            />
          </View>
        </View>
      </CachedBackground>
    );
  }

  // Полноэкранная загрузка только пока грузится пользователь.
  if (isUserLoading) {
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
            <SkeletonList rows={7} rowHeight={76} topInset={52} />
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
          <View style={[styles.pageHeader, isDesktop && styles.pageHeaderInFlow]}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('messages.title')}</Text>
          </View>
          
          {/* Строка поиска */}
          <View style={[styles.searchContainer, isDesktop && styles.searchContainerInFlow]}>
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
            ref={chatsListRef}
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={keyExtractor}
            style={[styles.chatsContainer, isDesktop && styles.chatsContainerDesktop]}
            contentContainerStyle={filteredChats.length === 0 ? styles.emptyListContent : styles.chatsContent}
            ListEmptyComponent={ListEmptyComponent}
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
    backgroundColor: colors.scene,
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: colors.screenOverlay,
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
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
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
    backgroundColor: colors.headerBar,
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderInFlow: {
    position: 'relative',
    zIndex: 1,
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
    paddingTop: 100, // Небольшой зазор под строкой поиска, чтобы список не налезал на неё
  },
  chatsContainerDesktop: {
    paddingTop: 0,
  },
  chatsContent: {
    paddingVertical: 0,
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
  skeletonContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  emptyContent: {
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
    borderRadius: 15,
    padding: 20, // Уменьшили с 40 до 20 (в 2 раза)
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  chatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  chatSeparator: {
    position: 'absolute',
    left: 82,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(210, 210, 210, 0.38)',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    marginTop: 2,
  },
  chatInfo: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  chatName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    lineHeight: 18,
  },
  chatTime: {
    color: 'rgba(180, 180, 180, 0.9)',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 14,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  chatLastMessage: {
    color: 'rgba(180, 180, 180, 0.9)',
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
    marginRight: 8,
    lineHeight: 16,
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
    color: 'rgba(250, 47, 64, 0.6)',
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 13,
    marginTop: 1,
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
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
  },
  searchContainerInFlow: {
    position: 'relative',
    top: 0,
    zIndex: 1,
  },
  searchInputBlur: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 26, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    height: 44,
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
      <View style={styles.chatItem}>
        <CachedAvatar
          playerId={chat.player.id}
          fallbackAvatarUrl={chat.player.avatar}
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
                ? t('profile.scout') || 'Scout'
                : displayName(chat.player.name)}
            </Text>
            {chat.lastMessage ? (
              <Text style={styles.chatTime}>{formatTime(chat.lastMessage.timestamp)}</Text>
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

          <View style={styles.chatPreview}>
            <Text style={styles.chatLastMessage} numberOfLines={2}>
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
        </View>
        <View pointerEvents="none" style={styles.chatSeparator} />
      </View>
    </TouchableOpacity>
  );
}, areMessagesChatRowPropsEqual);
