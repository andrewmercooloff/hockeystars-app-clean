import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActivityPoints } from '../services/activityService';
import { CURRENT_SEASON_KEY, formatSeasonLabel } from '../utils/seasonConfig';

interface ActivityRatingProps {
  userId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  style?: any;
  refreshKey?: number;
}

export default function ActivityRating({
  userId,
  currentUserId,
  isAdmin = false,
  style,
  refreshKey,
}: ActivityRatingProps) {
  const [points, setPoints] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const shouldShowRating = currentUserId === userId || isAdmin;

  useEffect(() => {
    if (!shouldShowRating) return;

    const loadActivityPoints = async () => {
      try {
        const result = await getActivityPoints(userId);
        if (result.success) {
          setPoints(result.points);
        } else {
          setError(result.error || 'Failed to load activity points');
        }
      } catch (err) {
        setError('Unexpected error loading activity points');
        console.error('Error loading activity points:', err);
      }
    };

    void loadActivityPoints();
  }, [userId, shouldShowRating, refreshKey]);

  if (!shouldShowRating) {
    return null;
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>⚠️</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={8} color="#FFFFFF" />
        <Text style={styles.pointsText}>{points}</Text>
      </View>
      <Text style={styles.seasonHint}>{formatSeasonLabel(CURRENT_SEASON_KEY)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 1,
  },
  seasonHint: {
    marginTop: 2,
    alignSelf: 'flex-end',
    fontSize: 7,
    fontFamily: 'Gilroy-Bold',
    color: 'rgba(255,255,255,0.55)',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
  },
});
