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
  language?: string // Язык приложения пользователя (ru, en, и т.д.)
  avatar?: string // URL аватара (если загружен)
  // Поля для повторной отправки
  resend?: boolean
  token?: string
}

// Генерация уникального токена
function generateConsentToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36)
}

// Определение языка на основе языка приложения или страны
function determineLanguage(appLanguage?: string, country?: string): string {
  console.log(`📧 determineLanguage called:`);
  console.log(`📧   - appLanguage: ${appLanguage}`);
  console.log(`📧   - appLanguage type: ${typeof appLanguage}`);
  console.log(`📧   - appLanguage === 'en': ${appLanguage === 'en'}`);
  console.log(`📧   - appLanguage === 'ru': ${appLanguage === 'ru'}`);
  console.log(`📧   - appLanguage truthy?: ${!!appLanguage}`);
  console.log(`📧   - country: ${country}`);
  
  // Если передан язык приложения, используем его (но только ru или en для писем)
  if (appLanguage) {
    // Если язык русский - используем русский
    if (appLanguage === 'ru') {
      console.log('📧 Determined language: ru (from appLanguage)');
      return 'ru';
    }
    // Для всех остальных языков (en, de, fr, и т.д.) используем английский
    console.log(`📧 Determined language: en (from appLanguage, was: ${appLanguage})`);
    return 'en';
  }
  
  // Fallback: определяем по стране, если язык не передан
  const russianSpeakingCountries = ['Россия', 'Беларусь', 'Russia', 'Belarus', 'RU', 'BY'];
  if (country && russianSpeakingCountries.includes(country)) {
    console.log(`📧 Determined language: ru (from country fallback: ${country})`);
    return 'ru';
  }
  console.log(`📧 Determined language: en (default fallback, country: ${country || 'не указана'})`);
  return 'en';
}

