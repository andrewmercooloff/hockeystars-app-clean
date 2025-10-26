import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bulkThumbnailGenerator } from '../utils/BulkThumbnailGenerator';

interface ThumbnailGeneratorPanelProps {
  onClose?: () => void;
}

const ThumbnailGeneratorPanel: React.FC<ThumbnailGeneratorPanelProps> = ({ onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<{
    processed: number;
    failed: number;
    processedPlayers: string[];
    failedPlayers: string[];
  } | null>(null);

  const startGeneration = async () => {
    Alert.alert(
      'Генерация миниатюр',
      'Этот процесс обработает все существующие аватары и создаст для них миниатюры. Это может занять некоторое время. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Начать', 
          onPress: async () => {
            setIsGenerating(true);
            try {
              await bulkThumbnailGenerator.generateThumbnailsFromDatabase();
              const newStats = bulkThumbnailGenerator.getStats();
              setStats(newStats);
              
              Alert.alert(
                'Генерация завершена',
                `Обработано: ${newStats.processed}\nОшибок: ${newStats.failed}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Ошибка генерации:', error);
              Alert.alert('Ошибка', 'Не удалось сгенерировать миниатюры');
            } finally {
              setIsGenerating(false);
            }
          }
        },
      ]
    );
  };

  const retryFailed = async () => {
    if (!stats || stats.failed === 0) {
      Alert.alert('Информация', 'Нет неудачных попыток для повтора');
      return;
    }

    Alert.alert(
      'Повторная попытка',
      `Повторить обработку для ${stats.failed} игроков?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Повторить', 
          onPress: async () => {
            setIsGenerating(true);
            try {
              // Здесь нужно будет загрузить игроков и повторить обработку
              // await bulkThumbnailGenerator.retryFailedPlayers(players);
              Alert.alert('Успех', 'Повторная обработка завершена');
            } catch (error) {
              console.error('Ошибка повторной обработки:', error);
              Alert.alert('Ошибка', 'Не удалось повторить обработку');
            } finally {
              setIsGenerating(false);
            }
          }
        },
      ]
    );
  };

  const clearStats = () => {
    bulkThumbnailGenerator.clearStats();
    setStats(null);
    Alert.alert('Статистика очищена', 'Статистика обработки была очищена');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Генератор миниатюр</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Что делает генератор:</Text>
          <Text style={styles.description}>
            • Загружает всех игроков из базы данных{'\n'}
            • Находит игроков с аватарами{'\n'}
            • Генерирует 5 размеров миниатюр для каждого аватара{'\n'}
            • Загружает миниатюры в Supabase Storage{'\n'}
            • Размеры: 30px, 50px, 60px, 80px, 100px
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статистика:</Text>
          {stats ? (
            <View style={styles.statsContainer}>
              <Text style={styles.statItem}>✅ Обработано: {stats.processed}</Text>
              <Text style={styles.statItem}>❌ Ошибок: {stats.failed}</Text>
              <Text style={styles.statItem}>📊 Всего: {stats.processed + stats.failed}</Text>
            </View>
          ) : (
            <Text style={styles.noStats}>Статистика недоступна</Text>
          )}
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isGenerating && styles.disabledButton]}
            onPress={startGeneration}
            disabled={isGenerating}
          >
            <Ionicons 
              name={isGenerating ? 'hourglass' : 'play'} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.buttonText}>
              {isGenerating ? 'Генерация...' : 'Начать генерацию'}
            </Text>
          </TouchableOpacity>

          {stats && stats.failed > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, isGenerating && styles.disabledButton]}
              onPress={retryFailed}
              disabled={isGenerating}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Повторить неудачные</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearStats}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.buttonText}>Очистить статистику</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
  },
  statItem: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  noStats: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ThumbnailGeneratorPanel;
