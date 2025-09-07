import { supabase } from './supabase';

// Интерфейс для данных из Supabase (snake_case)
export interface SupabasePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number;
  height: number;
  weight: number;
  avatar?: string;
  email?: string;
  password?: string;
  status?: string;
  birth_date?: string;
  hockey_start_date?: string;
  experience?: number;
  achievements?: string;
  past_teams?: string;
  phone?: string;
  city?: string;
  goals?: number;
  assists?: number;
  country?: string;
  grip?: string;
  games?: number;
  pull_ups?: number;
  push_ups?: number;
  plank_time?: number;
  sprint_100m?: number;
  long_jump?: number;
  jump_rope?: number;
  favorite_goals?: string;
  photos?: string;
  number?: string;
  exercise_stats?: string; // JSON string для статистики упражнений
  created_at?: string;
  updated_at?: string;
}

// Интерфейс для приложения (camelCase) - совместимый со старым кодом
export interface Team {
  id: string;
  name: string;
  type: 'club' | 'national' | 'regional' | 'school';
  country?: string;
  city?: string;
}

export interface PlayerTeam {
  teamId: string;
  teamName: string;
  teamType: string;
  teamCountry?: string;
  teamCity?: string;
  isPrimary: boolean;
  joinedDate?: string;
  startYear?: number;
  endYear?: number;
}

// Интерфейс для достижения
export interface Achievement {
  id: string;
  competition: string;
  year: number;
  place: 1 | 2 | 3;
  description?: string;
}

// Интерфейс для прошлой команды
export interface PastTeam {
  id: string;
  teamName: string;
  teamCountry?: string;
  teamCity?: string;
  startYear: number;
  endYear?: number;
  isCurrent: boolean;
}

// Интерфейс для выполненного упражнения
export interface ExerciseCompletion {
  exerciseId: string;
  completedAt: string; // ISO string date
  count: number; // количество выполнений этого упражнения
}

// Интерфейс для статистики упражнений игрока
export interface PlayerExerciseStats {
  completions: ExerciseCompletion[];
  totalCompletions: number;
  lastCompletedAt?: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string; // основная команда (для обратной совместимости)
  teams?: PlayerTeam[]; // текущие команды игрока
  pastTeams?: PastTeam[]; // прошлые команды игрока
  age: number;
  height: string;
  weight: string;
  avatar?: string;
  email?: string;
  password?: string;
  status?: string;
  birthDate?: string;
  hockeyStartDate?: string;
  experience?: string;
  achievements?: Achievement[]; // новые достижения
  oldAchievements?: string; // старые достижения (для обратной совместимости)
  phone?: string;
  city?: string;
  goals?: string;
  assists?: string;
  country?: string;
  grip?: string;
  games?: string;
  pullUps?: string;
  pushUps?: string;
  plankTime?: string;
  sprint100m?: string;
  longJump?: string;
  jumpRope?: string;
  favoriteGoals?: string;
  photos?: string[];
  number?: string;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  friendRequestsCount?: number;
  giftRequestsCount?: number;
  exerciseStats?: PlayerExerciseStats;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

// Функции преобразования данных
const convertSupabaseToPlayer = (supabasePlayer: SupabasePlayer): Player => {
  // Преобразование данных из Supabase в Player
  // console.log(`🔄 Конвертируем игрока: ${supabasePlayer.name}`);
  // console.log(`   Аватар из базы: ${supabasePlayer.avatar || 'null'}`);
  // console.log(`   Фотографии из базы: ${supabasePlayer.photos || 'null'}`);
  
  const result = {
    id: supabasePlayer.id,
    name: supabasePlayer.name,
    position: supabasePlayer.position,
    team: supabasePlayer.team,
    age: supabasePlayer.age,
    height: supabasePlayer.height ? supabasePlayer.height.toString() : '',
    weight: supabasePlayer.weight ? supabasePlayer.weight.toString() : '',
    avatar: supabasePlayer.avatar,
    email: supabasePlayer.email,
    password: supabasePlayer.password,
    status: supabasePlayer.status,
    birthDate: supabasePlayer.birth_date,
    hockeyStartDate: (() => {
      if (!supabasePlayer.hockey_start_date || supabasePlayer.hockey_start_date === '' || supabasePlayer.hockey_start_date === 'null') {
        return '';
      }
      
      // Конвертируем из YYYY-MM-DD в MM.YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(supabasePlayer.hockey_start_date)) {
        const [year, month] = supabasePlayer.hockey_start_date.split('-');
        return `${parseInt(month)}.${year}`;
      }
      
      return supabasePlayer.hockey_start_date; // Возвращаем как есть, если формат не распознан
    })(),
    experience: supabasePlayer.experience ? supabasePlayer.experience.toString() : '',
    achievements: (() => {
      if (supabasePlayer.achievements && supabasePlayer.achievements !== '[]' && supabasePlayer.achievements !== 'null') {
        try {
          return JSON.parse(supabasePlayer.achievements);
        } catch (error) {
          // console.error('Ошибка парсинга achievements:', error);
          return [];
        }
      }
      return [];
    })(),
    oldAchievements: supabasePlayer.achievements, // старые достижения для обратной совместимости
    pastTeams: [], // Команды теперь загружаются только из таблицы player_teams
    phone: supabasePlayer.phone,
    city: supabasePlayer.city,
    goals: supabasePlayer.goals ? supabasePlayer.goals.toString() : '0',
    assists: supabasePlayer.assists ? supabasePlayer.assists.toString() : '0',
    country: supabasePlayer.country,
    grip: supabasePlayer.grip,
    games: supabasePlayer.games ? supabasePlayer.games.toString() : '0',
    pullUps: supabasePlayer.pull_ups && String(supabasePlayer.pull_ups) !== '0' && String(supabasePlayer.pull_ups) !== 'null' ? supabasePlayer.pull_ups.toString() : '',
    pushUps: supabasePlayer.push_ups && String(supabasePlayer.push_ups) !== '0' && String(supabasePlayer.push_ups) !== 'null' ? supabasePlayer.push_ups.toString() : '',
    plankTime: supabasePlayer.plank_time && String(supabasePlayer.plank_time) !== '0' && String(supabasePlayer.plank_time) !== 'null' ? supabasePlayer.plank_time.toString() : '',
    sprint100m: supabasePlayer.sprint_100m && String(supabasePlayer.sprint_100m) !== '0' && String(supabasePlayer.sprint_100m) !== 'null' ? supabasePlayer.sprint_100m.toString() : '',
    longJump: supabasePlayer.long_jump && String(supabasePlayer.long_jump) !== '0' && String(supabasePlayer.long_jump) !== 'null' ? supabasePlayer.long_jump.toString() : '',
    jumpRope: supabasePlayer.jump_rope && String(supabasePlayer.jump_rope) !== '0' && String(supabasePlayer.jump_rope) !== 'null' ? supabasePlayer.jump_rope.toString() : '',
    favoriteGoals: supabasePlayer.favorite_goals && supabasePlayer.favorite_goals.trim() !== '' ? supabasePlayer.favorite_goals : '',
    photos: supabasePlayer.photos && supabasePlayer.photos !== '[]' && supabasePlayer.photos !== 'null' ? 
      (() => {
        try {
          return JSON.parse(supabasePlayer.photos);
        } catch (error) {
          // console.error('Ошибка парсинга photos:', error);
          return [];
        }
      })() : [],
    number: supabasePlayer.number || '',
    unreadNotificationsCount: 0,
    unreadMessagesCount: 0,
    friendRequestsCount: 0,
    giftRequestsCount: 0,
    exerciseStats: (() => {
      if (supabasePlayer.exercise_stats && 
          supabasePlayer.exercise_stats !== '{}' && 
          supabasePlayer.exercise_stats !== 'null' && 
          supabasePlayer.exercise_stats !== 'undefined' &&
          typeof supabasePlayer.exercise_stats === 'string') {
        try {
          const parsed = JSON.parse(supabasePlayer.exercise_stats);
          // Проверяем, что результат парсинга - это объект с нужными полями
          if (parsed && typeof parsed === 'object' && 
              Array.isArray(parsed.completions) && 
              typeof parsed.totalCompletions === 'number') {
            return parsed;
          }
          // Если структура неправильная, возвращаем дефолт без ошибки
          return { completions: [], totalCompletions: 0 };
        } catch (error) {
          // Логируем только первый раз для каждого игрока
          if (!supabasePlayer._exercise_stats_error_logged) {
            console.warn(`⚠️ Некорректные данные exercise_stats для игрока ${supabasePlayer.name || supabasePlayer.id}: "${supabasePlayer.exercise_stats}"`);
            supabasePlayer._exercise_stats_error_logged = true;
          }
          return { completions: [], totalCompletions: 0 };
        }
      }
      return { completions: [], totalCompletions: 0 };
    })()
  };
  
