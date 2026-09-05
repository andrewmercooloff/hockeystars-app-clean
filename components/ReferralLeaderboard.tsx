import React, { useCallback, useEffect, useState } from 'react';
import { displayName } from '../utils/displayName';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { buildPlayerPath } from '../utils/playerSeoPath';
import { getReferralLeaderboard, ReferralLeaderboardEntry } from '../utils/playerStorage';
import CachedAvatar from './CachedAvatar';
import { useLanguage } from '../contexts/LanguageContext';

interface ReferralLeaderboardProps {
  limit?: number;
  showTitle?: boolean;
}

const ReferralLeaderboard: React.FC<ReferralLeaderboardProps> = ({ 
  limit = 10,
  showTitle = true 
}) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await getReferralLeaderboard(limit);
      setLeaderboard(data);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0: return { name: 'medal', color: '#FFD700' }; // Золото
      case 1: return { name: 'medal', color: '#C0C0C0' }; // Серебро
      case 2: return { name: 'medal', color: '#CD7F32' }; // Бронза
      default: return null;
    }
  };

  const renderItem = useCallback(({ item, index }: { item: ReferralLeaderboardEntry; index: number }) => {
    const medal = getMedalIcon(index);
    
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(buildPlayerPath(item.id) as any)}
        activeOpacity={0.7}
      >
        {/* Позиция */}
        <View style={styles.positionContainer}>
          {medal ? (
            <Ionicons name={medal.name as any} size={24} color={medal.color} />
          ) : (
            <Text style={styles.positionText}>{index + 1}</Text>
          )}
        </View>

        {/* Аватар */}
        <CachedAvatar
          playerId={item.id}
          fallbackAvatarUrl={item.avatar || undefined}
          size={50}
          style={styles.avatar}
          status={item.status}
        />

        {/* Информация */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName(item.name)}
          </Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              👥 {item.invited_count} • 
              {item.invited_stars > 0 && ` ⭐${item.invited_stars}`}
              {item.invited_coaches > 0 && ` 👨‍🏫${item.invited_coaches}`}
              {item.invited_players > 0 && ` 🏒${item.invited_players}`}
            </Text>
          </View>
        </View>

        {/* Баллы */}
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{item.referral_points}</Text>
          <Text style={styles.pointsLabel}>{t('referral.points') || 'баллов'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [router, t]);

  const referralKeyExtractor = useCallback((item: ReferralLeaderboardEntry) => item.id, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa2f40" />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="#8a8a92" />
        <Text style={styles.emptyText}>
          {t('referral.noInvites') || 'Пока никто не пригласил друзей'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.title}>
            {t('referral.leaderboard') || 'Топ приглашающих'}
          </Text>
        </View>
      )}

      <View style={styles.pointsInfo}>
        <Text style={styles.pointsInfoText}>
          🏒 +1 • 👨‍🏫 +5 • ⭐ +10
        </Text>
      </View>

      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={referralKeyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fa2f40"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#8a8a92',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  pointsInfo: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  pointsInfoText: {
    color: '#888',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  positionContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#888',
  },
  avatar: {
    marginHorizontal: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#888',
  },
  pointsContainer: {
    alignItems: 'center',
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },
  pointsValue: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  pointsLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default ReferralLeaderboard;