// Отправка письма родителю через Resend
async function sendParentalConsentEmail(
  parentEmail: string,
  childName: string,
  consentToken: string,
  lang: string = 'en'
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY не настроен, используем fallback')
    return { success: false, error: 'Email service not configured' }
  }

  const baseUrl = Deno.env.get('SITE_URL') || 'https://hockey-stars.com'
  // URL для подтверждения через публичную страницу на сайте
  // Добавляем параметр lang для правильной локализации страницы
  const consentUrl = `${baseUrl}/verify-consent.html?token=${consentToken}&lang=${lang}`
  // URL логотипа - используем абсолютный URL
  // ВАЖНО: Используем полный URL с протоколом для корректной загрузки в почтовых клиентах
  const logoUrl = `${baseUrl}/logo.png`
  
  console.log(`📧 sendParentalConsentEmail called:`)
  console.log(`📧   - lang: ${lang}`)
  console.log(`📧   - logoUrl: ${logoUrl}`)
  console.log(`📧   - baseUrl: ${baseUrl}`)
  console.log(`📧   - parentEmail: ${parentEmail}`)
  console.log(`📧   - childName: ${childName}`)

  // Определяем URL политики конфиденциальности в зависимости от языка
  const privacyPolicyUrl = lang === 'ru' 
    ? `${baseUrl}/rules.html`
    : `${baseUrl}/privacy-en.html`

  console.log(`📧 Определение содержимого письма: lang=${lang}, lang === 'ru': ${lang === 'ru'}`)
  
  // Используем двуязычный формат писем
  const emailContent = lang === 'ru' ? {
    subject: 'Требуется ваше согласие для регистрации ребенка в HockeyStars',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #050008; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050008;">
          <div style="background-color: #050008; padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2);">
          <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="HockeyStars" style="max-width: 200px; height: auto; margin: 0 auto; display: block; width: 200px;" />
          </div>
          
          <h2 style="color: #fff; margin-bottom: 20px; font-family: Arial, sans-serif;">Здравствуйте!</h2>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            Ваш ребенок <strong style="color: #fff;">${childName}</strong> хочет создать аккаунт в приложении HockeyStars — социальной сети для юных хоккеистов.
          </p>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            В соответствии с законом COPPA, для пользователей младше 13 лет требуется подтвержденное согласие родителей. 
            Мы собираем следующие данные: имя, возраст, игровая статистика, фотографии и видео.
          </p>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            Пожалуйста, ознакомьтесь с нашей <a href="${privacyPolicyUrl}" style="color: #fa2f40; text-decoration: underline;">Политикой конфиденциальности</a>.
          </p>
          
          <div style="background-color: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0; border: 1px solid rgba(255, 255, 255, 0.2);">
            <p style="color: #fff; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">
              Чтобы дать согласие на создание аккаунта, пожалуйста, перейдите по ссылке ниже:
            </p>
            <a href="${consentUrl}" 
               style="display: inline-block; background-color: #fa2f40; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; font-family: Arial, sans-serif;">
              Подтвердить согласие
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px; font-family: Arial, sans-serif;">
            <strong style="color: #ccc;">Важно:</strong> Ссылка действительна в течение <strong style="color: #fff;">24 часов</strong>.<br>
            Если вы не давали разрешения, просто проигнорируйте это письмо. Аккаунт не будет создан без вашего подтверждения.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="color: #999; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
              С уважением,<br>
              Команда HockeyStars<br>
              <a href="mailto:support@hockey-stars.com" style="color: #fa2f40; text-decoration: underline;">support@hockey-stars.com</a>
            </p>
          </div>
        </div>
      </div>
      </body>
      </html>
    `
  } : {
    subject: 'Parental Consent Required for HockeyStars Registration',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #050008; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050008;">
          <div style="background-color: #050008; padding: 30px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2);">
          <div style="text-align: center; margin-bottom: 30px;">
              <img src="${logoUrl}" alt="HockeyStars" style="max-width: 200px; height: auto; margin: 0 auto; display: block; width: 200px;" />
          </div>
          
          <h2 style="color: #fff; margin-bottom: 20px; font-family: Arial, sans-serif;">Hello!</h2>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            Your child <strong style="color: #fff;">${childName}</strong> wants to create an account in the HockeyStars app — a social network for young hockey players.
          </p>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            In accordance with COPPA law, verified parental consent is required for users under 13 years of age. 
            We collect the following data: name, age, game statistics, photos and videos.
          </p>
          
          <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif;">
            Please review our full <a href="${privacyPolicyUrl}" style="color: #fa2f40; text-decoration: underline;">Privacy Policy</a>.
          </p>
          
          <div style="background-color: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0; border: 1px solid rgba(255, 255, 255, 0.2);">
            <p style="color: #fff; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">
              To give consent for account creation, please click the link below:
            </p>
            <a href="${consentUrl}" 
               style="display: inline-block; background-color: #fa2f40; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; font-family: Arial, sans-serif;">
              Confirm Consent
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px; font-family: Arial, sans-serif;">
            <strong style="color: #ccc;">Important:</strong> The link is valid for <strong style="color: #fff;">24 hours</strong>.<br>
            If you did not give permission, simply ignore this email. The account will not be created without your confirmation.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="color: #999; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
              Best regards,<br>
              HockeyStars Team<br>
              <a href="mailto:support@hockey-stars.com" style="color: #fa2f40; text-decoration: underline;">support@hockey-stars.com</a>
            </p>
          </div>
        </div>
      </div>
      </body>
      </html>
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
    
    console.log(`📧 Email payload (без HTML):`, JSON.stringify({ ...emailPayload, html: '[HTML content]' }))
    console.log(`📧 Email HTML содержит logoUrl: ${emailContent.html.includes(logoUrl)}`)
    console.log(`📧 Email HTML содержит русский текст: ${emailContent.html.includes('Здравствуйте')}`)
    console.log(`📧 Email HTML содержит английский текст: ${emailContent.html.includes('Hello')}`)
    console.log(`📧 Email subject: ${emailContent.subject}`)
    console.log(`📧 КРИТИЧЕСКАЯ ПРОВЕРКА: lang=${lang}, subject содержит 'Требуется' (ru): ${emailContent.subject.includes('Требуется')}, subject содержит 'Required' (en): ${emailContent.subject.includes('Required')}`)
    
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
    const requestBody = await req.json()
    console.log(`📧 Получен запрос:`, JSON.stringify({ ...requestBody, phone: requestBody.phone ? '[phone]' : undefined }))
    console.log(`📧 ПРОВЕРКА language в запросе: requestBody.language = ${requestBody.language}, type = ${typeof requestBody.language}`)
    const { phone, name, birthDate, parentEmail, country, position, team, userStatus = 'player', language, avatar, resend, token }: ChildRegistrationRequest = requestBody
    console.log(`📧 Распарсенные параметры: language=${language}, country=${country}, userStatus=${userStatus}, avatar=${avatar ? 'есть' : 'нет'}`)
    console.log(`📧 ПРОВЕРКА после деструктуризации: language = ${language}, type = ${typeof language}, undefined? ${language === undefined}, null? ${language === null}`)
    console.log(`📧 ПРОВЕРКА аватара: avatar = ${avatar}, type = ${typeof avatar}, undefined? ${avatar === undefined}, null? ${avatar === null}, empty? ${avatar === ''}`)

    // Обработка повторной отправки письма
    if (resend && token) {
      console.log(`📧 Повторная отправка письма: language=${language}, country=${country}`)
      // Находим игрока по токену или по email родителя и имени
      const { data: player, error: findError } = await supabase
        .from('players')
        .select('id, name, parent_email, country, status, language')
        .eq('parent_email', parentEmail)
        .eq('name', name)
        .eq('status', 'pending_verification')
        .maybeSingle()
      
      console.log(`📧 Найденный игрок:`, player ? { id: player.id, name: player.name, country: player.country, language: player.language } : 'не найден')

      if (findError || !player) {
        return new Response(
          JSON.stringify({ error: 'Игрок не найден или уже активирован' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Обновляем токен
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const { error: updateError } = await supabase
        .from('players')
        .update({
          consent_token: token,
          consent_token_expires_at: expiresAt
        })
        .eq('id', player.id)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Ошибка обновления токена' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Определяем язык и отправляем письмо
      // Используем язык из запроса, если он есть, иначе из БД, иначе определяем по стране
      const playerLanguage = language || player.language
      console.log(`📧 Язык для повторной отправки: language из запроса=${language}, language из БД=${player.language}, итоговый=${playerLanguage}`)
      const emailLang = determineLanguage(playerLanguage, player.country || country)
      console.log(`📧 Определенный язык письма: ${emailLang}`)
      const emailResult = await sendParentalConsentEmail(parentEmail, player.name, token, emailLang)

      if (!emailResult.success) {
        return new Response(
          JSON.stringify({ error: 'Не удалось отправить письмо', details: emailResult.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Письмо успешно отправлено' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Валидация для новой регистрации
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
        JSON.stringify({ error: 'Этот номер уже зарегистрирован. Попробуйте войти', code: 'PHONE_ALREADY_EXISTS' }),
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
    
    // Определяем язык для сохранения в БД (если передан, иначе определяем по стране)
    const playerLanguage = language || determineLanguage(undefined, country)
    
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
        consent_token_expires_at: expiresAt,
        language: playerLanguage, // Сохраняем язык в БД
        avatar: avatar || null // Сохраняем аватар, если он был загружен
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

    // Определяем язык письма на основе языка приложения или страны
    console.log(`📧 ПЕРЕД определением языка:`)
    console.log(`📧   - language parameter: ${language}`)
    console.log(`📧   - country parameter: ${country}`)
    console.log(`📧   - language type: ${typeof language}`)
    console.log(`📧   - language value: ${JSON.stringify(language)}`)
    console.log(`📧   - language === 'en': ${language === 'en'}`)
    console.log(`📧   - language === 'ru': ${language === 'ru'}`)
    console.log(`📧   - language truthy?: ${!!language}`)
    
    const emailLang = determineLanguage(language, country)
    
    console.log(`📧 ПОСЛЕ определения языка:`)
    console.log(`📧   - emailLang: ${emailLang}`)
    console.log(`📧   - emailLang === 'ru': ${emailLang === 'ru'}`)
    console.log(`📧   - emailLang === 'en': ${emailLang === 'en'}`)
    console.log(`📧   - Отправляем письмо родителю на ${parentEmail} для ребенка ${name}`)
    console.log(`📧   - Язык приложения: ${language || 'не указан'}`)
    console.log(`📧   - Язык письма: ${emailLang}`)
    
    const emailResult = await sendParentalConsentEmail(parentEmail, name, consentToken, emailLang)

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