  // console.log(`   Результат конвертации:`);
  // console.log(`     Аватар: ${result.avatar || 'null'}`);
  // console.log(`     Фотографии: ${result.photos ? result.photos.length : 0} шт.`);
  
  return result;
};

// Функции для работы с командами

// Поиск команд по названию
export const searchTeams = async (searchTerm: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .rpc('search_teams', { search_term: searchTerm });
    
    if (error) {
      console.error('❌ Ошибка поиска команд:', error);
      return [];
    }
    
    return (data || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      type: team.type,
      country: team.country,
      city: team.city
    }));
  } catch (error) {
    console.error('❌ Ошибка поиска команд:', error);
    return [];
  }
};

// Создание новой команды
export const createTeam = async (teamData: Omit<Team, 'id'>): Promise<Team | null> => {
  try {
    console.log('🆕 createTeam: начинаем создание команды:', teamData);
    
    // Сначала проверяем, существует ли уже команда с таким названием
    const { data: existingTeam, error: checkError } = await supabase
      .from('teams')
      .select('*')
      .eq('name', teamData.name)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Ошибка проверки существующей команды:', checkError);
      return null;
    }
    
    if (existingTeam) {

      return {
        id: existingTeam.id,
        name: existingTeam.name,
        type: existingTeam.type,
        country: existingTeam.country,
        city: existingTeam.city
      };
    }
    
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        type: teamData.type,
        country: teamData.country,
        city: teamData.city
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания команды:', error);
      console.error('❌ Детали ошибки:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      country: data.country,
      city: data.city
    };
  } catch (error) {
    console.error('❌ Ошибка создания команды:', error);
    return null;
  }
};

// Получение команд игрока
export const getPlayerTeams = async (playerId: string): Promise<PlayerTeam[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_player_teams', { player_uuid: playerId });
    
    if (error) {
      console.error('❌ Ошибка получения команд игрока:', error);
      return [];
    }
    
    
    
    const teams = (data || []).map((team: any) => {
      
      return {
        teamId: team.team_id,
        teamName: team.team_name,
        teamType: team.team_type,
        teamCountry: team.team_country,
        teamCity: team.team_city,
        isPrimary: team.is_primary,
        joinedDate: team.joined_date,
        startYear: team.start_year,
        endYear: team.end_year
      };
    });
    
    // Сортируем команды по дате добавления (сначала новые)
    teams.sort((a: PlayerTeam, b: PlayerTeam) => {
      const dateA = new Date(a.joinedDate || '1970-01-01');
      const dateB = new Date(b.joinedDate || '1970-01-01');
      return dateB.getTime() - dateA.getTime();
    });
    
    return teams;
  } catch (error) {
    console.error('❌ Ошибка получения команд игрока:', error);
    return [];
  }
};

