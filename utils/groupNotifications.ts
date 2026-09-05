export type GroupableNotification = {
  type: string;
  timestamp: number;
  playerId?: string;
  data?: any;
  groupCount?: number;
};

const LIKE_WINDOW_MS = 60 * 60 * 1000;
/** Лайки одного и того же контента схлопываем за сутки */
const LIKE_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export type FeedLiker = { id: string; name: string; avatar?: string };

const likerOf = (n: GroupableNotification): FeedLiker => ({
  id: String(n.data?.likedByUserId || n.data?.likedByUser || ''),
  name: String(n.data?.likedByName || n.data?.likedByUserName || ''),
  avatar: n.data?.likedByAvatar,
});

const tsOf = (n: GroupableNotification): number => {
  const t = n.timestamp;
  return typeof t === 'number' && !isNaN(t) ? t : 0;
};

const actorId = (n: GroupableNotification): string =>
  String(
    n.data?.changedPlayerId ||
      n.data?.playerId ||
      n.playerId ||
      n.data?.likedByUserId ||
      n.data?.likedByUser ||
      '',
  );

/**
 * Схлопывает спам в ленте:
 * — avatar_changed / puck_speed / physical: одно на игрока (самое новое);
 * — лайки одного человека за час — одна строка с groupCount;
 * — фото/видео одного игрока за час — одна карточка с суммой.
 * Список ожидается уже отсортированным (новые сверху).
 */
export function groupFeedNotifications<T extends GroupableNotification>(list: T[]): T[] {
  const out: T[] = [];
  const latestOnly = new Set<string>();
  const buckets = new Map<string, number>();

  for (const n of list) {
    if (n.type === 'avatar_changed' || n.type === 'puck_speed_changed' || n.type === 'physical_data_changed') {
      const key = `${n.type}|${actorId(n)}`;
      if (latestOnly.has(key)) continue;
      latestOnly.add(key);
      out.push(n);
      continue;
    }

    if (n.type === 'photo_liked' || n.type === 'video_liked') {
      const who = String(n.data?.likedByUserId || n.data?.likedByUser || n.data?.likedByName || '');
      const content = String(n.data?.contentId || '');
      // Группируем по контенту (разные люди лайкнули одно фото); без contentId — по лайкнувшему
      const key = content ? `${n.type}|c:${content}` : `${n.type}|u:${who}`;
      const liker = {
        id: who,
        name: String(n.data?.likedByName || n.data?.likedByUserName || ''),
        avatar: n.data?.likedByAvatar as string | undefined,
      };
      const prevIdx = buckets.get(key);
      if (prevIdx != null) {
        const prev = out[prevIdx];
        if (Math.abs(tsOf(prev) - tsOf(n)) <= LIKE_GROUP_WINDOW_MS) {
          const likers: typeof liker[] = prev.data?.likers ? [...prev.data.likers] : [likerOf(prev)];
          if (!likers.some(l => l.id && l.id === liker.id)) likers.push(liker);
          out[prevIdx] = {
            ...prev,
            groupCount: (prev.groupCount ?? 1) + 1,
            data: { ...prev.data, likers },
          };
          continue;
        }
      }
      buckets.set(key, out.length);
      out.push({ ...n, data: { ...n.data, likers: [liker] } });
      continue;
    }

    if (n.type === 'photo_added' || n.type === 'video_added') {
      const key = `${n.type}|${actorId(n)}`;
      const prevIdx = buckets.get(key);
      if (prevIdx != null) {
        const prev = out[prevIdx];
        if (Math.abs(tsOf(prev) - tsOf(n)) <= LIKE_WINDOW_MS) {
          const countField = n.type === 'photo_added' ? 'addedPhotosCount' : 'addedVideosCount';
          const urlsField = n.type === 'photo_added' ? 'photoUrls' : 'videoUrls';
          const prevCount = prev.data?.[countField] || 1;
          const addCount = n.data?.[countField] || 1;
          const prevUrls: string[] = prev.data?.[urlsField] || [];
          const addUrls: string[] = n.data?.[urlsField] || [];
          const urls = [...prevUrls];
          for (const u of addUrls) {
            if (u && !urls.includes(u)) urls.push(u);
          }
          out[prevIdx] = {
            ...prev,
            data: {
              ...prev.data,
              [countField]: prevCount + addCount,
              [urlsField]: urls,
            },
          };
          continue;
        }
      }
      buckets.set(key, out.length);
      out.push(n);
      continue;
    }

    out.push(n);
  }

  return out;
}
