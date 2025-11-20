// Сервис для работы с родительским согласием (COPPA)
import { supabase } from './supabase';

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
  userStatus: string = 'player' // Исходный статус пользователя (player/star)
): Promise<{ success: boolean; error?: string; playerId?: string }> {
  try {
    // Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('handle-child-registration', {
      body: {
        phone,
        name,
        birthDate,
        parentEmail,
        country,
        position,
        team,
        userStatus // Передаем исходный статус
      }
    });

    if (error) {
      console.error('❌ Error calling handle-child-registration:', error);
      return { success: false, error: error.message || 'Ошибка запроса родительского согласия' };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Не удалось отправить запрос согласия' };
    }

    return { success: true, playerId: data.playerId };
  } catch (error: any) {
    console.error('❌ Error in registerChildWithParentalConsent:', error);
    return { success: false, error: error.message || 'Неизвестная ошибка' };
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
    // Получаем данные игрока (включая страну для определения языка письма)
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('name, parent_email, birth_date, country')
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

