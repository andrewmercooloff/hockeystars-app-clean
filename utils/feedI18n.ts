/**
 * Строки ленты, добавленные в редизайне (фильтры, разделители дат, групповые лайки).
 * ru / en, остальные языки — en.
 */
type Dict = {
  filters: Record<string, string>;
  sections: { today: string; yesterday: string; week: string; earlier: string };
  likes: {
    andMore: (n: number) => string;
    likedPhoto: string;
    likedVideo: string;
    likedPhotoMany: string;
    likedVideoMany: string;
  };
};

const ru: Dict = {
  filters: { all: 'Все', media: 'Медиа', friends: 'Друзья', gifts: 'Подарки', stats: 'Статы', exercises: 'Скиллы' },
  sections: { today: 'Сегодня', yesterday: 'Вчера', week: 'На этой неделе', earlier: 'Ранее' },
  likes: {
    andMore: n => `и ещё ${n}`,
    likedPhoto: 'оценил(а) ваше фото',
    likedVideo: 'оценил(а) ваше видео',
    likedPhotoMany: 'оценили ваше фото',
    likedVideoMany: 'оценили ваше видео',
  },
};

const en: Dict = {
  filters: { all: 'All', media: 'Media', friends: 'Friends', gifts: 'Gifts', stats: 'Stats', exercises: 'Skills' },
  sections: { today: 'Today', yesterday: 'Yesterday', week: 'This week', earlier: 'Earlier' },
  likes: {
    andMore: n => `and ${n} more`,
    likedPhoto: 'liked your photo',
    likedVideo: 'liked your video',
    likedPhotoMany: 'liked your photo',
    likedVideoMany: 'liked your video',
  },
};

export function feedStrings(language?: string): Dict {
  return language === 'ru' ? ru : en;
}

export type FeedSectionKey = 'today' | 'yesterday' | 'week' | 'earlier';

export function sectionKeyFor(ts: number, now = Date.now()): FeedSectionKey {
  const d = new Date(ts);
  const n = new Date(now);
  const startToday = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  const startYesterday = startToday - 86400000;
  const startWeek = startToday - 6 * 86400000;
  const t = d.getTime();
  if (t >= startToday) return 'today';
  if (t >= startYesterday) return 'yesterday';
  if (t >= startWeek) return 'week';
  return 'earlier';
}
