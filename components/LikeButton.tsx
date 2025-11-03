import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  addLike, 
  removeLike, 
  checkIfLiked, 
  getLikesForContent,
  Like 
} from '../utils/likesService';
import { loadCurrentUser } from '../utils/playerStorage';

interface LikeButtonProps {
  playerId: string;
  contentId: string;
  contentType: 'video' | 'photo';
  size?: 'small' | 'medium' | 'large';
}

export default function LikeButton({
  playerId,
  contentId,
  contentType,
  size = 'medium',
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [playerId, contentId, contentType]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Получаем текущего пользователя
      const user = await loadCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);

      // Проверяем, лайкнул ли пользователь
      const liked = await checkIfLiked(contentId, contentType, user.id);
      setIsLiked(liked);

      // Получаем количество лайков
      const likes = await getLikesForContent(contentId, contentType);
      setLikesCount(likes.length);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных лайка:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUserId || isToggling) {
      return;
    }

    try {
      setIsToggling(true);
      
      // Оптимистичное обновление UI - сразу меняем состояние
      const wasLiked = isLiked;
      const previousCount = likesCount;
      
      if (isLiked) {
        // Оптимистично обновляем UI
        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // Оптимистично обновляем UI
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      
      if (wasLiked) {
        // Удаляем лайк
        const result = await removeLike(contentId, contentType, currentUserId);
        if (!result.success) {
          // Откатываем изменения при ошибке
          setIsLiked(true);
          setLikesCount(previousCount);
          console.error('❌ Ошибка удаления лайка:', result.error);
        }
      } else {
        // Добавляем лайк
        const result = await addLike(playerId, contentId, contentType, currentUserId);
        if (!result.success) {
          // Откатываем изменения при ошибке
          setIsLiked(false);
          setLikesCount(previousCount);
          console.error('❌ Ошибка добавления лайка:', result.error);
        } else {
          // Обновляем счетчик из реальных данных для точности
          const likes = await getLikesForContent(contentId, contentType);
          setLikesCount(likes.length);
        }
      }
    } catch (error) {
      // Откатываем изменения при ошибке
      setIsLiked(!isLiked);
      setLikesCount((prev) => isLiked ? prev + 1 : Math.max(0, prev - 1));
      console.error('❌ Ошибка при переключении лайка:', error);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FF4444" />
      </View>
    );
  }

  const iconSize = size === 'small' ? 18 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <TouchableOpacity
      style={[styles.container, styles[size]]}
      onPress={handleToggleLike}
      disabled={isToggling || !currentUserId}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isLiked ? 'heart' : 'heart-outline'}
        size={iconSize}
        color={isLiked ? '#FF4444' : '#fff'}
      />
      {likesCount > 0 && (
        <Text style={[styles.count, { fontSize }]}>{likesCount}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  large: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  count: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
    minWidth: 16,
    textAlign: 'center',
  },
});