// Добавление команды игроку
export const addPlayerTeam = async (playerId: string, teamId: string, isPrimary: boolean = false, startYear?: number, endYear?: number): Promise<boolean> => {
  try {
    console.log('➕ addPlayerTeam: добавляем команду', teamId, 'игроку', playerId, '(основная:', isPrimary, ')');
    console.log('➕ addPlayerTeam: годы - startYear:', startYear, 'endYear:', endYear);
    
    // Проверяем валидность параметров
    if (!playerId || !teamId) {
      console.error('❌ addPlayerTeam: невалидные параметры', { playerId, teamId });
      return false;
    }
    
    // Сначала проверяем, существует ли команда в таблице teams

    const { data: teamExists, error: teamCheckError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();
    
    if (teamCheckError && teamCheckError.code !== 'PGRST116') {
      console.error('❌ Ошибка проверки существования команды:', teamCheckError);
      console.error('❌ Детали ошибки:', {
        code: teamCheckError.code,
        message: teamCheckError.message,
        details: teamCheckError.details,
        hint: teamCheckError.hint
      });
      return false;
    }
    
    if (!teamExists) {
      console.error('❌ Команда с ID', teamId, 'не существует в таблице teams');
      return false;
    }
    
    
    
    // Проверяем, есть ли пересечение годов с существующими записями
    const { data: existingTeams, error: checkError } = await supabase
      .from('player_teams')
      .select('*')
      .eq('player_id', playerId)
      .eq('team_id', teamId);
    
    if (checkError) {
      console.error('❌ Ошибка проверки существующих команд:', checkError);
      return false;
    }
    
    // Проверяем пересечение годов
    if (existingTeams && existingTeams.length > 0) {
      const hasOverlap = existingTeams.some(existing => {
        const existingStart = existing.start_year || 0;
        const existingEnd = existing.end_year || 9999;
        const newStart = startYear || 0;
        const newEnd = endYear || 9999;
        
        // Проверяем, пересекаются ли периоды
        return (newStart <= existingEnd && newEnd >= existingStart);
      });
      
      if (hasOverlap) {
        console.error('❌ Игрок уже состоит в этой команде в указанный период времени');
        return false;
      }
    }
    
    // Создаем новую запись (теперь можно добавлять одну команду несколько раз с разными годами)
    const insertData: any = {
      player_id: playerId,
      team_id: teamId,
      is_primary: isPrimary,
      joined_date: new Date().toISOString().split('T')[0]
    };
    
    // Добавляем годы только если они переданы
    if (startYear !== undefined) {
      insertData.start_year = startYear;
    }
    if (endYear !== undefined) {
      insertData.end_year = endYear;
    }
    
    const { error: insertError } = await supabase
      .from('player_teams')
      .insert(insertData);
    
    if (insertError) {
      console.error('❌ Ошибка добавления команды игроку:', insertError);
      return false;
    }
    
    console.log('✅ Команда успешно добавлена игроку');
    return true;
  } catch (error) {
    console.error('❌ Ошибка добавления команды игроку:', error);
    return false;
  }
};

// Удаление команды у игрока
export const removePlayerTeam = async (playerId: string, teamId: string): Promise<boolean> => {
  try {
    console.log('🗑️ removePlayerTeam: удаляем команду', teamId, 'у игрока', playerId);
    
    const { error } = await supabase
      .from('player_teams')
      .delete()
      .eq('player_id', playerId)
      .eq('team_id', teamId);
    
    if (error) {
      console.error('❌ Ошибка удаления команды у игрока:', error);
      return false;
    }
    
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления команды у игрока:', error);
    return false;
  }
};

// Установка основной команды
export const setPrimaryTeam = async (playerId: string, teamId: string): Promise<boolean> => {
  try {
    // Сначала сбрасываем все команды как не основные
    const { error: resetError } = await supabase
      .from('player_teams')
      .update({ is_primary: false })
      .eq('player_id', playerId);
    
    if (resetError) {
      console.error('❌ Ошибка сброса основных команд:', resetError);
      return false;
    }
    
    // Затем устанавливаем выбранную команду как основную
    const { error: setError } = await supabase
      .from('player_teams')
      .update({ is_primary: true })
      .eq('player_id', playerId)
      .eq('team_id', teamId);
    
    if (setError) {
      console.error('❌ Ошибка установки основной команды:', setError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка установки основной команды:', error);
    return false;
  }
};

// Конвертация PlayerTeam в PastTeam
export const convertPlayerTeamToPastTeam = (playerTeam: PlayerTeam): PastTeam => {
  return {
    id: playerTeam.teamId,
    teamName: playerTeam.teamName,
    teamCountry: playerTeam.teamCountry,
    teamCity: playerTeam.teamCity,
    startYear: playerTeam.startYear || new Date().getFullYear(), // Используем сохраненный год или текущий
    endYear: playerTeam.endYear,
    isCurrent: playerTeam.isPrimary
  };
};

// Получение команд игрока в формате PastTeam
export const getPlayerTeamsAsPastTeams = async (playerId: string): Promise<PastTeam[]> => {
  try {
    const playerTeams = await getPlayerTeams(playerId);
    return playerTeams.map(convertPlayerTeamToPastTeam);
  } catch (error) {
    console.error('❌ Ошибка получения команд игрока:', error);
    return [];
  }
};

// Синхронизация команд игрока с базой данных (оптимизированная версия)
export const syncPlayerTeams = async (playerId: string, currentTeams: PastTeam[], pastTeams: PastTeam[]): Promise<boolean> => {
  try {
    // Проверяем, что playerId валидный
    if (!playerId) {
      console.error('❌ syncPlayerTeams: playerId не указан');
      return false;
    }
    
    // Выполняем операции параллельно для ускорения
    const [clearPastTeamsResult, deleteTeamsResult] = await Promise.all([
      // Очищаем поле pastTeams в таблице players
      supabase
        .from('players')
        .update({ past_teams: '[]' })
        .eq('id', playerId),
      
      // Удаляем все существующие команды игрока
      supabase
        .from('player_teams')
        .delete()
        .eq('player_id', playerId)
    ]);
    
    // Проверяем результаты операций
    if (clearPastTeamsResult.error) {
      console.error('❌ Ошибка очистки поля pastTeams:', clearPastTeamsResult.error);
      return false;
    }
    
    if (deleteTeamsResult.error) {
      console.error('❌ Ошибка удаления существующих команд:', deleteTeamsResult.error);
      return false;
    }
    
    // Подготавливаем все команды для добавления
    const allTeams = [
      ...currentTeams.map(team => ({ ...team, isCurrent: true })),
      ...pastTeams.filter(team => !team.isCurrent).map(team => ({ ...team, isCurrent: false }))
    ];
    
    if (allTeams.length === 0) {
      return true;
    }
    
    // Проверяем валидность всех ID команд
    const invalidTeams = allTeams.filter(team => !team.id || team.id === 'undefined' || team.id === 'null');
    if (invalidTeams.length > 0) {
      console.error('❌ Найдены невалидные ID команд:', invalidTeams.map(t => ({ name: t.teamName, id: t.id })));
      return false;
    }
    
    // Добавляем все команды параллельно
    const addPromises = allTeams.map(team => 
      addPlayerTeam(playerId, team.id, team.isCurrent, team.startYear, team.endYear)
    );
    
    const results = await Promise.all(addPromises);
    const failedTeams = results.filter((success, index) => !success);
    
    if (failedTeams.length > 0) {
      console.error(`❌ Ошибка добавления ${failedTeams.length} команд`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка синхронизации команд:', error);
    return false;
  }
};

// Функция для очистки старых данных команд из поля pastTeams
export const clearOldPastTeamsData = async (playerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('players')
      .update({ past_teams: '[]' })
      .eq('id', playerId);
    
    if (error) {
      console.error('❌ Ошибка очистки старых данных команд:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка очистки старых данных команд:', error);
    return false;
  }
};

const convertPlayerToSupabase = (player: Omit<Player, 'id' | 'unreadNotificationsCount' | 'unreadMessagesCount'>): Omit<SupabasePlayer, 'id' | 'created_at' | 'updated_at'> => {
  // Функция для конвертации даты из DD.MM.YYYY в YYYY-MM-DD
  const convertDate = (dateString?: string): string | undefined => {
    if (!dateString) return undefined;
    
    // Проверяем, если дата уже в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Конвертируем из DD.MM.YYYY в YYYY-MM-DD
    const parts = dateString.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateString; // Возвращаем как есть, если формат не распознан
  };

  return {
    name: player.name,
    position: player.position,
    team: player.team,
    age: player.age,
    height: parseInt(player.height) || 0,
    weight: parseInt(player.weight) || 0,
    avatar: player.avatar,
    email: player.email,
    password: player.password,
    status: player.status,
    birth_date: convertDate(player.birthDate),
    hockey_start_date: convertDate(player.hockeyStartDate),
    experience: player.experience ? parseInt(player.experience) : 0,
    achievements: player.achievements ? JSON.stringify(player.achievements) : '[]',
    past_teams: player.pastTeams ? JSON.stringify(player.pastTeams) : '[]',
    phone: player.phone,
    city: player.city,
    goals: player.goals ? parseInt(player.goals) : 0,
    assists: player.assists ? parseInt(player.assists) : 0,
    country: player.country,
    grip: player.grip,
    games: player.games ? parseInt(player.games) : 0,
    pull_ups: player.pullUps ? parseInt(player.pullUps) : 0,
    push_ups: player.pushUps ? parseInt(player.pushUps) : 0,
    plank_time: player.plankTime ? parseInt(player.plankTime) : 0,
    sprint_100m: player.sprint100m ? parseFloat(player.sprint100m) : 0,
    long_jump: player.longJump ? parseInt(player.longJump) : 0,
    jump_rope: player.jumpRope ? parseInt(player.jumpRope) : 0,
    favorite_goals: player.favoriteGoals || '',
    photos: player.photos && player.photos.length > 0 ? JSON.stringify(player.photos) : '[]',
    number: player.number || '',
    exercise_stats: player.exerciseStats ? JSON.stringify(player.exerciseStats) : '{"completions":[],"totalCompletions":0}'
  };
};

// Инициализация хранилища
export const initializeStorage = async (): Promise<void> => {
  try {
    console.log('🚀 Инициализация Supabase хранилища...');
    
    // Проверяем подключение к Supabase
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error);
      throw error;
    }
    
    console.log('✅ Supabase хранилище инициализировано');
  } catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
    throw error;
  }
};

// Загрузка всех игроков
export const loadPlayers = async (): Promise<Player[]> => {
  try {
    console.log('📊 Загружаем игроков из Supabase...');
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка загрузки игроков из Supabase:', error);
      return [];
    }
    
    if (data) {
      console.log('📊 Загружено игроков из Supabase:', data.length);
      
      // Преобразуем данные из Supabase в формат приложения
      const players = data.map(convertSupabaseToPlayer);
      return players;
    }
    
    console.log('📊 Нет данных в Supabase');
    return [];
    
  } catch (error) {
    console.error('❌ Ошибка загрузки игроков:', error);
    return [];
  }
};

// Получение игрока по ID
export const getPlayerById = async (id: string): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Ошибка получения игрока:', error);
      return null;
    }
    
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка получения игрока:', error);
    return null;
  }
};

