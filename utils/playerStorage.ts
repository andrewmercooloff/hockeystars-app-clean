import { supabase } from './supabase';
import { avatarCache, updateAvatarGlobally, preloadPlayerAvatars } from './AvatarCache';
import { dataCache, CACHE_KEYS } from './DataCache';

// Глобальный кеш для пользователя
let globalUserCache: Player | null = null;

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
  instagram?: string;
  tiktok?: string;
  vk?: string;
  website?: string;
  created_at?: string;
  updated_at?: string;
  // Поля для магазинов
  address?: string;
  working_hours?: string;
  discount_for_friends?: string;
  // Поля для тренеров
  coach_years?: number[] | null;
  // Поля для индивидуальных тренировок и услуг заточки коньков
  individual_training?: string[] | null;
  skate_services?: string[] | null;
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
  teamNameRu?: string;
  teamType: string;
  teamCountry?: string;
  teamCity?: string;
  isPrimary: boolean;
  joinedDate?: string;
  startYear?: number;
  endYear?: number;
  teamOrder?: number;
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
  teamNameRu?: string;
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

// Интерфейс для отслеживания изменений статистики
export interface StatChange {
  field: string;
  oldValue: number;
  newValue: number;
  change: number; // разность (newValue - oldValue)
  timestamp: string;
}

// Интерфейс для отслеживания изменений нормативов
export interface NormativeChange {
  field: string;
  oldValue: number;
  newValue: number;
  change: number;
  timestamp: string;
}

// Интерфейс для уведомлений о изменениях
export interface StatsChangeNotification {
  id: string;
  playerId: string;
  playerName: string;
  type: 'stats_change' | 'normative_change';
  changes: StatChange[] | NormativeChange[];
  timestamp: string;
  isRead: boolean;
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
  notifications?: string;
  unreadMessagesCount?: number;
  friendRequestsCount?: number;
  giftRequestsCount?: number;
  exerciseStats?: PlayerExerciseStats;
  instagram?: string;
  tiktok?: string;
  vk?: string;
  website?: string;
  // Поля для магазинов
  address?: string;
  workingHours?: string;
  discountForFriends?: string;
  // Поля для тренеров
  coach_years?: number[]; // годы рождения игроков, которых тренирует
  individual_training?: string[]; // типы индивидуальных тренировок
  // Поля для заточки коньков
  skate_services?: string[]; // услуги заточки коньков
  // Рейтинг активности
  activityRating?: number; // рейтинг активности игрока
  // Дата создания
  createdAt?: string; // дата создания игрока в БД
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
    notifications: '[]',
    unreadMessagesCount: 0,
    friendRequestsCount: 0,
    giftRequestsCount: 0,
    instagram: supabasePlayer.instagram || '',
    tiktok: supabasePlayer.tiktok || '',
    vk: supabasePlayer.vk || '',
    website: supabasePlayer.website || '',
    // Поля для магазинов
    address: supabasePlayer.address || '',
    workingHours: supabasePlayer.working_hours || '',
    discountForFriends: supabasePlayer.discount_for_friends || '',
    exerciseStats: (() => {
      if (supabasePlayer.exercise_stats && 
          supabasePlayer.exercise_stats !== '{}' && 
          supabasePlayer.exercise_stats !== 'null' && 
          supabasePlayer.exercise_stats !== 'undefined' &&
          typeof supabasePlayer.exercise_stats === 'string') {
        try {
          const parsed = JSON.parse(supabasePlayer.exercise_stats);
          
          // Проверяем, что результат парсинга - это объект
          if (parsed && typeof parsed === 'object') {
            // Если completions - это массив (старый формат)
            if (Array.isArray(parsed.completions) && typeof parsed.totalCompletions === 'number') {
              return parsed;
            }
            // Если completions - это объект (новый формат)
            if (parsed.completions && typeof parsed.completions === 'object' && !Array.isArray(parsed.completions) && typeof parsed.totalCompletions === 'number') {
              // Конвертируем в старый формат для совместимости
              const completionsArray = Object.entries(parsed.completions).map(([exerciseId, count]) => ({
                exerciseId,
                count: count as number,
                completedAt: new Date().toISOString() // Используем текущую дату как приблизительную
              }));
              
              return {
                completions: completionsArray,
                totalCompletions: parsed.totalCompletions
              };
            }
          }
          // Если структура неправильная, возвращаем дефолт без ошибки
          return { completions: [], totalCompletions: 0 };
        } catch (error) {
          console.warn(`⚠️ Некорректные данные exercise_stats для игрока ${supabasePlayer.name || supabasePlayer.id}: "${supabasePlayer.exercise_stats}"`);
          return { completions: [], totalCompletions: 0 };
        }
      }
      return { completions: [], totalCompletions: 0 };
    })(),
    // Поля для тренеров
    coach_years: supabasePlayer.coach_years || undefined,
    // Поля для индивидуальных тренировок и услуг заточки коньков
    individual_training: supabasePlayer.individual_training || undefined,
    skate_services: supabasePlayer.skate_services || undefined,
    // Дата создания
    createdAt: supabasePlayer.created_at
  };
  
  
  return result;
};

// Функции для работы с командами

import { findTeamTranslation } from './teamTranslations';

// Поиск команд по названию с поддержкой переводов
export const searchTeams = async (searchTerm: string, language: string = 'ru'): Promise<Team[]> => {
  try {
    // Сначала получаем все команды
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .limit(100);
    
    if (error) {
      console.error('❌ Ошибка получения команд:', error);
      return [];
    }
    
    const teams = (data || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      type: team.type,
      country: team.country,
      city: team.city
    }));
    
    if (!searchTerm.trim()) {
      return teams.slice(0, 10);
    }
    
    // Фильтруем команды по поисковому запросу с использованием словаря переводов
    const filteredTeams = teams.filter((team: Team) => {
      return findTeamTranslation(team.name, searchTerm);
    });
    
    return filteredTeams.slice(0, 10); // Ограничиваем результаты
  } catch (error) {
    console.error('❌ Ошибка поиска команд:', error);
    return [];
  }
};

// Создание новой команды
export const createTeam = async (teamData: Omit<Team, 'id'>): Promise<Team | null> => {
  try {
    
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

// Получение команд игрока с кешированием
export const getPlayerTeams = async (playerId: string): Promise<PlayerTeam[]> => {
  try {
    // Кешируем результат на 10 минут для улучшения производительности
    const cacheKey = `teams_${playerId}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // Проверяем кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { teams, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        return teams;
      }
    }
    
    // Временно используем прямой запрос вместо RPC функции
    const { data, error } = await supabase
      .from('player_teams')
      .select(`
        team_id,
        is_primary,
        joined_date,
        start_year,
        end_year,
        team_order,
        teams!inner(
          id,
          name,
          name_ru,
          type,
          country,
          city
        )
      `)
      .eq('player_id', playerId)
      .order('team_order', { ascending: true });
    
    
    if (error) {
      console.error('❌ Ошибка получения команд игрока:', error);
      return [];
    }
    
    
    
    const teams = (data || []).map((team: any) => {
      const teamData = team.teams;
      
      
      return {
        teamId: team.team_id,
        teamName: teamData.name,
        teamNameRu: teamData.name_ru,
        teamType: teamData.type,
        teamCountry: teamData.country,
        teamCity: teamData.city,
        isPrimary: team.is_primary,
        joinedDate: team.joined_date,
        startYear: team.start_year,
        endYear: team.end_year,
        teamOrder: team.team_order || 0
      };
    });
    
    // Сортируем команды по team_order (если есть) или по дате добавления
    teams.sort((a: PlayerTeam, b: PlayerTeam) => {
      // Если есть team_order, сортируем по нему
      if (a.teamOrder !== undefined && b.teamOrder !== undefined) {
        return a.teamOrder - b.teamOrder;
      }
      // Иначе сортируем по дате добавления (сначала новые)
      const dateA = new Date(a.joinedDate || '1970-01-01');
      const dateB = new Date(b.joinedDate || '1970-01-01');
      return dateB.getTime() - dateA.getTime();
    });
    
    // Кешируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      teams,
      timestamp: Date.now()
    }));
    
    return teams;
  } catch (error) {
    console.error('❌ Ошибка получения команд игрока:', error);
    return [];
  }
};

// Добавление команды игроку
export const addPlayerTeam = async (playerId: string, teamId: string, isPrimary: boolean = false, startYear?: number, endYear?: number, teamOrder?: number): Promise<boolean> => {
  try {
    
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
    
    // Добавляем team_order только если поле существует в базе
    if (teamOrder !== undefined) {
      insertData.team_order = teamOrder;
    }
    
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
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка добавления команды игроку:', error);
    return false;
  }
};

// Удаление команды у игрока
export const removePlayerTeam = async (playerId: string, teamId: string): Promise<boolean> => {
  try {
    
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
    teamNameRu: playerTeam.teamNameRu,
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
    const pastTeams = playerTeams.map(convertPlayerTeamToPastTeam);
    return pastTeams;
  } catch (error) {
    console.error('❌ Ошибка получения команд игрока:', error);
    return [];
  }
};

// Синхронизация команд игрока с базой данных (оптимизированная версия)
export const syncPlayerTeams = async (playerId: string, currentTeams: PastTeam[], pastTeams: PastTeam[]): Promise<boolean> => {
  // Объявляем переменную для бэкапа вне try/catch для доступа в catch
  let oldTeamsData: any = null;
  
  try {
    // Проверяем, что playerId валидный
    if (!playerId) {
      console.error('❌ syncPlayerTeams: playerId не указан');
      return false;
    }
    
    // 1. Создаем бэкап существующих команд для отката при ошибке
    const { data, error: backupError } = await supabase
      .from('player_teams')
      .select('*')
      .eq('player_id', playerId);
    
    oldTeamsData = data;
    
    if (backupError) {
      console.error('❌ Ошибка создания бэкапа команд:', backupError);
      return false;
    }
    
    // 2. Подготавливаем все команды для добавления
    const allTeams = [
      ...currentTeams.map(team => ({ ...team, isCurrent: true })),
      ...pastTeams.filter(team => !team.isCurrent).map(team => ({ ...team, isCurrent: false }))
    ];
    
    // 3. Проверяем валидность всех ID команд ПЕРЕД удалением
    console.log('📋 Проверка команд для сохранения:', { 
      total: allTeams.length, 
      teams: allTeams.map(t => ({ id: t.id, name: t.teamName, isCurrent: t.isCurrent }))
    });
    
    const invalidTeams = allTeams.filter(team => !team.id || team.id === 'undefined' || team.id === 'null');
    if (invalidTeams.length > 0) {
      console.error('❌ Найдены невалидные ID команд:', invalidTeams.map(t => ({ name: t.teamName, id: t.id })));
      return false;
    }
    
    // 4. Очищаем поле pastTeams в таблице players
    const { error: clearPastTeamsError } = await supabase
      .from('players')
      .update({ past_teams: '[]' })
      .eq('id', playerId);
    
    if (clearPastTeamsError) {
      console.error('❌ Ошибка очистки поля pastTeams:', clearPastTeamsError);
      return false;
    }
    
    // 5. Удаляем все существующие команды игрока
    const { error: deleteTeamsError } = await supabase
      .from('player_teams')
      .delete()
      .eq('player_id', playerId);
    
    if (deleteTeamsError) {
      console.error('❌ Ошибка удаления существующих команд:', deleteTeamsError);
      return false;
    }
    
    // 6. Добавляем новые команды
    if (allTeams.length === 0) {
      // Если команд нет, операция успешна
      return true;
    }
    
    const addPromises = allTeams.map((team, index) => 
      addPlayerTeam(playerId, team.id, team.isCurrent, team.startYear, team.endYear, index)
    );
    
    const results = await Promise.all(addPromises);
    const failedTeams = results.filter((success) => !success);
    
    console.log('📊 Результаты добавления команд:', { 
      total: results.length, 
      successful: results.filter(r => r).length, 
      failed: failedTeams.length 
    });
    
    // 7. Если при добавлении произошла ошибка - восстанавливаем старые команды
    if (failedTeams.length > 0) {
      console.error(`❌ Ошибка добавления ${failedTeams.length} команд, восстанавливаем старые данные...`);
      console.error('📋 Детали ошибок:', failedTeams);
      
      // Восстанавливаем старые команды из бэкапа
      if (oldTeamsData && oldTeamsData.length > 0) {
        console.log('🔄 Восстановление команд из бэкапа...', { count: oldTeamsData.length });
        
        const restorePromises = oldTeamsData.map(team => {
          return addPlayerTeam(
            team.player_id, 
            team.team_id, 
            team.is_primary, 
            team.start_year, 
            team.end_year, 
            team.team_order
          );
        });
        
        await Promise.all(restorePromises);
        console.log('✅ Старые команды восстановлены');
      } else {
        console.warn('⚠️ Нет данных для восстановления');
      }
      
      return false;
    }
    
    console.log('✅ Все команды успешно сохранены');
    
    // 8. Очищаем кеш команд при успешной синхронизации
    await clearTeamsCache(playerId);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка синхронизации команд:', error);
    
    // Пытаемся восстановить команды из старого бэкапа
    if (oldTeamsData && oldTeamsData.length > 0) {
      console.log('🔄 Пытаемся восстановить команды из бэкапа...');
      const restorePromises = oldTeamsData.map(team => {
        return addPlayerTeam(
          team.player_id, 
          team.team_id, 
          team.is_primary, 
          team.start_year, 
          team.end_year, 
          team.team_order
        );
      });
      
      await Promise.all(restorePromises);
    }
    
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

// Функция для добавления поля team_order (выполняется один раз)
export const addTeamOrderField = async (): Promise<boolean> => {
  try {
    // Пробуем выполнить простой запрос к таблице player_teams с полем team_order
    // Если поле не существует, получим ошибку
    const { data, error } = await supabase
      .from('player_teams')
      .select('team_order')
      .limit(1);
    
    if (error) {
      // Если ошибка связана с отсутствием колонки, попробуем добавить её
      if (error.message.includes('team_order') || error.message.includes('column')) {
        
        // Пробуем добавить поле через RPC
        const { error: alterError } = await supabase
          .rpc('exec', {
            sql: 'ALTER TABLE player_teams ADD COLUMN IF NOT EXISTS team_order INTEGER DEFAULT 0;'
          });
        
        if (alterError) {
          console.error('❌ Ошибка добавления поля team_order:', alterError);
          // Если не можем добавить поле, просто возвращаем true - поле может уже существовать
          return true;
        }
        
        return true;
      } else {
        console.error('❌ Ошибка проверки поля team_order:', error);
        return false;
      }
    }
    
    // Если запрос прошёл успешно, поле уже существует
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка добавления поля team_order:', error);
    // В случае ошибки возвращаем true, чтобы не блокировать работу приложения
    return true;
  }
};

const convertPlayerToSupabase = (player: Omit<Player, 'id' | 'unread_notifications_count' | 'unreadMessagesCount'>): Omit<SupabasePlayer, 'id' | 'created_at' | 'updated_at'> => {
  // Функция для конвертации даты из DD.MM.YYYY или MM.YYYY в YYYY-MM-DD
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
    
    // Конвертируем из MM.YYYY в YYYY-MM-01 (первое число месяца)
    if (parts.length === 2) {
      const [month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-01`;
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
    email: player.email || undefined, // undefined вместо null для TypeScript
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
    exercise_stats: player.exerciseStats ? JSON.stringify(player.exerciseStats) : '{"completions":[],"totalCompletions":0}',
    instagram: player.instagram || '',
    tiktok: player.tiktok || '',
    vk: player.vk || '',
    website: player.website || '',
    // Поля для магазинов
    address: player.address || '',
    working_hours: player.workingHours || '',
    discount_for_friends: player.discountForFriends || '',
    // Поля для тренеров
    coach_years: player.coach_years || null,
    // Поля для индивидуальных тренировок и услуг заточки коньков
    individual_training: player.individual_training || null,
    skate_services: player.skate_services || null
  };
};

// Инициализация хранилища
export const initializeStorage = async (): Promise<void> => {
  try {
    
    // Проверяем подключение к Supabase
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка подключения к Supabase:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
    throw error;
  }
};

// Загрузка всех игроков
export const loadPlayers = async (forceRefresh = false): Promise<Player[]> => {
  try {
    const cacheKey = 'all_players';
    const cacheTime = 10 * 60 * 1000; // 10 минут
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Если forceRefresh = true, пропускаем проверку кэша
    if (!forceRefresh) {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { players, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < cacheTime) {
          return players;
        }
      }
    }
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Ошибка загрузки игроков из Supabase:', error);
      return [];
    }
    
    if (data) {
      // Преобразуем данные из Supabase в формат приложения
      const players = data.map(convertSupabaseToPlayer);
      
      // Обновляем кеш аватаров для всех игроков
      players.forEach(player => {
        if (player.avatar) {
          avatarCache.setAvatar(player.id, player.avatar);
        }
      });
      
      // Предзагружаем аватары в фоне
      preloadPlayerAvatars(players).catch(error => {
        console.error('❌ Ошибка предзагрузки аватаров:', error);
      });
      
      // Загружаем рейтинги активности для сортировки в поиске
      try {
        const { getPlayersActivityRatings } = await import('../services/activityService');
        const playerIds = players.map(p => p.id);
        
        const activityRatings = await getPlayersActivityRatings(playerIds);
        
        players.forEach(player => {
          player.activityRating = activityRatings[player.id] || 0;
        });
        
      } catch (ratingError) {
        console.error('❌ Ошибка загрузки рейтингов активности:', ratingError);
        // Устанавливаем рейтинг по умолчанию если не удалось загрузить
        players.forEach(player => {
          player.activityRating = 0;
        });
      }
      
      // Загружаем команды для каждого игрока
      console.warn('🏒 Начинаем загрузку команд для всех игроков...');
      try {
        const teamPromises = players.map(async (player) => {
          try {
            const teams = await getPlayerTeamsAsPastTeams(player.id);
            console.warn(`📊 Игрок ${player.name} (${player.id}) имеет ${teams.length} команд`);
            if (teams.length > 0) {
              console.warn(`  - Команды:`, teams.map(t => `${t.teamName} (ID: ${t.id})`).join(', '));
            }
            // Преобразуем PastTeam[] в PlayerTeam[] для совместимости
            player.teams = teams.map(team => ({
              teamId: team.id,
              teamName: team.teamName,
              teamNameRu: team.teamNameRu,
              teamType: team.teamType || 'club',
              teamCountry: team.teamCountry,
              teamCity: team.teamCity,
              isPrimary: team.isCurrent,
              joinedDate: team.joinedDate,
              startYear: team.startYear,
              endYear: team.endYear,
              teamOrder: team.teamOrder || 0
            }));
          } catch (error) {
            console.error(`❌ Ошибка загрузки команд для игрока ${player.id}:`, error);
            player.teams = [];
          }
        });
        
        await Promise.all(teamPromises);
        console.warn('✅ Загрузка команд завершена');
      } catch (teamsError) {
        console.error('❌ Ошибка загрузки команд:', teamsError);
        // Устанавливаем пустые команды если не удалось загрузить
        players.forEach(player => {
          player.teams = [];
        });
      }
      
      // Кешируем результат
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        players,
        timestamp: Date.now()
      }));
      
      return players;
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Ошибка загрузки игроков:', error);
    return [];
  }
};

