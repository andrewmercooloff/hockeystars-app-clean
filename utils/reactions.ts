export type ProfileReactionType = 'respect' | 'like' | 'strength' | 'high_five';
export type FeedReactionType = 'respect' | 'fire' | 'strength' | 'lightning';

/** All profile reaction types (incl. legacy) — for emoji lookup in notifications. */
export const PROFILE_REACTION_META: Record<
  ProfileReactionType,
  { emoji: string; labelKey: string }
> = {
  respect: { emoji: '🤜🏻🤛🏻', labelKey: 'reactions.respect' },
  like: { emoji: '👍🏻', labelKey: 'reactions.like' },
  strength: { emoji: '💪🏻', labelKey: 'reactions.strength' },
  high_five: { emoji: '👋🏻', labelKey: 'reactions.highFive' },
};

/** Reactions shown on player profile (respect + hello). */
export const PROFILE_REACTIONS: readonly {
  type: ProfileReactionType;
  emoji: string;
  labelKey: string;
}[] = (['respect', 'high_five'] as const).map((type) => ({
  type,
  ...PROFILE_REACTION_META[type],
}));

export const FEED_REACTIONS: readonly {
  type: FeedReactionType;
  emoji: string;
  labelKey: string;
}[] = [
  { type: 'respect', emoji: '🤜🏻🤛🏻', labelKey: 'reactions.respect' },
  { type: 'fire', emoji: '🔥', labelKey: 'reactions.fire' },
  { type: 'strength', emoji: '💪🏻', labelKey: 'reactions.strength' },
];

export type ReactionSender = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type ProfileReactionSummary = {
  counts: Record<ProfileReactionType, number>;
  mine: Set<ProfileReactionType>;
  sendersByType: Record<ProfileReactionType, ReactionSender[]>;
};

export type FeedReactionSummary = {
  counts: Record<FeedReactionType, number>;
  mine: FeedReactionType | null;
};

export function totalProfileReactionCount(
  summary: Pick<ProfileReactionSummary, 'counts'>
): number {
  return (
    summary.counts.respect +
    summary.counts.like +
    summary.counts.strength +
    summary.counts.high_five
  );
}

export const REACTION_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Activity notifications that show compact reaction bar. */
export const REACTABLE_NOTIFICATION_TYPES = new Set([
  'stats_change',
  'normative_changed',
  'physical_data_changed',
  'puck_speed_changed',
  'achievement_added',
  'achievement',
  'scout_report',
  'video_added',
  'avatar_changed',
  'cover_changed',
  'exercise_completed',
  'game_first_place',
  'quiz_first_place',
]);

export function emptyProfileReactionSummary(): ProfileReactionSummary {
  return {
    counts: { respect: 0, like: 0, strength: 0, high_five: 0 },
    mine: new Set(),
    sendersByType: { respect: [], like: [], strength: [], high_five: [] },
  };
}

export function emptyFeedReactionSummary(): FeedReactionSummary {
  return {
    counts: { respect: 0, fire: 0, strength: 0, lightning: 0 },
    mine: null,
  };
}

export const EMPTY_FEED_REACTION_SUMMARY: FeedReactionSummary = {
  counts: { respect: 0, fire: 0, strength: 0, lightning: 0 },
  mine: null,
};

export function profileReactionEmoji(type: ProfileReactionType): string {
  return PROFILE_REACTION_META[type]?.emoji ?? '👍🏻';
}

export function feedReactionEmoji(type: FeedReactionType): string {
  return FEED_REACTIONS.find((r) => r.type === type)?.emoji ?? '🔥';
}

function cloneProfileSummary(summary: ProfileReactionSummary): ProfileReactionSummary {
  return {
    counts: { ...summary.counts },
    mine: new Set(summary.mine),
    sendersByType: {
      respect: [...summary.sendersByType.respect],
      like: [...summary.sendersByType.like],
      strength: [...summary.sendersByType.strength],
      high_five: [...summary.sendersByType.high_five],
    },
  };
}

export function optimisticToggleProfileReaction(
  summary: ProfileReactionSummary,
  reactionType: ProfileReactionType,
  viewerId: string,
  viewer?: ReactionSender | null
): ProfileReactionSummary {
  const next = cloneProfileSummary(summary);
  const had = next.mine.has(reactionType);

  if (had) {
    next.mine.delete(reactionType);
    next.counts[reactionType] = Math.max(0, next.counts[reactionType] - 1);
    next.sendersByType[reactionType] = next.sendersByType[reactionType].filter(
      (s) => s.id !== viewerId
    );
    return next;
  }

  next.mine.add(reactionType);
  next.counts[reactionType] += 1;
  if (viewer?.id) {
    const exists = next.sendersByType[reactionType].some((s) => s.id === viewer.id);
    if (!exists) {
      next.sendersByType[reactionType].push(viewer);
    }
  }
  return next;
}

export function optimisticSetFeedReaction(
  summary: FeedReactionSummary,
  reactionType: FeedReactionType
): FeedReactionSummary {
  const next: FeedReactionSummary = {
    counts: { ...summary.counts },
    mine: summary.mine,
  };

  if (next.mine === reactionType) {
    next.counts[reactionType] = Math.max(0, next.counts[reactionType] - 1);
    next.mine = null;
    return next;
  }

  if (next.mine) {
    next.counts[next.mine] = Math.max(0, next.counts[next.mine] - 1);
  }

  next.mine = reactionType;
  next.counts[reactionType] += 1;
  return next;
}