// Добавление нового игрока
export const addPlayer = async (player: Omit<Player, 'id' | 'unreadNotificationsCount' | 'unreadMessagesCount'>): Promise<Player> => {
  try {
    // Добавляем игрока
    
    const supabasePlayer = convertPlayerToSupabase(player);
    console.log('📤 Данные для Supabase:', JSON.stringify(supabasePlayer, null, 2));
    
    const { data, error } = await supabase
      .from('players')
      .insert([supabasePlayer])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка добавления игрока:', error);
      console.error('Детали ошибки:', error.message);
      console.error('Код ошибки:', error.code);
      console.error('Детали:', error.details);
      console.error('Подсказка:', error.hint);
      throw error;
    }
    
    // Игрок добавлен
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка добавления игрока:', error);
    throw error;
  }
};

// Обновление игрока
export const updatePlayer = async (id: string, updates: Partial<Player>, currentUserId?: string): Promise<Player | null> => {
  try {
    // Проверяем права доступа
    if (currentUserId) {
      const currentUser = await getPlayerById(currentUserId);
      if (!currentUser) {
        console.error('❌ Пользователь не найден для проверки прав доступа');
        return null;
      }
      
      // Только владелец профиля или администратор может обновлять данные
      if (currentUser.status !== 'admin' && currentUser.id !== id) {
        console.error('❌ Попытка несанкционированного обновления профиля:', {
          currentUserId,
          targetId: id,
          currentUserStatus: currentUser.status
        });
        return null;
      }
    }
    
    // Обновление игрока в Supabase
    // Логи обновления убраны для чистоты консоли
    // Функция для конвертации даты из MM.YYYY в YYYY-MM-DD
    const convertDate = (dateString?: string): string | undefined => {
      if (!dateString) return undefined;
      
      // Проверяем, если дата уже в формате YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Конвертируем из MM.YYYY в YYYY-MM-DD
      const parts = dateString.split('.');
      if (parts.length === 2) {
        const [month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-01`; // Добавляем день 01
      }
      
      // Конвертируем из DD.MM.YYYY в YYYY-MM-DD (для обратной совместимости)
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return dateString; // Возвращаем как есть, если формат не распознан
    };

    // Преобразуем обновления в формат Supabase
    const supabaseUpdates: Partial<SupabasePlayer> = {};
    
    if (updates.height) supabaseUpdates.height = parseInt(updates.height) || 0;
    if (updates.weight) supabaseUpdates.weight = parseInt(updates.weight) || 0;
    if (updates.birthDate) supabaseUpdates.birth_date = convertDate(updates.birthDate);
    if (updates.hockeyStartDate !== undefined) supabaseUpdates.hockey_start_date = convertDate(updates.hockeyStartDate);
    if (updates.experience) supabaseUpdates.experience = parseInt(updates.experience) || 0;
    if (updates.goals) supabaseUpdates.goals = parseInt(updates.goals) || 0;
    if (updates.assists) supabaseUpdates.assists = parseInt(updates.assists) || 0;
    if (updates.games) supabaseUpdates.games = parseInt(updates.games) || 0;
    if (updates.pullUps !== undefined) supabaseUpdates.pull_ups = parseInt(updates.pullUps) || 0;
    if (updates.pushUps !== undefined) supabaseUpdates.push_ups = parseInt(updates.pushUps) || 0;
    if (updates.plankTime !== undefined) supabaseUpdates.plank_time = parseInt(updates.plankTime) || 0;
    if (updates.sprint100m !== undefined) supabaseUpdates.sprint_100m = parseFloat(updates.sprint100m) || 0;
    if (updates.longJump !== undefined) supabaseUpdates.long_jump = parseInt(updates.longJump) || 0;
    if (updates.jumpRope !== undefined) supabaseUpdates.jump_rope = parseInt(updates.jumpRope) || 0;
    if (updates.favoriteGoals !== undefined) supabaseUpdates.favorite_goals = updates.favoriteGoals;
    if (updates.photos !== undefined) supabaseUpdates.photos = updates.photos && updates.photos.length > 0 ? JSON.stringify(updates.photos) : '[]';
    if (updates.number !== undefined) supabaseUpdates.number = updates.number;
    if (updates.exerciseStats !== undefined) supabaseUpdates.exercise_stats = JSON.stringify(updates.exerciseStats);
    
    // Обрабатываем достижения (конвертируем массив в JSON строку)
    if (updates.achievements !== undefined) {
      supabaseUpdates.achievements = JSON.stringify(updates.achievements);
    }
    
    // Обрабатываем прошлые команды (конвертируем массив в JSON строку)
    if (updates.pastTeams !== undefined) {
      supabaseUpdates.past_teams = JSON.stringify(updates.pastTeams);
    }
    
    // Добавляем остальные поля напрямую
    Object.assign(supabaseUpdates, {
      name: updates.name,
      position: updates.position,
      team: updates.team,
      age: updates.age,
      avatar: updates.avatar,
      email: updates.email,
      password: updates.password,
      status: updates.status,
      phone: updates.phone,
      city: updates.city,
      country: updates.country,
      grip: updates.grip
    });
    
    console.log('📤 Данные для обновления в Supabase:', JSON.stringify(supabaseUpdates, null, 2));
    
    const { data, error } = await supabase
      .from('players')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка обновления игрока:', error);
      return null;
    }
    
    // Игрок успешно обновлен в Supabase
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка обновления игрока:', error);
    return null;
  }
};

// Поиск игрока по email и паролю
export const findPlayerByCredentials = async (email: string, password: string): Promise<Player | null> => {
  try {
    console.log('🔍 Поиск пользователя по учетным данным:', email);
    console.log('🔗 Подключение к Supabase URL настроено');
    
    // Сначала проверим, есть ли вообще пользователи в базе
    const { data: countData, error: countError } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Ошибка проверки количества пользователей:', countError);
    } else {
      console.log('📊 Всего пользователей в базе:', countData?.length || 0);
    }
    
    // Теперь ищем конкретного пользователя
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (error) {
      console.error('❌ Ошибка поиска игрока в Supabase:', error);
      console.error('❌ Детали ошибки:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    if (data) {
      console.log('✅ Пользователь найден в Supabase:', data.name);
      // Логируем детали только при успешном входе, не при каждой проверке
      return convertSupabaseToPlayer(data);
    }
    
    console.log('❌ Пользователь не найден в Supabase');
    console.log('🔍 Проверяем, есть ли пользователи с таким email...');
    
    // Проверим, есть ли пользователи с таким email
    const { data: emailCheck, error: emailError } = await supabase
      .from('players')
      .select('email')
      .eq('email', email);
    
    if (emailError) {
      console.error('❌ Ошибка проверки email:', emailError);
    } else if (emailCheck && emailCheck.length > 0) {
      console.log('⚠️ Пользователь с таким email найден, но пароль неверный');
    } else {
      console.log('❌ Пользователь с таким email не найден');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Ошибка поиска игрока:', error);
    return null;
  }
};

// Сохранение текущего пользователя (в локальном хранилище для сессии)
export const saveCurrentUser = async (user: Player): Promise<void> => {
  try {
    // Проверяем, изменились ли данные пользователя
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const existingData = await AsyncStorage.getItem('hockeystars_current_user');
    
    if (existingData) {
      const existingUser = JSON.parse(existingData);
      // Логируем только если данные действительно изменились
      if (existingUser.id !== user.id || existingUser.status !== user.status) {
        console.log('💾 Обновляем данные пользователя в AsyncStorage:', user.name);
        console.log('📋 Изменения:', {
          id: user.id,
          name: user.name,
          status: user.status
        });
      }
    } else {
      console.log('💾 Сохраняем нового пользователя в AsyncStorage:', user.name);
    }
    
    await AsyncStorage.setItem('hockeystars_current_user', JSON.stringify(user));
    
    // Очищаем кэш при изменении пользователя
    await AsyncStorage.removeItem('hockeystars_user_cache');
    
    console.log('✅ Пользователь успешно сохранен в AsyncStorage');
  } catch (error) {
    console.error('❌ Ошибка сохранения текущего пользователя:', error);
  }
};

// Загрузка текущего пользователя
export const loadCurrentUser = async (): Promise<Player | null> => {
  try {
    // Кэшируем результат на короткое время, чтобы избежать повторных логов
    const cacheKey = 'hockeystars_user_cache';
    const cacheTime = 30000; // 30 секунд кэша
    
    // Проверяем кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { user, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        // Возвращаем кэшированные данные без логирования
        return user;
      }
    }
    
    // Логируем только при реальной загрузке
    console.log('👤 Загружаем текущего пользователя...');
    
    // Загрузка текущего пользователя
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    
    if (!userData) {
      console.log('👤 Текущий пользователь не найден в AsyncStorage');
      return null;
    }
    
    const user = JSON.parse(userData);
    console.log('✅ Текущий пользователь загружен из AsyncStorage:', user.name);
    
    // Логируем детали только при первом заходе или изменении пользователя
    const lastUserKey = 'hockeystars_last_user_id';
    const lastUserId = await AsyncStorage.getItem(lastUserKey);
    
    if (lastUserId !== user.id) {
      console.log('📋 Данные пользователя:', {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      });
      await AsyncStorage.setItem(lastUserKey, user.id);
    }
    
    // Кэшируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      user,
      timestamp: Date.now()
    }));
    
    return user;
  } catch (error) {
    console.error('❌ Ошибка загрузки текущего пользователя:', error);
    return null;
  }
};

// Выход пользователя
export const logoutUser = async (): Promise<void> => {
  try {
    console.log('🚪 Выход пользователя из системы...');
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Проверим, есть ли данные пользователя перед удалением
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('👤 Удаляем данные пользователя:', user.name);
    }
    
    // Очищаем все связанные данные
    await AsyncStorage.removeItem('hockeystars_current_user');
    await AsyncStorage.removeItem('hockeystars_user_cache');
    await AsyncStorage.removeItem('hockeystars_last_user_id');
    
    console.log('✅ Пользователь вышел из системы');
  } catch (error) {
    console.error('❌ Ошибка выхода:', error);
  }
};

// Отправка сообщения
export const sendMessage = async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
  try {
    const supabaseMessage = {
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      text: message.text,
      read: message.read
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert([supabaseMessage])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      throw error;
    }
    
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      text: data.text,
      timestamp: new Date(data.created_at),
      read: data.read
    };
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    throw error;
  }
};

// Получение сообщений между двумя пользователями
export const getMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }
    
    return (data || []).map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      text: msg.text,
      timestamp: new Date(msg.created_at),
      read: msg.read
    }));
  } catch (error) {
    console.error('❌ Ошибка получения сообщений:', error);
    return [];
  }
};

// Получение диалога между двумя пользователями
export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const messages = await getMessages(userId1, userId2);
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error('❌ Ошибка загрузки диалога:', error);
    return [];
  }
};

// Упрощенная отправка сообщения
export const sendMessageSimple = async (senderId: string, receiverId: string, text: string): Promise<boolean> => {
  try {
    const message = {
      senderId,
      receiverId,
      text,
      read: false
    };
    
    await sendMessage(message);
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return false;
  }
};

// Отметка сообщений как прочитанные
export const markMessagesAsRead = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false);
    
    if (error) {
      console.error('❌ Ошибка отметки сообщений как прочитанные:', error);
    }
  } catch (error) {
    console.error('❌ Ошибка отметки сообщений как прочитанные:', error);
  }
};

// Получение всех диалогов пользователя
export const getUserConversations = async (userId: string): Promise<Record<string, Message[]>> => {
  try {
    // Получаем все сообщения пользователя
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Ошибка получения диалогов:', error);
      return {};
    }
    
    // Группируем сообщения по собеседникам
    const conversations: Record<string, Message[]> = {};
    
    (data || []).forEach(msg => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = [];
      }
      
      conversations[otherUserId].push({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        text: msg.text,
        timestamp: new Date(msg.created_at),
        read: msg.read
      });
    });
    
    return conversations;
  } catch (error) {
    console.error('❌ Ошибка получения диалогов пользователя:', error);
    return {};
  }
};

// Отправка запроса дружбы
export const sendFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {

    
    // Получаем данные отправителя для уведомления
    const { data: senderData } = await supabase
      .from('players')
      .select('name')
      .eq('id', fromId)
      .single();
    
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{
        from_id: fromId,
        to_id: toId,
        status: 'pending'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка отправки запроса дружбы:', error);
      return false;
    }
    
    // Создаем уведомление для получателя
    if (senderData) {
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: toId,
            type: 'friend_request',
            title: 'Новый запрос дружбы',
            message: `${senderData.name} хочет добавить вас в друзья`,
            is_read: false,
            data: { from_id: fromId, request_id: data.id }
          }]);
        
        if (notificationError) {
          console.error('❌ Ошибка создания уведомления:', notificationError);
        } else {
    
        }
      } catch (notificationError) {
        console.error('❌ Ошибка создания уведомления:', notificationError);
      }
    }
    

    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки запроса дружбы:', error);
    return false;
  }
};

// Получение запросов дружбы для пользователя
export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_id.eq.${userId},to_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка получения запросов дружбы:', error);
      return [];
    }
    
    return (data || []).map(req => ({
      id: req.id,
      fromId: req.from_id,
      toId: req.to_id,
      status: req.status,
      timestamp: new Date(req.created_at)
    }));
  } catch (error) {
    console.error('❌ Ошибка получения запросов дружбы:', error);
    return [];
  }
};

// Принятие запроса дружбы
export const acceptFriendRequest = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'pending');
    
    if (error) {
      console.error('❌ Ошибка принятия запроса дружбы:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка принятия запроса дружбы:', error);
    return false;
  }
};

// Отклонение запроса дружбы
export const declineFriendRequest = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'pending');
    
    if (error) {
      console.error('❌ Ошибка отклонения запроса дружбы:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отклонения запроса дружбы:', error);
    return false;
  }
};

// Отмена запроса дружбы (удаление записи)
export const cancelFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(from_id.eq.${fromId},to_id.eq.${toId}),and(from_id.eq.${toId},to_id.eq.${fromId})`)
      .eq('status', 'pending');
    
    if (error) {
      console.error('❌ Ошибка отмены запроса дружбы:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отмены запроса дружбы:', error);
    return false;
  }
};

// Удаление из друзей
export const removeFriend = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'accepted');
    
    if (error) {
      console.error('❌ Ошибка удаления из друзей:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления из друзей:', error);
    return false;
  }
};

// Получение друзей пользователя
export const getFriends = async (userId: string): Promise<Player[]> => {
  try {
    // Получаем принятые запросы дружбы
    const { data: friendRequests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`from_id.eq.${userId},to_id.eq.${userId}`)
      .eq('status', 'accepted');
    
    if (requestsError) {
      console.error('❌ Ошибка получения запросов дружбы:', requestsError);
      return [];
    }
    
    if (!friendRequests || friendRequests.length === 0) {
      return [];
    }
    
    // Получаем ID друзей
    const friendIds = friendRequests.map(request => 
      request.from_id === userId ? request.to_id : request.from_id
    );
    
    // Получаем данные друзей
    const { data: friends, error: friendsError } = await supabase
      .from('players')
      .select('*')
      .in('id', friendIds);
    
    if (friendsError) {
      console.error('❌ Ошибка получения друзей:', friendsError);
      return [];
    }
    
    return (friends || []).map(convertSupabaseToPlayer);
  } catch (error) {
    console.error('❌ Ошибка получения друзей:', error);
    return [];
  }
};

// Проверка статуса дружбы
export const getFriendshipStatus = async (userId1: string, userId2: string): Promise<string> => {
  try {
  
    
    // Сначала проверяем, есть ли принятый запрос дружбы (друзья)
    const { data: friendsData, error: friendsError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2},status.eq.accepted),and(from_id.eq.${userId2},to_id.eq.${userId1},status.eq.accepted)`)
      .maybeSingle();
    
    if (friendsData) {

      return 'friends';
    }
    
    // Проверяем, отправил ли userId1 запрос userId2
    const { data: sentData, error: sentError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_id', userId1)
      .eq('to_id', userId2)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (sentData) {

      return 'sent_request';
    }
    
    // Проверяем, получил ли userId1 запрос от userId2
    const { data: receivedData, error: receivedError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('from_id', userId2)
      .eq('to_id', userId1)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (receivedData) {
      console.log('🔍 userId1 получил запрос от userId2:', receivedData);
      return 'received_request';
    }
    

    return 'none';
  } catch (error) {
    console.error('❌ Ошибка в getFriendshipStatus:', error);
    return 'none';
  }
};

// Очистка всех данных (для тестирования)
export const clearAllData = async (): Promise<boolean> => {
  try {
    console.log('🧹 Очистка всех данных из Supabase...');
    
    // Удаляем все данные из всех таблиц
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('friend_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    

    return true;
  } catch (error) {
    console.error('❌ Ошибка очистки данных:', error);
    return false;
  }
};

// Исправление поврежденных данных (заглушка для совместимости)
export const fixCorruptedData = async (): Promise<void> => {
  try {

    // В Supabase версии эта функция не нужна, так как данные хранятся в базе
    
  } catch (error) {
    console.error('❌ Ошибка исправления данных:', error);
  }
};

// Загрузка уведомлений
export const loadNotifications = async (userId?: string): Promise<any[]> => {
  try {
    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка загрузки уведомлений:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Ошибка загрузки уведомлений:', error);
    return [];
  }
};

// Создание уведомления
export const createNotification = async (notification: any): Promise<any> => {
  try {
    console.log('🔔 Создание уведомления:', notification);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания уведомления:', error);
      return null;
    }
    
    
    return data;
  } catch (error) {
    console.error('❌ Ошибка создания уведомления:', error);
    return null;
  }
};

// Отметка уведомления как прочитанного
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Ошибка отметки уведомления:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Ошибка отметки уведомления:', error);
    return false;
  }
};

// Принудительная инициализация хранилища (заглушка для совместимости)
export const forceInitializeStorage = async (): Promise<boolean> => {
  try {
    console.log('🔧 Принудительная инициализация Supabase хранилища...');
    await initializeStorage();
    return true;
  } catch (error) {
    console.error('❌ Ошибка принудительной инициализации:', error);
    return false;
  }
};

// Создание администратора
export const createAdmin = async (): Promise<Player | null> => {
  try {
    const adminData = {
      name: 'Администратор',
      position: 'Администратор',
      team: 'Система',
      age: 30,
      height: 180,
      weight: 80,
      email: 'admin',
      password: 'admin123',
      status: 'admin',
      city: 'Минск',
      goals: 0,
      assists: 0,
      games: 0,
      pull_ups: 0,
      push_ups: 0,
      plank_time: 0,
      sprint_100m: 0,
      long_jump: 0
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([adminData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания администратора:', error);
      return null;
    }
    
    
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error);
    return null;
  }
};

// Функция для получения полученных запросов дружбы
export const getReceivedFriendRequests = async (userId: string): Promise<Player[]> => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        players!friend_requests_from_id_fkey(*)
      `)
      .eq('to_id', userId)
      .eq('status', 'pending');
    
    if (error) {
      console.error('❌ Ошибка загрузки запросов дружбы:', error);
      return [];
    }
    
    return (data || []).map(item => convertSupabaseToPlayer(item.players));
  } catch (error) {
    console.error('❌ Ошибка загрузки запросов дружбы:', error);
    return [];
  }
};

