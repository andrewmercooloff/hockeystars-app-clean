import { supabase } from './supabase';
import { avatarCache, updateAvatarGlobally, preloadPlayerAvatars } from './AvatarCache';
import { dataCache, CACHE_KEYS } from './DataCache';
import { addActivityPoints } from '../services/activityService';

// Глобальный кеш для пользователя
let globalUserCache: Player | null = null;

// In-memory кэш для игроков и команд (мгновенный доступ)
// Объявляем здесь для использования в clearPlayerCache и других функциях
const playersMemoryCache = new Map<string, { player: Player, timestamp: number }>();
const teamsMemoryCache = new Map<string, { teams: PlayerTeam[], timestamp: number }>();

// Функция для нормализации позиции игрока (приводит все варианты к стандартным английским ключам)
export const normalizePosition = (position: string | undefined | null): string | undefined => {
  if (!position) return undefined;
  
  const pos = position.trim();
  const posLower = pos.toLowerCase();
  
  // Нормализуем позицию вратаря к стандартному ключу 'goalie'
  if (posLower === 'goalkeeper' || posLower === 'goalie' || pos === 'Вратарь' || pos === 'Goalkeeper' || pos === 'Goalie' || pos === 'goalie' || pos === 'GOALIE') {
    return 'goalie';
  }
  
  // Нормализуем позицию центрального нападающего к 'center'
  if (pos === 'Центральный нападающий' || posLower === 'center' || pos === 'Center') {
    return 'center';
  }
  
  // Нормализуем позицию крайнего нападающего к 'winger'
  if (pos === 'Крайний нападающий' || posLower === 'winger' || pos === 'Winger') {
    return 'winger';
  }
  
  // Нормализуем позицию защитника к 'defender'
  if (pos === 'Защитник' || posLower === 'defender' || pos === 'Defender') {
    return 'defender';
  }
  
  // Возвращаем позицию как есть, если это не известная позиция
  return pos;
};

// Функция для проверки, является ли игрок вратарем
export const isGoalkeeperPosition = (position: string | undefined | null): boolean => {
  if (!position) return false;
  return normalizePosition(position) === 'goalie';
};

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
  parent_email?: string; // Email родителя для детей < 13 лет
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
  // Поля для вратарей
  minutes?: number; // количество проведенных минут
  shots?: number; // количество бросков
  saves?: number; // отраженные броски (сэйвы)
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
  // Скорость шайбы (JSON строка с историей)
  puck_speed_data?: string; // JSON: { maxSpeed: number, history: Array<{speed: number, date: string}> }
  is_online?: boolean; // статус онлайн пользователя
  last_seen?: string; // время последней активности (ISO string)
  is_hidden?: boolean; // флаг скрытия профиля администратором
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
  parentEmail?: string; // Email родителя для детей < 13 лет
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
  // Поля для вратарей
  minutes?: string; // количество проведенных минут
  shots?: string; // количество бросков
  saves?: string; // отраженные броски (сэйвы)
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
  // Скорость шайбы
  puckSpeed?: number; // текущая максимальная скорость шайбы (км/ч)
  puckSpeedHistory?: PuckSpeedRecord[]; // история измерений скорости
  // Онлайн статус
  isOnline?: boolean; // статус онлайн пользователя
  lastSeen?: string; // последний раз когда пользователь был онлайн
  // Скрытие профиля
  is_hidden?: boolean; // флаг скрытия профиля администратором
}

