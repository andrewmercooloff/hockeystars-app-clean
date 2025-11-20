// Edge Function для обработки регистрации детей младше 13 лет
// Создает неактивный аккаунт и отправляет письмо родителю для получения согласия
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

interface ChildRegistrationRequest {
  phone: string
  name: string
  birthDate: string // формат: DD.MM.YYYY
  parentEmail: string
  country?: string
  // Другие поля регистрации (опционально)
  position?: string
  team?: string
  userStatus?: string // Исходный статус пользователя (player/star) - будет восстановлен при активации
}

// Генерация уникального токена
function generateConsentToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36)
}

// Отправка письма родителю через Resend
async function sendParentalConsentEmail(
  parentEmail: string,
  childName: string,
  consentToken: string,
  lang: string = 'ru'
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY не настроен, используем fallback')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = Deno.env.get('SITE_URL') || 'https://hockey-stars.com'
  // URL для подтверждения через публичную страницу на сайте
  const consentUrl = `${baseUrl}/verify-consent.html?token=${consentToken}`

  const privacyPolicyUrl = lang === 'ru' 
    ? `${baseUrl}/rules.html`
    : `${baseUrl}/privacy-en.html`

  const emailContent = lang === 'ru' ? {
    subject: 'Требуется ваше согласие для регистрации ребенка в HockeyStars',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fa2f40; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">HOCKEYSTARS</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Здравствуйте!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Ваш ребенок <strong>${childName}</strong> хочет создать аккаунт в приложении HockeyStars — социальной сети для юных хоккеистов.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            В соответствии с законом COPPA, для пользователей младше 13 лет требуется верифицированное согласие родителей. 
            Мы собираем следующие данные: имя, возраст, игровая статистика, фото и видео.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Пожалуйста, ознакомьтесь с нашей полной <a href="${privacyPolicyUrl}" style="color: #fa2f40;">Политикой конфиденциальности</a>.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
            <p style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
              Чтобы дать согласие на создание аккаунта, пожалуйста, перейдите по ссылке ниже:
            </p>
            <a href="${consentUrl}" 
               style="display: inline-block; background-color: #fa2f40; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
              Подтвердить согласие
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
            <strong>Важно:</strong> Ссылка действительна в течение <strong>24 часов</strong>.<br>
            Если вы не давали разрешения, просто проигнорируйте это письмо. Аккаунт не будет создан без вашего подтверждения.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              С уважением,<br>
              Команда HockeyStars<br>
              <a href="mailto:support@hockey-stars.com" style="color: #fa2f40;">support@hockey-stars.com</a>
            </p>
          </div>
        </div>
      </div>
    `
  } : {
    subject: 'Parental Consent Required for HockeyStars Registration',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fa2f40; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">HOCKEYSTARS</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Your child <strong>${childName}</strong> wants to create an account in the HockeyStars app — a social network for young hockey players.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            In accordance with COPPA law, verified parental consent is required for users under 13 years of age. 
            We collect the following data: name, age, game statistics, photos and videos.
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Please review our full <a href="${privacyPolicyUrl}" style="color: #fa2f40;">Privacy Policy</a>.
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">
            <p style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
              To give consent for account creation, please click the link below:
            </p>
            <a href="${consentUrl}" 
               style="display: inline-block; background-color: #fa2f40; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
              Confirm Consent
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
            <strong>Important:</strong> The link is valid for <strong>24 hours</strong>.<br>
            If you did not give permission, simply ignore this email. The account will not be created without your confirmation.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Best regards,<br>
              HockeyStars Team<br>
              <a href="mailto:support@hockey-stars.com" style="color: #fa2f40;">support@hockey-stars.com</a>
            </p>
          </div>
        </div>
      </div>
    `
  }

  try {
    console.log(`📧 Отправка письма через Resend на ${parentEmail}`)
    console.log(`📧 Consent URL: ${consentUrl}`)
    
    const emailPayload = {
      from: 'HockeyStars <noreply@hockey-stars.com>',
      to: [parentEmail],
      subject: emailContent.subject,
      html: emailContent.html
    }
    
    console.log(`📧 Email payload:`, JSON.stringify({ ...emailPayload, html: '[HTML content]' }))
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const responseText = await response.text()
    console.log(`📧 Resend API response status: ${response.status}`)
    console.log(`📧 Resend API response: ${responseText}`)

    if (!response.ok) {
      console.error('❌ Resend API error:', responseText)
      return { success: false, error: `Resend API error (${response.status}): ${responseText}` }
    }

    const result = JSON.parse(responseText)
    console.log('✅ Parental consent email sent successfully, email ID:', result.id)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending email:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { phone, name, birthDate, parentEmail, country, position, team, userStatus = 'player' }: ChildRegistrationRequest = await req.json()

    // Валидация
    if (!phone || !name || !birthDate || !parentEmail) {
      return new Response(
        JSON.stringify({ error: 'Все обязательные поля должны быть заполнены' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Валидация email родителя
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(parentEmail)) {
      return new Response(
        JSON.stringify({ error: 'Неверный формат email родителя' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем, что пользователь с таким телефоном еще не существует
    const { data: existingPlayer, error: checkError } = await supabase
      .from('players')
      .select('id, status')
      .eq('phone', phone)
      .maybeSingle()

    // Если ошибка не связана с отсутствием записи (PGRST116), это реальная ошибка
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing player:', checkError)
      return new Response(
        JSON.stringify({ error: 'Ошибка проверки существующего пользователя', details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingPlayer) {
      return new Response(
        JSON.stringify({ error: 'Пользователь с таким телефоном уже существует' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Генерируем токен согласия
    const consentToken = generateConsentToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 часа
    console.log('🔑 Сгенерирован токен согласия:', consentToken)
    console.log('🔑 Токен истекает:', expiresAt)

    // Создаем предварительный аккаунт со статусом pending_verification
    // ВАЖНО: Здесь мы НЕ создаем пользователя в auth.users, так как это делается на клиенте
    // Мы только создаем запись в players со статусом pending_verification
    // Клиент должен создать пользователя в auth, но не активировать его до получения согласия

    // Парсим дату рождения (формат DD.MM.YYYY)
    const [day, month, year] = birthDate.split('.')
    const birthDateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

    // Вычисляем возраст
    const birthYear = parseInt(year)
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear

    // Проверяем, что возраст действительно < 13
    if (age >= 13) {
      return new Response(
        JSON.stringify({ error: 'Эта функция предназначена только для детей младше 13 лет' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаем запись в players (пока без id из auth, он будет добавлен позже)
    // Но нам нужен временный UUID для связи
    const tempId = crypto.randomUUID()

    // Сохраняем исходный статус в поле team в формате "team|originalStatus"
    // Это временное решение, пока не добавим отдельное поле user_type в схему БД
    const teamWithStatus = team ? `${team}|${userStatus}` : `|${userStatus}`
    
    const { data: playerData, error: insertError } = await supabase
      .from('players')
      .insert({
        id: tempId, // Временный ID, будет заменен на реальный при создании auth пользователя
        name,
        phone,
        birth_date: birthDateISO,
        age: age, // Вычисленный возраст
        country: country || 'Беларусь',
        position: position || '',
        team: teamWithStatus, // Сохраняем исходный статус в поле team
        status: 'pending_verification',
        parent_email: parentEmail,
        consent_token: consentToken,
        consent_token_expires_at: expiresAt
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating player:', insertError)
      return new Response(
        JSON.stringify({ error: 'Ошибка создания аккаунта', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Игрок создан с токеном:', {
      playerId: playerData?.id,
      token: consentToken,
      savedToken: playerData?.consent_token
    })
    
    // Проверяем, что токен действительно сохранился
    const { data: verifyToken } = await supabase
      .from('players')
      .select('consent_token')
      .eq('id', tempId)
      .single()
    console.log('🔍 Проверка сохраненного токена:', verifyToken)

    // Определяем язык письма на основе страны
    let emailLanguage = 'en'; // По умолчанию английский

    // Русскоязычные страны
    const russianSpeakingCountries = [
      'Россия', 'Беларусь', 'Украина', 'Казахстан', 'Киргизия', 'Таджикистан',
      'Узбекистан', 'Армения', 'Азербайджан', 'Молдова', 'Грузия',
      'Russia', 'Belarus', 'Ukraine', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan',
      'Uzbekistan', 'Armenia', 'Azerbaijan', 'Moldova', 'Georgia'
    ];

    if (country && russianSpeakingCountries.some(rc => country.toLowerCase().includes(rc.toLowerCase()))) {
      emailLanguage = 'ru';
    }

    console.log(`📧 Отправляем письмо родителю на ${parentEmail} для ребенка ${name} на языке: ${emailLanguage} (страна: ${country})`)
    const emailResult = await sendParentalConsentEmail(parentEmail, name, consentToken, emailLanguage)

    if (!emailResult.success) {
      console.error('❌ Email не отправлен:', emailResult.error)
      console.error('❌ Проверьте настройки RESEND_API_KEY в секретах Supabase')
      // Возвращаем ошибку, чтобы пользователь знал, что письмо не отправлено
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось отправить письмо родителю', 
          details: emailResult.error,
          playerId: tempId // Возвращаем ID для возможности повторной отправки
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ Письмо успешно отправлено родителю')

    // Логируем запрос согласия
    await supabase
      .from('parental_consent_logs')
      .insert({
        player_id: tempId,
        parent_email: parentEmail,
        token: consentToken,
        action: 'requested',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Письмо с запросом согласия отправлено родителю',
        playerId: tempId,
        token: consentToken // Временно возвращаем для тестирования, в production можно убрать
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in handle-child-registration:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