// Функция для исправления данных администратора
export const fixAdminData = async (): Promise<void> => {
  try {

    
    const { data: admins, error } = await supabase
      .from('players')
      .select('*')
      .eq('status', 'admin');
    
    if (error) {
      console.error('❌ Ошибка поиска администраторов:', error);
      return;
    }
    
    if (admins && admins.length > 0) {
  
      
      // Исправляем аватар для каждого администратора
      for (const admin of admins) {
        console.log(`🔧 Проверяем администратора: ${admin.name} (ID: ${admin.id})`);
        console.log(`📸 Текущий аватар: ${admin.avatar}`);
        
        // Если аватар пустой или содержит некорректные данные, очищаем его
        if (!admin.avatar || admin.avatar === '' || admin.avatar === 'admin' || admin.avatar.includes('admin')) {
          console.log('⚠️ Аватар администратора некорректный, очищаем...');
          
          const { error: updateError } = await supabase
            .from('players')
            .update({ avatar: null })
            .eq('id', admin.id);
          
          if (updateError) {
            console.error('❌ Ошибка очистки аватара:', updateError);
          } else {
            console.log('✅ Аватар администратора очищен');
          }
        }
      }
    } else {
      console.log('⚠️ Администраторы не найдены, создаем нового...');
      await createAdmin();
    }
  } catch (error) {
    console.error('❌ Ошибка исправления данных администратора:', error);
  }
};