// Очистка кеша игрока при обновлении
export const clearPlayerCache = async (playerId: string): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cacheKey = `player_${playerId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Кеш игрока ${playerId} очищен`);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша игрока:', error);
  }
};

// Очистка кеша всех игроков при обновлении
export const clearAllPlayersCache = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const playerCacheKeys = keys.filter((key: string) => key.startsWith('player_') || key === 'all_players');
    
    if (playerCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(playerCacheKeys);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки кеша игроков:', error);
  }
};

// Очистка кеша друзей при изменении дружбы
export const clearFriendsCache = async (userId: string): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cacheKey = `friends_${userId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Кеш друзей пользователя ${userId} очищен`);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша друзей:', error);
  }
};

// Очистка всего кеша друзей
export const clearAllFriendsCache = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const friendsCacheKeys = keys.filter((key: string) => key.startsWith('friends_'));
    
    if (friendsCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(friendsCacheKeys);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки кеша друзей:', error);
  }
};

// Очистка кеша команд при изменении команд игрока
export const clearTeamsCache = async (playerId: string): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cacheKey = `teams_${playerId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Кеш команд игрока ${playerId} очищен`);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша команд:', error);
  }
};

// Очистка всего кеша команд
export const clearAllTeamsCache = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const teamsCacheKeys = keys.filter((key: string) => key.startsWith('teams_'));
    
    if (teamsCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(teamsCacheKeys);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки кеша команд:', error);
  }
};

// Очистка кеша статуса дружбы при изменении дружбы
export const clearFriendshipCache = async (userId1: string, userId2: string): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cacheKey = `friendship_${userId1}_${userId2}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Кеш статуса дружбы ${userId1} <-> ${userId2} очищен`);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша статуса дружбы:', error);
  }
};

// Очистка всего кеша статусов дружбы
export const clearAllFriendshipCache = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const friendshipCacheKeys = keys.filter((key: string) => key.startsWith('friendship_'));
    
    if (friendshipCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(friendshipCacheKeys);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки кеша статусов дружбы:', error);
  }
};

// Очистка кеша статистики упражнений при изменении упражнений
export const clearExerciseStatsCache = async (playerId: string): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cacheKey = `exercise_stats_${playerId}`;
    await AsyncStorage.removeItem(cacheKey);
    // console.log(`🗑️ Кеш статистики упражнений игрока ${playerId} очищен`);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша статистики упражнений:', error);
  }
};

// Очистка всего кеша статистики упражнений
export const clearAllExerciseStatsCache = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const exerciseStatsCacheKeys = keys.filter((key: string) => key.startsWith('exercise_stats_'));
    
    if (exerciseStatsCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(exerciseStatsCacheKeys);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки кеша статистики упражнений:', error);
  }
};

// Отправка запроса дружбы с очисткой кеша
export const sendFriendRequest = async (fromId: string, toId: string): Promise<boolean> => {
  try {
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

    // Очищаем кеш статуса дружбы при отправке запроса
    await clearFriendshipCache(fromId, toId);
    
    // Получаем данные отправителя для уведомления
    const { data: senderData } = await supabase
      .from('players')
      .select('name, avatar')
      .eq('id', fromId)
      .single();
    
    if (senderData) {
      // Получаем язык получателя из БД
      const { getUserLanguage, loadTranslations } = await import('./languageHelper');
      const receiverLanguage = await getUserLanguage(toId);
      const translations = loadTranslations(receiverLanguage);
      
      // Локализованные тексты
      const title = translations?.notifications?.friendRequest || 'Friend Request';
      const message = translations?.notifications?.wantsToAddYou?.replace('{name}', senderData.name) 
        || `${senderData.name} sent you a friend request`;
      const pushTitle = `👋 ${title}`;
      const pushBody = translations?.notifications?.wantsToAddYou?.replace('{name}', senderData.name)
        || `${senderData.name} wants to add you as a friend`;
      
      // Создаем уведомление для получателя
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: toId,
            type: 'friend_request',
            title: title,
            message: message,
            is_read: false,
            data: {
              sender_id: fromId,
              sender_name: senderData.name,
              sender_avatar: senderData.avatar,
              playerId: fromId,
              playerName: senderData.name,
              playerAvatar: senderData.avatar
            }
          }]);
        
        if (notificationError) {
          console.error('❌ Ошибка создания in-app уведомления о запросе:', notificationError);
        } else {
          console.log('✅ In-app уведомление о запросе дружбы создано для:', toId);
        }
        
        // Увеличиваем счетчик уведомлений для получателя
        const { error: counterError } = await supabase.rpc('increment_unread_notifications', { user_id: toId });
        if (counterError) {
          console.error('❌ Ошибка увеличения счетчика уведомлений:', counterError);
        }
        
        // Отправляем push уведомление
        try {
          const { sendNotificationToUser } = await import('./notificationService');
          const pushResult = await sendNotificationToUser(
            toId,
            pushTitle,
            pushBody,
            {
              type: 'friend_request',
              sender_id: fromId,
              playerId: fromId,
              action: 'open_notifications'
            }
          );
          if (pushResult) {
            console.log('✅ Push-уведомление о запросе дружбы отправлено');
          } else {
            console.warn('⚠️ Push-уведомление о запросе дружбы не отправлено');
          }
        } catch (pushError) {
          console.error('⚠️ Ошибка отправки push уведомления:', pushError);
        }
      } catch (notificationError) {
        console.error('❌ Ошибка создания уведомления о запросе:', notificationError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки запроса дружбы:', error);
    return false;
  }
};

// Проверка статуса дружбы с кешированием
export const getFriendshipStatus = async (userId1: string, userId2: string): Promise<'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'> => {
  try {
    // Кешируем результат на 5 минут для улучшения производительности
    const cacheKey = `friendship_${userId1}_${userId2}`;
    const cacheTime = 5 * 60 * 1000; // 5 минут
    
    // Проверяем кэш (временно отключено для отладки)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    // Проверяем кеш
    if (cachedData) {
      const { status, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        return status;
      }
    }
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .single();
    
    if (error) {
      // Кешируем результат "none" при ошибке
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        status: 'none',
        timestamp: Date.now()
      }));
      return 'none';
    }
    
    // Определяем статус на основе данных
    let status: 'friends' | 'sent_request' | 'received_request' | 'none' | 'pending';
    
    if (data.status === 'friends' || data.status === 'accepted') {
      // 'accepted' и 'friends' означают одно и то же - пользователи друзья
      status = 'friends';
    } else if (data.status === 'pending' || data.status === 'sent_request' || data.status === 'received_request') {
      // Проверяем направление запроса
      if (data.from_id === userId1) {
        status = 'sent_request';
      } else {
        status = 'received_request';
      }
    } else {
      status = data.status as 'friends' | 'sent_request' | 'received_request' | 'none' | 'pending';
    }
    
    // Кешируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      status,
      timestamp: Date.now()
    }));
    
    return status;
  } catch (error) {
    console.error('❌ Ошибка получения статуса дружбы:', error);
    return 'none';
  }
};

