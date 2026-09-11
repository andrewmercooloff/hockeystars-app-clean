export type ProfileReactionType = 'respect' | 'like' | 'strength' | 'high_five';
export type FeedReactionType = 'respect' | 'fire' | 'strength' | 'lightning';

export const PROFILE_REACTIONS: readonly {
  type: ProfileReactionType;
  emoji: string;
  labelKey: string;
}[] = [
  { type: 'respect', emoji: '🤜🏻🤛🏻', labelKey: 'reactions.respect' },
  { type: 'like', emoji: '👍🏻', labelKey: 'reactions.like' },
  { type: 'strength', emoji: '💪🏻', labelKey: 'reactions.strength' },
  { type: 'high_five', emoji: '✋🏻', labelKey: 'reactions.highFive' },
];

export const FEED_REACTIONS: readonly {
  type: FeedReactionType;
  emoji: string;
  labelKey: string;
}[] = [
  { type: 'respect', emoji: '🤜🏻🤛🏻', labelKey: 'reactions.respect' },
  { type: 'fire', emoji: '🔥', labelKey: 'reactions.fire' },
  { type: 'strength', emoji: '💪🏻', labelKey: 'reactions.strength' },
  { type: 'lightning', emoji: '⚡️', labelKey: 'reactions.lightning' },
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
  'photo_added',
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

export function profileReactionEmoji(type: ProfileReactionType): string {
  return PROFILE_REACTIONS.find((r) => r.type === type)?.emoji ?? '👍🏻';
}

export function feedReactionEmoji(type: FeedReactionType): string {
  return FEED_REACTIONS.find((r) => r.type === type)?.emoji ?? '🔥';
}