// Функция для принудительного исправления аватара администратора
export const fixAdminAvatar = async (): Promise<void> => {
  try {
    console.log('🔧 Принудительное исправление аватара администратора...');
    
    // Находим текущего пользователя
    const currentUser = await loadCurrentUser();
    if (!currentUser || currentUser.status !== 'admin') {
      console.log('❌ Текущий пользователь не является администратором');
      return;
    }
    
    console.log(`👑 Исправляем аватар для администратора: ${currentUser.name}`);
    console.log(`📸 Текущий аватар: ${currentUser.avatar}`);
    
    // Очищаем аватар администратора
    const { error } = await supabase
      .from('players')
      .update({ avatar: null })
      .eq('id', currentUser.id);
    
    if (error) {
      console.error('❌ Ошибка очистки аватара:', error);
    } else {
      console.log('✅ Аватар администратора очищен, теперь можно загрузить новый');
      
      // Обновляем текущего пользователя
      const updatedUser = { ...currentUser, avatar: undefined };
      await saveCurrentUser(updatedUser);
    }
  } catch (error) {
    console.error('❌ Ошибка исправления аватара администратора:', error);
  }
};

// Функция для получения количества непрочитанных сообщений
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', userId)
      .eq('read', false);
    
    if (error) {
      return 0;
    }
    
    return data?.length || 0;
  } catch (error) {
    return 0;
  }
};