// Получение игрока по ID с кешированием
export const getPlayerById = async (id: string): Promise<Player | null> => {
  try {
    // Кешируем результат на 10 минут для улучшения производительности
    const cacheKey = `player_${id}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // Проверяем кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { player, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        // // // // console.log('💪 getPlayerById: используем кешированные данные для игрока:', id);
        return player;
      }
    }
    
    // // // // // console.log('💪 getPlayerById: загружаем данные игрока из базы:', id);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Ошибка получения игрока:', error);
      return null;
    }
    if (!data) {
      // Нет строки — игрок не найден
      return null;
    }
    
    const player = convertSupabaseToPlayer(data);
    // // // // console.log('💪 getPlayerById: данные игрока загружены из базы:', { 
    //   id: player.id, 
    //   name: player.name,
    //   exerciseStats: player.exerciseStats
    // });
    
    // Обновляем кеш аватаров
    if (player.avatar) {
      avatarCache.setAvatar(player.id, player.avatar);
    }
    
    // Кешируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      player,
      timestamp: Date.now()
    }));
    
    return player;
  } catch (error) {
    console.error('❌ Ошибка получения игрока:', error);
    return null;
  }
};

// Добавление нового игрока
export const addPlayer = async (player: Omit<Player, 'id' | 'unread_notifications_count' | 'unreadMessagesCount'>): Promise<Player> => {
  try {
    // Добавляем игрока
    
    const supabasePlayer = convertPlayerToSupabase(player);
    
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
export const updatePlayer = async (playerId: string, updateData: Partial<Player>, skipCacheClear: boolean = false): Promise<Player | null> => {
  try {
    // Получаем старые данные игрока для отслеживания изменений
    const oldPlayer = await getPlayerById(playerId);
    
    // Конвертируем данные в формат Supabase
    const supabaseData = convertPlayerToSupabase(updateData as Player);
    
    const { data, error } = await supabase
      .from('players')
      .update(supabaseData)
      .eq('id', playerId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('❌ Ошибка обновления игрока:', error);
        return null;
      }
      
    if (!data) {
      console.error('❌ Не удалось найти игрока для обновления');
        return null;
    }
    
    const updatedPlayer = convertSupabaseToPlayer(data);
    
    // Проверяем изменение аватара и обновляем глобальный кеш
    if (oldPlayer && oldPlayer.avatar !== updatedPlayer.avatar) {
      // Очищаем старый аватар из всех кешей
      if (oldPlayer.avatar) {
        try {
          const { Image } = await import('expo-image');
          // Инвалидируем кеш старого аватара
          await Image.clearMemoryCache();
          await Image.clearDiskCache();
        } catch (error) {
          console.error('❌ Ошибка очистки кеша изображений:', error);
        }
      }
      
      // Очищаем AvatarCache для этого игрока перед обновлением
      avatarCache.clearAvatar(playerId);
      
      // Обновляем кеш аватаров
      if (updatedPlayer.avatar) {
        await updateAvatarGlobally(playerId, updatedPlayer.avatar);
      } else {
        avatarCache.clearAvatar(playerId);
      }
      
      // Уведомления об изменении аватара отправляются из handleSave в app/player/[id].tsx
      // Убрали дублирующий вызов отсюда, чтобы избежать двойных push-уведомлений
    }
    
    // Очищаем кеш игрока при обновлении (только если не пропускаем)
    if (!skipCacheClear) {
      await clearPlayerCache(playerId);
      // НЕ очищаем кеш всех игроков при каждом обновлении
      // await clearAllPlayersCache(); // Закомментировано для лучшей производительности
    }
    
    // Отслеживаем изменения статистики и нормативов
    if (oldPlayer) {
      const statChanges = trackStatsChanges(oldPlayer, updatedPlayer);
      const normativeChanges = trackNormativeChanges(oldPlayer, updatedPlayer);
      
      // Если есть изменения, сохраняем их в базу данных и отправляем уведомления друзьям
      if (statChanges.length > 0 || normativeChanges.length > 0) {
        // Сохраняем изменения статистики и нормативов в базу данных (действуют 7 дней)
        await saveStatsChanges(playerId, [...statChanges, ...normativeChanges]);
        
        // Отправляем уведомления друзьям асинхронно (не блокируем основной поток)
        setTimeout(async () => {
          try {
            await notifyFriendsAboutChanges(
              playerId, 
              updatedPlayer.name, 
              statChanges, 
              normativeChanges
            );
          } catch (error) {
            console.error('❌ Ошибка отправки уведомлений (не критично):', error);
          }
        }, 0);
      }
    }
    
    // Обновляем текущего пользователя в AsyncStorage асинхронно (не блокируем основной поток)
    const updateAsyncStorage = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const currentUserData = await AsyncStorage.getItem('hockeystars_current_user');
        
        if (currentUserData) {
          const currentUser = JSON.parse(currentUserData);
          if (currentUser.id === playerId) {
            await AsyncStorage.setItem('hockeystars_current_user', JSON.stringify(updatedPlayer));
            
            // Обновляем кэш
            const cacheKey = 'hockeystars_user_cache';
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              user: updatedPlayer,
              timestamp: Date.now()
            }));
          }
        }
      } catch (error) {
        console.error('❌ Ошибка обновления AsyncStorage (не критично):', error);
      }
    };

    // Используем setTimeout для веб-совместимости
    if (typeof setImmediate !== 'undefined') {
      setTimeout(updateAsyncStorage, 0);
    } else {
      setTimeout(updateAsyncStorage, 0);
    }
    
    return updatedPlayer;
  } catch (error) {
    console.error('❌ Ошибка обновления игрока:', error);
    return null;
  }
};

// Поиск игрока по email и паролю
export const findPlayerByCredentials = async (email: string, password: string): Promise<Player | null> => {
  try {
    
    // Сначала проверим, есть ли вообще пользователи в базе
    const { data: countData, error: countError } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Ошибка проверки количества пользователей:', countError);
    } else {
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
      // Логируем детали только при успешном входе, не при каждой проверке
      return convertSupabaseToPlayer(data);
    }
    
    
    // Проверим, есть ли пользователи с таким email
    const { data: emailCheck, error: emailError } = await supabase
      .from('players')
      .select('email')
      .eq('email', email);
    
    if (emailError) {
      console.error('❌ Ошибка проверки email:', emailError);
    } else if (emailCheck && emailCheck.length > 0) {
    } else {
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
    // СРАЗУ обновляем глобальный кеш для мгновенного доступа
    try {
      const { updateGlobalUserCache } = require('../contexts/UserContext');
      updateGlobalUserCache(user);
    } catch (e) {
      // Контекст еще не загружен, ничего страшного
    }
    
    // Проверяем, изменились ли данные пользователя
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const existingData = await AsyncStorage.getItem('hockeystars_current_user');
    
    if (existingData) {
      const existingUser = JSON.parse(existingData);
      // Логируем только если данные действительно изменились
      if (existingUser.id !== user.id || existingUser.status !== user.status) {
        // User data changed
      }
    } else {
      // New user
    }
    
    // Сохраняем пользователя и сразу создаем кеш для быстрого доступа
    const userWithTimestamp = { ...user, lastUpdated: Date.now() };
    
    await Promise.all([
      AsyncStorage.setItem('hockeystars_current_user', JSON.stringify(user)),
      AsyncStorage.setItem('hockeystars_user_cache', JSON.stringify({
        user: userWithTimestamp,
        timestamp: Date.now()
      }))
    ]);
    
  } catch (error) {
    console.error('❌ Ошибка сохранения текущего пользователя:', error);
  }
};

// Загрузка текущего пользователя
export const loadCurrentUser = async (forceRefresh = false): Promise<Player | null> => {
  try {
    // Кэшируем результат на короткое время, чтобы избежать повторных логов
    const cacheKey = 'hockeystars_user_cache';
    const cacheTime = 60000; // Увеличиваем до 1 минуты для лучшей производительности
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let wasFromCache = false;
    
    // Очищаем кеш при принудительном обновлении
    if (forceRefresh) {
      await AsyncStorage.removeItem(cacheKey);
      console.log('🔄 Кеш пользователя очищен при принудительном обновлении');
    } else {
      // Проверяем кэш только если не принудительное обновление
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { user, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < cacheTime) {
          // Быстро возвращаем кешированного пользователя
          return user;
        }
      }
    }
    
    // Загрузка текущего пользователя
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    
    if (!userData) {
      return null;
    }
    
    const user = JSON.parse(userData);
    
    // Сразу загружаем счетчик сообщений из базы для мгновенного отображения правильного значения
    try {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('unread_messages_count')
        .eq('id', user.id)
        .single();
      
      if (!playerError && playerData) {
        user.unreadMessagesCount = playerData.unread_messages_count || 0;
      } else {
        // Fallback на 0 если не удалось загрузить
        user.unreadMessagesCount = 0;
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки счетчика сообщений:', error);
      user.unreadMessagesCount = 0;
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
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Проверим, есть ли данные пользователя перед удалением
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    if (userData) {
      const user = JSON.parse(userData);
    }
    
    // Очищаем все связанные данные
    await AsyncStorage.removeItem('hockeystars_current_user');
    await AsyncStorage.removeItem('hockeystars_user_cache');
    await AsyncStorage.removeItem('hockeystars_last_user_id');
    
    // Обновляем глобальный кеш и контекст пользователя
    try {
      const { updateGlobalUserCache, globalUserCache } = await import('../contexts/UserContext');
      updateGlobalUserCache(null);
    } catch (contextError) {
      console.error('❌ Ошибка обновления контекста пользователя:', contextError);
    }
    
    // Редирект убран - проверка авторизации происходит в _layout.tsx
    // Попытка редиректа может вызвать ошибку навигации при выходе из профиля
    // try {
    //   const { router } = await import('expo-router');
    //   router.replace('/login');
    // } catch (routerError) {
    //   console.error('❌ Ошибка редиректа:', routerError);
    // }
    
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
    // console.log('📨 ОТПРАВКА СООБЩЕНИЯ:', {
    //   senderId,
    //   receiverId,
    //   text: text.substring(0, 30) + '...'
    // });
    
    const message = {
      senderId,
      receiverId,
      text,
      read: false
    };
    
    await sendMessage(message);
    
    // Отправляем push-уведомление напрямую (альтернатива Realtime)
    try {
      const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
      
      // Получаем данные отправителя
      const senderPlayer = await getPlayerById(senderId);
      if (senderPlayer) {
      // Получаем токены получателя
      const receiverTokens = await getUserPushTokens(receiverId);
      
      if (receiverTokens.length > 0) {
        await sendMessageNotification(
          receiverTokens,
          senderPlayer.name || 'Пользователь',
          text,
          senderId
        );
      }
      }
    } catch (pushError) {
      console.error('❌ Ошибка отправки push-уведомления:', pushError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return false;
  }
};

// Отметка сообщений как прочитанные
export const markMessagesAsRead = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    // Сначала проверим, сколько непрочитанных сообщений есть
    const { data: unreadData, error: unreadError } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false);
    
    if (unreadError) {
      console.error('❌ Ошибка проверки непрочитанных сообщений:', unreadError);
      return;
    }
    
    if ((unreadData?.length || 0) === 0) {
      return;
    }
    
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false)
      .select();
    
    if (error) {
      console.error('❌ Ошибка отметки сообщений как прочитанные:', error);
    } else {
      
      // Проверим, что сообщения действительно обновились
      const { data: verifyData, error: verifyError } = await supabase
        .from('messages')
        .select('id, read')
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('read', false);
      
      if (verifyError) {
        console.error('❌ Ошибка проверки обновления:', verifyError);
      } else {
      }
      
      // Проверим, что счетчик в БД обновился (триггер должен был сработать)
      const { data: countData, error: countError } = await supabase
        .from('players')
        .select('unread_messages_count')
        .eq('id', userId)
        .single();
      
      if (countError) {
        console.error('❌ Ошибка проверки счетчика в БД:', countError);
      } else {
      }
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
    console.log('🟢 acceptFriendRequest вызван:', { userId1, userId2 });
    
    // Получаем информацию о запросе, чтобы узнать кто отправитель, а кто получатель
    const { data: requestData } = await supabase
      .from('friend_requests')
      .select('from_id, to_id')
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'pending')
      .single();
    
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'pending');
    
    if (error) {
      console.error('❌ Ошибка принятия запроса дружбы:', error);
      return false;
    }
    
    // Очищаем кеш статуса дружбы после принятия запроса
    await clearFriendshipCache(userId1, userId2);
    console.log('✅ Кеш статуса дружбы очищен после принятия запроса');
    
    // Получаем имя и аватар того, кто принял запрос (userId1 - тот кто принимает)
    const { data: acceptorData } = await supabase
      .from('players')
      .select('name, avatar')
      .eq('id', userId1)
      .single();
    
    // Определяем кто отправитель запроса
    // Если from_id == userId1 (принимающий), то отправитель - userId2
    // Если from_id != userId1, то from_id и есть отправитель
    const senderId = requestData?.from_id === userId1 ? userId2 : requestData?.from_id;
    
    // console.log('📝 Отправка уведомления о принятии:', {
    //   acceptorId: userId1,
    //   acceptorName: acceptorData?.name,
    //   acceptorAvatar: acceptorData?.avatar,
    //   senderId: senderId,
    //   requestFromId: requestData?.from_id,
    //   requestToId: requestData?.to_id
    // });
    
    // Создаем уведомление для ОТПРАВИТЕЛЯ запроса о том, что его запрос принят
    if (acceptorData && senderId) {
      try {
        await supabase
          .from('notifications')
          .insert([{
            user_id: senderId,
            type: 'friend_accepted',
            title: 'Friend Request Accepted',
            message: `${acceptorData.name} accepted your friend request`,
            is_read: false,
            data: { 
              acceptor_id: userId1,
              acceptor_name: acceptorData.name,
              acceptor_avatar: acceptorData.avatar
            }
          }]);
        
        // Увеличиваем счетчик уведомлений для отправителя
        await supabase.rpc('increment_unread_notifications', { user_id: senderId });
        
        
        // Отправляем push уведомление
        try {
          const { getUserPushTokens, sendNotificationToUser } = await import('./notificationService');
          await sendNotificationToUser(
            senderId,
            '🤝 Запрос принят',
            `${acceptorData.name} принял ваш запрос в друзья`,
            {
              type: 'friend_accepted',
              acceptor_id: userId1,
              action: 'open_notifications'
            }
          );
        } catch (pushError) {
          console.error('⚠️ Ошибка отправки push уведомления:', pushError);
        }
      } catch (notificationError) {
        console.error('❌ Ошибка создания уведомления о принятии:', notificationError);
      }
    }
    
    // Уведомляем друзей о новой дружбе
    await notifyFriendsAboutNewFriendship(userId1, userId2);
    
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
    
    // Очищаем кеш статуса дружбы после отклонения запроса
    await clearFriendshipCache(userId1, userId2);
    console.log('✅ Кеш статуса дружбы очищен после отклонения запроса');
    
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
    
    // Удаляем уведомление о запросе в друзья у получателя
    try {
      const { data: deletedNotifications } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', toId)
        .eq('type', 'friend_request')
        .contains('data', { from_id: fromId })
        .select();
      
      if (deletedNotifications && deletedNotifications.length > 0) {
        // Получаем текущий счетчик и уменьшаем на 1
        const { data: playerData } = await supabase
          .from('players')
          .select('unread_notifications_count')
          .eq('id', toId)
          .single();
        
        const currentCount = playerData?.unread_notifications_count || 0;
        const newCount = Math.max(currentCount - 1, 0);
        
        await supabase
          .from('players')
          .update({ unread_notifications_count: newCount })
          .eq('id', toId);
        
        // console.log('✅ Уведомление о запросе в друзья удалено после отмены и счетчик обновлен:', newCount);
      }
    } catch (notificationError) {
      console.error('⚠️ Ошибка удаления уведомления (не критично):', notificationError);
    }
    
    // Очищаем кеш статуса дружбы после отмены запроса
    await clearFriendshipCache(fromId, toId);
    console.log('✅ Кеш статуса дружбы очищен после отмены запроса');
    
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
    
    // Очищаем кеш статуса дружбы после удаления из друзей
    await clearFriendshipCache(userId1, userId2);
    console.log('✅ Кеш статуса дружбы очищен после удаления из друзей');
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления из друзей:', error);
    return false;
  }
};

// Получение друзей пользователя с кешированием
export const getFriends = async (userId: string): Promise<Player[]> => {
  try {
    // Кешируем результат на 10 минут для улучшения производительности
    const cacheKey = `friends_${userId}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // Проверяем кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { friends, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        return friends;
      }
    }
    
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
    
    // Конвертируем друзей (без загрузки команд для ускорения)
    const friendsWithTeams = (friends || []).map((friend) => {
      const convertedFriend = convertSupabaseToPlayer(friend);
      // Используем team из основного запроса (уже есть в данных игрока)
      // Дополнительная загрузка команд замедляет загрузку друзей
      return convertedFriend;
    });
    
    // Кешируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      friends: friendsWithTeams,
      timestamp: Date.now()
    }));
    
    return friendsWithTeams;
  } catch (error) {
    console.error('❌ Ошибка получения друзей:', error);
    return [];
  }
};

// Удаление игрока
export const deletePlayer = async (playerId: string): Promise<boolean> => {
  try {
    console.log(`🗑️ Удаляем игрока с ID: ${playerId}`);
    
    // Проверяем, существует ли игрок перед удалением
    const { data: existingBefore, error: existErr } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .limit(1);
    if (existErr) {
      console.error('❌ Ошибка проверки существования игрока перед удалением:', existErr);
    }
    if (!existingBefore || existingBefore.length === 0) {
      console.warn('⚠️ Игрок с таким ID не найден перед удалением. Отменяем операцию.');
      return false;
    }

    // Удаляем связанные данные
    const [notifResult, messagesResult, friendRequestsResult, teamsResult] = await Promise.all([
      // Удаляем уведомления игрока
      supabase.from('notifications').delete().eq('user_id', playerId),
      // Удаляем сообщения игрока
      supabase.from('messages').delete().or(`sender_id.eq.${playerId},receiver_id.eq.${playerId}`),
      // Удаляем запросы дружбы игрока
      supabase.from('friend_requests').delete().or(`from_id.eq.${playerId},to_id.eq.${playerId}`),
      // Удаляем команды игрока
      supabase.from('player_teams').delete().eq('player_id', playerId)
    ]);
    
    // Проверяем ошибки при удалении связанных данных
    if (notifResult.error) console.error('❌ Ошибка удаления уведомлений:', notifResult.error);
    if (messagesResult.error) console.error('❌ Ошибка удаления сообщений:', messagesResult.error);
    if (friendRequestsResult.error) console.error('❌ Ошибка удаления запросов дружбы:', friendRequestsResult.error);
    if (teamsResult.error) console.error('❌ Ошибка удаления команд:', teamsResult.error);

    // Пытаемся удалить статистику упражнений, если таблица есть
    try {
      const exDel = await supabase.from('exercise_completions').delete().eq('player_id', playerId);
      if ((exDel as any)?.error && (exDel as any).error.code !== '42P01') {
        console.error('❌ Ошибка удаления упражнений:', (exDel as any).error);
      }
    } catch {}
    
    // Пытаемся удалить записи из дополнительных таблиц (не критично, оборачиваем в try)
    try { await supabase.from('player_museum').delete().eq('player_id', playerId); } catch {}
    try { await supabase.from('photos').delete().eq('player_id', playerId); } catch {}
    try { await supabase.from('videos').delete().eq('player_id', playerId); } catch {}

    // Удаляем самого игрока
    const { error, data } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)
      .select(); // Добавляем select для получения результата
    
    if (error) {
      console.error('❌ Ошибка удаления игрока:', error);
      return false;
    }
    // Проверяем, что запись действительно удалена
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error('❌ Удаление не произошло: запись не удалена (пустой результат).');
      return false;
    }

    console.log(`✅ Игрок успешно удален. Результат:`, data);
    
    // Очищаем кеши после успешного удаления
    try {
      // Очищаем AvatarCache для удаленного игрока
      avatarCache.clearAvatar(playerId);
      
      // Очищаем AsyncStorage кэш конкретного игрока
      await clearPlayerCache(playerId);
      
      // Очищаем DataCache для списка игроков
      dataCache.invalidate(CACHE_KEYS.PLAYERS);
      
      // Очищаем кэш всех игроков для гарантии
      await clearAllPlayersCache();
      
      console.log(`✅ Кеши очищены для удаленного игрока`);
    } catch (cacheError) {
      console.warn('⚠️ Ошибка очистки кешей:', cacheError);
      // Не считаем это критической ошибкой, так как основное удаление прошло успешно
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления игрока:', error);
    return false;
  }
};

// Очистка всех данных (для тестирования)
export const clearAllData = async (): Promise<boolean> => {
  try {
    
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

    // Сначала пытаемся с новой структурой (user_id)
    let { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select();

    if (error) {
      console.error('❌ Ошибка отметки уведомления:', {
        notificationId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details
      });
      
      return false; // Всегда возвращаем false при ошибке
    }
    
    // Проверяем, что данные действительно обновились
    if (!data || data.length === 0) {
      console.error('❌ Данные не обновились для уведомления:', notificationId);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception при отметке уведомления:', notificationId, error);
    return false;
  }
};


// Принудительная инициализация хранилища (заглушка для совместимости)
export const forceInitializeStorage = async (): Promise<boolean> => {
  try {
    
    // Очищаем существующие данные
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .neq('status', 'admin');
    
    if (deleteError) {
      console.error('❌ Ошибка очистки существующих игроков:', deleteError);
      return false;
    }
    
    // Создаем администратора
    const admin = await createAdmin();
    
    if (!admin) {
      console.error('❌ Не удалось создать администратора');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка инициализации хранилища:', error);
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
      phone: '+375296549728', // Added phone number
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
        
        // Если аватар пустой или содержит некорректные данные, очищаем его
        if (!admin.avatar || admin.avatar === '' || admin.avatar === 'admin' || admin.avatar.includes('admin')) {
          
          const { error: updateError } = await supabase
            .from('players')
            .update({ avatar: null })
            .eq('id', admin.id);
          
          if (updateError) {
            console.error('❌ Ошибка очистки аватара:', updateError);
          } else {
          }
        }
      }
    } else {
      await createAdmin();
    }
  } catch (error) {
    console.error('❌ Ошибка исправления данных администратора:', error);
  }
};

// Функция для принудительного исправления аватара администратора
export const fixAdminAvatar = async (): Promise<void> => {
  try {
    
    // Находим текущего пользователя
    const currentUser = await loadCurrentUser();
    if (!currentUser || currentUser.status !== 'admin') {
      return;
    }
    
    
    // Очищаем аватар администратора
    const { error } = await supabase
      .from('players')
      .update({ avatar: null })
      .eq('id', currentUser.id);
    
    if (error) {
      console.error('❌ Ошибка очистки аватара:', error);
    } else {
      
      // Обновляем текущего пользователя
      const updatedUser = { ...currentUser, avatar: undefined };
      await saveCurrentUser(updatedUser);
    }
  } catch (error) {
    console.error('❌ Ошибка исправления аватара администратора:', error);
  }
};

// Функция для предзагрузки критических данных пользователя
export const preloadUserData = async (userId: string): Promise<void> => {
  try {
    // Предзагружаем счетчик сообщений в фоне
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('unread_messages_count')
      .eq('id', userId)
      .single();
    
    if (!playerError && playerData) {
      // Обновляем кеш пользователя с актуальным счетчиком
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userData = await AsyncStorage.getItem('hockeystars_current_user');
      
      if (userData) {
        const user = JSON.parse(userData);
        user.unreadMessagesCount = playerData.unread_messages_count || 0;
        
        // Обновляем кеш
        await AsyncStorage.setItem('hockeystars_user_cache', JSON.stringify({
          user,
          timestamp: Date.now()
        }));
      }
    }
  } catch (error) {
    console.error('❌ Ошибка предзагрузки данных пользователя:', error);
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
      console.error('❌ Ошибка получения счетчика непрочитанных сообщений:', error);
      return 0;
    }
    
    const count = data?.length || 0;
    return count;
  } catch (error) {
    console.error('❌ Ошибка получения счетчика непрочитанных сообщений:', error);
    return 0;
  }
};

