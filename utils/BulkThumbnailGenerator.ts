import { processAvatarThumbnails } from './ThumbnailGenerator';

// Интерфейс для игрока с аватаром
interface PlayerWithAvatar {
  id: string;
  avatar?: string | null;
  name?: string;
}

// Утилита для массовой генерации миниатюр
export class BulkThumbnailGenerator {
  private static instance: BulkThumbnailGenerator;
  private processedPlayers: Set<string> = new Set();
  private failedPlayers: Set<string> = new Set();

  private constructor() {}

  static getInstance(): BulkThumbnailGenerator {
    if (!BulkThumbnailGenerator.instance) {
      BulkThumbnailGenerator.instance = new BulkThumbnailGenerator();
    }
    return BulkThumbnailGenerator.instance;
  }

  // Генерируем миниатюры для одного игрока
  async generateThumbnailsForPlayer(player: PlayerWithAvatar): Promise<boolean> {
    if (!player.avatar || !player.avatar.startsWith('http')) {
      console.log(`⏭️ Пропускаем ${player.name || player.id} - нет аватара`);
      return false;
    }

    if (this.processedPlayers.has(player.id)) {
      console.log(`✅ Миниатюры для ${player.name || player.id} уже обработаны`);
      return true;
    }

    if (this.failedPlayers.has(player.id)) {
      console.log(`❌ Пропускаем ${player.name || player.id} - предыдущая попытка не удалась`);
      return false;
    }

    try {
      console.log(`🔄 Обрабатываем аватар для ${player.name || player.id}...`);
      
      // Генерируем миниатюры
      const thumbnailUrls = await processAvatarThumbnails(player.avatar, player.id);
      
      console.log(`✅ Миниатюры созданы для ${player.name || player.id}:`, thumbnailUrls);
      this.processedPlayers.add(player.id);
      
      return true;
    } catch (error) {
      console.error(`❌ Ошибка создания миниатюр для ${player.name || player.id}:`, error);
      this.failedPlayers.add(player.id);
      return false;
    }
  }

  // Генерируем миниатюры для списка игроков
  async generateThumbnailsForPlayers(players: PlayerWithAvatar[]): Promise<{
    processed: number;
    failed: number;
    skipped: number;
  }> {
    console.log(`🚀 Начинаем массовую генерацию миниатюр для ${players.length} игроков`);
    
    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // Обрабатываем игроков по одному, чтобы не перегружать систему
    for (const player of players) {
      try {
        const result = await this.generateThumbnailsForPlayer(player);
        
        if (result) {
          processed++;
        } else {
          skipped++;
        }

        // Небольшая пауза между обработкой, чтобы не перегружать браузер
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Критическая ошибка для ${player.name || player.id}:`, error);
        failed++;
      }
    }

    console.log(`🎯 Массовая генерация завершена:`);
    console.log(`   ✅ Обработано: ${processed}`);
    console.log(`   ❌ Ошибок: ${failed}`);
    console.log(`   ⏭️ Пропущено: ${skipped}`);

    return { processed, failed, skipped };
  }

  // Генерируем миниатюры для игроков с аватарами из базы данных
  async generateThumbnailsFromDatabase(): Promise<void> {
    try {
      console.log(`📊 Загружаем игроков из базы данных...`);
      
      // Импортируем функцию загрузки игроков
      const { loadPlayers } = await import('./playerStorage');
      const players = await loadPlayers();
      
      // Фильтруем только игроков с аватарами
      const playersWithAvatars = players.filter(p => p.avatar && p.avatar.startsWith('http'));
      
      console.log(`📊 Найдено ${playersWithAvatars.length} игроков с аватарами из ${players.length} общих`);
      
      if (playersWithAvatars.length === 0) {
        console.log(`ℹ️ Нет игроков с аватарами для обработки`);
        return;
      }

      // Генерируем миниатюры
      await this.generateThumbnailsForPlayers(playersWithAvatars);
      
    } catch (error) {
      console.error(`❌ Ошибка загрузки игроков из базы данных:`, error);
      throw error;
    }
  }

  // Получаем статистику обработки
  getStats(): {
    processed: number;
    failed: number;
    processedPlayers: string[];
    failedPlayers: string[];
  } {
    return {
      processed: this.processedPlayers.size,
      failed: this.failedPlayers.size,
      processedPlayers: Array.from(this.processedPlayers),
      failedPlayers: Array.from(this.failedPlayers),
    };
  }

  // Очищаем статистику
  clearStats(): void {
    this.processedPlayers.clear();
    this.failedPlayers.clear();
    console.log(`🗑️ Статистика обработки очищена`);
  }

  // Повторная попытка для неудачных игроков
  async retryFailedPlayers(players: PlayerWithAvatar[]): Promise<void> {
    const failedPlayers = players.filter(p => this.failedPlayers.has(p.id));
    
    if (failedPlayers.length === 0) {
      console.log(`ℹ️ Нет игроков для повторной обработки`);
      return;
    }

    console.log(`🔄 Повторная обработка ${failedPlayers.length} игроков...`);
    
    // Очищаем список неудачных попыток
    this.failedPlayers.clear();
    
    // Повторяем обработку
    await this.generateThumbnailsForPlayers(failedPlayers);
  }
}

export const bulkThumbnailGenerator = BulkThumbnailGenerator.getInstance();

// Функция для запуска массовой генерации (можно вызвать из консоли браузера)
export const startBulkThumbnailGeneration = async (): Promise<void> => {
  try {
    console.log(`🚀 Запускаем массовую генерацию миниатюр...`);
    await bulkThumbnailGenerator.generateThumbnailsFromDatabase();
    console.log(`🎯 Массовая генерация завершена!`);
  } catch (error) {
    console.error(`❌ Ошибка массовой генерации:`, error);
  }
};

// Делаем функцию доступной в глобальной области для вызова из консоли
if (typeof window !== 'undefined') {
  (window as any).startBulkThumbnailGeneration = startBulkThumbnailGeneration;
  console.log(`💡 Для запуска массовой генерации миниатюр выполните: startBulkThumbnailGeneration()`);
}
