import { supabase } from '../utils/supabase';
import { createNotification, getPlayerById } from '../utils/playerStorage';
import { getUserLanguage, loadTranslations } from '../utils/languageHelper';
import { sendNotificationToUser } from '../utils/notificationService';
import {
  type FeedReactionType,
  type ProfileReactionType,
  type ProfileReactionSummary,
  type FeedReactionSummary,
  type ReactionSender,
  REACTION_GROUP_WINDOW_MS,
  emptyProfileReactionSummary,
  emptyFeedReactionSummary,
  profileReactionEmoji,
  feedReactionEmoji,
} from '../utils/reactions';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isMissingTableError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '');
  return msg.includes('does not exist') || msg.includes('42P01') || msg.includes('profile_reactions');
}

async function bumpUnreadCount(userId: string): Promise<void> {
  try {
    await supabase.rpc('increment_unread_notifications', { user_id: userId });
  } catch {
    /* ignore */
  }
}

function buildProfileReactionMessage(
  senderName: string,
  reactionTypes: ProfileReactionType[],
  t: Record<string, unknown> | null
): string {
  const reactions = (t?.reactions as Record<string, string> | undefined) ?? {};
  const labels = reactionTypes.map((type) => {
    const key =
      type === 'high_five' ? 'highFive' : type === 'respect' ? 'respect' : type;
    return profileReactionEmoji(type) + ' ' + (reactions[key] || type);
  });
  const template =
    (t?.notifications as Record<string, Record<string, string>> | undefined)?.profile_reaction
      ?.messageGrouped ||
    '{name} sent {reactions}';
  return template.replace('{name}', senderName).replace('{reactions}', labels.join(', '));
}

function buildActivityReactionMessage(
  senderName: string,
  reactionType: FeedReactionType,
  t: Record<string, unknown> | null
): string {
  const reactions = (t?.reactions as Record<string, string> | undefined) ?? {};
  const key =
    reactionType === 'lightning' ? 'lightning' : reactionType === 'fire' ? 'fire' : reactionType;
  const label = reactions[key] || reactionType;
  const template =
    (t?.notifications as Record<string, Record<string, string>> | undefined)?.activity_reaction
      ?.message ||
    '{name} reacted {emoji} to your update';
  return template
    .replace('{name}', senderName)
    .replace('{emoji}', feedReactionEmoji(reactionType))
    .replace('{reaction}', label);
}

async function notifyProfileReactionGrouped(
  targetPlayerId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  reactionType: ProfileReactionType
): Promise<void> {
  if (targetPlayerId === senderId) return;

  const lang = await getUserLanguage(targetPlayerId);
  const t = loadTranslations(lang);
  const since = new Date(Date.now() - REACTION_GROUP_WINDOW_MS).toISOString();

  const { data: existing } = await supabase
    .from('notifications')
    .select('id, data')
    .eq('user_id', targetPlayerId)
    .eq('type', 'profile_reaction')
    .eq('is_read', false)
    .gte('created_at', since)
    .filter('data->>senderId', 'eq', senderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const reactions: ProfileReactionType[] = existing?.data?.reactions?.length
    ? [...existing.data.reactions]
    : [];
  if (!reactions.includes(reactionType)) {
    reactions.push(reactionType);
  }

  const title =
    (t?.notifications as Record<string, Record<string, string>> | undefined)?.profile_reaction
      ?.title || 'New reaction';
  const message = buildProfileReactionMessage(senderName, reactions, t);

  if (existing?.id) {
    await supabase
      .from('notifications')
      .update({
        message,
        data: {
          ...existing.data,
          senderId,
          senderName,
          senderAvatar,
          reactions,
          lastReactionType: reactionType,
        },
      })
      .eq('id', existing.id);
    return;
  }

  await createNotification({
    id: generateUUID(),
    user_id: targetPlayerId,
    type: 'profile_reaction',
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
    data: {
      senderId,
      senderName,
      senderAvatar,
      reactions: [reactionType],
      lastReactionType: reactionType,
    },
  });
  await bumpUnreadCount(targetPlayerId);

  try {
    await sendNotificationToUser(targetPlayerId, title, message, {
      type: 'profile_reaction',
      player_id: senderId,
      action: 'open_player',
      deepLink: `/player/${senderId}`,
    });
  } catch {
    /* ignore push errors */
  }
}

async function notifyActivityReaction(
  recipientId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  reactionType: FeedReactionType,
  sourceNotificationId: string,
  sourceNotificationType: string
): Promise<void> {
  if (recipientId === senderId) return;

  const lang = await getUserLanguage(recipientId);
  const t = loadTranslations(lang);
  const title =
    (t?.notifications as Record<string, Record<string, string>> | undefined)?.activity_reaction
      ?.title || 'Reaction to your update';
  const message = buildActivityReactionMessage(senderName, reactionType, t);

  await createNotification({
    id: generateUUID(),
    user_id: recipientId,
    type: 'activity_reaction',
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
    data: {
      senderId,
      senderName,
      senderAvatar,
      reactionType,
      sourceNotificationId,
      sourceNotificationType,
    },
  });
  await bumpUnreadCount(recipientId);

  try {
    await sendNotificationToUser(recipientId, title, message, {
      type: 'activity_reaction',
      player_id: senderId,
      action: 'open_player',
      deepLink: `/player/${senderId}`,
    });
  } catch {
    /* ignore */
  }
}

export async function loadProfileReactions(
  targetPlayerId: string,
  viewerId?: string | null
): Promise<ProfileReactionSummary> {
  const summary = emptyProfileReactionSummary();
  if (!targetPlayerId) return summary;

  try {
    const { data, error } = await supabase
      .from('profile_reactions')
      .select('reaction_type, sender_id, created_at')
      .eq('target_player_id', targetPlayerId);

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('loadProfileReactions:', error.message);
      }
      return summary;
    }

    const senderIds = [...new Set((data ?? []).map((row) => row.sender_id).filter(Boolean))];
    const senderMap = new Map<string, ReactionSender>();

    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('players')
        .select('id, name, avatar')
        .in('id', senderIds);
      for (const sender of senders ?? []) {
        senderMap.set(sender.id, sender);
      }
    }

    for (const row of data ?? []) {
      const type = row.reaction_type as ProfileReactionType;
      if (!(type in summary.counts)) continue;
      summary.counts[type] += 1;
      if (viewerId && row.sender_id === viewerId) {
        summary.mine.add(type);
      }
      const sender = senderMap.get(row.sender_id);
      if (sender?.id) {
        summary.sendersByType[type].push({
          id: sender.id,
          name: sender.name,
          avatar: sender.avatar,
        });
      }
    }
  } catch (e) {
    if (!isMissingTableError(e)) {
      console.warn('loadProfileReactions failed:', e);
    }
  }

  return summary;
}

