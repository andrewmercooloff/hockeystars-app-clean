// Сервис для работы с родительским согласием (COPPA)
import { supabase, supabaseAnonKey, getActiveSupabaseUrl, supabaseFetch } from './supabase';

const getSupabaseConfig = () => ({ supabaseUrl: getActiveSupabaseUrl(), supabaseAnonKey });

// Вычисление возраста из даты рождения
export function calculateAge(birthDate: string): number {
  // Формат: DD.MM.YYYY
  const [day, month, year] = birthDate.split('.');
  const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Проверка, требуется ли родительское согласие
export function requiresParentalConsent(birthDate: string): boolean {
  if (!birthDate) return false;
  const age = calculateAge(birthDate);
  return age < 13;
}

// Регистрация ребенка с запросом родительского согласия
export async function registerChildWithParentalConsent(
  phone: string,
  name: string,
  birthDate: string,
  parentEmail: string,
  country?: string,
  position?: string,
  team?: string,
  userStatus: string = 'player', // Исходный статус пользователя (player/star)
  language?: string, // Язык приложения пользователя
  avatar?: string, // URL аватара (если загружен)
  grip?: string, // Хват игрока
  height?: string, // Рост игрока
  weight?: string, // Вес игрока
  number?: string // Номер игрока
): Promise<{ success: boolean; error?: string; playerId?: string }> {
  try {
    console.log(`🌐 registerChildWithParentalConsent: передаем язык=${language}, avatar=${avatar ? 'есть' : 'нет'}`);
    const requestBody = {
        phone,
        name,
        birthDate,
        parentEmail,
        country,
        position,
        team,
      userStatus, // Передаем исходный статус
      language, // Передаем язык приложения
      avatar, // Передаем аватар
      grip, // Хват игрока
      height, // Рост игрока
      weight, // Вес игрока
      number // Номер игрока
    };
    console.log(`🌐 Полный body запроса:`, JSON.stringify({ ...requestBody, phone: '[phone]', avatar: avatar ? (avatar.substring(0, 50) + '...') : 'нет' }));
    // Вызываем Edge Function через SDK
    const { data, error } = await supabase.functions.invoke('handle-child-registration', {
      body: requestBody
    });

    // Сначала проверяем, есть ли ошибка в data (даже при не-2xx статусе SDK может вернуть data)
    if (data) {
      if (data.error) {
        const errorMessage = data.error;
        // Проверяем, является ли это ошибкой о существующем пользователе
        if (errorMessage.includes('уже зарегистрирован') || 
            errorMessage.includes('уже существует') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('already registered')) {
          return { success: false, error: 'PHONE_ALREADY_EXISTS' };
        }
        return { success: false, error: errorMessage };
      }
      if (data.success) {
        return { success: true, playerId: data.playerId };
      }
    }

    // Если есть error, используем прямой fetch для получения полного ответа
    if (error) {
      console.error('❌ Error calling handle-child-registration:', error);
      
      // Пытаемся извлечь сообщение из data, если оно есть
      if (data && data.error) {
        const errorMessage = data.error;
        if (errorMessage.includes('уже зарегистрирован') || 
            errorMessage.includes('уже существует') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('already registered')) {
          return { success: false, error: 'PHONE_ALREADY_EXISTS' };
        }
        return { success: false, error: errorMessage };
      }
      
      // Используем прямой fetch для получения полного ответа с телом ошибки
      try {
        const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
        
        const response = await supabaseFetch(`${supabaseUrl}/functions/v1/handle-child-registration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            phone,
            name,
            birthDate,
            parentEmail,
            country,
            position,
            team,
            userStatus,
            language,
            avatar,
            grip,
            height,
            weight,
            number
          })
        });

        const responseData = await response.json();
        
        if (!response.ok && responseData.error) {
          const errorMessage = responseData.error;
          if (errorMessage.includes('уже зарегистрирован') || 
              errorMessage.includes('уже существует') || 
              errorMessage.includes('already exists') ||
              errorMessage.includes('already registered')) {
            return { success: false, error: 'Этот номер уже зарегистрирован. Попробуйте войти' };
          }
          return { success: false, error: errorMessage };
        }
      } catch (fetchError) {
        console.error('❌ Error fetching full response:', fetchError);
      }
      
      // Если не удалось получить сообщение из fetch, используем стандартное сообщение
      const errorMessage = (error as any).context?.error || error.message;
      if (errorMessage && (
        errorMessage.includes('уже зарегистрирован') || 
        errorMessage.includes('уже существует') || 
        errorMessage.includes('already exists') ||
        errorMessage.includes('already registered')
      )) {
        return { success: false, error: 'PHONE_ALREADY_EXISTS' };
      }
      
      return { success: false, error: errorMessage || 'PARENTAL_CONSENT_ERROR' };
    }

    // Если нет ни data, ни error, но и нет success
    if (!data || !data.success) {
      return { success: false, error: data?.error || 'CONSENT_REQUEST_FAILED' };
    }

    return { success: true, playerId: data.playerId };
  } catch (error: any) {
    console.error('❌ Error in registerChildWithParentalConsent:', error);
    const errorMessage = error.message || 'UNKNOWN_ERROR';
    if (errorMessage.includes('уже зарегистрирован') || 
        errorMessage.includes('уже существует') || 
        errorMessage.includes('already exists') ||
        errorMessage.includes('already registered')) {
      return { success: false, error: 'PHONE_ALREADY_EXISTS' };
    }
    return { success: false, error: errorMessage };
  }
}

// Проверка статуса аккаунта пользователя
export async function checkAccountStatus(userId: string): Promise<{
  status: 'pending_verification' | 'active' | 'suspended';
  parentEmail?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('status, parent_email')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error checking account status:', error);
      return { status: 'active' }; // По умолчанию считаем активным
    }

    return {
      status: (data?.status as any) || 'active',
      parentEmail: data?.parent_email
    };
  } catch (error) {
    console.error('❌ Error in checkAccountStatus:', error);
    return { status: 'active' };
  }
}

// Повторная отправка письма родителю (если токен истек)
export async function resendParentalConsentEmail(
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Получаем данные игрока (включая страну и язык для определения языка письма)
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('name, parent_email, birth_date, country, language')
      .eq('id', playerId)
      .single();

    if (fetchError || !player) {
      return { success: false, error: 'Игрок не найден' };
    }

    // Проверяем, что статус все еще pending
    const { data: statusData } = await supabase
      .from('players')
      .select('status')
      .eq('id', playerId)
      .single();

    if (statusData?.status !== 'pending_verification') {
      return { success: false, error: 'Аккаунт уже активирован или не требует согласия' };
    }

    // Генерируем новый токен
    const newToken = crypto.randomUUID() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Обновляем токен в БД
    const { error: updateError } = await supabase
      .from('players')
      .update({
        consent_token: newToken,
        consent_token_expires_at: expiresAt
      })
      .eq('id', playerId);

    if (updateError) {
      return { success: false, error: 'Ошибка обновления токена' };
    }

    // Отправляем письмо через Edge Function
    const { data, error } = await supabase.functions.invoke('handle-child-registration', {
      body: {
        phone: '', // Не требуется для повторной отправки
        name: player.name,
        birthDate: player.birth_date,
        parentEmail: player.parent_email,
        country: player.country, // Передаем страну для определения языка письма
        language: player.language, // Передаем язык из БД, если он сохранен
        resend: true,
        token: newToken
      }
    });

    if (error || !data?.success) {
      return { success: false, error: data?.error || 'Не удалось отправить письмо' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in resendParentalConsentEmail:', error);
    return { success: false, error: error.message || 'Неизвестная ошибка' };
  }
}

