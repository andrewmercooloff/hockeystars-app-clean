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
  const requestBody = {
    phone, name, birthDate, parentEmail, country, position, team,
    userStatus, language, avatar, grip, height, weight, number,
  };

  const mapError = (raw: unknown): string => {
    const msg = typeof raw === 'string' ? raw : '';
    if (
      msg === 'PHONE_ALREADY_EXISTS' || msg === 'EMAIL_ALREADY_EXISTS' ||
      msg.includes('уже зарегистрирован') || msg.includes('уже существует') ||
      msg.includes('already exists') || msg.includes('already registered')
    ) {
      return 'PHONE_ALREADY_EXISTS';
    }
    if (msg === 'PARENT_EMAIL_SEND_FAILED' || msg.includes('Не удалось отправить письмо')) {
      return 'PARENT_EMAIL_SEND_FAILED';
    }
    return msg || 'PARENTAL_CONSENT_ERROR';
  };

  // Один POST напрямую: functions.invoke() при не-2xx скрывает тело ответа,
  // а повторный вызов создал бы вторую регистрацию (и ложное "номер уже занят").
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    const response = await supabaseFetch(`${supabaseUrl}/functions/v1/handle-child-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestBody),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.ok && data?.success) {
      return { success: true, playerId: data.playerId };
    }
    console.error('❌ handle-child-registration:', response.status, data);
    return { success: false, error: mapError(data?.code || data?.error) };
  } catch (error: any) {
    console.error('❌ Error in registerChildWithParentalConsent:', error);
    return { success: false, error: mapError(error?.message) };
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