export async function toggleProfileReaction(
  targetPlayerId: string,
  senderId: string,
  reactionType: ProfileReactionType
): Promise<ProfileReactionSummary | null> {
  if (!targetPlayerId || !senderId || targetPlayerId === senderId) return null;

  try {
    const { data: existing } = await supabase
      .from('profile_reactions')
      .select('id')
      .eq('target_player_id', targetPlayerId)
      .eq('sender_id', senderId)
      .eq('reaction_type', reactionType)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('profile_reactions').delete().eq('id', existing.id);
      return loadProfileReactions(targetPlayerId, senderId);
    }

    await supabase.from('profile_reactions').insert({
      target_player_id: targetPlayerId,
      sender_id: senderId,
      reaction_type: reactionType,
    });

    const sender = await getPlayerById(senderId);
    if (sender) {
      await notifyProfileReactionGrouped(
        targetPlayerId,
        senderId,
        sender.name,
        sender.avatar,
        reactionType
      );
    }

    return loadProfileReactions(targetPlayerId, senderId);
  } catch (e) {
    if (isMissingTableError(e)) {
      console.warn('profile_reactions table missing — run database/create_reactions_tables.sql');
    } else {
      console.error('toggleProfileReaction:', e);
    }
    return null;
  }
}

export async function loadFeedReactions(
  notificationId: string,
  viewerId?: string | null
): Promise<FeedReactionSummary> {
  const summary = emptyFeedReactionSummary();
  if (!notificationId) return summary;

  try {
    const { data, error } = await supabase
      .from('notification_reactions')
      .select('reaction_type, sender_id')
      .eq('notification_id', notificationId);

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn('loadFeedReactions:', error.message);
      }
      return summary;
    }

    for (const row of data ?? []) {
      const type = row.reaction_type as FeedReactionType;
      summary.counts[type] += 1;
      if (viewerId && row.sender_id === viewerId) {
        summary.mine = type;
      }
    }
  } catch (e) {
    if (!isMissingTableError(e)) {
      console.warn('loadFeedReactions failed:', e);
    }
  }

  return summary;
}

export async function setFeedReaction(
  notificationId: string,
  senderId: string,
  reactionType: FeedReactionType,
  recipientId: string,
  sourceNotificationType: string
): Promise<FeedReactionSummary | null> {
  if (!notificationId || !senderId || !recipientId || senderId === recipientId) return null;

  try {
    const { data: existing } = await supabase
      .from('notification_reactions')
      .select('id, reaction_type')
      .eq('notification_id', notificationId)
      .eq('sender_id', senderId)
      .maybeSingle();

    if (existing?.id && existing.reaction_type === reactionType) {
      await supabase.from('notification_reactions').delete().eq('id', existing.id);
      return loadFeedReactions(notificationId, senderId);
    }

    const isNewReaction = !existing?.id;

    if (existing?.id) {
      await supabase
        .from('notification_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existing.id);
    } else {
      await supabase.from('notification_reactions').insert({
        notification_id: notificationId,
        sender_id: senderId,
        reaction_type: reactionType,
      });
    }

    if (isNewReaction) {
      const sender = await getPlayerById(senderId);
      if (sender) {
        await notifyActivityReaction(
          recipientId,
          senderId,
          sender.name,
          sender.avatar,
          reactionType,
          notificationId,
          sourceNotificationType
        );
      }
    }

    return loadFeedReactions(notificationId, senderId);
  } catch (e) {
    if (isMissingTableError(e)) {
      console.warn('notification_reactions table missing — run database/create_reactions_tables.sql');
    } else {
      console.error('setFeedReaction:', e);
    }
    return null;
  }
}
