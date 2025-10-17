import api from './api';
import { loadPlayers } from './playerStorage';

interface SyncResult {
  success: boolean;
  message: string;
  exportedCount?: number;
  error?: string;
}

export const syncLocalPlayersToServer = async (): Promise<SyncResult> => {
  try {
    
    
    // Загружаем локальных игроков

    const localPlayers = await loadPlayers();

    
    if (localPlayers.length === 0) {
      return {
        success: true,
        message: 'Нет локальных игроков для экспорта'
      };
    }

    // Сначала регистрируем каждого игрока на сервере

    let exportedCount = 0;
    const errors: string[] = [];

    for (const player of localPlayers) {

              try {

          // Проверяем, есть ли уже такой пользователь на сервере
          const existingPlayer = await api.getPlayerById(player.id).catch(() => {
            // Игрок не найден на сервере - это нормально для новых игроков
            return null;
          });
          
          if (!existingPlayer) {

          // Регистрируем нового игрока на сервере
          const registrationData = {
            username: player.username || `player_${player.id}`,
            email: player.email || `player_${player.id}@hockeystars.com`,
            password: 'default_password_123', // Временный пароль
            name: player.name,
            birthDate: player.birthDate || '1990-01-01',
            status: player.status || 'player',
            country: player.country || 'Беларусь',
            team: player.team || '',
            position: player.position || ''
          };

          const result = await api.register(registrationData);

          exportedCount++;
        } else {

        }
      } catch (error) {
        const errorMsg = `Ошибка экспорта игрока ${player.name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Обновляем профили с дополнительными данными
    for (const player of localPlayers) {
      try {
        // Обновляем профиль с дополнительными данными
        const profileData = {
          bio: player.bio || '',
          team: player.team || '',
          position: player.position || '',
          number: player.number || 0,
          grip: player.grip || '',
          height: player.height || 0,
          weight: player.weight || 0,
          hockeyStartDate: player.hockeyStartDate || '',
          favoriteGoals: player.favoriteGoals || 0,
          pullUps: player.pullUps || 0,
          pushUps: player.pushUps || 0,
          plankTime: player.plankTime || 0,
          sprint100m: player.sprint100m || 0,
          longJump: player.longJump || 0,
          games: player.games || 0,
          goals: player.goals || 0,
          assists: player.assists || 0,
          points: player.points || 0,
          photos: player.photos || '',
          avatar: player.avatar || '',
          isPublic: player.isPublic !== false,
          allowMessages: player.allowMessages !== false,
          allowFriendRequests: player.allowFriendRequests !== false
        };

        await api.updateProfile(profileData);

      } catch (error) {
        console.error(`Ошибка обновления профиля игрока ${player.name}:`, error);
      }
    }

    return {
      success: true,
      message: `Успешно экспортировано ${exportedCount} игроков на сервер${errors.length > 0 ? ` (${errors.length} ошибок)` : ''}`,
      exportedCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    };

  } catch (error) {
    console.error('Ошибка синхронизации:', error);
    return {
      success: false,
      message: 'Ошибка синхронизации с сервером',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
};

export const checkServerConnection = async (): Promise<boolean> => {
  try {
    
    const result = await api.healthCheck();
    
    return true;
  } catch (error) {
    console.error('Сервер недоступен:', error);
    console.error('Детали ошибки:', error.message);
    return false;
  }
};

export const getServerPlayersCount = async (): Promise<number> => {
  try {
    const players = await api.getPlayers();
    return players.length;
  } catch (error) {
    console.error('Ошибка получения количества игроков с сервера:', error);
    return 0;
  }
}; 