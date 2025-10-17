import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActivityPoints, ActivityPoints } from '../services/activityService';
import { useLanguage } from '../contexts/LanguageContext';

interface ActivityRatingProps {
  userId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  style?: any;
  refreshKey?: number; // Добавляем refreshKey для принудительного обновления
}

export default function ActivityRating({ 
  userId, 
  currentUserId, 
  isAdmin = false, 
  style,
  refreshKey 
}: ActivityRatingProps) {
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  // Показываем рейтинг только владельцу профиля или администратору
  const shouldShowRating = currentUserId === userId || isAdmin;

  useEffect(() => {
    if (!shouldShowRating) return;

    const loadActivityPoints = async () => {
      try {
        setLoading(true);
        const result = await getActivityPoints(userId);
        
        if (result.success) {
          setPoints(result.points);
        } else {
          setError(result.error || 'Failed to load activity points');
        }
      } catch (err) {
        setError('Unexpected error loading activity points');
        console.error('Error loading activity points:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivityPoints();
  }, [userId, shouldShowRating, refreshKey]); // Добавляем refreshKey в зависимости

  if (!shouldShowRating) {
    return null;
  }

  // Убираем индикатор загрузки - показываем сразу с 0 очками
  // if (loading) {
  //   return (
  //     <View style={[styles.container, style]}>
  //       <ActivityIndicator size="small" color="#FFD700" />
  //     </View>
  //   );
  // }

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
    backgroundColor: '#FF4444',
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
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
  },
});