// Функция для расчета стажа в хоккее
export const calculateHockeyExperience = (startDate?: string): string => {
  // Расчет опыта хоккея для даты
  if (!startDate || startDate === '' || startDate === 'null') {
    return '';
  }
  
  try {
    const [month, year] = startDate.split('.');
    
    if (!month || !year) {
      return '';
    }
    
    const start = new Date(parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Правильное склонение для русского языка
    const getYearWord = (num: number): string => {
      if (num === 1) return 'год';
      if (num >= 2 && num <= 4) return 'года';
      return 'лет';
    };
    
    const result = years > 0 ? `${years} ${getYearWord(years)}` : `${months} мес.`;
    return result;
  } catch (error) {
    console.error('❌ Ошибка расчета опыта хоккея:', error);
    return '';
  }
}; 

// Функция для принудительной миграции всех изображений в Storage
export const migrateAllImagesToStorage = async (): Promise<void> => {
  try {
    console.log('🔄 Начинаем принудительную миграцию всех изображений...');
    
    // Загружаем всех игроков
    const players = await loadPlayers();
    console.log(`📊 Найдено игроков для миграции: ${players.length}`);
    
    let migratedCount = 0;
    
    for (const player of players) {
      let hasChanges = false;
      const updates: Partial<Player> = {};
      
      // Мигрируем аватар
      if (player.avatar && (player.avatar.startsWith('file://') || player.avatar.startsWith('content://') || player.avatar.startsWith('data:'))) {
        console.log(`🔄 Мигрируем аватар игрока ${player.name}: ${player.avatar}`);
        const { uploadImageToStorage } = await import('./uploadImage');
        const migratedAvatarUrl = await uploadImageToStorage(player.avatar);
        if (migratedAvatarUrl) {
          updates.avatar = migratedAvatarUrl;
          hasChanges = true;
          console.log(`✅ Аватар игрока ${player.name} мигрирован: ${migratedAvatarUrl}`);
        }
      }
      
      // Мигрируем фотографии
      if (player.photos && player.photos.length > 0) {
        const migratedPhotos = [];
        let photosChanged = false;
        
        for (const photo of player.photos) {
          if (photo.startsWith('file://') || photo.startsWith('content://') || photo.startsWith('data:')) {
            console.log(`🔄 Мигрируем фото игрока ${player.name}: ${photo}`);
            const { uploadImageToStorage } = await import('./uploadImage');
            const migratedUrl = await uploadImageToStorage(photo);
            if (migratedUrl) {
              migratedPhotos.push(migratedUrl);
              photosChanged = true;
              console.log(`✅ Фото игрока ${player.name} мигрировано: ${migratedUrl}`);
            }
          } else {
            migratedPhotos.push(photo);
          }
        }
        
        if (photosChanged) {
          updates.photos = migratedPhotos;
          hasChanges = true;
        }
      }
      
      // Обновляем игрока, если были изменения
      if (hasChanges) {
        const updatedPlayer = await updatePlayer(player.id, updates);
        if (updatedPlayer) {
          migratedCount++;
          console.log(`✅ Игрок ${player.name} обновлен`);
        }
      }
    }
    
    console.log(`🎉 Миграция завершена! Обновлено игроков: ${migratedCount}`);
  } catch (error) {
    console.error('❌ Ошибка миграции изображений:', error);
  }
};

// Проверка состояния базы данных
export const checkDatabaseStatus = async (): Promise<void> => {
  try {
    console.log('🔍 Проверка состояния базы данных Supabase...');
    console.log('🔗 URL Supabase настроен');
    
    // Проверяем подключение к таблице players
    const { data, error } = await supabase
      .from('players')
      .select('id, name, email, status')
      .limit(5);
    
    if (error) {
      console.error('❌ Ошибка подключения к таблице players:', error);
      console.error('❌ Детали ошибки:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('✅ Подключение к таблице players успешно');
      console.log('📊 Количество пользователей в базе:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('👥 Первые пользователи в базе:');
        data.forEach((player, index) => {
          console.log(`   ${index + 1}. ${player.name} (${player.email}) - ${player.status}`);
        });
      } else {
        console.log('⚠️ В базе данных нет пользователей');
      }
    }
    
    // Проверяем подключение к таблице items
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('id, type, owner_id')
      .limit(1);
    
    if (itemsError) {
      console.error('❌ Ошибка подключения к таблице items:', itemsError);
    } else {
      console.log('✅ Подключение к таблице items успешно');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки состояния базы данных:', error);
  }
};

// Функции для работы с упражнениями

// Отметить упражнение как выполненное
export const completeExercise = async (playerId: string, exerciseId: string): Promise<boolean> => {
  try {
    console.log('✅ Отмечаем упражнение как выполненное:', { playerId, exerciseId });
    
    // Получаем текущего игрока
    const player = await getPlayerById(playerId);
    if (!player) {
      console.error('❌ Игрок не найден');
      return false;
    }
    
    // Проверяем, что это игрок (не тренер/скаут/звезда)
    if (player.status !== 'player') {
      console.error('❌ Упражнения доступны только для игроков');
      return false;
    }
    
    // Инициализируем статистику упражнений, если её нет
    let exerciseStats = player.exerciseStats || {
      completions: [],
      totalCompletions: 0
    };
    
    // Ищем существующую запись для этого упражнения
    const existingCompletion = exerciseStats.completions.find(c => c.exerciseId === exerciseId);
    
    if (existingCompletion) {
      // Увеличиваем счетчик
      existingCompletion.count += 1;
      existingCompletion.completedAt = new Date().toISOString();
    } else {
      // Добавляем новую запись
      exerciseStats.completions.push({
        exerciseId,
        completedAt: new Date().toISOString(),
        count: 1
      });
    }
    
    // Обновляем общую статистику
    exerciseStats.totalCompletions += 1;
    exerciseStats.lastCompletedAt = new Date().toISOString();
    
    // Сохраняем обновленные данные
    const success = await updatePlayer(playerId, { exerciseStats }, playerId);
    
    if (success) {
      console.log('✅ Упражнение отмечено как выполненное');
      return true;
    } else {
      console.error('❌ Ошибка сохранения статистики упражнений');
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отметки упражнения:', error);
    return false;
  }
};

// Получить статистику упражнений игрока
export const getPlayerExerciseStats = async (playerId: string): Promise<PlayerExerciseStats | null> => {
  try {
    const player = await getPlayerById(playerId);
    if (!player) return null;
    
    return player.exerciseStats || {
      completions: [],
      totalCompletions: 0
    };
  } catch (error) {
    console.error('❌ Ошибка получения статистики упражнений:', error);
    return null;
  }
};

// Получить количество выполнений конкретного упражнения
export const getExerciseCompletionCount = async (playerId: string, exerciseId: string): Promise<number> => {
  try {
    const stats = await getPlayerExerciseStats(playerId);
    if (!stats) return 0;
    
    const completion = stats.completions.find(c => c.exerciseId === exerciseId);
    return completion ? completion.count : 0;
  } catch (error) {
    console.error('❌ Ошибка получения количества выполнений:', error);
    return 0;
  }
};

// Получить топ упражнений по популярности (для всех игроков)
export const getExerciseRankings = async (): Promise<{ exerciseId: string; totalCompletions: number }[]> => {
  try {
    console.log('📊 Получаем рейтинг упражнений...');
    
    // Загружаем всех игроков
    const players = await loadPlayers();
    const exerciseRankings: Record<string, number> = {};
    
    // Подсчитываем выполнения по всем игрокам
    players.forEach(player => {
      if (player.status === 'player' && player.exerciseStats) {
        player.exerciseStats.completions.forEach(completion => {
          exerciseRankings[completion.exerciseId] = 
            (exerciseRankings[completion.exerciseId] || 0) + completion.count;
        });
      }
    });
    
    // Конвертируем в массив и сортируем по популярности
    const rankings = Object.entries(exerciseRankings)
      .map(([exerciseId, totalCompletions]) => ({ exerciseId, totalCompletions }))
      .sort((a, b) => b.totalCompletions - a.totalCompletions);
    
    console.log('📊 Рейтинг упражнений получен:', rankings.length, 'упражнений');
    return rankings;
  } catch (error) {
    console.error('❌ Ошибка получения рейтинга упражнений:', error);
    return [];
  }
};

// Поиск игрока по email
export const getPlayerByEmail = async (email: string): Promise<Player | null> => {
  try {
    console.log('🔍 Поиск игрока по email:', email);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка поиска игрока по email:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('👤 Игрок с email не найден:', email);
      return null;
    }
    
    const supabasePlayer = data[0];
    const player = convertSupabaseToPlayer(supabasePlayer);
    
    console.log('✅ Игрок найден по email:', player.name);
    return player;
  } catch (error) {
    console.error('❌ Ошибка поиска игрока по email:', error);
    return null;
  }
};

// Поиск игрока по телефону
export const getPlayerByPhone = async (phone: string): Promise<Player | null> => {
  try {
    console.log('🔍 Поиск игрока по телефону:', phone);
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('phone', phone.trim())
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка поиска игрока по телефону:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('👤 Игрок с телефоном не найден:', phone);
      return null;
    }
    
    const supabasePlayer = data[0];
    const player = convertSupabaseToPlayer(supabasePlayer);
    
    console.log('✅ Игрок найден по телефону:', player.name);
    return player;
  } catch (error) {
    console.error('❌ Ошибка поиска игрока по телефону:', error);
    return null;
  }
};

// Создание нового игрока в базе данных
export const createPlayer = async (playerData: Player): Promise<Player | null> => {
  try {
    console.log('👤 Создаем нового игрока:', playerData.name);
    
    // Конвертируем данные игрока в формат Supabase
    const supabaseData = convertPlayerToSupabase(playerData);
    
    const { data, error } = await supabase
      .from('players')
      .insert([supabaseData])
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания игрока:', error);
      return null;
    }
    
    if (!data) {
      console.error('❌ Нет данных после создания игрока');
      return null;
    }
    
    const createdPlayer = convertSupabaseToPlayer(data);
    console.log('✅ Игрок создан успешно:', createdPlayer.name);
    return createdPlayer;
    
  } catch (error) {
    console.error('❌ Ошибка создания игрока:', error);
    return null;
  }
};