// Интерфейс для записи скорости шайбы
export interface PuckSpeedRecord {
  speed: number; // скорость в км/ч
  date: string; // дата измерения (ISO string)
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  replyToId?: string; // ID сообщения, на которое отвечаем
  replyToText?: string; // Текст сообщения, на которое отвечаем (для превью)
  replyToSenderId?: string; // ID отправителя сообщения, на которое отвечаем
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
    position: normalizePosition(supabasePlayer.position) || supabasePlayer.position || '',
    team: supabasePlayer.team,
    age: supabasePlayer.age,
    height: supabasePlayer.height ? supabasePlayer.height.toString() : '',
    weight: supabasePlayer.weight ? supabasePlayer.weight.toString() : '',
    avatar: supabasePlayer.avatar,
    email: supabasePlayer.email,
    password: supabasePlayer.password,
    status: supabasePlayer.status,
    parentEmail: supabasePlayer.parent_email,
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
    // Поля для вратарей
    minutes: supabasePlayer.minutes ? supabasePlayer.minutes.toString() : '0',
    shots: supabasePlayer.shots ? supabasePlayer.shots.toString() : '0',
    saves: supabasePlayer.saves ? supabasePlayer.saves.toString() : '0',
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
    createdAt: supabasePlayer.created_at,
    // Скорость шайбы
    puckSpeed: (() => {
      if (supabasePlayer.puck_speed_data) {
        try {
          const parsed = JSON.parse(supabasePlayer.puck_speed_data);
          return parsed.maxSpeed || undefined;
        } catch (error) {
          console.warn('⚠️ Ошибка парсинга puck_speed_data:', error);
          return undefined;
        }
      }
      return undefined;
    })(),
    puckSpeedHistory: (() => {
      if (supabasePlayer.puck_speed_data) {
        try {
          const parsed = JSON.parse(supabasePlayer.puck_speed_data);
          return parsed.history || [];
        } catch (error) {
          console.warn('⚠️ Ошибка парсинга puck_speed_data:', error);
          return [];
        }
      }
      return [];
    })(),
    // Онлайн статус
    isOnline: supabasePlayer.is_online ?? false,
    lastSeen: supabasePlayer.last_seen || undefined,
    // Скрытие профиля
    is_hidden: supabasePlayer.is_hidden ?? false,
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
    const cacheKey = `teams_${playerId}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // 1. Сначала проверяем in-memory кэш (мгновенно!)
    const memCached = teamsMemoryCache.get(playerId);
    if (memCached && Date.now() - memCached.timestamp < cacheTime) {
      return memCached.teams;
    }
    
    // 2. Затем проверяем AsyncStorage кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { teams, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        // Сохраняем в memory кэш для следующих обращений
        teamsMemoryCache.set(playerId, { teams, timestamp });
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
    
    // Кешируем результат в AsyncStorage и memory
    const timestamp = Date.now();
    teamsMemoryCache.set(playerId, { teams, timestamp });
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ teams, timestamp }));
    
    return teams;
  } catch (error) {
    console.error('❌ Ошибка получения команд игрока:', error);
    return [];
  }
};

// Очистка memory кэша команд (вызывается при обновлении команд)
export const clearTeamsMemoryCache = (playerId?: string) => {
  if (playerId) {
    teamsMemoryCache.delete(playerId);
  } else {
    teamsMemoryCache.clear();
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

// Синхронизация команд игрока с базой данных через Edge Function (обходит RLS)
export const syncPlayerTeams = async (playerId: string, currentTeams: PastTeam[], pastTeams: PastTeam[]): Promise<boolean> => {
  try {
    // Проверяем, что playerId валидный
    if (!playerId) {
      console.error('❌ syncPlayerTeams: playerId не указан');
      return false;
    }
    
    // Используем Edge Function для синхронизации команд (обходит RLS)
    const { data, error } = await supabase.functions.invoke('sync-player-teams', {
      body: {
        playerId,
        currentTeams,
        pastTeams
      }
    });
    
    if (error) {
      console.error('❌ Ошибка синхронизации команд через Edge Function:', error);
      return false;
    }
    
    if (data && data.success) {
      console.log('✅ Команды успешно синхронизированы через Edge Function');
      // Очищаем кеш команд при успешной синхронизации
      await clearTeamsCache(playerId);
      return true;
      } else {
      console.error('❌ Edge Function вернул ошибку:', data?.error);
      return false;
    }
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
    position: normalizePosition(player.position) || player.position || '',
    team: player.team,
    age: player.age,
    height: player.height && player.height !== '' ? (typeof player.height === 'string' ? parseInt(player.height) || 0 : player.height) : 0,
    weight: player.weight && player.weight !== '' ? (typeof player.weight === 'string' ? parseInt(player.weight) || 0 : player.weight) : 0,
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
    grip: player.grip || '',
    games: player.games ? parseInt(player.games) : 0,
    // Поля для вратарей
    minutes: player.minutes ? parseInt(player.minutes) : 0,
    shots: player.shots ? parseInt(player.shots) : 0,
    saves: player.saves ? parseInt(player.saves) : 0,
    pull_ups: player.pullUps ? parseInt(player.pullUps) : 0,
    push_ups: player.pushUps ? parseInt(player.pushUps) : 0,
    plank_time: player.plankTime ? parseInt(player.plankTime) : 0,
    sprint_100m: player.sprint100m ? parseFloat(player.sprint100m) : 0,
    long_jump: player.longJump ? parseInt(player.longJump) : 0,
    jump_rope: player.jumpRope ? parseInt(player.jumpRope) : 0,
    favorite_goals: player.favoriteGoals || '',
    photos: player.photos && player.photos.length > 0 ? JSON.stringify(player.photos) : '[]',
    number: player.number && player.number !== '' ? (typeof player.number === 'string' ? player.number : String(player.number)) : '',
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
    skate_services: player.skate_services || null,
    // Скорость шайбы
    puck_speed_data: (() => {
      if (player.puckSpeed !== undefined || (player.puckSpeedHistory && player.puckSpeedHistory.length > 0)) {
        const maxSpeed = player.puckSpeed || (player.puckSpeedHistory && player.puckSpeedHistory.length > 0 
          ? Math.max(...player.puckSpeedHistory.map(r => r.speed)) 
          : 0);
        return JSON.stringify({
          maxSpeed: maxSpeed,
          history: player.puckSpeedHistory || []
        });
      }
      return undefined;
    })()
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
          console.log('💾 Загрузили игроков из кеша all_players');
          return players;
        }
      }
    }

    console.log('🌐 Загружаем игроков из базы данных' + (forceRefresh ? ' (принудительно)' : ''));
    
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
      // НЕ фильтруем скрытые профили здесь - они будут отфильтрованы в компонентах
      // Это нужно, чтобы администраторы могли видеть скрытые профили в поиске
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
      
      // Загружаем команды для каждого игрока (без тяжёлых логов для производительности)
      try {
        const teamPromises = players.map(async (player) => {
          try {
            const teams = await getPlayerTeamsAsPastTeams(player.id);
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
    // Очищаем memory кэш (мгновенно)
    playersMemoryCache.delete(playerId);
    teamsMemoryCache.delete(playerId);
    
    // Очищаем AsyncStorage кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await Promise.all([
      AsyncStorage.removeItem(`player_${playerId}`),
      AsyncStorage.removeItem(`teams_${playerId}`)
    ]);
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
    // ВАЖНО: Используем отсортированный ключ для симметричности
    const sortedIds = [userId1, userId2].sort();
    const cacheKey = `friendship_${sortedIds[0]}_${sortedIds[1]}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Кеш статуса дружбы ${userId1} <-> ${userId2} очищен (ключ: ${cacheKey})`);
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
    // КРИТИЧЕСКАЯ ПРОВЕРКА параметров
    if (!fromId || !toId) {
      console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: fromId или toId пустые!', { fromId, toId });
      return false;
    }
    
    if (fromId === toId) {
      console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: fromId равен toId!', { fromId, toId });
      return false;
    }
    
    console.log('📤 [FRIEND_REQUEST] sendFriendRequest вызван:', { fromId, toId });
    
    // Проверяем все существующие запросы между пользователями
    const { data: allRequests } = await supabase
      .from('friend_requests')
      .select('id, status, from_id, to_id')
      .or(`and(from_id.eq.${fromId},to_id.eq.${toId}),and(from_id.eq.${toId},to_id.eq.${fromId})`);
    
    if (allRequests && allRequests.length > 0) {
      console.log('📤 Найдены существующие запросы:', allRequests);
      
      // Проверяем, есть ли входящий pending запрос от toId к fromId
      // Если есть - это означает, что оба пользователя хотят дружить, просто принимаем запрос
      const incomingPendingRequest = allRequests.find(
        req => req.from_id === toId && req.to_id === fromId && req.status === 'pending'
      );
      
      if (incomingPendingRequest) {
        console.log('📤 Найден входящий pending запрос, принимаем его вместо создания нового');
        // Принимаем входящий запрос вместо создания нового
        return await acceptFriendRequest(fromId, toId);
      }
      
      // Проверяем, есть ли уже исходящий pending запрос
      const outgoingPendingRequest = allRequests.find(
        req => req.from_id === fromId && req.to_id === toId && req.status === 'pending'
      );
      
      if (outgoingPendingRequest) {
        console.log('📤 Уже есть исходящий pending запрос, пропускаем');
        return true; // Запрос уже отправлен
      }
      
      // Проверяем, если уже друзья
      const acceptedRequest = allRequests.find(req => req.status === 'accepted');
      if (acceptedRequest) {
        console.log('📤 Уже друзья, пропускаем');
        return true;
      }
      
      // Удаляем только отклоненные запросы (rejected)
      const rejectedRequests = allRequests.filter(req => req.status === 'rejected');
      if (rejectedRequests.length > 0) {
        const idsToDelete = rejectedRequests.map(req => req.id);
        const { error: deleteError } = await supabase
          .from('friend_requests')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('❌ Ошибка удаления отклоненных запросов:', deleteError);
        } else {
          console.log('🗑️ Удалены отклоненные запросы перед созданием нового:', idsToDelete);
        }
      }
    }
    
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
      // Если ошибка связана с уникальным ограничением, возможно есть отклоненный запрос
      // Попробуем удалить его и создать новый
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        console.log('🔄 Обнаружен конфликт уникальности, пытаемся удалить старый запрос и создать новый');
        const { error: deleteError } = await supabase
          .from('friend_requests')
          .delete()
          .or(`and(from_id.eq.${fromId},to_id.eq.${toId}),and(from_id.eq.${toId},to_id.eq.${fromId})`);
        
        if (!deleteError) {
          // Пытаемся создать запрос снова
          const { data: retryData, error: retryError } = await supabase
            .from('friend_requests')
            .insert([{
              from_id: fromId,
              to_id: toId,
              status: 'pending'
            }])
            .select()
            .single();
          
          if (retryError) {
            console.error('❌ Ошибка повторной отправки запроса дружбы:', retryError);
      return false;
          }
          
          console.log('✅ Запрос дружбы успешно создан после удаления конфликтующего запроса');
          // Продолжаем выполнение с retryData вместо data
          // Но так как мы уже вставили данные, просто продолжаем
        }
      } else {
        return false;
      }
    }

    // Очищаем кеш статуса дружбы при отправке запроса
    await clearFriendshipCache(fromId, toId);
    
    // Получаем данные отправителя для уведомления
    console.log('📤 [FRIEND_REQUEST] Получение данных отправителя для fromId:', fromId);
    const { data: senderData, error: senderDataError } = await supabase
      .from('players')
      .select('id, name, avatar')
      .eq('id', fromId)
      .single();
    
    if (senderDataError) {
      console.error('❌ [FRIEND_REQUEST] Ошибка получения данных отправителя:', senderDataError);
    }
    
    if (senderData) {
      console.log('📤 [FRIEND_REQUEST] Данные отправителя получены:', {
        fromId,
        fromName: senderData.name,
        toId,
        senderDataId: senderData.id
      });
      
      // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что senderData.id совпадает с fromId
      if (senderData.id !== fromId) {
        console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: senderData.id не совпадает с fromId!', {
          fromId,
          senderDataId: senderData.id
        });
      }
      
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
      
      // Удаляем старые уведомления о запросе дружбы от этого отправителя
      // Это нужно, чтобы при повторной отправке запроса создавалось новое уведомление
      console.log('🔍 [FRIEND_REQUEST] Проверка старых уведомлений для получателя:', toId, 'от отправителя:', fromId);
      try {
        // Сначала получаем старые уведомления, чтобы проверить, сколько из них непрочитанных
        const { data: oldNotifications, error: selectOldError } = await supabase
        .from('notifications')
          .select('id, is_read, data')
        .eq('user_id', toId)
          .eq('type', 'friend_request');
        
        if (selectOldError) {
          console.error('❌ [FRIEND_REQUEST] Ошибка получения старых уведомлений:', selectOldError);
        } else {
          console.log(`🔍 [FRIEND_REQUEST] Найдено ${oldNotifications?.length || 0} старых уведомлений о запросах дружбы`);
        }
        
        // Фильтруем в памяти, так как Supabase не поддерживает сложные запросы к JSON полям
        const notificationsFromSender = oldNotifications?.filter((notif: any) => {
          // Проверяем через прямой запрос к data
          const notifData = notif.data || {};
          const matches = notifData.sender_id === fromId || notifData.playerId === fromId;
          if (matches) {
            console.log('🔍 [FRIEND_REQUEST] Найдено старое уведомление от этого отправителя:', notif.id, 'is_read:', notif.is_read);
          }
          return matches;
        }) || [];
        
        console.log(`🔍 [FRIEND_REQUEST] Найдено ${notificationsFromSender.length} уведомлений от отправителя ${fromId}`);
        
        if (notificationsFromSender.length > 0) {
          // Подсчитываем непрочитанные уведомления
          const unreadCount = notificationsFromSender.filter((n: any) => !n.is_read).length;
          console.log(`🔍 [FRIEND_REQUEST] Из них непрочитанных: ${unreadCount}`);
          
          // Удаляем старые уведомления
          const notificationIds = notificationsFromSender.map((n: any) => n.id);
          const { error: deleteError } = await supabase
          .from('notifications')
            .delete()
            .in('id', notificationIds);
          
          if (deleteError) {
            console.error('❌ [FRIEND_REQUEST] Ошибка удаления старых уведомлений:', deleteError);
          } else {
            console.log(`🗑️ [FRIEND_REQUEST] Удалено ${notificationsFromSender.length} старых уведомлений (${unreadCount} непрочитанных)`);
            
            // Если были удалены непрочитанные уведомления, уменьшаем счетчик
            if (unreadCount > 0) {
              const { data: playerData } = await supabase
                .from('players')
                .select('unread_notifications_count')
                .eq('id', toId)
                .single();
              
              const currentCount = playerData?.unread_notifications_count || 0;
              const newCount = Math.max(0, currentCount - unreadCount);
              
              console.log(`🔢 [FRIEND_REQUEST] Уменьшаем счетчик уведомлений: ${currentCount} → ${newCount}`);
              
              await supabase
                .from('players')
                .update({ 
                  unread_notifications_count: newCount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', toId);
            }
          }
        } else {
          console.log('ℹ️ [FRIEND_REQUEST] Старых уведомлений от этого отправителя не найдено');
        }
      } catch (deleteOldError) {
        console.error('❌ [FRIEND_REQUEST] Ошибка удаления старых уведомлений:', deleteOldError);
      }
      
      // Всегда создаем новое уведомление при отправке запроса
      console.log('📤 [FRIEND_REQUEST] Начинаем создание in-app уведомления для получателя:', toId);
      try {
        // КРИТИЧЕСКАЯ ПРОВЕРКА перед созданием уведомления
        if (!toId || toId === fromId) {
          console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: некорректный toId перед созданием уведомления!', { fromId, toId });
          return true; // Возвращаем true чтобы не сломать основной flow
        }
        
        console.log('📤 [FRIEND_REQUEST] Создание in-app уведомления для получателя:', toId, {
          title,
          message,
          sender_id: fromId,
          sender_name: senderData.name
        });
        
        const notificationData = {
          user_id: toId, // ВАЖНО: создаем уведомление ТОЛЬКО для получателя
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
        };
        
        console.log('📤 [FRIEND_REQUEST] Данные для вставки уведомления:', JSON.stringify(notificationData, null, 2));
        
        const { data: insertedNotification, error: notificationError } = await supabase
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();
        
        if (notificationError) {
          console.error('❌ [FRIEND_REQUEST] Ошибка создания in-app уведомления о запросе:', notificationError);
          console.error('❌ [FRIEND_REQUEST] Детали ошибки:', {
            code: notificationError.code,
            message: notificationError.message,
            details: notificationError.details,
            hint: notificationError.hint
          });
        } else {
          console.log('✅ [FRIEND_REQUEST] In-app уведомление о запросе дружбы создано для:', toId);
          console.log('✅ [FRIEND_REQUEST] Созданное уведомление:', insertedNotification?.id);
        
          // ИСПРАВЛЕНО: Используем SQL функцию increment_unread_notifications для атомарного увеличения
          // Это предотвращает гонки и двойное увеличение счетчика
          // Friend requests теперь считаются вместе с обычными уведомлениями
          // После просмотра уведомлений (3 сек) они помечаются как прочитанные и badge исчезает
          try {
            const { error: counterError } = await supabase
              .rpc('increment_unread_notifications', { user_id: toId });
            
            if (counterError) {
              console.error('❌ Ошибка увеличения счетчика уведомлений:', counterError);
            } else {
              console.log('✅ Счетчик уведомлений увеличен для:', toId, '(использована SQL функция)');
            }
          } catch (counterError) {
            console.error('❌ Ошибка увеличения счетчика уведомлений:', counterError);
          }
        }
        } catch (notificationError) {
          console.error('❌ Ошибка создания уведомления о запросе:', notificationError);
      }
        
      // Отправляем push уведомление (даже если in-app уведомление уже существует)
        try {
          // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что отправляем ТОЛЬКО получателю
          if (!toId || toId === fromId) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: toId некорректный или равен fromId!', { fromId, toId });
            return true; // Возвращаем true чтобы не сломать основной flow
          }
          
          console.log('📤 [PUSH] Отправка push-уведомления о запросе дружбы:', {
            fromId,
            fromName: senderData.name,
            toId,
            pushTitle,
            pushBody
          });
          
          const { sendNotificationToUser } = await import('./notificationService');
          const pushResult = await sendNotificationToUser(
            toId, // ВАЖНО: отправляем ТОЛЬКО получателю (toId)
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
            console.log('✅ [PUSH] Push-уведомление о запросе дружбы отправлено получателю:', toId);
          } else {
            console.warn('⚠️ [PUSH] Push-уведомление о запросе дружбы не отправлено получателю:', toId);
          }
        } catch (pushError) {
          console.error('❌ [PUSH] Ошибка отправки push уведомления:', pushError, { fromId, toId });
      }
    } else {
      console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: senderData не определен! Не удалось получить данные отправителя для fromId:', fromId);
      console.error('❌ [FRIEND_REQUEST] Это означает, что уведомление не будет создано!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки запроса дружбы:', error);
    return false;
  }
};

// Проверка статуса дружбы с кешированием
export const getFriendshipStatus = async (userId1: string, userId2: string, skipCache: boolean = false): Promise<'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'> => {
  try {
    // ВАЖНО: Используем отсортированный ключ для симметричности
    const sortedIds = [userId1, userId2].sort();
    const cacheKey = `friendship_${sortedIds[0]}_${sortedIds[1]}`;
    const cacheTime = 5 * 60 * 1000; // 5 минут
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Проверяем кеш только если не указан skipCache
    if (!skipCache) {
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { status, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        return status;
        }
      }
    }
    
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .single();
    
    if (error) {
      // Кешируем результат "none" при ошибке (нет записи = не друзья)
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
    } else if (data.status === 'rejected') {
      // Отклоненные запросы считаются как 'none', чтобы можно было отправить запрос снова
      status = 'none';
    } else {
      status = 'none';
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
    const cacheKey = `player_${id}`;
    const cacheTime = 10 * 60 * 1000; // 10 минут
    
    // 1. Сначала проверяем in-memory кэш (мгновенно!)
    const memCached = playersMemoryCache.get(id);
    if (memCached && Date.now() - memCached.timestamp < cacheTime) {
      return memCached.player;
    }
    
    // 2. Затем проверяем AsyncStorage кэш
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { player, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < cacheTime) {
        // Сохраняем в memory кэш для следующих обращений
        playersMemoryCache.set(id, { player, timestamp });
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
    
    // Кешируем результат в AsyncStorage и memory
    const timestamp = Date.now();
    playersMemoryCache.set(id, { player, timestamp });
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ player, timestamp }));
    
    return player;
  } catch (error) {
    console.error('❌ Ошибка получения игрока:', error);
    return null;
  }
};

// Очистка memory кэша игрока (вызывается при обновлении)
export const clearPlayerMemoryCache = (playerId?: string) => {
  if (playerId) {
    playersMemoryCache.delete(playerId);
  } else {
    playersMemoryCache.clear();
  }
};

// Добавление нового игрока
export const addPlayer = async (player: Omit<Player, 'id' | 'unread_notifications_count' | 'unreadMessagesCount'>): Promise<Player> => {
  try {
    // Добавляем игрока
    const supabasePlayer = convertPlayerToSupabase(player);
    
    // Добавляем created_at и updated_at при создании
    const dataWithTimestamp = {
      ...supabasePlayer,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([dataWithTimestamp])
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
    
    // Явно обновляем updated_at для срабатывания Realtime подписок
    supabaseData.updated_at = new Date().toISOString();
    
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

      // Очищаем AsyncStorage кэш всех игроков для главной страницы (чтобы изменения отображались)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('all_players');

      // НЕ очищаем кеш всех игроков при каждом обновлении
      // await clearAllPlayersCache(); // Закомментировано для лучшей производительности
    }
    
    // Отслеживаем изменения статистики и нормативов
    // ВАЖНО: Уведомления отправляются из handleSave в app/player/[id].tsx,
    // чтобы избежать дублирования и проблем с кешированием.
    // Здесь только сохраняем изменения в базу данных для истории.
    if (oldPlayer) {
      const statChanges = trackStatsChanges(oldPlayer, updatedPlayer);
      const normativeChanges = trackNormativeChanges(oldPlayer, updatedPlayer);
      
      // Если есть изменения, сохраняем их в базу данных (действуют 7 дней)
      if (statChanges.length > 0 || normativeChanges.length > 0) {
        // Сохраняем изменения статистики и нормативов в базу данных (действуют 7 дней)
        await saveStatsChanges(playerId, [...statChanges, ...normativeChanges]);
        
        // Уведомления отправляются из handleSave, чтобы избежать дублирования
        // и проблем с кешированием при одновременном изменении статистики и нормативов
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
    // Обновляем онлайн-статус в базе данных при входе
    try {
      await supabase
        .from('players')
        .update({ 
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);
      
      // Обновляем локальный объект пользователя
      user.isOnline = true;
      user.lastSeen = new Date().toISOString();
    } catch (statusError) {
      // Не критично, если не удалось обновить статус
      console.warn('⚠️ Не удалось обновить онлайн-статус:', statusError);
    }
    
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
          // ВАЖНО: Даже при загрузке из кэша проверяем страну из БД,
          // чтобы убедиться, что данные актуальны
          // Это критично для правильной работы фильтров
          try {
            const { data: playerData, error: playerError } = await supabase
              .from('players')
              .select('id, country, birth_date, status')
              .eq('id', user.id)
              .single();
            
            if (!playerError && playerData) {
              // Если страна не совпадает, обновляем и не используем кэш
              if (playerData.country && playerData.country !== user.country) {
                console.log('⚠️ [USER] Обнаружено несоответствие страны в кэше:', {
                  cachedCountry: user.country,
                  dbCountry: playerData.country,
                  userId: user.id,
                  userName: user.name
                });
                // Обновляем страну в объекте пользователя
                user.country = playerData.country;
                // Обновляем другие важные поля
                if (playerData.birth_date) user.birthDate = playerData.birth_date;
                if (playerData.status) user.status = playerData.status;
                // Обновляем AsyncStorage с актуальными данными
                await AsyncStorage.setItem('hockeystars_current_user', JSON.stringify(user));
                // Продолжаем загрузку без использования кэша, чтобы обновить данные
              } else {
                // Страна совпадает, можно использовать кэш
          return user;
        }
            } else {
              // Если не удалось загрузить из БД, используем кэш
              return user;
            }
          } catch (error) {
            console.error('❌ Ошибка проверки страны из БД при загрузке из кэша:', error);
            // При ошибке используем кэш
            return user;
          }
        }
      }
    }
    
    // Загрузка текущего пользователя
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    
    if (!userData) {
      return null;
    }
    
    const user = JSON.parse(userData);
    
    // ВАЖНО: Загружаем актуальные данные пользователя из базы данных, чтобы убедиться, что страна и другие поля актуальны
    try {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, name, country, birth_date, status, unread_messages_count')
        .eq('id', user.id)
        .single();
      
      if (!playerError && playerData) {
        // Обновляем критически важные поля из базы данных
        if (playerData.country && playerData.country !== user.country) {
          console.log('⚠️ [USER] Обнаружено несоответствие страны пользователя:', {
            cachedCountry: user.country,
            dbCountry: playerData.country,
            userId: user.id,
            userName: user.name
          });
          user.country = playerData.country;
        }
        
        // Обновляем другие важные поля
        if (playerData.birth_date && playerData.birth_date !== user.birthDate) {
          user.birthDate = playerData.birth_date;
        }
        
        if (playerData.status && playerData.status !== user.status) {
          user.status = playerData.status;
        }
        
        user.unreadMessagesCount = playerData.unread_messages_count || 0;
      } else {
        // Fallback на 0 если не удалось загрузить
        user.unreadMessagesCount = 0;
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных пользователя из БД:', error);
      user.unreadMessagesCount = 0;
    }
    
    // ВАЖНО: Обновляем данные пользователя в AsyncStorage, если они были изменены из базы данных
    // Это гарантирует, что при следующей загрузке будут использоваться актуальные данные
    if (user.country !== JSON.parse(userData).country || 
        user.birthDate !== JSON.parse(userData).birthDate || 
        user.status !== JSON.parse(userData).status) {
      console.log('🔄 [USER] Обновляем данные пользователя в AsyncStorage с актуальными данными из БД');
      await AsyncStorage.setItem('hockeystars_current_user', JSON.stringify(user));
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
export const logoutUser = async (skipStatusUpdate: boolean = false): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Проверим, есть ли данные пользователя перед удалением
    const userData = await AsyncStorage.getItem('hockeystars_current_user');
    let userId: string | null = null;
    
    if (userData && !skipStatusUpdate) {
      const user = JSON.parse(userData);
      userId = user.id;
      
      // Обновляем онлайн-статус в базе данных при выходе (только если пользователь не удален)
      try {
        await supabase
          .from('players')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id);
      } catch (statusError) {
        // Не критично, если не удалось обновить статус (возможно, пользователь уже удален)
        console.warn('⚠️ Не удалось обновить офлайн-статус:', statusError);
      }
      
      // Удаляем все push токены пользователя при выходе из аккаунта
      try {
        const { deleteUserPushTokens } = await import('./notificationService');
        await deleteUserPushTokens(user.id);
        console.log('✅ Push токены удалены при выходе из аккаунта');
      } catch (tokenError) {
        // Не критично, если не удалось удалить токены
        console.warn('⚠️ Не удалось удалить push токены при выходе (не критично):', tokenError);
      }
    }
    
    // Очищаем все связанные данные
    await AsyncStorage.removeItem('hockeystars_current_user');
    await AsyncStorage.removeItem('hockeystars_user_cache');
    await AsyncStorage.removeItem('hockeystars_last_user_id');
    await AsyncStorage.removeItem('all_players');
    
    // Обновляем глобальный кеш и контекст пользователя
    try {
      const { updateGlobalUserCache } = await import('../contexts/UserContext');
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
    
    // Парсим информацию об ответе из текста сообщения
    let text = data.text;
    let replyToId: string | undefined;
    let replyToText: string | undefined;
    let replyToSenderId: string | undefined;
    
    const replyDataMatch = text.match(/^\[REPLY_DATA:(.+?)\](.*)$/);
    if (replyDataMatch) {
      try {
        const replyData = JSON.parse(replyDataMatch[1]);
        if (replyData.replyTo) {
          replyToId = replyData.replyTo.id;
          replyToText = replyData.replyTo.text;
          replyToSenderId = replyData.replyTo.senderId;
          text = replyDataMatch[2];
        }
      } catch (e) {
        console.error('Ошибка парсинга replyTo данных:', e);
      }
    }
    
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      text: text,
      timestamp: new Date(data.created_at),
      read: data.read,
      replyToId,
      replyToText,
      replyToSenderId
    };
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    throw error;
  }
};

// Получение сообщений между двумя пользователями
export const getMessages = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    // ВАЖНО: Всегда загружаем свежие данные из БД (без кеширования)
    // Это гарантирует, что при открытии чата видны все новые сообщения
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }
    
    return (data || []).map(msg => {
      // Парсим информацию об ответе из текста сообщения
      let text = msg.text;
      let replyToId: string | undefined;
      let replyToText: string | undefined;
      let replyToSenderId: string | undefined;
      
      // Проверяем, есть ли в начале текста метаданные об ответе
      const replyDataMatch = text.match(/^\[REPLY_DATA:(.+?)\](.*)$/);
      if (replyDataMatch) {
        try {
          const replyData = JSON.parse(replyDataMatch[1]);
          if (replyData.replyTo) {
            replyToId = replyData.replyTo.id;
            replyToText = replyData.replyTo.text;
            replyToSenderId = replyData.replyTo.senderId;
            text = replyDataMatch[2]; // Убираем метаданные из текста
          }
        } catch (e) {
          console.error('Ошибка парсинга replyTo данных:', e);
        }
      }
      
      return {
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        text: text,
        timestamp: new Date(msg.created_at),
        read: msg.read,
        replyToId,
        replyToText,
        replyToSenderId
      };
    });
  } catch (error) {
    console.error('❌ Ошибка получения сообщений:', error);
    return [];
  }
};

// Получение диалога между двумя пользователями
export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    console.log(`📨 getConversation: загружаем диалог между ${userId1} и ${userId2}`);
    const messages = await getMessages(userId1, userId2);
    const sorted = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`✅ getConversation: получено ${sorted.length} сообщений`);
    return sorted;
  } catch (error) {
    console.error('❌ Ошибка загрузки диалога:', error);
    console.error('❌ Детали ошибки:', error instanceof Error ? error.stack : String(error));
    return [];
  }
};

// Упрощенная отправка сообщения
export const sendMessageSimple = async (
  senderId: string, 
  receiverId: string, 
  text: string,
  replyTo?: { id: string; text: string; senderId: string }
): Promise<boolean> => {
  try {
    // console.log('📨 ОТПРАВКА СООБЩЕНИЯ:', {
    //   senderId,
    //   receiverId,
    //   text: text.substring(0, 30) + '...'
    // });
    
    // Формируем текст сообщения с информацией об ответе в JSON формате в начале
    let messageText = text;
    if (replyTo) {
      const replyData = JSON.stringify({
        replyTo: {
          id: replyTo.id,
          text: replyTo.text.substring(0, 100), // Ограничиваем длину для превью
          senderId: replyTo.senderId
        }
      });
      messageText = `[REPLY_DATA:${replyData}]${text}`;
    }
    
    const message = {
      senderId,
      receiverId,
      text: messageText,
      read: false,
      replyToId: replyTo?.id,
      replyToText: replyTo?.text,
      replyToSenderId: replyTo?.senderId
    };
    
    await sendMessage(message);
    
    // Отправляем push-уведомление напрямую (альтернатива Realtime)
    // ВАЖНО: Уведомление отправляется ТОЛЬКО получателю (receiverId)
    // Это гарантирует, что админы не получат уведомления о чужих сообщениях
    try {
      const { sendMessageNotification, getUserPushTokens } = await import('./notificationService');
      
      // Дополнительная проверка: отправитель и получатель не должны быть одинаковыми
      if (senderId === receiverId) {
        console.log('🔔 Пропускаем уведомление: отправитель и получатель одинаковые');
        return true;
      }
      
      // Получаем данные отправителя
      const senderPlayer = await getPlayerById(senderId);
      if (!senderPlayer) {
        console.log('🔔 Пропускаем уведомление: не удалось получить данные отправителя');
        return true;
      }
      
      // Получаем токены получателя
      const receiverTokens = await getUserPushTokens(receiverId);
      if (receiverTokens.length > 0) {
        console.log(`🔔 Отправляем push-уведомление получателю ${receiverId} от ${senderId}`);
        await sendMessageNotification(
          receiverTokens,
          senderPlayer.name || 'Пользователь',
          text,
          senderId
        );
      } else {
        console.log(`🔔 Пропускаем уведомление: у получателя ${receiverId} нет push токенов`);
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
    console.log(`📨 getUserConversations: загружаем диалоги для пользователя ${userId}...`);
    
    // Пробуем два подхода: сначала с .or(), если не работает - два отдельных запроса
    let data: any[] = [];
    let error: any = null;
    
    // Подход 1: Используем .or() запрос
    const { data: orData, error: orError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    if (orError) {
      console.error('❌ Ошибка с .or() запросом:', orError);
      console.error('❌ Детали ошибки:', JSON.stringify(orError, null, 2));
      console.warn('⚠️ Пробуем два отдельных запроса...');
      
      // Подход 2: Два отдельных запроса
      const [sentResult, receivedResult] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', userId)
          .order('created_at', { ascending: true })
      ]);
      
      if (sentResult.error) {
        console.error('❌ Ошибка получения отправленных сообщений:', sentResult.error);
      }
      if (receivedResult.error) {
        console.error('❌ Ошибка получения полученных сообщений:', receivedResult.error);
      }
      
      // Объединяем результаты и убираем дубликаты по id
      const sentMessages = sentResult.data || [];
      const receivedMessages = receivedResult.data || [];
      const messageMap = new Map();
      
      [...sentMessages, ...receivedMessages].forEach(msg => {
        if (!messageMap.has(msg.id)) {
          messageMap.set(msg.id, msg);
        }
      });
      
      data = Array.from(messageMap.values());
      error = sentResult.error || receivedResult.error;
    } else {
      data = orData || [];
      error = orError;
    }
    
    if (error) {
      console.error('❌ Ошибка получения диалогов:', error);
      console.error('❌ Детали ошибки:', JSON.stringify(error, null, 2));
      return {};
    }
    
    console.log(`✅ getUserConversations: получено ${data.length} сообщений из БД`);
    
    // Группируем сообщения по собеседникам
    const conversations: Record<string, Message[]> = {};
    
    data.forEach(msg => {
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
    
    // Сортируем сообщения в каждом диалоге по времени
    Object.keys(conversations).forEach(key => {
      conversations[key].sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return aTime - bTime;
      });
    });
    
    const conversationCount = Object.keys(conversations).length;
    console.log(`✅ getUserConversations: сформировано ${conversationCount} диалогов`);
    
    if (conversationCount === 0 && data.length > 0) {
      console.warn(`⚠️ getUserConversations: есть сообщения (${data.length}), но диалоги не сформированы`);
    }
    
    return conversations;
  } catch (error) {
    console.error('❌ Ошибка получения диалогов пользователя:', error);
    console.error('❌ Детали ошибки:', error instanceof Error ? error.stack : String(error));
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
    
    // Очищаем кеш друзей для обоих пользователей
    await clearFriendsCache(userId1);
    await clearFriendsCache(userId2);
    console.log('✅ Кеш друзей очищен для обоих пользователей');
    
    // ВАЖНО: Удаляем уведомление о запросе дружбы у принимающего (userId1)
    // Это нужно чтобы индикатор "1" исчез после принятия запроса
    try {
      const senderId = requestData?.from_id === userId1 ? userId2 : requestData?.from_id;
      if (senderId) {
        const { data: deletedNotifications } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId1)
          .eq('type', 'friend_request')
          .or(`data->sender_id.eq.${senderId},data->from_id.eq.${senderId},data->playerId.eq.${senderId}`)
          .select();
        
        if (deletedNotifications && deletedNotifications.length > 0) {
          console.log('✅ Удалено уведомление о запросе дружбы после принятия:', deletedNotifications.length);
          
          // ИСПРАВЛЕНО: Пересчитываем все непрочитанные уведомления для точности
          // Это гарантирует, что счетчик будет правильным даже если были другие изменения
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId1)
            .eq('is_read', false)
            .not('type', 'in', '(gift_accepted,achievement,team_invite,new_friendship)');
          
          const newCount = count || 0;
          
          await supabase
            .from('players')
            .update({ 
              unread_notifications_count: newCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId1);
          
          console.log('✅ Счётчик уведомлений обновлен после принятия запроса:', newCount);
        }
      }
    } catch (notifError) {
      console.error('⚠️ Ошибка удаления уведомления о запросе (не критично):', notifError);
    }
    
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
        console.log('📝 Создаем уведомление friend_accepted для отправителя запроса:', {
          senderId,
          acceptorId: userId1,
          acceptorName: acceptorData.name
        });
        
        // Получаем язык получателя (отправителя запроса)
        const { getUserLanguage, loadTranslations } = await import('./languageHelper');
        const senderLang = await getUserLanguage(senderId);
        const senderTranslations = loadTranslations(senderLang);
        
        const title = senderTranslations?.notifications?.friendAccepted || 'Friend Request Accepted';
        const acceptedText = senderTranslations?.notifications?.acceptedYourRequest || 'accepted your friend request';
        const message = `${acceptorData.name} ${acceptedText}`;
        
        const { data: notificationData, error: insertError } = await supabase
          .from('notifications')
          .insert([{
            user_id: senderId,
            type: 'friend_accepted',
            title: title,
            message: message,
            is_read: false,
            data: { 
              acceptor_id: userId1,
              acceptor_name: acceptorData.name,
              acceptor_avatar: acceptorData.avatar
            }
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Ошибка создания уведомления friend_accepted:', insertError);
        } else {
          console.log('✅ Уведомление friend_accepted создано:', notificationData?.id);
        }
        
        // Увеличиваем счетчик уведомлений для отправителя
        const { error: counterError } = await supabase.rpc('increment_unread_notifications', { user_id: senderId });
        
        if (counterError) {
          console.error('❌ Ошибка увеличения счетчика уведомлений:', counterError);
        } else {
          console.log('✅ Счетчик уведомлений увеличен для отправителя запроса:', senderId);
        }
        
        // Отправляем push уведомление с локализацией
        try {
          const { sendNotificationToUser } = await import('./notificationService');
          console.log('📤 Отправляем push уведомление friend_accepted отправителю:', senderId);
          const pushTitle = '🤝 ' + title;
          
          await sendNotificationToUser(
            senderId,
            pushTitle,
            message,
            {
              type: 'friend_accepted',
              acceptor_id: userId1,
              action: 'open_notifications'
            }
          );
          console.log('✅ Push уведомление friend_accepted отправлено');
        } catch (pushError) {
          console.error('⚠️ Ошибка отправки push уведомления:', pushError);
        }
      } catch (notificationError) {
        console.error('❌ Ошибка создания уведомления о принятии:', notificationError);
      }
    } else {
      console.warn('⚠️ Не удалось создать уведомление friend_accepted: отсутствуют данные', {
        hasAcceptorData: !!acceptorData,
        senderId
      });
    }
    
    // Уведомляем друзей о новой дружбе
    // ИСПРАВЛЕНО: Передаем senderId, чтобы исключить его из получателей уведомлений new_friendship
    // Это предотвращает двойное увеличение счетчика (friend_accepted + new_friendship)
    const senderIdForFriendship = requestData?.from_id === userId1 ? userId2 : requestData?.from_id;
    await notifyFriendsAboutNewFriendship(userId1, userId2, senderIdForFriendship);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка принятия запроса дружбы:', error);
    return false;
  }
};

// Отклонение запроса дружбы
export const declineFriendRequest = async (userId1: string, userId2: string): Promise<boolean> => {
  try {
    // Получаем информацию о запросе, чтобы узнать кто отправитель
    const { data: requestData } = await supabase
      .from('friend_requests')
      .select('from_id, to_id')
      .or(`and(from_id.eq.${userId1},to_id.eq.${userId2}),and(from_id.eq.${userId2},to_id.eq.${userId1})`)
      .eq('status', 'pending')
      .single();
    
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
    
    // ВАЖНО: Удаляем уведомление о запросе дружбы у отклоняющего (userId1)
    // Это нужно чтобы индикатор "1" исчез после отклонения запроса
    try {
      const senderId = requestData?.from_id === userId1 ? userId2 : requestData?.from_id;
      if (senderId) {
        const { data: deletedNotifications } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId1)
          .eq('type', 'friend_request')
          .or(`data->sender_id.eq.${senderId},data->from_id.eq.${senderId},data->playerId.eq.${senderId}`)
          .select();
        
        if (deletedNotifications && deletedNotifications.length > 0) {
          console.log('✅ Удалено уведомление о запросе дружбы после отклонения:', deletedNotifications.length);
          
          // ИСПРАВЛЕНО: Пересчитываем все непрочитанные уведомления для точности
          // Это гарантирует, что счетчик будет правильным даже если были другие изменения
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId1)
            .eq('is_read', false)
            .not('type', 'in', '(gift_accepted,achievement,team_invite,new_friendship)');
          
          const newCount = count || 0;
          
          await supabase
            .from('players')
            .update({ 
              unread_notifications_count: newCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId1);
          
          console.log('✅ Счётчик уведомлений обновлен после отклонения запроса:', newCount);
        }
      }
    } catch (notifError) {
      console.error('⚠️ Ошибка удаления уведомления о запросе (не критично):', notifError);
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
export const deletePlayer = async (playerId: string, isOwnAccount: boolean = false): Promise<boolean> => {
  try {
    console.log(`🗑️ Удаляем игрока с ID: ${playerId}, isOwnAccount: ${isOwnAccount}`);
    
    // Если пользователь удаляет свой аккаунт, используем RPC функцию
    if (isOwnAccount) {
      console.log('🗑️ Используем RPC функцию для удаления собственного аккаунта');
      console.log('🗑️ playerId:', playerId);
      
      // Получаем текущего пользователя для проверки
      const currentUser = await loadCurrentUser();
      if (!currentUser || currentUser.id !== playerId) {
        console.error('❌ Пользователь может удалить только свой аккаунт');
        return false;
      }
      
      const { data, error } = await supabase.rpc('delete_own_account', {
        player_id_param: playerId,
        requesting_user_id: playerId
      });
      
      console.log('🗑️ RPC результат - data:', data, 'error:', error);
      
      if (error) {
        console.error('❌ Ошибка удаления собственного аккаунта через RPC:', error);
        console.error('❌ Детали ошибки:', JSON.stringify(error, null, 2));
        return false;
      }
      
      if (data) {
        console.log('✅ Аккаунт успешно удален через RPC функцию');
        // Очищаем кеши после успешного удаления
        try {
          avatarCache.clearAvatar(playerId);
          await clearPlayerCache(playerId);
          dataCache.invalidate(CACHE_KEYS.PLAYERS);
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('all_players');
          await clearAllPlayersCache();
          console.log(`✅ Кеши очищены для удаленного игрока`);
        } catch (cacheError) {
          console.warn('⚠️ Ошибка очистки кешей:', cacheError);
        }
        return true;
      }
      return false;
    }
    
    // Для админов используем обычный способ удаления
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

      // Очищаем AsyncStorage кэш всех игроков (используется главной страницей)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('all_players');

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
      // Тихая обработка сетевых ошибок (отсутствие интернета)
      const isNetworkError = (error as any)?.message?.includes('Network request failed') || 
                             (error as any)?.message?.includes('network') ||
                             (error as any)?.code === 'NETWORK_ERROR';
      
      if (!isNetworkError) {
        // Логируем только не-сетевые ошибки
      console.error('❌ Ошибка загрузки уведомлений:', error);
      }
      return [];
    }

    return data || [];
  } catch (error) {
    // Тихая обработка сетевых ошибок (отсутствие интернета)
    const isNetworkError = (error as any)?.message?.includes('Network request failed') || 
                           (error as any)?.message?.includes('network') ||
                           (error as any)?.code === 'NETWORK_ERROR';
    
    if (!isNetworkError) {
      // Логируем только не-сетевые ошибки
    console.error('❌ Ошибка загрузки уведомлений:', error);
    }
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
      phone: '+123456789', // Added phone number
      city: 'Минск',
      goals: 0,
      assists: 0,
      games: 0,
      pull_ups: 0,
      push_ups: 0,
      plank_time: 0,
      sprint_100m: 0,
      long_jump: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
      if (player.avatar && (player.avatar.startsWith('file://') || player.avatar.startsWith('content://') || player.avatar.startsWith('data:'))) {
        const { uploadImageToStorage } = await import('./uploadImage');
        const migratedAvatarUrl = await uploadImageToStorage(player.avatar, `avatar_${player.id}.jpg`);
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
      
      // ВАЖНО: Уведомления друзьям отправляются в ExerciseService.markExerciseAsCompleted
      // Здесь НЕ отправляем уведомления, чтобы избежать дублирования
      
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
// ВАЖНО: Получаем данные напрямую из БД, минуя кеш, для актуальности
export const getLastExerciseCompletion = async (playerId: string, exerciseId: string): Promise<ExerciseCompletion | null> => {
  try {
    // Получаем данные напрямую из базы данных, минуя кеш
    const { data, error } = await supabase
      .from('players')
      .select('exercise_stats')
      .eq('id', playerId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Парсим exercise_stats
    let exerciseStats: PlayerExerciseStats | null = null;
    
    if (data.exercise_stats) {
      if (typeof data.exercise_stats === 'string') {
        try {
          exerciseStats = JSON.parse(data.exercise_stats);
        } catch (e) {
          console.error('❌ Ошибка парсинга exercise_stats:', e);
          return null;
        }
      } else {
        exerciseStats = data.exercise_stats as PlayerExerciseStats;
      }
    }
    
    if (!exerciseStats || !exerciseStats.completions) {
      return null;
    }
    
    // Проверяем формат (массив)
    if (Array.isArray(exerciseStats.completions)) {
      const completion = exerciseStats.completions.find(c => c.exerciseId === exerciseId);
      if (completion) {
        return completion;
      }
    }
    
    // Проверяем формат (объект) - конвертируем в ExerciseCompletion
    if (typeof exerciseStats.completions === 'object' && !Array.isArray(exerciseStats.completions)) {
      const count = (exerciseStats.completions as any)[exerciseId];
      if (count !== undefined) {
        // В объектном формате нет даты - возвращаем null (упражнение можно выполнить)
      return null;
      }
    }
    
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
    // Если есть несколько пользователей с одним телефоном, берем самого нового
    if (isAdminAccess) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
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
    // Если есть несколько администраторов с одним телефоном, берем самого нового
    const { data: adminData, error: adminError } = await supabase
      .from('players')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'admin')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (adminData) {
      return convertSupabaseToPlayer(adminData);
    }
    
    // Если администратор не найден, ищем обычного пользователя
    // Если есть несколько пользователей с одним телефоном, берем самого нового
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
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
    console.log('📋 Данные игрока перед созданием:', {
      name: playerData.name,
      status: playerData.status,
      avatar: playerData.avatar ? (playerData.avatar.substring(0, 50) + '...') : 'нет',
      phone: playerData.phone
    });
    
    // Проверяем, нет ли уже пользователя с таким телефоном
    if (playerData.phone) {
      const existingPlayer = await getPlayerByPhone(playerData.phone, true); // Используем admin access для поиска всех
      if (existingPlayer) {
        console.error('❌ Пользователь с таким телефоном уже существует:', existingPlayer.id, existingPlayer.name, existingPlayer.status);
        // Выбрасываем ошибку вместо возврата существующего пользователя
        throw new Error('PHONE_ALREADY_EXISTS');
      }
    }
    
    // Конвертируем данные игрока в формат Supabase
    const supabaseData = convertPlayerToSupabase(playerData);
    
    // Добавляем created_at при создании
    const dataWithTimestamp = {
      ...supabaseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📋 Данные для Supabase:', {
      name: dataWithTimestamp.name,
      status: dataWithTimestamp.status,
      avatar: dataWithTimestamp.avatar ? (dataWithTimestamp.avatar.substring(0, 50) + '...') : 'нет',
      phone: dataWithTimestamp.phone,
      created_at: dataWithTimestamp.created_at
    });
    
    const { data, error } = await supabase
      .from('players')
      .insert([dataWithTimestamp])
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Ошибка создания игрока:', error);
      // Если ошибка из-за дубликата телефона, выбрасываем специальную ошибку
      if (error.code === '23505' && playerData.phone) { // 23505 = unique violation
        console.log('⚠️ Обнаружен дубликат телефона');
        throw new Error('PHONE_ALREADY_EXISTS');
      }
      return null;
    }
    
    if (!data) {
      console.error('❌ Нет данных после создания игрока');
      return null;
    }
    
    console.log('✅ Игрок создан в БД:', {
      id: data.id,
      name: data.name,
      status: data.status,
      avatar: data.avatar ? (data.avatar.substring(0, 50) + '...') : 'нет',
      avatarFull: data.avatar || null
    });
    
    const createdPlayer = convertSupabaseToPlayer(data);
    
    console.log('✅ Игрок конвертирован:', {
      id: createdPlayer.id,
      name: createdPlayer.name,
      status: createdPlayer.status,
      avatar: createdPlayer.avatar ? (createdPlayer.avatar.substring(0, 50) + '...') : 'нет',
      avatarFull: createdPlayer.avatar || null
    });
    
    // Обновляем кеш аватаров для нового игрока
    if (createdPlayer.avatar) {
      avatarCache.setAvatar(createdPlayer.id, createdPlayer.avatar);
      console.log('✅ Аватар добавлен в кеш для игрока:', createdPlayer.id, 'URL:', createdPlayer.avatar.substring(0, 80) + '...');
    } else {
      console.warn('⚠️ У созданного игрока нет аватара!');
    }
    
    // Очищаем кеш всех игроков и инвалидация dataCache, чтобы главный экран увидел нового игрока
    await clearAllPlayersCache();

    // Очищаем AsyncStorage кэш всех игроков (используется главной страницей)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('all_players');

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
    
    // Начисляем 50 звездочек за регистрацию профиля
    try {
      await addActivityPoints(createdPlayer.id, 'REGISTRATION', `Регистрация профиля: ${createdPlayer.name}`);
    } catch (error) {
      console.error('❌ Ошибка начисления очков активности за регистрацию (не критично):', error);
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

    // Конвертируем данные игрока в формат Supabase
    const supabaseData = convertPlayerToSupabase(completePlayerData);
    
    // Добавляем created_at при создании
    const dataWithTimestamp = {
      ...supabaseData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([dataWithTimestamp])
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

    // Очищаем AsyncStorage кэш всех игроков (используется главной страницей)
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('all_players');

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
  
  // Определяем, является ли игрок вратарем (используем функцию нормализации)
  const isGoalkeeper = isGoalkeeperPosition(newPlayer.position);
  
  if (isGoalkeeper) {
    // Поля статистики для вратарей
    const goalkeeperStatsFields = ['games', 'minutes', 'shots', 'saves'];
    
    goalkeeperStatsFields.forEach(field => {
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
  } else {
    // Поля статистики для полевых игроков
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
  }
  
  return changes;
};

// Функция для отслеживания изменений нормативов
export const trackNormativeChanges = (oldPlayer: Player, newPlayer: Player): NormativeChange[] => {
  const changes: NormativeChange[] = [];
  const timestamp = new Date().toISOString();
  
  // Поля нормативов для отслеживания
  const normativeFields = ['pullUps', 'pushUps', 'plankTime', 'sprint100m', 'longJump', 'jumpRope'];
  
  // Вспомогательная функция для безопасного парсинга нормативов
  const parseNormative = (value: string | null | undefined, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  normativeFields.forEach(field => {
    const oldValue = parseNormative(oldPlayer[field as keyof Player] as string);
    const newValue = parseNormative(newPlayer[field as keyof Player] as string);
    
    // Обнаруживаем изменение только если новое значение не равно 0 (т.е. было введено значение)
    // Или если старое значение было не 0, а новое изменилось
    if (oldValue !== newValue && (newValue > 0 || oldValue > 0)) {
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
      
      const addedText = friendTranslations?.photoNotification?.added || translations?.photoNotification?.added || 'added';
      const title = friendTranslations?.pushTitles?.newPhotos || 'New photos';
      
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
            // Получаем локализацию для каждого получателя
            const userLang = friendLanguages.get(userId) || 'en';
            const userTranslations = loadTranslations(userLang);
            const photoText = photosCount === 1 
              ? (userTranslations?.photoNotification?.onePhoto || 'new photo')
              : ((userTranslations?.photoNotification?.multiplePhotos || '{count} new photos')?.replace('{count}', photosCount.toString()));
            const addedText = userTranslations?.photoNotification?.added || 'added';
            const pushTitle = '📸 ' + (userTranslations?.pushTitles?.newPhotos || 'New photos');
            await sendNotificationToUser(
              userId,
              pushTitle,
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
      
      const addedText = friendTranslations?.videoNotification?.added || translations?.videoNotification?.added || 'added';
      const title = friendTranslations?.pushTitles?.newVideos || 'New video moments';
      
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
          // Получаем локализацию для каждого получателя
          const userLang = friendLanguages.get(userId) || 'en';
          const userTranslations = loadTranslations(userLang);
          const videoText = videosCount === 1 
            ? (userTranslations?.videoNotification?.oneVideo || 'new video')
            : ((userTranslations?.videoNotification?.multipleVideos || '{count} new videos')?.replace('{count}', videosCount.toString()));
          const addedText = userTranslations?.videoNotification?.added || 'added';
          const pushTitle = '🎬 ' + (userTranslations?.pushTitles?.newVideos || 'New video moments');
          await sendNotificationToUser(
            userId,
            pushTitle,
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

            // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                unread_notifications_count: newCount,
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
      
      const changedText = friendTranslations?.avatarNotification?.changed || translations?.avatarNotification?.changed || 'changed avatar';
      const title = friendTranslations?.avatarNotification?.title || 'New Avatar';
      
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
              .select('notifications, unread_notifications_count')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              // Пробуем получить из unread_notifications_count
              if (playerData?.unread_notifications_count !== undefined && playerData?.unread_notifications_count !== null) {
                currentCount = playerData.unread_notifications_count;
              } else {
                // Fallback на JSON поле notifications
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
                }
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                unread_notifications_count: newCount,
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

export const notifyFriendsAboutPuckSpeed = async (
  playerId: string,
  playerName: string,
  newMaxSpeed: number,
  translations?: {
    puckSpeedNotification: {
      title: string;
      message: string;
    };
  }
): Promise<void> => {
  try {
    console.log('⚡ Отправляем уведомления об обновлении максимальной скорости:', { playerId, playerName, newMaxSpeed });
    
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();
    
    const playerAvatar = playerData?.avatar || null;
    
    // Получаем список друзей игрока
    const friends = await getFriends(playerId);
    console.log('👥 Друзья для уведомлений о скорости:', friends.length);
    
    if (friends.length === 0) {
      console.log('👥 У игрока нет друзей для отправки уведомлений о скорости');
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
      
      const title = friendTranslations?.puckSpeedNotification?.title || translations?.puckSpeedNotification?.title || 'Новый рекорд скорости';
      const message = friendTranslations?.puckSpeedNotification?.message?.replace('{playerName}', playerName).replace('{speed}', Math.round(newMaxSpeed).toString()) 
        || translations?.puckSpeedNotification?.message?.replace('{playerName}', playerName).replace('{speed}', Math.round(newMaxSpeed).toString())
        || `${playerName} установил новый рекорд скорости: ${Math.round(newMaxSpeed)} км/ч`;
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'puck_speed_changed',
        title: title,
        message: message,
        data: {
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar,
          newMaxSpeed: newMaxSpeed,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
    });
    
    // Сохраняем уведомления в базу данных (только для друзей)
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления о скорости в базу данных:', notifications.length);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();
      
      if (error) {
        console.error('❌ Ошибка сохранения уведомлений о скорости:', error);
      }
      
      // Отправляем push уведомления и обновляем счетчик для каждого получателя
      for (const notification of notifications) {
        if (notification.user_id) {
          // Отправляем push уведомление
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            const friendLang = friendLanguages.get(notification.user_id) || 'en';
            const friendTranslations = loadTranslations(friendLang);
            
            const pushTitle = '⚡ ' + (friendTranslations?.pushTitles?.speedRecord || friendTranslations?.puckSpeedNotification?.title || 'New speed record');
            const pushMessage = friendTranslations?.puckSpeedNotification?.message?.replace('{playerName}', playerName).replace('{speed}', Math.round(newMaxSpeed).toString())
              || `${playerName}: ${Math.round(newMaxSpeed)} km/h`;
            
            await sendNotificationToUser(
              notification.user_id,
              pushTitle,
              pushMessage,
              {
                type: 'puck_speed_changed',
                player_id: playerId,
                action: 'open_profile',
                deepLink: `/player/${playerId}`
              }
            );
          } catch (pushError) {
            console.error('⚠️ Ошибка отправки push уведомления о скорости:', pushError);
          }
          
          // Обновляем счетчик
          try {
            const userId = notification.user_id;
            const { error: updateError } = await supabase
              .rpc('increment_unread_notifications', { user_id: userId });

            if (updateError) {
              console.error('❌ Ошибка обновления счетчика уведомлений:', updateError);
            }
          } catch (updateError) {
            console.error('❌ Ошибка обновления счетчика:', updateError);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о скорости:', error);
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
        const title = friendTranslations?.pushTitles?.newAchievements || 'New Achievements';
      
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
            const pushTitle = '🏆 ' + (friendTranslations?.pushTitles?.newAchievements || 'New Achievements');
            
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
              .select('notifications, unread_notifications_count')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('❌ Ошибка получения счетчика уведомлений:', fetchError);
              continue;
            }

            let currentCount = 0;
            try {
              // Пробуем получить из unread_notifications_count
              if (playerData?.unread_notifications_count !== undefined && playerData?.unread_notifications_count !== null) {
                currentCount = playerData.unread_notifications_count;
              } else {
                // Fallback на JSON поле notifications
              const notifData = playerData?.notifications;
              if (typeof notifData === 'string') {
                const parsed = JSON.parse(notifData);
                currentCount = parsed.unread_count || 0;
              } else if (typeof notifData === 'object' && notifData !== null) {
                currentCount = notifData.unread_count || 0;
                }
              }
            } catch (parseError) {
              console.error('❌ Ошибка парсинга notifications:', parseError);
              currentCount = 0;
            }

            const newCount = currentCount + 1;

            // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                unread_notifications_count: newCount,
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

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));

    // Создаем уведомления для каждого друга с индивидуальной локализацией
    const notifications = friends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      
      // Формируем текст изменений на языке друга
      const changesText = changes.map(change => {
        const fieldName = change.field === 'height' 
          ? (friendTranslations?.height || 'рост')
          : (friendTranslations?.weight || 'вес');
        const unit = change.field === 'height' 
          ? (friendTranslations?.cm || 'см')
          : (friendTranslations?.kg || 'кг');
        return `${fieldName}: ${change.oldValue}${unit} → ${change.newValue}${unit}`;
      }).join(', ');
      
      const updatedText = friendTranslations?.statsNotification?.updated || 'updated';
      const physicalDataText = friendTranslations?.statsNotification?.physicalData || 'physical data';
      const title = friendTranslations?.pushTitles?.physicalDataUpdate || 'Physical Data Update';
      
      return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'physical_data_changed',
        title: title,
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
        // Отправляем push уведомление с локализацией для получателя
        try {
          const { sendNotificationToUser } = await import('./notificationService');
          const friendLang = friendLanguages.get(userId) || 'en';
          const friendTranslations = loadTranslations(friendLang);
          
          const changesText = changes.map(change => {
            const fieldName = change.field === 'height' 
              ? (friendTranslations?.height || 'рост')
              : (friendTranslations?.weight || 'вес');
            const unit = change.field === 'height' 
              ? (friendTranslations?.cm || 'см')
              : (friendTranslations?.kg || 'кг');
            return `${fieldName}: ${change.oldValue}${unit} → ${change.newValue}${unit}`;
          }).join(', ');
          
          const updatedText = friendTranslations?.statsNotification?.updated || 'updated';
          const physicalDataText = friendTranslations?.statsNotification?.physicalData || 'physical data';
          const title = '💪 ' + (friendTranslations?.pushTitles?.physicalDataUpdate || 'Physical Data Update');
          
          await sendNotificationToUser(
            userId,
            title,
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

            // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                unread_notifications_count: newCount,
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
  
  // Предотвращаем дубликаты (60 секунд кеш)
  if (lastCall && (now - lastCall) < 60000) {
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
    
    if (friends.length === 0) return; // Нет друзей - нечего уведомлять
    
    // Функция для генерации UUID v4
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(friends.map(f => f.id));

    // Создаем уведомления для статистики (если есть изменения) с локализацией
    const statNotifications = [];
    if (statChanges.length > 0) {
      const notifications = friends.map(friend => {
        const friendLang = friendLanguages.get(friend.id) || 'en';
        const friendTranslations = loadTranslations(friendLang);
        
        // Используем переводы из файлов локализации
        // Для русского языка используем родительный падеж для правильной грамматики в уведомлениях
        const fieldNames: { [key: string]: string } = {
          'goals': friendLang === 'ru' 
            ? (friendTranslations?.goals === 'Голы' ? 'голов' : friendTranslations?.goals || 'голов')
            : (friendTranslations?.goals || 'goals'),
          'assists': friendLang === 'ru'
            ? (friendTranslations?.assists === 'Передачи' ? 'передач' : friendTranslations?.assists || 'передач')
            : (friendTranslations?.assists || 'assists'),
          'games': friendLang === 'ru'
            ? (friendTranslations?.games === 'Игры' ? 'игр' : friendTranslations?.games || 'игр')
            : (friendTranslations?.games || 'games'),
          'minutes': friendLang === 'ru'
            ? (friendTranslations?.profile?.minutes === 'минуты' ? 'минут' : friendTranslations?.profile?.minutes || 'минут')
            : (friendTranslations?.profile?.minutes || 'minutes'),
          'shots': friendLang === 'ru'
            ? (friendTranslations?.profile?.shots === 'броски' ? 'бросков' : friendTranslations?.profile?.shots || 'бросков')
            : (friendTranslations?.profile?.shots || 'shots'),
          'saves': friendLang === 'ru'
            ? (friendTranslations?.profile?.saves === 'сэйвы' ? 'сэйвов' : friendTranslations?.profile?.saves || 'сэйвов')
            : (friendTranslations?.profile?.saves || 'saves')
        };
        
        const statChangesText = statChanges
          .map(change => {
          const fieldName = fieldNames[change.field] || change.field;
          const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
          return `${fieldName}: ${changeText}`;
        })
        .join(', ');

        const updatedText = friendTranslations?.statsNotification?.updated || 'updated';
        const title = friendTranslations?.pushTitles?.statsUpdate || 'Stats Update';
        
        return {
        id: generateUUID(),
        user_id: friend.id,
        type: 'stats_change',
          title: title,
          message: `${playerName} ${updatedText}: ${statChangesText}`,
        data: {
            changes: statChanges,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar
        },
        created_at: new Date().toISOString(),
        is_read: false
        };
      });
      
      statNotifications.push(...notifications);
    }

    // Создаем уведомления для нормативов (если есть изменения) с локализацией
    const normativeNotifications = [];
    console.log('🏋️ Проверка нормативов для уведомлений:', {
      normativeChangesCount: normativeChanges.length,
      normativeChanges: normativeChanges,
      friendsCount: friends.length
    });
    if (normativeChanges.length > 0) {
      console.log('✅ Создаем уведомления о нормативах для', friends.length, 'друзей');
      const notifications = friends.map(friend => {
        const friendLang = friendLanguages.get(friend.id) || 'en';
        const friendTranslations = loadTranslations(friendLang);
        
        // Используем переводы из файла локализации
        // Если есть секция normativeFields - используем её, иначе используем прямые ключи из корня
        const fieldNames = friendTranslations?.normativeFields || {
          'pullUps': friendTranslations?.pullUps || 'pull-ups',
          'pushUps': friendTranslations?.pushUps || 'push-ups',
          'plankTime': friendTranslations?.plankTime || 'plank',
          'sprint100m': friendTranslations?.sprint100m || '100m sprint',
          'longJump': friendTranslations?.longJump || 'long jump',
          'jumpRope': friendTranslations?.jumpRope || 'jump rope'
        };
        
        const normativeChangesText = normativeChanges
          .map(change => {
          const fieldName = fieldNames[change.field] || change.field;
          const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
          return `${fieldName}: ${changeText}`;
        })
        .join(', ');

        const updatedText = friendTranslations?.statsNotification?.updated || 'updated';
        const title = friendTranslations?.pushTitles?.standardsUpdate || 'Standards Update';
        
        return {
        id: generateUUID(),
        user_id: friend.id,
          type: 'normative_changed',
          title: title,
          message: `${playerName} ${updatedText}: ${normativeChangesText}`,
        data: {
            changes: normativeChanges,
          changedPlayerId: playerId,
          changedPlayerName: playerName,
          changedPlayerAvatar: playerAvatar
        },
        created_at: new Date().toISOString(),
        is_read: false
        };
      });
      
      normativeNotifications.push(...notifications);
      console.log('✅ Создано уведомлений о нормативах:', notifications.length);
    } else {
      console.log('⚠️ Нормативы не изменились или пусты, уведомления не создаются');
    }

    // Объединяем все уведомления
    const allNotifications = [...statNotifications, ...normativeNotifications];
    console.log('📋 Всего уведомлений перед дедупликацией:', {
      statNotifications: statNotifications.length,
      normativeNotifications: normativeNotifications.length,
      total: allNotifications.length
    });
    
    // Дедуплицируем уведомления по пользователю и типу
    const uniqueNotifications = new Map<string, typeof allNotifications[0]>();
    for (const notification of allNotifications) {
      const key = `${notification.user_id}_${notification.type}`;
      if (!uniqueNotifications.has(key)) {
        uniqueNotifications.set(key, notification);
        console.log('✅ Добавлено уведомление:', { user_id: notification.user_id, type: notification.type, title: notification.title });
      } else {
        console.log('⏭️ Пропущено дублирующееся уведомление:', { user_id: notification.user_id, type: notification.type });
      }
    }
    const deduplicatedNotifications = Array.from(uniqueNotifications.values());
    console.log('📋 Уведомлений после дедупликации:', deduplicatedNotifications.length);
    
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
        console.log('⏭️ Пропускаем дубликат уведомления для пользователя:', notification.user_id, 'от игрока:', playerId, 'тип:', notification.type, 'с теми же изменениями');
        continue;
      }
      
      console.log('💾 Сохраняем уведомление:', {
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message?.substring(0, 50) + '...'
      });
      
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notification);
        
      if (insertError) {
        console.error('❌ Ошибка сохранения уведомления:', insertError, 'тип:', notification.type);
      } else {
        console.log('✅ Уведомление сохранено в базу данных:', notification.type, 'для пользователя:', notification.user_id);
        // Запоминаем что уведомление отправлено
        notificationsByUserAndType.set(key, notification);
      }
    }
    
    const statCount = statNotifications.length;
    const normativeCount = normativeNotifications.length;
    // console.log(`📢 Отправлено ${statCount} уведомлений о статистике и ${normativeCount} уведомлений о нормативах`);
    
    // Отправляем push уведомления и обновляем счетчик для каждого друга
    const uniqueUserIds = [...new Set(deduplicatedNotifications.map(n => n.user_id))];
    const sentPushNotifications = new Set<string>();
    
    // Получаем актуальные языки из БД (задержка для синхронизации при смене языка)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const { getUserLanguages: getUserLanguagesFresh } = await import('./languageHelper');
    const freshUserLanguages = await getUserLanguagesFresh(uniqueUserIds);
    
    const userLanguagesMap = new Map<string, string>();
    const userTranslationsMap = new Map<string, any>();
    
    for (const userId of uniqueUserIds) {
      const userLang = freshUserLanguages.get(userId) || 'en';
      userLanguagesMap.set(userId, userLang);
      userTranslationsMap.set(userId, loadTranslations(userLang));
    }
    
    for (const userId of uniqueUserIds) {
      // Используем предопределенные язык и переводы для консистентности
      const userLang = userLanguagesMap.get(userId) || 'en';
      const userTranslations = userTranslationsMap.get(userId) || loadTranslations('en');
      
      // Получаем все уведомления для этого пользователя
      const userNotifications = deduplicatedNotifications.filter(n => n.user_id === userId);
      
      // Отправляем отдельное push-уведомление для каждого типа уведомления
      for (const userNotification of userNotifications) {
        const notificationType = userNotification.type;
        
      try {
        const { sendNotificationToUser } = await import('./notificationService');
        
        // Проверяем, не отправлялось ли уже push-уведомление для этого пользователя и игрока с теми же изменениями
          // ВАЖНО: Ключ кеша НЕ включает язык, чтобы предотвратить дубликаты при смене языка
          const changesHash = JSON.stringify(userNotification?.data?.changes || []);
        const pushCacheKey = `${userId}_${playerId}_${notificationType}_${changesHash}`;
        
          // Проверка дубликатов
          if (sentPushNotifications.has(pushCacheKey)) continue;
        
        const lastPushTime = pushNotificationCache.get(pushCacheKey);
        const now = Date.now();
        
          if (lastPushTime && (now - lastPushTime) < 60000) continue;
        
          // Не отправляем уведомление самому игроку
        if (userId === playerId) {
            console.error('🚨 Попытка отправить уведомление самому игроку:', {
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
        
          // Определяем тип уведомления и формируем заголовок и тело
          // КРИТИЧЕСКИ ВАЖНО: ВСЕГДА формируем title и body заново на актуальном языке из БД
          // НЕ используем userNotification?.title и userNotification?.message, так как они могут быть на старом языке
          let title: string;
          let body: string;
          
          // Получаем изменения из data (они не зависят от языка)
          const changes = (userNotification?.data as any)?.changes || [];
          
          if (notificationType === 'normative_changed') {
            // Для нормативов формируем текст заново на актуальном языке
            const fieldNames = userTranslations?.normativeFields || {
              'pullUps': userTranslations?.pullUps || 'pull-ups',
              'pushUps': userTranslations?.pushUps || 'push-ups',
              'plankTime': userTranslations?.plankTime || 'plank',
              'sprint100m': userTranslations?.sprint100m || '100m sprint',
              'longJump': userTranslations?.longJump || 'long jump',
              'jumpRope': userTranslations?.jumpRope || 'jump rope'
            };
            
            const changesText = changes
              .map((change: any) => {
                const fieldName = fieldNames[change.field] || change.field;
                const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
                return `${fieldName}: ${changeText}`;
              })
              .join(', ');
            
            title = '💪 ' + (userTranslations?.pushTitles?.standardsUpdate || 'Standards Update');
            body = `${playerName} ${userTranslations?.statsNotification?.updated || 'updated'}: ${changesText}`;
            
          } else if (notificationType === 'stats_change') {
            // Для статистики формируем текст заново на актуальном языке
            const fieldNames: { [key: string]: string } = {
              'goals': userLang === 'ru' 
                ? (userTranslations?.goals === 'Голы' ? 'голов' : userTranslations?.goals || 'голов')
                : (userTranslations?.goals || 'goals'),
              'assists': userLang === 'ru'
                ? (userTranslations?.assists === 'Передачи' ? 'передач' : userTranslations?.assists || 'передач')
                : (userTranslations?.assists || 'assists'),
              'games': userLang === 'ru'
                ? (userTranslations?.games === 'Игры' ? 'игр' : userTranslations?.games || 'игр')
                : (userTranslations?.games || 'games'),
              'minutes': userLang === 'ru'
                ? (userTranslations?.profile?.minutes === 'минуты' ? 'минут' : userTranslations?.profile?.minutes || 'минут')
                : (userTranslations?.profile?.minutes || 'minutes'),
              'shots': userLang === 'ru'
                ? (userTranslations?.profile?.shots === 'броски' ? 'бросков' : userTranslations?.profile?.shots || 'бросков')
                : (userTranslations?.profile?.shots || 'shots'),
              'saves': userLang === 'ru'
                ? (userTranslations?.profile?.saves === 'сэйвы' ? 'сэйвов' : userTranslations?.profile?.saves || 'сэйвов')
                : (userTranslations?.profile?.saves || 'saves')
            };
            
            const changesText = changes
              .map((change: any) => {
                const fieldName = fieldNames[change.field] || change.field;
                const changeText = change.change > 0 ? `+${change.change}` : change.change.toString();
                return `${fieldName}: ${changeText}`;
              })
              .join(', ');
            
            title = '📊 ' + (userTranslations?.pushTitles?.statsUpdate || 'Stats Update');
            body = `${playerName} ${userTranslations?.statsNotification?.updated || 'updated'}: ${changesText}`;
            
        } else if (notificationType === 'physical_data_changed') {
            // Для физических данных (вес, рост)
            title = '💪 ' + (userTranslations?.pushTitles?.physicalDataUpdate || 'Physical Data Update');
            body = `${playerName} ${userTranslations?.statsNotification?.updated || 'updated'} ${userTranslations?.statsNotification?.physicalData || 'physical data'}`;
          } else {
            title = '📊 ' + (userTranslations?.pushTitles?.statsUpdate || 'Stats Update');
            body = `${playerName} ${userTranslations?.statsNotification?.updated || 'updated'}`;
        }
        
          const pushResult = await sendNotificationToUser(
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
          // Ошибка отправки push — не критично
        }
      }
      
      // Обновляем счетчик уведомлений
      try {
        const { data: playerData } = await supabase
          .from('players')
          .select('unread_notifications_count')
          .eq('id', userId)
          .single();

        const currentCount = playerData?.unread_notifications_count || 0;
        await supabase
          .from('players')
          .update({ 
            unread_notifications_count: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (counterError) {
        // Ошибка обновления счетчика — не критично
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомлений о изменениях:', error);
  }
};

// Функция для уведомлений о новой дружбе
export const notifyFriendsAboutNewFriendship = async (
  userId1: string,
  userId2: string,
  excludeUserId?: string // ИСПРАВЛЕНО: Дополнительный параметр для исключения пользователя из получателей
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

    // Получаем друзей обоих игроков
    // ВАЖНО: Исключаем userId1 и userId2 из списков друзей, т.к. они участники новой дружбы
    const [friends1Raw, friends2Raw] = await Promise.all([
      getFriends(userId1),
      getFriends(userId2)
    ]);
    
    // Явно исключаем участников новой дружбы из списков друзей
    const friends1 = friends1Raw.filter(f => f.id !== userId2 && f.id !== userId1);
    const friends2 = friends2Raw.filter(f => f.id !== userId1 && f.id !== userId2);

    // Объединяем списки друзей обоих пользователей
    // Исключаем:
    // 1. Самих участников новой дружбы (userId1 и userId2) - они не должны получать уведомление "стали друзьями"
    //    - Отправитель запроса уже получил уведомление "запрос принят" (friend_accepted)
    //    - Принимающий не должен получать уведомление о новой дружбе
    // 2. excludeUserId (если передан) - отправитель запроса, который уже получил friend_accepted
    // 3. Дубликаты (если у обоих пользователей есть общие друзья)
    const allFriends = [...friends1, ...friends2].filter((friend, index, arr) => {
      // Исключаем обоих участников новой дружбы
      if (friend.id === userId1 || friend.id === userId2) {
        console.log(`🚫 Исключаем ${friend.id} из списка получателей уведомления о дружбе (это участник новой дружбы)`);
        return false;
      }
      // ИСПРАВЛЕНО: Исключаем отправителя запроса, который уже получил friend_accepted
      if (excludeUserId && friend.id === excludeUserId) {
        console.log(`🚫 Исключаем ${friend.id} из списка получателей уведомления о дружбе (уже получил friend_accepted)`);
        return false;
      }
      // Исключаем дубликаты (если друг есть в списке друзей обоих пользователей)
      return arr.findIndex(f => f.id === friend.id) === index;
    });

    console.log('👥 Друзья для уведомлений о дружбе:', allFriends.length);
    console.log('👥 ID друзей для уведомлений:', allFriends.map(f => f.id));
    console.log('👥 userId1 (принимающий):', userId1, 'userId2 (отправитель):', userId2);
    console.log('👥 Друзья userId1:', friends1.length, friends1.map(f => f.id));
    console.log('👥 Друзья userId2:', friends2.length, friends2.map(f => f.id));

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

    // Получаем языки всех друзей для локализации
    const { getUserLanguages, loadTranslations } = await import('./languageHelper');
    const friendLanguages = await getUserLanguages(allFriends.map(f => f.id));
    
    // Создаем уведомления для всех друзей с локализацией
    const notifications = allFriends.map(friend => {
      const friendLang = friendLanguages.get(friend.id) || 'en';
      const friendTranslations = loadTranslations(friendLang);
      const title = friendTranslations?.pushTitles?.newFriendship || 'New friendship';
      const becameText = friendTranslations?.friendshipNotification?.became || 'became friends';
      
      return {
      id: generateUUID(),
      user_id: friend.id,
      type: 'new_friendship',
        title: title,
        message: `${player1.name} ${friendTranslations?.common?.and || 'and'} ${player2.name} ${becameText}`,
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
      };
    });

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
        // ВАЖНО: еще раз проверяем, что участники дружбы и excludeUserId не получают уведомления
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))].filter(
          userId => userId !== userId1 && userId !== userId2 && (!excludeUserId || userId !== excludeUserId)
        );
        
        console.log('👥 Отправка push уведомлений для пользователей (исключая участников дружбы):', uniqueUserIds);
        
        for (const userId of uniqueUserIds) {
          // Дополнительная проверка на всякий случай
          if (userId === userId1 || userId === userId2) {
            console.log(`🚫 Пропускаем отправку уведомления участнику дружбы: ${userId}`);
            continue;
          }
          
          // Отправляем push уведомление с локализацией получателя
          try {
            const { sendNotificationToUser } = await import('./notificationService');
            const userLang = friendLanguages.get(userId) || 'en';
            const userTranslations = loadTranslations(userLang);
            const pushTitle = '👥 ' + (userTranslations?.pushTitles?.newFriendship || 'New friendship');
            const becameText = userTranslations?.friendshipNotification?.became || 'became friends';
            const andText = userTranslations?.common?.and || 'and';
            
            await sendNotificationToUser(
              userId,
              pushTitle,
              `${player1.name} ${andText} ${player2.name} ${becameText}`,
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
  try {
    console.log('💪 NOTIFY EXERCISE: Начало отправки уведомлений о выполнении упражнения:', { playerId, playerName, exerciseId });

    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();

    const playerAvatar = playerData?.avatar || null;

    // Получаем друзей игрока
    const friends = await getFriends(playerId);

    console.log('👥 Друзья для уведомлений об упражнении:', friends.length);

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

    // Получаем языки всех друзей для локализации уведомлений
    const { getUserLanguages } = await import('./languageHelper');
    const friendIds = friends.map(f => f.id);
    const friendLanguages = await getUserLanguages(friendIds);
    
    // Загружаем переводы
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

    // Создаем уведомления для друзей с локализацией
    const notifications = friends.map(friend => {
      const userLanguage = friendLanguages.get(friend.id) || 'en';
      const userTranslations = translations[userLanguage] || translations.en;
      const exerciseNotification = userTranslations?.exerciseNotification;
      
      // Формируем локализованные тексты
      const title = exerciseNotification?.title || 'Exercise completed';
      const completedText = exerciseNotification?.completed || 'completed an exercise';
      const message = `${playerName} ${completedText}`;
      
      return {
      id: generateUUID(),
      user_id: friend.id,
      type: 'exercise_completed',
        title: title,
        message: message,
      data: {
        playerId,
        playerName,
        playerAvatar,
        exerciseId,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      is_read: false
      };
    });

    // Сохраняем уведомления в базу данных
    if (notifications.length > 0) {
      console.log('💾 Сохраняем уведомления об упражнении в БД:', notifications.length);
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Ошибка сохранения уведомлений об упражнении:', error);
      } else {
        console.log('✅ Уведомления об упражнении сохранены в базу данных');
        
        // Обновляем счетчик уведомлений для каждого друга и отправляем push-уведомления
        const uniqueUserIds = [...new Set(notifications.map(n => n.user_id))];
        console.log(`👥 Уникальных друзей для отправки push-уведомлений: ${uniqueUserIds.length}`);
        
        // Импортируем функцию отправки push-уведомлений один раз для всех друзей
        let sendNotificationToUser: any = null;
        try {
          const notificationModule = await import('./notificationService');
          sendNotificationToUser = notificationModule.sendNotificationToUser;
          if (!sendNotificationToUser) {
            console.error('❌ sendNotificationToUser не найдена в модуле notificationService');
            throw new Error('sendNotificationToUser не экспортирована');
          }
        } catch (importError) {
          console.error('❌ Не удалось импортировать sendNotificationToUser:', importError);
          // Продолжаем выполнение, но без push-уведомлений
        }
        
        // Создаем Map для быстрого доступа к уведомлениям по userId
        const notificationsByUser = new Map<string, typeof notifications[0]>();
        notifications.forEach(n => notificationsByUser.set(n.user_id, n));
        
        for (const userId of uniqueUserIds) {
          
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
            continue;
          }
          
          try {
            // Используем уже подготовленные локализованные данные из уведомления
            const notification = notificationsByUser.get(userId);
            const pushTitle = `💪 ${notification?.title || 'Exercise completed'}`;
            const pushBody = notification?.message || `${playerName} completed an exercise`;
            
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
            
            if (pushResult) {
              console.log(`✅ Push-уведомление об упражнении отправлено для ${userId}`);
            }
          } catch (pushError) {
            console.error(`❌ Ошибка отправки push-уведомления для ${userId}:`, pushError);
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
  giftName?: string,
  starId?: string,
  starAvatar?: string | null
): Promise<void> => {
  try {
    // Получаем данные игрока для аватара
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('avatar')
      .eq('id', playerId)
      .single();

    const playerAvatar = playerData?.avatar || null;
    
    // Если starAvatar не передан, но есть starId - получаем аватар звезды
    let finalStarAvatar = starAvatar;
    if (!finalStarAvatar && starId) {
      const { data: starData } = await supabase
        .from('players')
        .select('avatar')
        .eq('id', starId)
        .single();
      finalStarAvatar = starData?.avatar || null;
    }

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
        starId: starId || null,
        starAvatar: finalStarAvatar || null,
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

            // Обновляем счетчик в базе данных (обновляем и unread_notifications_count и notifications JSON)
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                unread_notifications_count: newCount,
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
  senderId?: string,
  senderAvatar?: string | null
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
    
    // Получаем аватар отправителя если не передан
    let finalSenderAvatar = senderAvatar;
    if (!finalSenderAvatar && senderId) {
      try {
        const { data: senderData } = await supabase
          .from('players')
          .select('avatar')
          .eq('id', senderId)
          .single();
        finalSenderAvatar = senderData?.avatar || null;
      } catch (senderError) {
        console.error('🎁 NOTIFICATIONS: ⚠️ Ошибка получения аватара отправителя:', senderError);
      }
    }
    
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
            starId: senderId || null,
            starName: senderName,
            starAvatar: finalSenderAvatar || null,
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
    
    // Получаем всех админов (без push_token, так как он в отдельной таблице)
    const { data: admins, error: adminsError } = await supabase
      .from('players')
      .select('id, name')
      .eq('status', 'admin');
    
    if (adminsError) {
      console.error('❌ Ошибка получения списка админов:', adminsError);
      return;
    }
    
    if (!admins || admins.length === 0) {
      console.log('ℹ️ Админы не найдены');
      return;
    }
    
    // Отправляем уведомление каждому админу
    for (const admin of admins) {
      try {
        // Создаем уведомление в базе данных
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
  currentUserStatus?: string,
  selectedCountry?: string,
  selectedYear?: number,
  randomSeed?: number // Добавляем seed для детерминированного рандома
): Player[] => {
  try {
    // 0. Фильтруем скрытые профили (кроме текущего пользователя, если он скрыт)
    const visiblePlayers = players.filter(player => {
      if (player.is_hidden) {
        // Скрытый профиль показываем:
        // 1. Всегда администраторам
        if (currentUserStatus === 'admin') {
          return true;
        }
        // 2. Самому владельцу профиля
        return currentUserId && player.id === currentUserId;
      }
      return true;
    });
    
    // 1. Разделяем не-игроков на категории
    // Администраторы всегда показываются везде
    const admins = visiblePlayers.filter(player => player.status === 'admin');
    
    // Звезды и скауты - показываем рандомно (обрабатываются отдельно)
    // Скауты показываются во всех странах независимо от фильтра, но с вероятностью 25% (1 к 4)
    // Звезды показываются всегда (если проходят фильтр по стране)
    
    // Если randomSeed не передан или равен 0, используем текущее время для разнообразия
    const effectiveSeed = randomSeed !== undefined && randomSeed !== 0
      ? randomSeed 
      : Date.now() % 1000000; // Используем миллисекунды для разнообразия
    
    // Отдельно обрабатываем звезд
    const stars = visiblePlayers.filter(player => {
      if (player.status !== 'star') return false;
      
      // Звезды фильтруются по стране, если выбран фильтр
      if (selectedCountry) {
        return player.country === selectedCountry;
      }
      return true;
    });
    
    // Отдельно обрабатываем скаутов с вероятностью 25% (1 к 4)
    // Скауты показываются во всех странах независимо от фильтра
    // ВАЖНО: Скауты НЕ зависят от randomSeed (встряска не влияет на них)
    // Они используют свой собственный seed на основе текущего 5-минутного интервала
    // Это создаёт ощущение, что скаут появляется "иногда" независимо от действий пользователя
    const allScouts = visiblePlayers.filter(player => player.status === 'scout');
    const scoutTimeSeed = Math.floor(Date.now() / (5 * 60 * 1000)); // Меняется каждые 5 минут
    const selectedScouts = allScouts.filter(scout => {
      // Создаем уникальный seed для каждого скаута на основе его ID и ВРЕМЕНИ (не randomSeed!)
      const scoutSeed = `${scout.id}_${scoutTimeSeed}_scout`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      // Используем синус для получения значения от -1 до 1, затем преобразуем в вероятность
      const randomValue = Math.sin(scoutSeed * 1.5) * 0.5 + 0.5; // От 0 до 1
      // 25% вероятность показать скаута (1 к 4)
      return randomValue <= 0.25;
    });
    
    // Остальные не-игроки (магазины, заточка коньков) - БЕЗ тренеров (они обрабатываются отдельно)
    const otherNonPlayers = visiblePlayers.filter(player => {
      const isOtherNonPlayer = player.status === 'shop' || 
        player.status === 'skateSharpening';
      
      if (!isOtherNonPlayer) return false;
      
      // Если выбран фильтр по стране, фильтруем
      if (selectedCountry) {
        return player.country === selectedCountry;
      }
      
      return true;
    });
    
    // Отдельно обрабатываем тренеров с особой логикой
    const allCoaches = visiblePlayers.filter(player => {
      if (player.status !== 'coach') return false;
      
      // Если выбран фильтр по стране, фильтруем
      if (selectedCountry && player.country !== selectedCountry) {
        return false;
      }
      
      return true;
    });
    
    // Выбираем тренеров для показа (максимум 5 рандомных)
    const maxCoaches = 5;
    
    // Фильтруем тренеров по году, если год выбран
    let eligibleCoaches = allCoaches;
    if (selectedYear) {
      eligibleCoaches = allCoaches.filter(coach => {
        if (coach.coach_years && coach.coach_years.length > 0) {
          return coach.coach_years.includes(selectedYear);
        }
        // Если годы не указаны - показываем везде (обратная совместимость)
        return true;
      });
    }
    
    // Текущий пользователь-тренер всегда видит себя
    const currentUserCoach = currentUserId ? eligibleCoaches.find(c => c.id === currentUserId) : null;
    const otherCoaches = eligibleCoaches.filter(c => c.id !== currentUserId);
    
    // Перемешиваем других тренеров детерминированно
    const shuffledOtherCoaches = [...otherCoaches].sort((a, b) => {
      const seedA = `${a.id}_${effectiveSeed}_coach`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seedB = `${b.id}_${effectiveSeed}_coach`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomA = Math.sin(seedA * 1.5);
      const randomB = Math.sin(seedB * 1.5);
      return randomA - randomB;
    });
    
    // Выбираем до 5 рандомных тренеров
    // Если текущий пользователь - тренер, берем его + до 4 других
    let selectedCoaches: Player[] = [];
    if (currentUserCoach) {
      const otherCoachesToShow = shuffledOtherCoaches.slice(0, maxCoaches - 1);
      selectedCoaches = [currentUserCoach, ...otherCoachesToShow];
    } else {
      selectedCoaches = shuffledOtherCoaches.slice(0, maxCoaches);
    }
    
    // Перемешиваем звезд отдельно и берем до 3
    const starsShuffled = [...stars].sort((a, b) => {
      const seedA = `${a.id}_${effectiveSeed}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seedB = `${b.id}_${effectiveSeed}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomA = Math.sin(seedA * 1.5);
      const randomB = Math.sin(seedB * 1.5);
      return randomA - randomB;
    });
    const limitedStars = starsShuffled.slice(0, 3);
    
    // Перемешиваем скаутов отдельно (используем scoutTimeSeed, чтобы не зависеть от встряски)
    const scoutsShuffled = [...selectedScouts].sort((a, b) => {
      const seedA = `${a.id}_${scoutTimeSeed}_scout_sort`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seedB = `${b.id}_${scoutTimeSeed}_scout_sort`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomA = Math.sin(seedA * 1.5);
      const randomB = Math.sin(seedB * 1.5);
      return randomA - randomB;
    });
    
    // Сначала берем звезд (до 3), затем добавляем скаутов отдельно (если есть место)
    const maxTotal = 5;
    const starsCount = limitedStars.length;
    const remainingSlotsForScouts = Math.max(0, maxTotal - starsCount);
    const limitedScouts = scoutsShuffled.slice(0, remainingSlotsForScouts);
    
    // Объединяем звезд и скаутов (не перемешивая их между собой)
    const limitedStarsAndScouts = [...limitedStars, ...limitedScouts];

    // 2. Фильтруем игроков по стране и году
    const filteredPlayers = visiblePlayers.filter(player => {
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

    // 5. Топ-5 игроков по рейтингу активности
    const topPlayers = otherPlayers
      .filter(player => !newcomers.some(n => n.id === player.id)) // Исключаем новичков
      .sort((a, b) => (b.activityRating || 0) - (a.activityRating || 0))
      .slice(0, 5);

    // 6. Оставшиеся игроки для случайного выбора
    const remainingPlayers = otherPlayers.filter(player => 
      !newcomers.some(n => n.id === player.id) && 
      !topPlayers.some(t => t.id === player.id)
    );

    // 7. Случайные игроки (могут заполнить все оставшиеся места до MAX_PLAYERS)
    // Используем детерминированный рандом на основе seed для стабильности между пересчетами
    // НЕ ограничиваем здесь - ограничение будет применено позже на основе оставшихся мест
    const effectiveRandomSeed = randomSeed !== undefined && randomSeed !== 0
      ? randomSeed 
      : `${selectedCountry || 'all'}_${selectedYear || 'all'}_random`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const randomPlayers = remainingPlayers
      .sort((a, b) => {
        // Детерминированный рандом на основе seed И id игрока
        // Каждый игрок получает уникальное значение, которое меняется при изменении seed
        const seedA = `${a.id}_${effectiveRandomSeed}_rnd`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seedB = `${b.id}_${effectiveRandomSeed}_rnd`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const valueA = Math.sin(seedA * 1.7) * 0.5 + 0.5;
        const valueB = Math.sin(seedB * 1.7) * 0.5 + 0.5;
        return valueA - valueB;
      });

    // 8. Максимальное количество игроков для отображения (применяется к фильтру)
    const MAX_PLAYERS = 20;

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
    
    // 9.5. Остальные не-игроки (магазины, заточка коньков)
    // otherNonPlayers уже объявлен выше, просто используем его
    permanentPlayers.push(...otherNonPlayers);
    
    // 9.6. Тренеры (выбранные по логике: все при фильтре по году, или до 5 рандомных при "Все года")
    permanentPlayers.push(...selectedCoaches);
    
    // 9.7. Рандомные звезды (до 3) и скауты (до 2), выбираются случайно
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
    
    // 15. Финальное ограничение на MAX_PLAYERS (на всякий случай, если после удаления дубликатов стало больше)
    const finalPlayers = uniquePlayers.slice(0, MAX_PLAYERS);

    return finalPlayers;

  } catch (error) {
    console.error('❌ Ошибка умного отбора игроков:', error);
    // В случае ошибки возвращаем всех игроков (fallback)
    return players;
  }
};

/**
 * Сохраняет результат измерения скорости шайбы
 * @param playerId ID игрока
 * @param speed Скорость в км/ч
 */
export const savePuckSpeedResult = async (playerId: string, speed: number): Promise<boolean> => {
  try {
    // Получаем текущие данные игрока
    const player = await getPlayerById(playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    // Получаем текущую историю скорости
    const currentHistory = player.puckSpeedHistory || [];
    const currentMaxSpeed = player.puckSpeed || 0;

    // Добавляем новую запись
    const newRecord: PuckSpeedRecord = {
      speed: speed,
      date: new Date().toISOString(),
    };

    const updatedHistory = [...currentHistory, newRecord];
    
    // Определяем новую максимальную скорость
    const newMaxSpeed = Math.max(currentMaxSpeed, speed);

    // Обновляем данные игрока
    const updatedPlayer = {
      ...player,
      puckSpeed: newMaxSpeed,
      puckSpeedHistory: updatedHistory,
    };

    const result = await updatePlayer(playerId, updatedPlayer);
    
    // Начисляем 5 звездочек за сохранение скорости шайбы в профиль
    if (result !== null) {
      setTimeout(async () => {
        try {
          await addActivityPoints(playerId, 'PUCK_SPEED_SAVE', `Сохранение скорости шайбы: ${speed} км/ч`);
        } catch (error) {
          console.error('❌ Ошибка начисления очков активности за скорость шайбы (не критично):', error);
        }
      }, 0);
    }
    
    // Если максимальная скорость увеличилась, уведомляем друзей
    if (newMaxSpeed > currentMaxSpeed && result !== null) {
      // Отправляем уведомления асинхронно (не блокируем основной поток)
      setTimeout(async () => {
        try {
          await notifyFriendsAboutPuckSpeed(playerId, player.name || 'Игрок', newMaxSpeed);
        } catch (error) {
          console.error('❌ Ошибка отправки уведомлений о скорости шайбы (не критично):', error);
        }
      }, 0);
    }
    
    return result !== null;
  } catch (error) {
    console.error('❌ Ошибка сохранения результата скорости шайбы:', error);
    return false;
  }
};

/**
 * Удаляет запись из истории скорости шайбы
 * @param playerId ID игрока
 * @param recordDate Дата записи для удаления (ISO string)
 * @returns Обновленный игрок если удаление успешно, null в противном случае
 */
export const deletePuckSpeedRecord = async (playerId: string, recordDate: string): Promise<Player | null> => {
  try {
    // Получаем текущие данные игрока
    const player = await getPlayerById(playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    // Получаем текущую историю скорости
    const currentHistory = player.puckSpeedHistory || [];
    const currentMaxSpeed = player.puckSpeed || 0;

    // Находим запись для удаления
    const recordToDelete = currentHistory.find(r => r.date === recordDate);
    if (!recordToDelete) {
      throw new Error('Запись не найдена');
    }

    // Удаляем запись из истории
    const updatedHistory = currentHistory.filter(r => r.date !== recordDate);
    
    // Пересчитываем максимальную скорость из оставшихся записей
    let newMaxSpeed = 0;
    if (updatedHistory.length > 0) {
      newMaxSpeed = Math.max(...updatedHistory.map(r => r.speed));
    }

    // Обновляем данные игрока
    const updatedPlayer = {
      ...player,
      puckSpeed: newMaxSpeed,
      puckSpeedHistory: updatedHistory,
    };

    const result = await updatePlayer(playerId, updatedPlayer);
    
    // Возвращаем обновленного игрока напрямую
    return result;
  } catch (error) {
    console.error('❌ Ошибка удаления записи скорости шайбы:', error);
    return null;
  }
};

/**
 * Блокирует пользователя
 * @param blockerId ID пользователя, который блокирует
 * @param blockedId ID пользователя, которого блокируют
 * @returns true если блокировка успешна, false в противном случае
 */
export const blockUser = async (blockerId: string, blockedId: string): Promise<boolean> => {
  try {
    if (blockerId === blockedId) {
      console.error('❌ Нельзя заблокировать самого себя');
      return false;
    }

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
      });

    if (error) {
      // Если таблица не существует
      if (error.code === '42P01') {
        console.error('❌ Таблица blocked_users не существует. Выполните SQL скрипт database/create_blocked_users_table.sql');
        return false;
      }
      // Если пользователь уже заблокирован, это не ошибка
      if (error.code === '23505') { // Unique violation
        console.log('ℹ️ Пользователь уже заблокирован');
        return true;
      }
      console.error('❌ Ошибка блокировки пользователя:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.error('❌ Таблица blocked_users не существует. Выполните SQL скрипт database/create_blocked_users_table.sql');
      return false;
    }
    console.error('❌ Ошибка блокировки пользователя:', error);
    return false;
  }
};

/**
 * Разблокирует пользователя
 * @param blockerId ID пользователя, который разблокирует
 * @param blockedId ID пользователя, которого разблокируют
 * @returns true если разблокировка успешна, false в противном случае
 */
export const unblockUser = async (blockerId: string, blockedId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('❌ Ошибка разблокировки пользователя:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка разблокировки пользователя:', error);
    return false;
  }
};

/**
 * Проверяет, заблокирован ли пользователь
 * @param blockerId ID пользователя, который проверяет
 * @param blockedId ID пользователя, которого проверяют
 * @returns true если пользователь заблокирован, false в противном случае
 */
export const isUserBlocked = async (blockerId: string, blockedId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return false;
      }
      // Если таблица не существует, просто возвращаем false
      if (error.code === '42P01') { // relation does not exist
        console.log('ℹ️ Таблица blocked_users еще не создана. Выполните SQL скрипт database/create_blocked_users_table.sql');
        return false;
      }
      console.error('❌ Ошибка проверки блокировки пользователя:', error);
      return false;
    }

    return data !== null;
  } catch (error: any) {
    // Если таблица не существует, просто возвращаем false
    if (error?.code === '42P01') {
      console.log('ℹ️ Таблица blocked_users еще не создана. Выполните SQL скрипт database/create_blocked_users_table.sql');
      return false;
    }
    console.error('❌ Ошибка проверки блокировки пользователя:', error);
    return false;
  }
};

/**
 * Получает список заблокированных пользователей
 * @param blockerId ID пользователя
 * @returns Массив ID заблокированных пользователей
 */
export const getBlockedUsers = async (blockerId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', blockerId);

    if (error) {
      console.error('❌ Ошибка получения списка заблокированных пользователей:', error);
      return [];
    }

    return data?.map(item => item.blocked_id) || [];
  } catch (error) {
    console.error('❌ Ошибка получения списка заблокированных пользователей:', error);
    return [];
  }
};

/**
 * Исправляет отсутствующие даты регистрации (created_at) для всех пользователей
 * @returns Количество исправленных записей
 */
export const fixMissingCreatedAt = async (): Promise<number> => {
  try {
    console.log('🔧 Начинаем исправление отсутствующих дат регистрации...');
    
    // Получаем всех пользователей без created_at
    const { data: playersWithoutDate, error: fetchError } = await supabase
      .from('players')
      .select('id, name, created_at')
      .is('created_at', null);
    
    if (fetchError) {
      console.error('❌ Ошибка получения пользователей:', fetchError);
      return 0;
    }
    
    if (!playersWithoutDate || playersWithoutDate.length === 0) {
      console.log('✅ Все пользователи уже имеют дату регистрации');
      return 0;
    }
    
    console.log(`📋 Найдено ${playersWithoutDate.length} пользователей без даты регистрации`);
    
    let fixedCount = 0;
    const now = new Date().toISOString();
    
    for (const player of playersWithoutDate) {
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          created_at: now,
          updated_at: now
        })
        .eq('id', player.id);
      
      if (updateError) {
        console.error(`❌ Ошибка обновления игрока ${player.name}:`, updateError);
      } else {
        console.log(`✅ Исправлен: ${player.name}`);
        fixedCount++;
      }
    }
    
    console.log(`🔧 Исправлено ${fixedCount} из ${playersWithoutDate.length} записей`);
    return fixedCount;
  } catch (error) {
    console.error('❌ Ошибка исправления дат регистрации:', error);
    return 0;
  }
};