// Функция для поиска игрока по имени
export const findPlayerByName = async (name: string): Promise<Player | null> => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single();
    
    if (error) {
      console.error('❌ Ошибка поиска игрока по имени:', error);
      return null;
    }
    
    return convertSupabaseToPlayer(data);
  } catch (error) {
    console.error('❌ Ошибка поиска игрока по имени:', error);
    return null;
  }
};

// Функция для диагностики дружбы между двумя игроками
export const debugFriendship = async (player1Name: string, player2Name: string): Promise<void> => {
  try {
    
    // Находим игроков по имени
    const player1 = await findPlayerByName(player1Name);
    const player2 = await findPlayerByName(player2Name);
    
    if (!player1) {
      // console.log(`❌ Игрок ${player1Name} не найден`);
      return;
    }
    
    if (!player2) {
      // console.log(`❌ Игрок ${player2Name} не найден`);
      return;
    }
    
    
    // Проверяем статус дружбы
    const friendshipStatus = await getFriendshipStatus(player1.id, player2.id);
    console.log(`🔗 Статус дружбы: ${friendshipStatus}`);
    
    // Получаем список друзей первого игрока
    const player1Friends = await getFriends(player1.id);
    console.log(`👥 Друзья ${player1Name} (${player1Friends.length}):`);
    player1Friends.forEach(friend => {
      console.log(`   - ${friend.name} (${friend.id})`);
    });
    
    // Проверяем, есть ли второй игрок в друзьях первого
    const isFriend = player1Friends.some(friend => friend.id === player2.id);
    console.log(`🤝 ${player2Name} является другом ${player1Name}: ${isFriend ? 'ДА' : 'НЕТ'}`);
    
  } catch (error) {
    console.error('❌ Ошибка диагностики дружбы:', error);
  }
};

// Функция для расчета стажа в хоккее
export const calculateHockeyExperience = (startDate?: string, language: string = 'ru'): string => {
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
    
    // Правильное склонение для разных языков
    const getYearWord = (num: number, lang: string): string => {
      if (lang === 'en') {
        return num === 1 ? 'year' : 'years';
      } else if (lang === 'lt') {
        // Литовский язык
        if (num === 1) return 'metai';
        if (num >= 2 && num <= 9) return 'metai';
        return 'metų';
      } else if (lang === 'lv') {
        // Латышский язык
        if (num === 1) return 'gads';
        return 'gadi';
      } else if (lang === 'pl') {
        // Polski язык
        if (num === 1) return 'rok';
        return 'lat';
      } else if (lang === 'sv') {
        // Svenska язык
        if (num === 1) return 'år';
        return 'år';
      } else if (lang === 'cs') {
        // Čeština язык
        if (num === 1) return 'rok';
        return 'let';
      } else if (lang === 'sk') {
        // Slovenčina язык
        if (num === 1) return 'rok';
        return 'rokov';
      } else if (lang === 'fi') {
        // Suomi язык
        if (num === 1) return 'vuosi';
        return 'vuotta';
      } else if (lang === 'it') {
        // Italiano язык
        if (num === 1) return 'anno';
        return 'anni';
      } else if (lang === 'de') {
        // Deutsch язык
        if (num === 1) return 'Jahr';
        return 'Jahre';
      } else if (lang === 'fr') {
        // Français язык
        if (num === 1) return 'an';
        return 'ans';
      } else {
        // Русский язык
        if (num === 1) return 'год';
        if (num >= 2 && num <= 4) return 'года';
        return 'лет';
      }
    };
    
    const getMonthWord = (lang: string): string => {
      if (lang === 'en') return 'mo.';
      if (lang === 'lt') return 'mėn.';
      if (lang === 'lv') return 'mēn.';
      if (lang === 'pl') return 'mies.';
      if (lang === 'sv') return 'mån.';
      if (lang === 'cs') return 'měs.';
      if (lang === 'sk') return 'mes.';
      if (lang === 'fi') return 'kk';
      if (lang === 'it') return 'mesi';
      if (lang === 'de') return 'Mon.';
      if (lang === 'fr') return 'mois';
      return 'мес.';
    };
    
    const getInHockeyPhrase = (lang: string): string => {
      if (lang === 'en') return 'in hockey';
      if (lang === 'lt') return 'ledo ritulyje';
      if (lang === 'lv') return 'hokejā';
      if (lang === 'pl') return 'w hokeju';
      if (lang === 'sv') return 'i hockey';
      if (lang === 'cs') return 'v hokeji';
      if (lang === 'sk') return 'v hokeji';
      if (lang === 'fi') return 'jääkiekossa';
      if (lang === 'it') return 'nell\'hockey';
      if (lang === 'de') return 'im Hockey';
      if (lang === 'fr') return 'au hockey';
      return 'в хоккее';
    };
    
    const formatExperience = (lang: string) => {
      return years > 0 
        ? `${years} ${getYearWord(years, lang)} ${getInHockeyPhrase(lang)}`
        : `${months} ${getMonthWord(lang)} ${getInHockeyPhrase(lang)}`;
    };
    
    return formatExperience(language);
  } catch (error) {
    console.error('❌ Ошибка расчета опыта хоккея:', error);
    return '';
  }
}; 

// Функция для принудительной миграции всех изображений в Storage
export const migrateAllImagesToStorage = async (): Promise<void> => {
  try {
    
    // Загружаем всех игроков
    const players = await loadPlayers();
    
    let migratedCount = 0;
    
    for (const player of players) {
      let hasChanges = false;
      const updates: Partial<Player> = {};
      
      // Мигрируем аватар
      if (player.avatar && (player.avatar.startsWith('file://') || player.avatar.startsWith('content://') || player.avatar.startsWith('data:'))) {
        const { uploadImageToStorage } = await import('./uploadImage');
        const migratedAvatarUrl = await uploadImageToStorage(player.avatar);
        if (migratedAvatarUrl) {
          updates.avatar = migratedAvatarUrl;
          hasChanges = true;
        }
      }
      
      // Мигрируем фотографии
      if (player.photos && player.photos.length > 0) {
        const migratedPhotos = [];
        let photosChanged = false;
        
        for (const photo of player.photos) {
          if (photo.startsWith('file://') || photo.startsWith('content://') || photo.startsWith('data:')) {
            const { uploadImageToStorage } = await import('./uploadImage');
            const migratedUrl = await uploadImageToStorage(photo);
            if (migratedUrl) {
              migratedPhotos.push(migratedUrl);
              photosChanged = true;
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
      
      if (data && data.length > 0) {
      } else {
        console.log('⚠️ В базе данных нет пользователей');
      }
    }
    
    // Проверяем подключение к таблице items
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('id, item_type, owner_id')
      .limit(1);
    
    if (itemsError) {
      console.error('❌ Ошибка подключения к таблице items:', itemsError);
    } else {
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки состояния базы данных:', error);
  }
};

// Функции для работы с упражнениями

// Отметить упражнение как выполненное
export const completeExercise = async (playerId: string, exerciseId: string): Promise<boolean> => {
  try {
    
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
    const success = await updatePlayer(playerId, { exerciseStats });
    
    if (success) {
      // Очищаем кеш статистики упражнений при изменении
      await clearExerciseStatsCache(playerId);
      
      // Получаем данные упражнения для уведомления
      try {
        const { ExerciseService } = await import('../services/exerciseService');
        const exerciseData = await ExerciseService.getExerciseById(exerciseId);
        
        if (player.name) {
          // Отправляем уведомления друзьям
          await notifyFriendsAboutExercise(
            playerId,
            player.name,
            exerciseId
          );
        }
      } catch (notificationError) {
        console.error('❌ Ошибка отправки уведомлений об упражнении:', notificationError);
        // Не прерываем выполнение, если уведомления не отправились
      }
      
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

// Очистить кеш статистики упражнений для игрока
export const clearPlayerExerciseStatsCache = async (playerId: string): Promise<void> => {
  try {
    const cacheKey = `exercise_stats_${playerId}`;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(cacheKey);
    // // console.log('💪 Кеш статистики упражнений очищен для игрока:', playerId);
  } catch (error) {
    console.error('❌ Ошибка очистки кеша статистики упражнений:', error);
  }
};


// Получить статистику упражнений игрока с кешированием
export const getPlayerExerciseStats = async (playerId: string): Promise<PlayerExerciseStats | null> => {
  try {
    // // console.log('💪 getPlayerExerciseStats вызван для игрока:', playerId);
    
    // Кешируем результат на 10 минут для улучшения производительности
    const cacheKey = `exercise_stats_${playerId}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // Проверяем кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { stats, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        // // // // console.log('💪 Используем кешированные данные статистики:', stats);
        return stats;
      }
    }
    
    // // // console.log('💪 Загружаем данные игрока из базы...');
    const player = await getPlayerById(playerId);
    if (!player) {
      // // console.log('💪 Игрок не найден');
      return null;
    }
    
    // console.log('💪 Данные игрока загружены:', { 
    //   id: player.id, 
    //   name: player.name, 
    //   exerciseStats: player.exerciseStats 
    // });
    
    let stats: PlayerExerciseStats;
    
    if (!player.exerciseStats) {
      // // // console.log('💪 У игрока нет данных exerciseStats, создаем пустую статистику');
      stats = {
        completions: [],
        totalCompletions: 0
      };
    } else {
      // // console.log('💪 У игрока есть данные exerciseStats:', player.exerciseStats);
      
      // Проверяем формат данных и конвертируем если нужно
      if (typeof player.exerciseStats.completions === 'object' && !Array.isArray(player.exerciseStats.completions)) {
        // Новый формат: { "exerciseId": count }
        // // console.log('💪 Используем новый формат данных, конвертируем в массив');
        const completionsArray = Object.entries(player.exerciseStats.completions).map(([exerciseId, count]) => ({
          exerciseId,
          count: count as number,
          completedAt: new Date().toISOString() // Используем текущую дату как приблизительную
        }));
        
        stats = {
          completions: completionsArray,
          totalCompletions: player.exerciseStats.totalCompletions || 0
        };
        // // console.log('💪 Конвертированная статистика:', stats);
      } else {
        // Старый формат: [{ "exerciseId": "id", "completedAt": "date", "count": number }]
        // // console.log('💪 Используем старый формат данных');
        stats = player.exerciseStats;
      }
    }
    
    // Кешируем результат
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      stats,
      timestamp: Date.now()
    }));
    
    // console.log('💪 Статистика упражнений возвращена:', stats);
    return stats;
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

// Получить время последнего выполнения конкретного упражнения
export const getLastExerciseCompletion = async (playerId: string, exerciseId: string): Promise<ExerciseCompletion | null> => {
  try {
    // console.log('💪 getLastExerciseCompletion вызван для:', { playerId, exerciseId });
    
    // Получаем данные игрока напрямую из базы
    const player = await getPlayerById(playerId);
    if (!player || !player.exerciseStats) {
      // // console.log('💪 У игрока нет данных о статистике упражнений');
      return null;
    }
    
    // // console.log('💪 Данные exerciseStats игрока:', player.exerciseStats);
    
    // Проверяем старый формат (массив)
    if (Array.isArray(player.exerciseStats.completions)) {
      // // console.log('💪 Используем старый формат данных (массив)');
      const completion = player.exerciseStats.completions.find(c => c.exerciseId === exerciseId);
      if (completion) {
        // console.log('💪 Найдена запись в старом формате:', completion);
        return completion;
      }
    }
    
    // Проверяем новый формат (объект) - если есть
    if (player.exerciseStats.completions && typeof player.exerciseStats.completions === 'object' && !Array.isArray(player.exerciseStats.completions)) {
      // // console.log('💪 Используем новый формат данных (объект)');
      // В новом формате нет информации о времени, возвращаем null
      console.log('⚠️ В новом формате нет информации о времени выполнения');
      return null;
    }
    
    // // console.log('💪 Упражнение не найдено в статистике');
    return null;
  } catch (error) {
    console.error('❌ Ошибка получения времени последнего выполнения:', error);
    return null;
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
    
    return player;
  } catch (error) {
    console.error('❌ Ошибка поиска игрока по email:', error);
    return null;
  }
};

// Поиск игрока по телефону
export const getPlayerByPhone = async (phone: string, isAdminAccess: boolean = false): Promise<Player | null> => {
  try {
    
    // Если это доступ администратора, ищем любого пользователя с этим номером
    if (isAdminAccess) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('phone', phone)
        .single();
      
      if (error) {
        console.error('❌ Ошибка поиска игрока (admin access):', error);
        return null;
      }
      
      if (data) {
        return convertSupabaseToPlayer(data);
      }
      
      return null;
    }
    
    // Обычный поиск - сначала администратор, потом обычный пользователь
    const { data: adminData, error: adminError } = await supabase
      .from('players')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'admin')
      .single();
    
    if (adminData) {
      return convertSupabaseToPlayer(adminData);
    }
    
    // Если администратор не найден, ищем обычного пользователя
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error) {
      console.error('❌ Ошибка поиска игрока:', error);
      return null;
    }
    
    if (data) {
      return convertSupabaseToPlayer(data);
    }
    
    return null;
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
    
    // Очищаем кеш всех игроков и инвалидация dataCache, чтобы главный экран увидел нового игрока
    await clearAllPlayersCache();
    try { 
      dataCache.invalidate(CACHE_KEYS.PLAYERS);
    } catch (e) {
      console.error('❌ Ошибка dataCache.invalidate:', e);
    }
    
    // Также очищаем кэш конкретного игрока (на случай если он был в кэше ранее)
    await clearPlayerCache(createdPlayer.id);
    
    // Отправляем уведомление админам о новой регистрации
    try {
      await notifyAdminsAboutNewRegistration(createdPlayer);
    } catch (notificationError) {
      console.error('❌ Ошибка отправки уведомления админам о регистрации:', notificationError);
    }
    
    return createdPlayer;
    
  } catch (error) {
    console.error('❌ Ошибка создания игрока:', error);
    return null;
  }
};

// Обновление номера телефона игрока
export const updatePlayerPhone = async (playerId: string, newPhone: string): Promise<Player | null> => {
  try {
    
    const { data, error } = await supabase
      .from('players')
      .update({ phone: newPhone })
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Ошибка обновления номера телефона:', error);
      return null;
    }
    
    if (!data) {
      console.error('❌ Не удалось найти игрока для обновления');
      return null;
    }
    
    const updatedPlayer = convertSupabaseToPlayer(data);
    return updatedPlayer;
  } catch (error) {
    console.error('❌ Ошибка обновления номера телефона:', error);
    return null;
  }
};

// Создание игрока администратором без SMS-подтверждения
export const createPlayerManually = async (playerData: Player, adminId: string): Promise<Player | null> => {
  try {
    // Проверяем, что создающий пользователь - администратор
    const admin = await getPlayerById(adminId);
    if (!admin || admin.status !== 'admin') {
      console.error('❌ Только администратор может создавать пользователей вручную');
      return null;
    }

    console.log('👤 Администратор создает нового игрока:', playerData.name);
    console.log('📞 Телефон:', playerData.phone);
    console.log('📧 Email:', playerData.email || '(пустой)');
    
    // Проверяем, существует ли уже пользователь с таким телефоном (если он указан)
    if (playerData.phone && playerData.phone.trim() !== '') {
      const existingPlayer = await getPlayerByPhone(playerData.phone);
      if (existingPlayer) {
        console.error('❌ Пользователь с таким номером телефона уже существует:', playerData.phone);
        throw new Error('Пользователь с таким номером телефона уже существует');
      }
    }
    
    // Если указан email, проверяем его уникальность
    if (playerData.email && playerData.email.trim() !== '') {
      const { data: existingEmailPlayer } = await supabase
        .from('players')
        .select('id, name, email')
        .eq('email', playerData.email)
        .single();
      
      if (existingEmailPlayer) {
        console.error('❌ Пользователь с таким email уже существует:', playerData.email, existingEmailPlayer);
        throw new Error(`Пользователь с email ${playerData.email} уже существует: ${existingEmailPlayer.name}`);
      }
    }
    
    // ID генерируется в БД, не проставляем его на клиенте

    // Устанавливаем значения по умолчанию, если не указаны
    const completePlayerData: Player = {
      ...playerData,
      age: playerData.age || 0,
      city: playerData.city || '',
      goals: playerData.goals || '',
      assists: playerData.assists || '',
      games: playerData.games || '',
      pullUps: playerData.pullUps || '',
      pushUps: playerData.pushUps || '',
      plankTime: playerData.plankTime || '',
      sprint100m: playerData.sprint100m || '',
      longJump: playerData.longJump || '',
      status: playerData.status || 'player'
    };

    // Проставляем createdAt для корректной логики «новички на льду»
    try { (completePlayerData as any).createdAt = (completePlayerData as any).createdAt || new Date().toISOString(); } catch {}

    // Конвертируем данные игрока в формат Supabase
    const supabaseData = convertPlayerToSupabase(completePlayerData);
    
    const { data, error } = await supabase
      .from('players')
      .insert([supabaseData])
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания игрока администратором:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        playerData: {
          name: completePlayerData.name,
          phone: completePlayerData.phone,
          status: completePlayerData.status
        }
      });
      throw error;
    }
    
    if (!data) {
      console.error('❌ Нет данных после создания игрока');
      throw new Error('Нет данных после создания игрока');
    }
    
    const createdPlayer = convertSupabaseToPlayer(data);
    
    // Очищаем кеш всех игроков и инвалидация dataCache, чтобы главный экран увидел нового игрока
    await clearAllPlayersCache();
    try { 
      dataCache.invalidate(CACHE_KEYS.PLAYERS);
    } catch (e) {
      console.error('❌ Ошибка dataCache.invalidate:', e);
    }
    
    // Также очищаем кэш конкретного игрока (на случай если он был в кэше ранее)
    await clearPlayerCache(createdPlayer.id);
    
    return createdPlayer;
    
  } catch (error) {
    console.error('❌ Ошибка создания игрока администратором:', error);
    throw error; // Пробрасываем ошибку для отображения пользователю
  }
};

// Функция для отслеживания изменений статистики
export const trackStatsChanges = (oldPlayer: Player, newPlayer: Player): StatChange[] => {
  const changes: StatChange[] = [];
  const timestamp = new Date().toISOString();
  
  // Поля статистики для отслеживания
  const statsFields = ['goals', 'assists', 'games'];
  
  statsFields.forEach(field => {
    const oldValue = parseInt(oldPlayer[field as keyof Player] as string || '0') || 0;
    const newValue = parseInt(newPlayer[field as keyof Player] as string || '0') || 0;
    
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
        change: newValue - oldValue,
        timestamp
      });
    }
  });
  
  return changes;
};

// Функция для отслеживания изменений нормативов
export const trackNormativeChanges = (oldPlayer: Player, newPlayer: Player): NormativeChange[] => {
  const changes: NormativeChange[] = [];
  const timestamp = new Date().toISOString();
  
  // Поля нормативов для отслеживания
  const normativeFields = ['pullUps', 'pushUps', 'plankTime', 'sprint100m', 'longJump', 'jumpRope'];
  
  normativeFields.forEach(field => {
    const oldValue = parseFloat(oldPlayer[field as keyof Player] as string || '0') || 0;
    const newValue = parseFloat(newPlayer[field as keyof Player] as string || '0') || 0;
    
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
        change: newValue - oldValue,
        timestamp
      });
    }
  });
  
  return changes;
};

// Функция для отправки уведомлений друзьям о добавлении фото
export const notifyFriendsAboutPhotos = async (
  playerId: string,
  playerName: string,
  photosCount: number,
  translations?: {
    photoNotification: {
      added: string;
      onePhoto: string;
      multiplePhotos: string;
    };
  }
): Promise<void> => {
  try {
    console.log('📸 Отправляем уведомления о добавлении фото:', { playerId, playerName, photosCount });
    
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    console.log('🖼️ Аватар игрока для уведомлений о фото:', { playerId, playerName, playerAvatar });
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений о фото:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений о фото');
      return;
    }
    
    // Функция для генерации UUID v4
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));
    
    // Создаем уведомления для каждого друга с индивидуальной локализацией
    const notifications = friends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      
      const photoText = photosCount === 1 
        ? (friendTranslations?.photoNotification?.onePhoto || translations?.photoNotification?.onePhoto || 'новое фото')
        : ((friendTranslations?.photoNotification?.multiplePhotos || translations?.photoNotification?.multiplePhotos)?.replace('{count}', photosCount.toString()) || `${photosCount} новых фото`);
      
      const addedText = friendTranslations?.photoNotification?.added || translations?.photoNotification?.added || 'добавил';
      const title = friendLang === 'ru' ? 'Новые фото' : 'New Photos';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'photo_added',
        title: title,
        message: `${playerName} ${addedText} ${photoText}`,
        data: {
          addedPhotosCount: photosCount,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Уведомления о фото получают только друзья, не сам игрок
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о фото в БД:', notifications.length);
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о фото:', error);
      } else {
        // console.log('✅ Уведомления о фото сохранены в базу данных');
        
        // Отправляем push уведомления и обновляем счетчик для каждого друга
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
        for (const userId of uniqueUserIds) {
          // Отправляем push уведомление
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            const photoText = photosCount === 1 
              ? (translations?.photoNotification?.onePhoto || 'новое фото')
              : (translations?.photoNotification?.multiplePhotos?.replace('{count}', photosCount.toString()) || `${photosCount} новых фото`);
            const addedText = translations?.photoNotification?.added || 'добавил';
            await sendNotificationToUser(
              userId,
              '📸 Новые фото',
              `${playerName} ${addedText} ${photoText}`,
              {
                type: 'photo_added',
                player_id: playerId,
                action: 'open_notifications'
              }
            );
          } catch (pushError) {
            console.error('⚠️ Ошибка отправки push уведомления о фото:', pushError);
          }
          
          // Обновляем счетчик
          try {
            // Просто увеличиваем счетчик на 1 используя SQL функцию
            const { error: updateError } = await supabase
              .rpc('increment_unread_notifications', { user_id: userId });

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              // // // // // // console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о фото:', error);
  }
};

// Функция для отправки уведомлений друзьям о добавлении видео моментов
export const notifyFriendsAboutVideos = async (
  playerId: string,
  playerName: string,
  videosCount: number,
  translations?: {
    videoNotification: {
      added: string;
      oneVideo: string;
      multipleVideos: string;
    };
  }
): Promise<void> => {
  try {
    console.log('🎬 Отправляем уведомления о добавлении видео:', { playerId, playerName, videosCount });
    
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    console.log('🖼️ Аватар игрока для уведомлений о видео:', { playerId, playerName, playerAvatar });
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений о видео:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений о видео');
      return;
    }
    
    // Функция для генерации UUID v4
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));
    
    // Создаем уведомления для каждого друга с индивидуальной локализацией
    const notifications = friends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      
      const videoText = videosCount === 1 
        ? (friendTranslations?.videoNotification?.oneVideo || translations?.videoNotification?.oneVideo || 'новое видео')
        : ((friendTranslations?.videoNotification?.multipleVideos || translations?.videoNotification?.multipleVideos)?.replace('{count}', videosCount.toString()) || `${videosCount} новых видео`);
      
      const addedText = friendTranslations?.videoNotification?.added || translations?.videoNotification?.added || 'добавил';
      const title = friendLang === 'ru' ? 'Новые видео моменты' : 'New Videos';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'video_added',
        title: title,
        message: `${playerName} ${addedText} ${videoText}`,
        data: {
          addedVideosCount: videosCount,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о видео в базу данных:', notifications.length);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о видео:', error);
      } else {
        // console.log('✅ Уведомления о видео сохранены:', data?.length);
      }
      
      // Отправляем push уведомления и обновляем счетчик для каждого получателя
      const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
      for (const userId of uniqueUserIds) {
        // Отправляем push уведомление
        try {
          const { sendNotificationToUser } = await import('./notificationService');
          const videoText = videosCount === 1 
            ? (translations?.videoNotification?.oneVideo || 'новое видео')
            : (translations?.videoNotification?.multipleVideos?.replace('{count}', videosCount.toString()) || `${videosCount} новых видео`);
          const addedText = translations?.videoNotification?.added || 'добавил';
          await sendNotificationToUser(
            userId,
            '🎬 Новые видео моменты',
            `${playerName} ${addedText} ${videoText}`,
            {
              type: 'video_added',
              player_id: playerId,
              action: 'open_notifications'
            }
          );
        } catch (pushError) {
          console.error('⚠️ Ошибка отправки push уведомления о видео:', pushError);
        }
        
        // Обновляем счетчик
        try {
          const { error: updateError } = await supabase
            .rpc('increment_unread_notifications', { user_id: userId });

          if (updateError) {
            console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
          } else {
            console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
          }
        } catch (updateError) {
          console.error('❌ Ошибка обновления счетчика:', updateError);
        }
      }
      
      // Обновляем счетчик непрочитанных уведомлений для каждого получателя (старый код)
      for (const notification of notifications) {
        if (notification.user_id) {
          try {
            const userId = notification.user_id;

            // Получаем текущий счетчик из БД
            const { data: playerData, error: fetchError } = await supabase
              .from('players')
              .select('notifications')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                notifications: JSON.stringify({
                  unread_count: newCount,
                  last_updated: new Date().toISOString()
                })
              })
              .eq('id', userId);

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              // // // // console.log(`✅ Счетчик уведомлений обновлен для пользователя ${userId}: ${currentCount} → ${newCount}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о видео:', error);
  }
};

// Функция для отправки уведомлений друзьям об изменении аватара
export const notifyFriendsAboutAvatarChange = async (
  playerId: string,
  playerName: string,
  newAvatarUrl: string,
  translations?: {
    avatarNotification: {
      changed: string;
    };
  }
): Promise<void> => {
  try {
    console.log('🖼️ Отправляем уведомления об изменении аватара:', { playerId, playerName, newAvatarUrl });
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений об аватаре:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений об аватаре');
      return;
    }
    
    // Функция для генерации UUID v4
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));
    
    // Создаем уведомления для каждого друга с индивидуальной локализацией
    const notifications = friends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      
      const changedText = friendTranslations?.avatarNotification?.changed || translations?.avatarNotification?.changed || 'изменил свой аватар';
      const title = friendLang === 'ru' ? 'Новый аватар' : 'New Avatar';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'avatar_changed',
        title: title,
        message: `${playerName} ${changedText}`,
        data: {
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: newAvatarUrl,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления об аватаре в базу данных:', notifications.length);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений об аватаре:', error);
      } else {
        // console.log('✅ Уведомления об аватаре сохранены:', data?.length);
      }
      
      // Отправляем push уведомления и обновляем счетчик для каждого получателя
      for (const notification of notifications) {
        if (notification.user_id) {
          // Отправляем push уведомление
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            const changedText = translations?.avatarNotification?.changed || 'изменил свой аватар';
            await sendNotificationToUser(
              notification.user_id,
              '🖼️ Новый аватар',
              `${playerName} ${changedText}`,
              {
                type: 'avatar_changed',
                player_id: playerId,
                action: 'open_notifications'
              }
            );
          } catch (pushError) {
            console.error('⚠️ Ошибка отправки push уведомления об аватаре:', pushError);
          }
          
          // Обновляем счетчик
          try {
            const userId = notification.user_id;

            // Получаем текущий счетчик из БД
            const { data: playerData, error: fetchError } = await supabase
              .from('players')
              .select('notifications')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                notifications: JSON.stringify({
                  unread_count: newCount,
                  last_updated: new Date().toISOString()
                })
              })
              .eq('id', userId);

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              console.log(`✅ Счетчик уведомлений обновлен для пользователя ${userId}: ${currentCount} → ${newCount}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений об аватаре:', error);
  }
};

// Функция для отправки уведомлений друзьям о новых достижениях
export const notifyFriendsAboutAchievements = async (
  playerId: string,
  playerName: string,
  achievementsCount: number,
  translations?: {
    achievementNotification: {
      added: string;
      received: string;
      oneAchievement: string;
      multipleAchievements: string;
    };
  }
): Promise<void> => {
  try {
    console.log('🏆 Отправляем уведомления о новых достижениях:', { playerId, playerName, achievementsCount });
    
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений о достижениях:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений о достижениях');
      return;
    }
    
    // Функция для генерации UUID v4
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));
    
    // Создаем уведомления для каждого друга с индивидуальной локализацией
    const notifications = friends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      
      const achievementText = achievementsCount === 1 
        ? (friendTranslations?.achievementNotification?.oneAchievement || translations?.achievementNotification?.oneAchievement || 'новое достижение')
        : ((friendTranslations?.achievementNotification?.multipleAchievements || translations?.achievementNotification?.multipleAchievements)?.replace('{count}', achievementsCount.toString()) || `${achievementsCount} новых достижения`);
      
      const addedText = friendTranslations?.achievementNotification?.added || translations?.achievementNotification?.added || 'добавил';
      const title = friendLang === 'ru' ? 'Новые достижения' : 'New Achievements';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'achievement_added',
        title: title,
        message: `${playerName} ${addedText} ${achievementText}`,
        data: {
          addedAchievementsCount: achievementsCount,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о достижениях в базу данных:', notifications.length);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о достижениях:', error);
      } else {
        // console.log('✅ Уведомления о достижениях сохранены:', data?.length);
      }
      
      // Отправляем push уведомления и обновляем счетчик для каждого получателя
      for (const notification of notifications) {
        if (notification.user_id) {
          // Отправляем push уведомление с локализацией
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            
            // Получаем язык получателя и переводы
            const friendLang = friendLanguages.get(notification.user_id) || 'en';
            const friendTranslations = loadTranslations(friendLang);
            
            const achievementText = achievementsCount === 1 
              ? (friendTranslations?.achievementNotification?.oneAchievement || translations?.achievementNotification?.oneAchievement || 'новое достижение')
              : ((friendTranslations?.achievementNotification?.multipleAchievements || translations?.achievementNotification?.multipleAchievements)?.replace('{count}', achievementsCount.toString()) || `${achievementsCount} новых достижения`);
            const receivedText = friendTranslations?.achievementNotification?.received || translations?.achievementNotification?.received || 'получил';
            const pushTitle = friendLang === 'ru' ? '🏆 Новые достижения' : '🏆 New Achievements';
            
            await sendNotificationToUser(
              notification.user_id,
              pushTitle,
              `${playerName} ${receivedText} ${achievementText}`,
              {
                type: 'achievement_added',
                player_id: playerId,
                action: 'open_notifications'
              }
            );
          } catch (pushError) {
            console.error('⚠️ Ошибка отправки push уведомления о достижении:', pushError);
          }
          
          // Обновляем счетчик
          try {
            const userId = notification.user_id;

            // Получаем текущий счетчик из БД
            const { data: playerData, error: fetchError } = await supabase
              .from('players')
              .select('notifications')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                notifications: JSON.stringify({
                  unread_count: newCount,
                  last_updated: new Date().toISOString()
                })
              })
              .eq('id', userId);

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              console.log(`✅ Счетчик уведомлений обновлен для пользователя ${userId}: ${currentCount} → ${newCount}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о достижениях:', error);
  }
};

// Функция для отправки уведомлений друзьям об изменении физических данных (рост/вес)
export const notifyFriendsAboutPhysicalData = async (
  playerId: string,
  playerName: string,
  changes: { field: 'height' | 'weight', oldValue: number, newValue: number }[],
  translations?: {
    statsNotification: {
      updated: string;
      physicalData: string;
    };
    height: string;
    weight: string;
    cm: string;
    kg: string;
  }
): Promise<void> => {
  try {
    console.log('📏 Отправляем уведомления об изменении физических данных:', { playerId, playerName, changes });
    
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений о физических данных:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений о физических данных');
      return;
    }
    
    // Функция для генерации UUID v4
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Создаем уведомления для каждого друга
    const notifications = friends.map(friend => {
      // Формируем текст изменений
      const changesText = changes.map(change => {
        const fieldName = change.field === 'height' 
          ? (translations?.height || 'рост')
          : (translations?.weight || 'вес');
        const unit = change.field === 'height' 
          ? (translations?.cm || 'см')
          : (translations?.kg || 'кг');
        return `${fieldName}: ${change.oldValue}${unit} → ${change.newValue}${unit}`;
      }).join(', ');
      
      const updatedText = translations?.statsNotification?.updated || 'обновил';
      const physicalDataText = translations?.statsNotification?.physicalData || 'физические данные';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'physical_data_changed',
        title: 'Изменение физических данных',
        message: `${playerName} ${updatedText} ${physicalDataText}: ${changesText}`,
        data: {
          changes: changes,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о физических данных в базу данных:', notifications.length);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о физических данных:', error);
      } else {
        // console.log('✅ Уведомления о физических данных сохранены:', data?.length);
      }
      
      // Отправляем push уведомления и обновляем счетчик для каждого получателя
      const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
      for (const userId of uniqueUserIds) {
        // Отправляем push уведомление
        try {
          const { sendNotificationToUser } = await import('./notificationService');
          const changesText = changes.map(change => {
            const fieldName = change.field === 'height' 
              ? (translations?.height || 'рост')
              : (translations?.weight || 'вес');
            const unit = change.field === 'height' 
              ? (translations?.cm || 'см')
              : (translations?.kg || 'кг');
            return `${fieldName}: ${change.oldValue}${unit} → ${change.newValue}${unit}`;
          }).join(', ');
          const updatedText = translations?.statsNotification?.updated || 'обновил';
          const physicalDataText = translations?.statsNotification?.physicalData || 'физические данные';
          await sendNotificationToUser(
            userId,
            '💪 Изменение физических данных',
            `${playerName} ${updatedText} ${physicalDataText}: ${changesText}`,
            {
              type: 'physical_data_changed',
              player_id: playerId,
              action: 'open_notifications'
            }
          );
        } catch (pushError) {
          console.error('⚠️ Ошибка отправки push уведомления о физических данных:', pushError);
        }
        
        // Обновляем счетчик
        try {
          const { error: updateError } = await supabase
            .rpc('increment_unread_notifications', { user_id: userId });

          if (updateError) {
            console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
          } else {
            console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
          }
        } catch (updateError) {
          console.error('❌ Ошибка обновления счетчика:', updateError);
        }
      }
      
      // Обновляем счетчик непрочитанных уведомлений для каждого получателя (старый код)
      for (const notification of notifications) {
        if (notification.user_id) {
          try {
            const userId = notification.user_id;

            // Получаем текущий счетчик из БД
            const { data: playerData, error: fetchError } = await supabase
              .from('players')
              .select('notifications')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                notifications: JSON.stringify({
                  unread_count: newCount,
                  last_updated: new Date().toISOString()
                })
              })
              .eq('id', userId);

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              console.log(`✅ Счетчик уведомлений обновлен для пользователя ${userId}: ${currentCount} → ${newCount}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о физических данных:', error);
  }
};

// Функция для отправки уведомлений друзьям о изменениях
// Кеш для предотвращения повторных вызовов
const notificationCache = new Map<string, number>();
// Кеш для предотвращения дублирования push-уведомлений
const pushNotificationCache = new Map<string, number>();

// Функция для очистки старых записей кеша
const cleanOldCacheEntries = (cache: Map<string, number>, maxAge: number = 300000) => { // 5 минут
  const now = Date.now();
  for (const [key, timestamp] of cache.entries()) {
    if (now - timestamp > maxAge) {
      cache.delete(key);
    }
  }
};

export const notifyFriendsAboutChanges = async (
  playerId: string, 
  playerName: string, 
  statChanges: StatChange[], 
  normativeChanges: NormativeChange[]
): Promise<void> => {
  // Очищаем старые записи кеша
  cleanOldCacheEntries(notificationCache);
  cleanOldCacheEntries(pushNotificationCache);
  
  // Проверяем, не вызывалась ли функция недавно для этого игрока
  const statChangesHash = statChanges.map(c => `${c.field}_${c.oldValue}_${c.newValue}`).join('|');
  const normativeChangesHash = normativeChanges.map(c => `${c.field}_${c.oldValue}_${c.newValue}`).join('|');
  const cacheKey = `${playerId}_${statChangesHash}_${normativeChangesHash}`;
  const lastCall = notificationCache.get(cacheKey);
  const now = Date.now();
  
  if (lastCall && (now - lastCall) < 30000) { // 30 секунд
    console.log('⏭️ Пропускаем повторный вызов notifyFriendsAboutChanges для игрока:', playerId);
    return;
  }
  
  notificationCache.set(cacheKey, now);
  
  try {
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    
    // Получаем список друзей игрока
    const allFriends = await getFriends(playerId);
    
    // Исключаем самого игрока из списка друзей (на случай ошибки в БД)
    const friends = allFriends.filter(friend => friend.id !== playerId);
    
    console.log(`👥 Список друзей игрока ${playerName}:`, friends.length, 'из', allFriends.length);
    
    // Дополнительная проверка: логируем, если игрок попал в список друзей самому себе
    if (allFriends.some(friend => friend.id === playerId)) {
      console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Игрок попал в список друзей самому себе!', {
        playerId,
        playerName,
        allFriendsCount: allFriends.length,
        friendsCount: friends.length
      });
    }
    
    // Функция для генерации UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Создаем уведомления для статистики (если есть изменения)
    const statNotifications = [];
    if (statChanges.length > 0) {
      const statChangesText = statChanges
        .map(change => {
          const fieldNames: { [key: string]: string } = {
            'goals': 'голов',
            'assists': 'передач', 
            'games': 'игр'
          };
          const fieldName = fieldNames[change.field] || change.field;
          const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
          return `${fieldName}: ${changeText}`;
        })
        .join(', ');

      const notifications = friends.map(friend => ({
        id: generateUUID(),
        user_id: friend.id,
        type: 'stats_change',
        title: 'Изменения в статистике',
        message: `${playerName} обновил: ${statChangesText}`,
        data: {
          changes: statChanges, // Только статистика
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar
        },
        created_at: new Date().toISOString(),
        is_read: false
      }));
      
      statNotifications.push(...notifications);
    }

    // Создаем уведомления для нормативов (если есть изменения)
    const normativeNotifications = [];
    if (normativeChanges.length > 0) {
      const normativeChangesText = normativeChanges
        .map(change => {
          const fieldNames: { [key: string]: string } = {
            'pullUps': 'подтягиваний',
            'pushUps': 'отжиманий',
            'plankTime': 'планки',
            'sprint100m': 'стометровки',
            'longJump': 'прыжка в длину',
            'jumpRope': 'скакалки'
          };
          const fieldName = fieldNames[change.field] || change.field;
          const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
          return `${fieldName}: ${changeText}`;
        })
        .join(', ');

      const notifications = friends.map(friend => ({
        id: generateUUID(),
        user_id: friend.id,
        type: 'stats_change', // Используем тот же тип для нормативов
        title: 'Изменения в нормативах',
        message: `${playerName} обновил: ${normativeChangesText}`,
        data: {
          changes: normativeChanges, // Только нормативы
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar
        },
        created_at: new Date().toISOString(),
        is_read: false
      }));
      
      normativeNotifications.push(...notifications);
    }

    // Объединяем все уведомления
    const allNotifications = [...statNotifications, ...normativeNotifications];
    
    // Дедуплицируем уведомления по пользователю и типу
    const uniqueNotifications = new Map<string, typeof allNotifications[0]>();
    for (const notification of allNotifications) {
      const key = `${notification.user_id}_${notification.type}`;
      if (!uniqueNotifications.has(key)) {
        uniqueNotifications.set(key, notification);
      }
    }
    const deduplicatedNotifications = Array.from(uniqueNotifications.values());
    
    // Уведомления получают только друзья, не сам игрок
    
    if (friends.length === 0) {
      console.log('📭 У игрока нет друзей, уведомления не создаются');
      return;
    }
    
    if (deduplicatedNotifications.length === 0) {
      console.log('📭 Нет изменений для отправки уведомлений');
      return;
    }
    
    // Сохраняем уведомления в базу данных (только для друзей)
    console.log('💾 Сохраняем уведомления в базу данных...');
    console.log('💾 Количество уведомлений для сохранения:', deduplicatedNotifications.length);
    
    // Группируем уведомления по пользователю и типу для проверки дубликатов
    const notificationsByUserAndType = new Map<string, typeof deduplicatedNotifications[0]>();
    
    for (const notification of deduplicatedNotifications) {
      const key = `${notification.user_id}_${notification.type}_${playerId}`;
      
      // Проверяем, есть ли уже похожее уведомление за последние 5 минут
      const { data: existingNotifications, error: checkError } = await supabase
        .from('notifications')
        .select('id, created_at, data')
        .eq('user_id', notification.user_id)
        .eq('type', notification.type)
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Последние 30 секунд
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (checkError) {
        console.error('❌ Ошибка проверки дубликатов уведомлений:', checkError);
      }
      
      // Проверяем, есть ли уведомление с теми же изменениями за последние 30 секунд
      const currentData = notification.data as any;
      const isDuplicate = existingNotifications?.some(existing => {
        const existingData = existing.data as any;
        // Сравниваем конкретные изменения, а не просто игрока
        return existingData?.changedPlayerId === playerId && 
               JSON.stringify(existingData?.changes) === JSON.stringify(currentData?.changes);
      });
      
      if (isDuplicate) {
        console.log('⏭️ Пропускаем дубликат уведомления для пользователя:', notification.user_id, 'от игрока:', playerId, 'с теми же изменениями');
        continue;
      }
      
      // console.log('💾 Сохраняем уведомление:', {
      //   id: notification.id,
      //   user_id: notification.user_id,
      //   type: notification.type,
      //   title: notification.title,
      //   data: notification.data
      // });
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notification);
        
      if (insertError) {
        console.error('❌ Ошибка сохранения уведомления:', insertError);
      } else {
        // console.log('✅ Уведомление сохранено в базу данных');
        // Запоминаем что уведомление отправлено
        notificationsByUserAndType.set(key, notification);
      }
    }
    
    const statCount = statNotifications.length;
    const normativeCount = normativeNotifications.length;
    // console.log(`📢 Отправлено ${statCount} уведомлений о статистике и ${normativeCount} уведомлений о нормативах`);
    
    // Отправляем push уведомления и обновляем счетчик для каждого друга
    const uniqueUserIds = [...new Set(deduplicatedNotifications.map(n => n.user_id))];
    const sentPushNotifications = new Set<string>(); // Кеш для предотвращения дублирования
    
    for (const userId of uniqueUserIds) {
      // Отправляем push уведомление
      try {
        const { sendNotificationToUser } = await import('./notificationService');
        const userNotifications = deduplicatedNotifications.filter(n => n.user_id === userId);
        const notificationType = userNotifications[0]?.type;
        
        // Проверяем, не отправлялось ли уже push-уведомление для этого пользователя и игрока с теми же изменениями
        const changesHash = JSON.stringify(userNotifications[0]?.data?.changes || []);
        const pushCacheKey = `${userId}_${playerId}_${notificationType}_${changesHash}`;
        
        // Двойная проверка: глобальный кеш + локальный кеш
        if (sentPushNotifications.has(pushCacheKey)) {
          console.log('⏭️ Пропускаем дублирующееся push-уведомление (локальный кеш):', userId, 'от игрока:', playerId);
          continue;
        }
        
        const lastPushTime = pushNotificationCache.get(pushCacheKey);
        const now = Date.now();
        
        if (lastPushTime && (now - lastPushTime) < 30000) { // 30 секунд
          console.log('⏭️ Пропускаем дублирующееся push-уведомление (глобальный кеш):', userId, 'от игрока:', playerId);
          continue;
        }
        
        // Дополнительная проверка: не отправляем уведомление самому игроку
        if (userId === playerId) {
          console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Попытка отправить уведомление самому игроку!', {
            userId,
            playerId,
            playerName,
            notificationType
          });
          continue;
        }
        
        // Помечаем как отправленное
        sentPushNotifications.add(pushCacheKey);
        pushNotificationCache.set(pushCacheKey, now);
        
        let title = '📊 Обновление статистики';
        let body = `${playerName} обновил свою статистику`;
        
        if (notificationType === 'stats_change') {
          title = '📊 Обновление статистики';
          body = `${playerName} обновил статистику`;
        } else if (notificationType === 'physical_data_changed') {
          title = '💪 Обновление нормативов';
          body = `${playerName} обновил свои нормативы`;
        }
        
        await sendNotificationToUser(
          userId,
          title,
          body,
          {
            type: notificationType,
            player_id: playerId,
            action: 'open_profile',
            deepLink: `/player/${playerId}`
          }
        );
      } catch (pushError) {
        console.error('⚠️ Ошибка отправки push уведомления об изменениях:', pushError);
      }
      
      // Обновляем счетчик
      try {
        // Просто увеличиваем счетчик на 1 используя SQL функцию
        const { error: updateError } = await supabase
          .rpc('increment_unread_notifications', { user_id: userId });

        if (updateError) {
          console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
        } else {
          console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
        }
      } catch (updateError) {
        console.error('❌ Ошибка обновления счетчика:', updateError);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о изменениях:', error);
  }
};

// Функция для уведомлений о новой дружбе
export const notifyFriendsAboutNewFriendship = async (
  userId1: string,
  userId2: string
): Promise<void> => {
  try {
    console.log('👥 Отправляем уведомления о новой дружбе:', { userId1, userId2 });

    // Получаем данные обоих игроков
    const [player1, player2] = await Promise.all([
      getPlayerById(userId1),
      getPlayerById(userId2)
    ]);

    if (!player1 || !player2) {
      console.error('❌ Не удалось найти данные игроков');
      return;
    }

    // Получаем друзей обоих игроков (исключая их самих)
    const [friends1, friends2] = await Promise.all([
      getFriends(userId1),
      getFriends(userId2)
    ]);

    // Объединяем списки друзей и исключаем дубликаты и самих игроков
    const allFriends = [...friends1, ...friends2].filter((friend, index, arr) => {
      return friend.id !== userId1 && 
             friend.id !== userId2 && 
             arr.findIndex(f => f.id === friend.id) === index;
    });

    console.log('👥 Друзья для уведомлений о дружбе:', allFriends.length);

    if (allFriends.length === 0) {
      console.log('👥 Нет друзей для отправки уведомлений о дружбе');
      return;
    }

    // Функция для генерации UUID
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Создаем уведомления для всех друзей
    const notifications = allFriends.map(friend => ({
      id: generateUUID(),
      user_id: friend.id,
      type: 'new_friendship',
      title: 'Новая дружба',
      message: `${player1.name} и ${player2.name} стали друзьями`,
      data: {
        friend1Id: userId1,
        friend1Name: player1.name,
        friend1Avatar: player1.avatar,
        friend2Id: userId2,
        friend2Name: player2.name,
        friend2Avatar: player2.avatar,
        confirmedBy: userId1, // userId1 - тот, кто подтвердил дружбу
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_read: false
    }));

    // Сохраняем уведомления в базу данных
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о дружбе в БД:', notifications.length);
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о дружбе:', error);
      } else {
        // console.log('✅ Уведомления о дружбе сохранены в базу данных');
        
        // Отправляем push уведомления и обновляем счетчик для каждого друга
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
        for (const userId of uniqueUserIds) {
          // Отправляем push уведомление
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            await sendNotificationToUser(
              userId,
              '👥 Новая дружба',
              `${player1.name} и ${player2.name} стали друзьями`,
              {
                type: 'new_friendship',
                friend1Id: userId1,
                friend2Id: userId2,
                action: 'open_notifications'
              }
            );
          } catch (pushError) {
            console.error('⚠️ Ошибка отправки push уведомления о дружбе:', pushError);
          }
          
          // Обновляем счетчик
          try {
            // Просто увеличиваем счетчик на 1 используя SQL функцию
            const { error: updateError } = await supabase
              .rpc('increment_unread_notifications', { user_id: userId });

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            } else {
              console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о дружбе:', error);
  }
};

// Функция для уведомлений о выполнении упражнений
export const notifyFriendsAboutExercise = async (
  playerId: string,
  playerName: string,
  exerciseId: string
): Promise<void> => {
  console.error('🚨🚨🚨 notifyFriendsAboutExercise ВЫЗВАНА 🚨🚨🚨');
  console.error('🚨 Параметры:', { playerId, playerName, exerciseId });
  try {
    console.warn('💪 NOTIFY EXERCISE: Начало отправки уведомлений о выполнении упражнения:', { playerId, playerName, exerciseId });
    console.error('💪 NOTIFY EXERCISE: Начало отправки уведомлений о выполнении упражнения:', { playerId, playerName, exerciseId });

    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();

    const playerAvatar = playerData?.avatar || null;

    // Получаем друзей игрока
    const friends = await getFriends(playerId);

    console.error('👥 Друзья для уведомлений об упражнении:', friends.length);

    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений об упражнении');
      return;
    }

    // Функция для генерации UUID
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Создаем уведомления для друзей
    const notifications = friends.map(friend => ({
      id: generateUUID(),
      user_id: friend.id,
      type: 'exercise_completed',
      title: 'Exercise completed',
      message: `${playerName} completed an exercise`,
      data: {
        playerId,
        playerName,
        playerAvatar,
        exerciseId,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_read: false
    }));

    // Сохраняем уведомления в базу данных
    if (notifications.length > 0) {
      console.warn('💾 Сохраняем уведомления об упражнении в БД:', notifications.length);
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Ошибка сохранения уведомлений об упражнении:', error);
      } else {
        console.log('✅ Уведомления об упражнении сохранены в базу данных');
        
        // Обновляем счетчик уведомлений для каждого друга и отправляем push-уведомления
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
        console.error(`👥 Уникальных друзей для отправки push-уведомлений: ${uniqueUserIds.length}`);
        
        // Импортируем функцию отправки push-уведомлений один раз для всех друзей
        let sendNotificationToUser: any = null;
        try {
          console.error('📦 Импортируем sendNotificationToUser...');
          const notificationModule = await import('./notificationService');
          sendNotificationToUser = notificationModule.sendNotificationToUser;
          if (!sendNotificationToUser) {
            console.error('❌ sendNotificationToUser не найдена в модуле notificationService');
            throw new Error('sendNotificationToUser не экспортирована');
          }
          console.error('✅ sendNotificationToUser успешно импортирована');
        } catch (importError) {
          console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось импортировать sendNotificationToUser:', importError);
          console.error('❌ Детали ошибки импорта:', importError instanceof Error ? importError.stack : JSON.stringify(importError, null, 2));
          // Продолжаем выполнение, но без push-уведомлений
        }
        
        for (const userId of uniqueUserIds) {
          console.error(`🔄 Обрабатываем пользователя ${userId}...`);
          
          // ОБНОВЛЕНИЕ СЧЕТЧИКА - независимый блок
          try {
            const { error: updateError } = await supabase
              .rpc('increment_unread_notifications', { user_id: userId });

            if (updateError) {
              console.error(`❌ Ошибка обновления счетчика уведомлений для ${userId}:`, updateError);
            } else {
              console.log(`✅ Счетчик уведомлений увеличен для пользователя ${userId}`);
            }
          } catch (updateError) {
            console.error(`❌ Ошибка обновления счетчика уведомлений для ${userId}:`, updateError);
            // Продолжаем выполнение, даже если счетчик не обновлен
          }
          
          // ОТПРАВКА PUSH-УВЕДОМЛЕНИЯ - независимый блок (всегда выполняется, если функция импортирована)
          if (!sendNotificationToUser) {
            console.error(`⚠️ [${userId}] Пропускаем отправку push-уведомления: функция не импортирована`);
            continue;
          }
          
          try {
            // ВАЖНО: Получаем язык пользователя из БД
            const { getUserLanguage } = await import('./languageHelper');
            const userLanguage = await getUserLanguage(userId);
            
            // Загружаем переводы для нужного языка
            let pushTitle = '💪 Exercise completed';
            let pushBody = `${playerName} completed an exercise`;
            
            try {
              const translations: any = {
                ru: require('../locales/ru.json'),
                en: require('../locales/en.json'),
                lt: require('../locales/lt.json'),
                lv: require('../locales/lv.json'),
                pl: require('../locales/pl.json'),
                sv: require('../locales/sv.json'),
                cs: require('../locales/cs.json'),
                sk: require('../locales/sk.json'),
                fi: require('../locales/fi.json'),
                it: require('../locales/it.json'),
                de: require('../locales/de.json'),
                fr: require('../locales/fr.json'),
              };
              
              const userTranslations = translations[userLanguage] || translations.en;
              const exerciseNotification = userTranslations?.exerciseNotification;
              
              if (exerciseNotification) {
                // Используем локализованный текст
                pushTitle = `💪 ${exerciseNotification.title || 'Exercise completed'}`;
                // Для body используем шаблон с именем игрока
                const completedText = exerciseNotification.completed || 'completed an exercise';
                pushBody = `${playerName} ${completedText}`;
              }
            } catch (translationError) {
              console.error(`⚠️ [${userId}] Ошибка загрузки переводов, используем английский:`, translationError);
            }
            
            console.error(`📤 [${userId}] Начинаем отправку push-уведомления об упражнении...`);
            console.error(`📤 [${userId}] Язык: ${userLanguage}, Данные для отправки:`, {
              userId,
              title: pushTitle,
              body: pushBody,
              data: {
                type: 'exercise_completed',
                player_id: playerId,
                exercise_id: exerciseId,
                action: 'open_exercise'
              }
            });
            
            const pushResult = await sendNotificationToUser(
              userId,
              pushTitle,
              pushBody,
              {
                type: 'exercise_completed',
                player_id: playerId,
                exercise_id: exerciseId,
                action: 'open_exercise'
              }
            );
            
            console.error(`📤 [${userId}] Результат отправки push-уведомления:`, pushResult);
            
            if (pushResult) {
              console.error(`✅ [${userId}] Push-уведомление об упражнении успешно отправлено`);
            } else {
              console.error(`⚠️ [${userId}] Push-уведомление об упражнении НЕ отправлено (вернулось false)`);
            }
          } catch (pushError) {
            console.error(`❌ [${userId}] Ошибка отправки push-уведомления об упражнении:`, pushError);
            console.error(`❌ [${userId}] Детали ошибки:`, pushError instanceof Error ? pushError.stack : JSON.stringify(pushError, null, 2));
            // Продолжаем выполнение для других пользователей
          }
        }
        
        console.log(`✅ Завершена обработка всех друзей для push-уведомлений об упражнении`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений об упражнении:', error);
  }
};

// Функция для уведомлений о получении подарков от звезд
export const notifyFriendsAboutGiftReceived = async (
  playerId: string,
  playerName: string,
  starName: string,
  giftType: string,
  giftName?: string
): Promise<void> => {
  try {
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();

    const playerAvatar = playerData?.avatar || null;

    // Получаем друзей игрока
    const friends = await getFriends(playerId);

    // Функция для генерации UUID
    const generateUUID = (): string => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Переводим тип подарка
    const giftTypeNames: { [key: string]: string } = {
      'autograph': 'автограф',
      'stick': 'клюшку',
      'puck': 'шайбу',
      'jersey': 'майку'
    };

    const giftTypeName = giftTypeNames[giftType] || giftType;
    const displayName = giftName || giftTypeName;

    // ВАЖНО: Получаем язык игрока из БД
    const { getUserLanguage, loadTranslations, getUserLanguages } = await import('./languageHelper');
    const playerLanguage = await getUserLanguage(playerId);
    const playerTranslations = loadTranslations(playerLanguage);

    const playerTitle = playerTranslations?.giftNotification?.title || (playerLanguage === 'ru' ? 'Подарок от администратора' : 'Gift from administrator');
    const playerMessage = playerTranslations?.giftNotification?.message 
      ? playerTranslations.giftNotification.message.replace('{playerName}', 'Вы').replace('{giftName}', displayName).replace('{starName}', starName)
      : playerLanguage === 'ru' 
        ? `Вы получили ${displayName} от ${starName}`
        : `You received ${displayName} from ${starName}`;

    // Получаем языки всех друзей для локализации
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));
    
    // Создаем уведомления для друзей - определяем язык для каждого друга индивидуально
    const friendNotifications = await Promise.all(friends.map(async (friend) => {
      // ВАЖНО: Получаем язык из БД
      const friendLanguage = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLanguage);
      
      const friendTitle = friendTranslations?.giftNotification?.title || (friendLanguage === 'ru' ? 'Подарок от звезды' : 'Gift from star');
      const friendMessage = friendTranslations?.giftNotification?.message 
        ? friendTranslations.giftNotification.message.replace('{playerName}', playerName).replace('{giftName}', displayName).replace('{starName}', starName)
        : friendLanguage === 'ru' 
          ? `${playerName} получил ${displayName} от ${starName}`
          : `${playerName} received ${displayName} from ${starName}`;
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'friend_gift_received',
        title: friendTitle,
        message: friendMessage,
      data: {
        playerId,
        playerName,
        playerAvatar,
        starName,
        giftType,
        giftName: displayName,
        timestamp: new Date().toISOString()
      },
        created_at: new Date().toISOString(),
        is_read: false
      };
    }));
    
    // Создаем уведомление для самого игрока
    const playerNotification = {
      id: generateUUID(),
      user_id: playerId,
      type: 'gift_received',
      title: playerTitle,
      message: playerMessage,
      data: {
        playerId,
        playerName,
        playerAvatar,
        starName,
        giftType,
        giftName: displayName,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_read: false
    };

    // Объединяем все уведомления
    const notifications = [...friendNotifications, playerNotification];

    // Сохраняем уведомления в базу данных
    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о подарке:', error);
      } else {
        
        // Обновляем счетчик уведомлений для всех получателей
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
        for (const userId of uniqueUserIds) {
          try {
            // Получаем текущий счетчик уведомлений для пользователя
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('notifications')
              .eq('id', userId)
              .single();

            if (playerError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', playerError);
              continue;
            }

            // Парсим текущий счетчик
            let currentCount = 0;
            try {
              if (playerData?.notifications && typeof playerData.notifications === 'string') {
                const notificationsData = JSON.parse(playerData.notifications);
                currentCount = notificationsData.unread_count || 0;
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                notifications: JSON.stringify({
                  unread_count: newCount,
                  last_updated: new Date().toISOString()
                })
              })
              .eq('id', userId);

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о подарке:', error);
  }
};

// Функция для отправки уведомлений и push о получении подарка (новая система)
export const sendGiftNotification = async (
  playerId: string,
  playerName: string,
  senderName: string,
  giftName: string,
  translations?: {
    giftReceived: string;
    giftReceivedMessage: string;
    giftReceivedPushTitle: string;
    giftReceivedPushBody: string;
  },
  senderId?: string
): Promise<void> => {
  try {
    // ВАЖНО: Получаем язык получателя из БД
    const { getUserLanguage } = await import('./languageHelper');
    const userLanguage = await getUserLanguage(playerId);
    
    // Загружаем переводы
    let giftNotificationTranslations: any = null;
    try {
      const translationsMap: any = {
        ru: require('../locales/ru.json'),
        en: require('../locales/en.json'),
        lt: require('../locales/lt.json'),
        lv: require('../locales/lv.json'),
        pl: require('../locales/pl.json'),
        sv: require('../locales/sv.json'),
        cs: require('../locales/cs.json'),
        sk: require('../locales/sk.json'),
        fi: require('../locales/fi.json'),
        it: require('../locales/it.json'),
        de: require('../locales/de.json'),
        fr: require('../locales/fr.json'),
      };
      giftNotificationTranslations = translationsMap[userLanguage]?.giftNotification || translationsMap.en?.giftNotification;
    } catch (translationError) {
      // Используем английский fallback
    }
    
    // Используем локализованные тексты или переданные translations, или fallback на русский/английский
    const title = translations?.giftReceived || giftNotificationTranslations?.title || (userLanguage === 'ru' ? 'Подарок получен!' : 'Gift received!');
    const message = translations?.giftReceivedMessage || 
      (giftNotificationTranslations?.message 
        ? giftNotificationTranslations.message.replace('{playerName}', 'Вы').replace('{giftName}', giftName).replace('{starName}', senderName)
        : userLanguage === 'ru' ? `Вы получили подарок от ${senderName}: ${giftName}` : `You received a gift from ${senderName}: ${giftName}`);
    const pushTitle = translations?.giftReceivedPushTitle || `🎁 ${giftNotificationTranslations?.title || (userLanguage === 'ru' ? 'Подарок получен!' : 'Gift received!')}`;
    const pushBody = translations?.giftReceivedPushBody || 
      (giftNotificationTranslations?.message 
        ? giftNotificationTranslations.message.replace('{playerName}', 'Вы').replace('{giftName}', giftName).replace('{starName}', senderName)
        : userLanguage === 'ru' ? `Вы получили подарок от ${senderName}: ${giftName}` : `You received a gift from ${senderName}: ${giftName}`);
    
    console.log('🎁 NOTIFICATIONS: Отправка уведомлений о подарке');
    console.log('🎁 NOTIFICATIONS: player:', playerName, playerId);
    console.log('🎁 NOTIFICATIONS: sender:', senderName);
    console.log('🎁 NOTIFICATIONS: gift:', giftName);
    
    // Получаем данные игрока для аватара (нужно для всех уведомлений)
    let playerDataInfo: any = null;
    try {
      const { data, error: playerInfoError } = await supabase
        .from('players')
        .select('avatar, name')
        .eq('id', playerId)
        .single();
      if (!playerInfoError && data) {
        playerDataInfo = data;
      }
    } catch (error) {
      console.error('🎁 NOTIFICATIONS: ⚠️ Ошибка получения данных игрока для аватара:', error);
    }
    
    // Проверяем, что получатель подарка не является отправителем
    if (senderId && playerId === senderId) {
      console.log('🎁 NOTIFICATIONS: Отправитель и получатель совпадают, пропускаем создание уведомления для получателя');
    } else {
      // 1. Создаем in-app уведомление
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: playerId,
          type: 'gift_received',
          title: title,
          message: message,
          is_read: false,
          data: {
            playerName: playerName,
            playerAvatar: playerDataInfo?.avatar || null,
            starName: senderName,
            giftName: giftName,
            giftType: 'gift',
            timestamp: new Date().toISOString()
          }
        }]);
    
      if (notificationError) {
        console.error('🎁 NOTIFICATIONS: ❌ Ошибка создания уведомления:', notificationError);
        throw notificationError;
      }
      
      console.log('🎁 NOTIFICATIONS: ✅ In-app уведомление создано');
      
      // 2. Увеличиваем счетчик уведомлений
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('notifications, unread_notifications_count')
        .eq('id', playerId)
        .single();
      
      if (!playerError && playerData) {
        let currentCount = 0;
        try {
          if (playerData.notifications && typeof playerData.notifications === 'string') {
            const notificationsData = JSON.parse(playerData.notifications);
            currentCount = notificationsData.unread_count || 0;
          }
        } catch (parseError) {
          // Используем unread_notifications_count как fallback
          currentCount = playerData.unread_notifications_count || 0;
        }
        
        const newCount = currentCount + 1;
        
        const { error: updateError } = await supabase
          .from('players')
          .update({
            notifications: JSON.stringify({
              unread_count: newCount,
              last_updated: new Date().toISOString()
            }),
            unread_notifications_count: newCount
          })
          .eq('id', playerId);
        
        if (updateError) {
          console.error('🎁 NOTIFICATIONS: ❌ Ошибка обновления счетчика:', updateError);
        } else {
          console.log('🎁 NOTIFICATIONS: ✅ Счетчик увеличен:', currentCount, '→', newCount);
        }
      }
      
      // 3. Отправляем push-уведомление получателю подарка
      try {
        const { sendPushNotification } = await import('./notificationService');
        const { data: deviceData, error: deviceError } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', playerId);
        
        console.log('🎁 NOTIFICATIONS: Поиск push-токенов для получателя:', playerId);
        console.log('🎁 NOTIFICATIONS: deviceData:', deviceData);
        console.log('🎁 NOTIFICATIONS: deviceError:', deviceError);
        
        if (!deviceError && deviceData && deviceData.length > 0) {
          const pushTokens = deviceData.map(d => d.token);
          console.log('🎁 NOTIFICATIONS: Найдено', pushTokens.length, 'push-токенов для получателя');
          console.log('🎁 NOTIFICATIONS: Отправляем push получателю:', pushTitle, pushBody);
          
          for (const token of pushTokens) {
            try {
              await sendPushNotification(token, pushTitle, pushBody, {
                type: 'gift_received',
                sender_name: senderName,
                gift_name: giftName
              });
              console.log('🎁 NOTIFICATIONS: ✅ Push отправлен получателю на токен:', token.substring(0, 20) + '...');
            } catch (pushError) {
              console.error('🎁 NOTIFICATIONS: ❌ Ошибка отправки push получателю:', pushError);
            }
          }
          
          console.log('🎁 NOTIFICATIONS: ✅ Push-уведомления получателю отправлены');
        } else {
          console.log('🎁 NOTIFICATIONS: ⚠️ У получателя нет зарегистрированных устройств для push');
          if (deviceError) {
            console.error('🎁 NOTIFICATIONS: ❌ Ошибка получения push-токенов:', deviceError);
          }
        }
      } catch (pushError) {
        console.error('🎁 NOTIFICATIONS: ❌ Ошибка отправки push получателю:', pushError);
      }
    }
    
    // 4. Уведомляем друзей игрока (исключая отправителя)
    const allFriends = await getFriends(playerId);
    const friends = senderId 
      ? allFriends.filter(friend => friend.id !== senderId) 
      : allFriends;
    
    console.log('🎁 NOTIFICATIONS: Всего друзей:', allFriends.length);
    if (senderId) {
      console.log('🎁 NOTIFICATIONS: Исключаем отправителя из уведомлений');
      console.log('🎁 NOTIFICATIONS: Уведомляем', friends.length, 'друзей (без отправителя)');
    } else {
      console.log('🎁 NOTIFICATIONS: Уведомляем', friends.length, 'друзей');
    }
    
    if (friends.length > 0) {
      // Определяем язык для каждого друга и создаем локализованные уведомления
      const friendNotifications = await Promise.all(friends.map(async (friend) => {
        // Для каждого друга определяем язык (в идеале из БД, пока используем язык устройства)
        let friendLanguage: string = 'en';
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
          if (savedLanguage && ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'].includes(savedLanguage)) {
            friendLanguage = savedLanguage;
          }
        } catch (langError) {
          // Используем английский по умолчанию
        }
        
        // Загружаем переводы для друга
        let friendTranslations: any = null;
        try {
          const translationsMap: any = {
            ru: require('../locales/ru.json'),
            en: require('../locales/en.json'),
            lt: require('../locales/lt.json'),
            lv: require('../locales/lv.json'),
            pl: require('../locales/pl.json'),
            sv: require('../locales/sv.json'),
            cs: require('../locales/cs.json'),
            sk: require('../locales/sk.json'),
            fi: require('../locales/fi.json'),
            it: require('../locales/it.json'),
            de: require('../locales/de.json'),
            fr: require('../locales/fr.json'),
          };
          friendTranslations = translationsMap[friendLanguage]?.giftNotification || translationsMap.en?.giftNotification;
        } catch (translationError) {
          // Используем английский fallback
        }
        
        const friendTitle = friendTranslations?.title || (friendLanguage === 'ru' ? 'Подарок от звезды' : 'Gift from star');
        const friendMessage = friendTranslations?.message 
          ? friendTranslations.message.replace('{playerName}', playerName).replace('{giftName}', giftName).replace('{starName}', senderName)
          : friendLanguage === 'ru' 
            ? `${playerName} получил подарок от ${senderName}: ${giftName}`
            : `${playerName} received a gift from ${senderName}: ${giftName}`;
        
        return {
          user_id: friend.id,
          type: 'friend_gift_received',
          title: friendTitle,
          message: friendMessage,
          is_read: false,
          data: {
            playerId: playerId, // Добавляем ID игрока для навигации
            playerName: playerName,
            playerAvatar: playerDataInfo?.avatar || null,
            starName: senderName,
            giftName: giftName,
            giftType: 'gift',
            timestamp: new Date().toISOString()
          }
        };
      }));
      
      const { error: friendsError } = await supabase
        .from('notifications')
        .insert(friendNotifications);
      
      if (friendsError) {
        console.error('🎁 NOTIFICATIONS: ❌ Ошибка уведомления друзей:', friendsError);
      } else {
        console.log('🎁 NOTIFICATIONS: ✅ Друзья уведомлены');
        
        // Увеличиваем счетчик для друзей
        for (const friend of friends) {
          const { data: friendData, error: friendError } = await supabase
            .from('players')
            .select('notifications, unread_notifications_count')
            .eq('id', friend.id)
            .single();
          
          if (!friendError && friendData) {
            let currentCount = 0;
            try {
              if (friendData.notifications && typeof friendData.notifications === 'string') {
                const notificationsData = JSON.parse(friendData.notifications);
                currentCount = notificationsData.unread_count || 0;
              }
            } catch (parseError) {
              // Используем unread_notifications_count как fallback
              currentCount = friendData.unread_notifications_count || 0;
            }
            
            await supabase
              .from('players')
              .update({
                notifications: JSON.stringify({
                  unread_count: currentCount + 1,
                  last_updated: new Date().toISOString()
                }),
                unread_notifications_count: currentCount + 1
              })
              .eq('id', friend.id);
          }
        }
        
        // Отправляем push-уведомления друзьям
        try {
          const { sendPushNotification } = await import('./notificationService');
          
          // Получаем языки всех друзей для push-уведомлений
          const { getUserLanguages: getLanguages, loadTranslations: loadTrans } = await import('./languageHelper');
          const friendLangs = await getLanguages(friends.map(f => f.id));
          
          for (const friend of friends) {
            const { data: friendDeviceData, error: friendDeviceError } = await supabase
              .from('push_tokens')
              .select('token')
              .eq('user_id', friend.id);
            
            if (!friendDeviceError && friendDeviceData && friendDeviceData.length > 0) {
              // ВАЖНО: Получаем язык друга из БД
              const friendLanguage = friendLangs.get(friend.id) || 'en';
              const friendTranslations = loadTrans(friendLanguage);
              
              const friendPushTitle = friendTranslations?.giftNotification?.title 
                ? `🎁 ${friendTranslations.giftNotification.title}`
                : friendLanguage === 'ru' 
                  ? `🎁 ${playerName} получил подарок!`
                  : `🎁 ${playerName} received a gift!`;
              const friendPushBody = friendTranslations?.giftNotification?.message 
                ? friendTranslations.giftNotification.message.replace('{playerName}', playerName).replace('{giftName}', giftName).replace('{starName}', senderName)
                : friendLanguage === 'ru' 
                  ? `${playerName} получил подарок от ${senderName}: ${giftName}`
                  : `${playerName} received a gift from ${senderName}: ${giftName}`;
              
              const friendPushTokens = friendDeviceData.map(d => d.token);
              
              for (const token of friendPushTokens) {
                try {
                  await sendPushNotification(token, friendPushTitle, friendPushBody, {
                    type: 'friend_gift_received',
                    player_name: playerName,
                    sender_name: senderName,
                    gift_name: giftName
                  });
                } catch (pushError) {
                  console.error('🎁 NOTIFICATIONS: ❌ Ошибка отправки push другу:', pushError);
                }
              }
            }
          }
          console.log('🎁 NOTIFICATIONS: ✅ Push-уведомления друзьям отправлены');
        } catch (pushError) {
          console.error('🎁 NOTIFICATIONS: ❌ Ошибка отправки push друзьям:', pushError);
        }
      }
    }
    
    console.log('🎁 NOTIFICATIONS: ✅ Все уведомления отправлены');
    
  } catch (error) {
    console.error('🎁 NOTIFICATIONS: ❌ Критическая ошибка:', error);
  }
};

// Функции для работы с изменениями статистики в базе данных

// Сохранение изменений статистики в базу данных
export const saveStatsChanges = async (
  playerId: string,
  changes: StatChange[]
): Promise<boolean> => {
  try {
    if (changes.length === 0) {
      return true;
    }

    // Подготавливаем данные для вставки
    const statsChangesData = changes.map(change => ({
      player_id: playerId,
      field: change.field,
      old_value: Math.round(change.oldValue * 100) / 100, // Округляем до 2 знаков после запятой
      new_value: Math.round(change.newValue * 100) / 100, // Округляем до 2 знаков после запятой
      change_value: Math.round(change.change * 100) / 100, // Округляем до 2 знаков после запятой
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
    }));

    // Сохраняем в базу данных
    const { error } = await supabase
      .from('stats_changes')
      .insert(statsChangesData);

    if (error) {
      console.error('❌ Ошибка сохранения изменений статистики:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения изменений статистики:', error);
    return false;
  }
};

// Получение изменений статистики для игрока
export const getStatsChanges = async (playerId: string): Promise<StatChange[]> => {
  try {
    const { data, error } = await supabase
      .from('stats_changes')
      .select('*')
      .eq('player_id', playerId)
      .gt('expires_at', new Date().toISOString()) // Только не истекшие
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения изменений статистики:', error);
      return [];
    }

    // Конвертируем в формат StatChange
    const changes: StatChange[] = (data || []).map(item => ({
      field: item.field,
      oldValue: item.old_value,
      newValue: item.new_value,
      change: item.change_value,
      timestamp: item.created_at
    }));

    return changes;
  } catch (error) {
    console.error('❌ Ошибка получения изменений статистики:', error);
    return [];
  }
};

// Получение изменений для конкретного поля
export const getChangeForField = async (playerId: string, field: string): Promise<number> => {
  try {
    const changes = await getStatsChanges(playerId);
    const change = changes.find(c => c.field === field);
    return change ? change.change : 0;
  } catch (error) {
    console.error('❌ Ошибка получения изменения для поля:', error);
    return 0;
  }
};

// Очистка истекших изменений статистики
export const cleanupExpiredStatsChanges = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stats_changes')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('❌ Ошибка очистки истекших изменений:', error);
    } else {
    }
  } catch (error) {
    console.error('❌ Ошибка очистки истекших изменений:', error);
  }
};

// Уведомление админов о новой регистрации
export const notifyAdminsAboutNewRegistration = async (newPlayer: Player): Promise<void> => {
  try {
    console.log('🔔 Отправляем уведомление админам о новой регистрации:', newPlayer.name);
    
    // Получаем всех админов
    const { data: admins, error: adminsError } = await supabase
      .from('players')
      .select('id, name, push_token')
      .eq('status', 'admin')
      .not('push_token', 'is', null);
    
    if (adminsError) {
      console.error('❌ Ошибка получения списка админов:', adminsError);
      return;
    }
    
    if (!admins || admins.length === 0) {
      console.log('ℹ️ Админы не найдены или у них нет push токенов');
      return;
    }
    
    // Отправляем уведомление каждому админу
    for (const admin of admins) {
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: admin.id,
            type: 'new_registration',
            title: 'Новая регистрация',
            message: `Зарегистрировался новый пользователь: ${newPlayer.name}`,
            data: {
              player_id: newPlayer.id,
              player_name: newPlayer.name,
              player_phone: newPlayer.phone,
              player_status: newPlayer.status
            }
          });
        
        if (notificationError) {
          console.error(`❌ Ошибка создания уведомления для админа ${admin.name}:`, notificationError);
        } else {
          // console.log(`✅ Уведомление отправлено админу: ${admin.name}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка отправки уведомления админу ${admin.name}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка уведомления админов о регистрации:', error);
  }
};

/**
 * Умный отбор игроков для главного экрана с ограничением количества
 * @param players - все игроки
 * @param currentUserId - ID текущего пользователя
 * @param selectedCountry - выбранная страна (опционально)
 * @param selectedYear - выбранный год (опционально)
 * @returns отобранные игроки для отображения на главном экране
 */
export const getSmartPlayerSelection = (
  players: Player[], 
  currentUserId?: string,
  selectedCountry?: string,
  selectedYear?: number,
  randomSeed?: number // Добавляем seed для детерминированного рандома
): Player[] => {
  try {
    // 1. Разделяем не-игроков на категории
    // Администраторы всегда показываются везде
    const admins = players.filter(player => player.status === 'admin');
    
    // Звезды и скауты - показываем рандомно (обрабатываются отдельно)
    const starsAndScouts = players.filter(player => {
      const isStarOrScout = player.status === 'star' || player.status === 'scout';
      if (!isStarOrScout) return false;
      
      // Если выбран фильтр по стране, фильтруем по стране
      if (selectedCountry) {
        return player.country === selectedCountry;
      }
      
      return true;
    });
    
    // Остальные не-игроки (тренеры, магазины, заточка коньков)
    const otherNonPlayers = players.filter(player => {
      const isOtherNonPlayer = player.status === 'coach' || 
        player.status === 'shop' || 
        player.status === 'skateSharpening';
      
      if (!isOtherNonPlayer) return false;
      
      // Если выбран фильтр по стране, фильтруем остальных не-игроков
      if (selectedCountry) {
        return player.country === selectedCountry;
      }
      
      return true;
    });
    
    // Звезды и скауты показываем рандомно
    // Каждая звезда/скаут случайно решает, показываться ей или нет (50% вероятность)
    // Используем детерминированный рандом на основе seed для стабильности
    const effectiveSeed = randomSeed !== undefined 
      ? randomSeed 
      : `${selectedCountry || 'all'}_${selectedYear || 'all'}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Для каждой звезды/скаута определяем случайно, показывать её или нет
    // Используем хеш от playerId + seed для детерминированного, но случайного решения
    const starsAndScoutsRandom = starsAndScouts.filter((player, index) => {
      // Создаем уникальный seed для каждого игрока на основе его ID и общего seed
      const playerSeed = `${player.id}_${effectiveSeed}_${index}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      // Используем синус для получения значения от -1 до 1, затем преобразуем в вероятность
      const randomValue = Math.sin(playerSeed * 1.5) * 0.5 + 0.5; // От 0 до 1
      // 50% вероятность показать звезду/скаута
      return randomValue > 0.5;
    });
    
    // Ограничиваем максимум 10 звезд/скаутов (на случай если случайно выбралось больше)
    const limitedStarsAndScouts = starsAndScoutsRandom.slice(0, 10);

    // 2. Фильтруем игроков по стране и году
    const filteredPlayers = players.filter(player => {
      if (player.status !== 'player') return false;
      
      // Фильтр по стране
      const matchesCountry = !selectedCountry || player.country === selectedCountry;
      
      // Фильтр по году
      const matchesYear = !selectedYear || 
        (player.birthDate && player.birthDate.startsWith(selectedYear.toString()));
      
      return matchesCountry && matchesYear;
    });

    // 3. Всегда показываем текущего пользователя (если он игрок)
    const currentUser = currentUserId ? filteredPlayers.find(p => p.id === currentUserId) : null;
    const otherPlayers = filteredPlayers.filter(p => p.id !== currentUserId);

    // 4. Новички (зарегистрировались в последние 5 дней) - до 5 человек
    // ВАЖНО: новички берутся из filteredPlayers, чтобы учитывать фильтры по стране и году
    // Но они всегда имеют приоритет и показываются независимо от рейтинга
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const newcomers = otherPlayers
      .filter(player => {
        if (!player.createdAt) return false;
        const createdAt = new Date(player.createdAt);
        return createdAt >= fiveDaysAgo;
      })
      .sort((a, b) => {
        // Сортируем по дате создания (новые сначала)
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5); // Берем только 5 новичков

    // 5. Топ-10 игроков по рейтингу активности
    const topPlayers = otherPlayers
      .filter(player => !newcomers.some(n => n.id === player.id)) // Исключаем новичков
      .sort((a, b) => (b.activityRating || 0) - (a.activityRating || 0))
      .slice(0, 10);

    // 6. Оставшиеся игроки для случайного выбора
    const remainingPlayers = otherPlayers.filter(player => 
      !newcomers.some(n => n.id === player.id) && 
      !topPlayers.some(t => t.id === player.id)
    );

    // 7. Случайные игроки (до 10 человек)
    // Используем детерминированный рандом на основе seed для стабильности между пересчетами
    const randomPlayers = remainingPlayers
      .sort(() => {
        // Детерминированный рандом на основе seed
        const effectiveSeed = randomSeed !== undefined 
          ? randomSeed 
          : `${selectedCountry || 'all'}_${selectedYear || 'all'}_random`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        // Используем другую функцию для другого рандома, чтобы звезды и случайные игроки различались
        return Math.cos(effectiveSeed * 1.5) * 10000 % 1 - 0.5;
      })
      .slice(0, 10);

    // 8. Максимальное количество игроков для отображения (применяется к фильтру)
    const MAX_PLAYERS = 30;

    // 9. Определяем постоянных игроков с приоритетами (в порядке важности)
    // Порядок важен: сначала самые важные, потом менее важные
    const permanentPlayers: Player[] = [];
    
    // 9.1. Администраторы (всегда в первую очередь)
    // admins уже объявлен выше, просто используем его
    permanentPlayers.push(...admins);
    
    // 9.2. Текущий пользователь (если он игрок)
    if (currentUser) {
      permanentPlayers.push(currentUser);
    }
    
    // 9.3. Новички (приоритетные игроки)
    permanentPlayers.push(...newcomers);
    
    // 9.4. Топ игроки (по рейтингу)
    permanentPlayers.push(...topPlayers);
    
    // 9.5. Остальные не-игроки (тренеры, магазины и т.д.)
    // otherNonPlayers уже объявлен выше, просто используем его
    permanentPlayers.push(...otherNonPlayers);
    
    // 9.6. Рандомные звезды и скауты (до 10 человек, выбираются случайно)
    permanentPlayers.push(...limitedStarsAndScouts);

    // 10. Если постоянных игроков больше максимума, обрезаем до максимума
    // Приоритет: администраторы > текущий пользователь > новички > топ > остальные не-игроки
    const permanentPlayersLimited = permanentPlayers.slice(0, MAX_PLAYERS);

    // 11. Вычисляем сколько мест осталось для случайных игроков
    const permanentCount = permanentPlayersLimited.length;
    const remainingSlots = Math.max(0, MAX_PLAYERS - permanentCount);

    // 12. Берем случайных игроков в пределах оставшихся мест
    const randomPlayersLimited = randomPlayers.slice(0, remainingSlots);

    // 13. Объединяем всех отобранных игроков
    const selectedPlayers = [
      ...permanentPlayersLimited,
      ...randomPlayersLimited
    ];

    // 14. Убираем дубликаты (на всякий случай)
    const uniquePlayers = selectedPlayers.filter((player, index, self) => 
      index === self.findIndex(p => p.id === player.id)
    );
    
    // 15. Финальное ограничение на 30 (на всякий случай, если после удаления дубликатов стало больше)
    const finalPlayers = uniquePlayers.slice(0, MAX_PLAYERS);

    console.log(`🎯 Умный отбор игроков: ${finalPlayers.length} из ${players.length} (фильтр: ${selectedCountry || 'все страны'}, ${selectedYear || 'все годы'})`);
    console.log(`📊 Разбивка: админы: ${admins.length}, звезды/скауты (рандом ${starsAndScouts.length > 0 ? `${limitedStarsAndScouts.length}/${starsAndScouts.length}` : '0'}, показывается случайно): ${limitedStarsAndScouts.length}, другие не-игроки: ${otherNonPlayers.length}, новички: ${newcomers.length}, топ: ${topPlayers.length}, случайные: ${randomPlayersLimited.length}${currentUser ? ', текущий пользователь: 1' : ''}`);
    console.log(`🔢 Лимит: ${MAX_PLAYERS} (постоянные: ${permanentCount}, доступно для случайных: ${remainingSlots}, итого: ${finalPlayers.length})`);

    return finalPlayers;

  } catch (error) {
    console.error('❌ Ошибка умного отбора игроков:', error);
    // В случае ошибки возвращаем всех игроков (fallback)
    return players;
  }
};