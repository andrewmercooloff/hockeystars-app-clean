// Edge Function для верификации родительского согласия
// Вызывается когда родитель переходит по ссылке из письма
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

// Общие стили для HTML страниц в стиле сайта
const HTML_STYLES = `
  <style>
    @font-face {
      font-family: 'Gilroy';
      src: url('https://fonts.gstatic.com/s/gilroy/v1/8vIJ7w-U0JQ1F-vFeyU_Pw.woff2') format('woff2');
      font-weight: 400;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Gilroy', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #000000;
      color: #ffffff;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(80deg, #054c76d4, #0c192ad9, #471c3ade);
      z-index: 0;
    }
    .container {
      position: relative;
      z-index: 2;
      background: rgba(5, 0, 8, 0.85);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 50px 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
    .success-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #fa2f40;
      margin-bottom: 20px;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    p {
      color: #cccccc;
      line-height: 1.6;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .info-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    .info-box p {
      color: #ffffff;
      margin: 0;
    }
    .info-box p:first-child {
      font-weight: 700;
      margin-bottom: 10px;
    }
    a {
      color: #fa2f40;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media (max-width: 480px) {
      .container {
        padding: 30px 20px;
      }
      h1 {
        font-size: 24px;
      }
    }
  </style>
`

// Отправка второго письма (Email-Plus) родителю после активации
async function sendActivationConfirmationEmail(
  parentEmail: string,
  childName: string,
  lang: string = 'ru'
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY не настроен')
    return { success: false, error: 'Email service not configured' }
  }

  const supportEmail = 'support@hockey-stars.com'
  const emailContent = lang === 'ru' ? {
    subject: 'Аккаунт вашего ребенка в HockeyStars активирован',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fa2f40; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">HOCKEYSTARS</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Здравствуйте!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Вы успешно дали согласие на создание аккаунта для вашего ребенка <strong>${childName}</strong>.
          </p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-weight: bold;">
              ✅ Аккаунт активирован
            </p>
            <p style="color: #155724; margin: 10px 0 0 0;">
              Теперь ваш ребенок может войти в приложение и начать пользоваться HockeyStars.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-top: 30px;">
            <strong>Важно:</strong> Если вы считаете, что это произошло по ошибке, или хотите отозвать согласие и удалить аккаунт ребенка, 
            пожалуйста, свяжитесь с нами по адресу <a href="mailto:${supportEmail}" style="color: #fa2f40;">${supportEmail}</a>.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Вы также можете просмотреть нашу <a href="https://hockey-stars.com/rules.html" style="color: #fa2f40;">Политику конфиденциальности</a> 
            в любое время.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              С уважением,<br>
              Команда HockeyStars<br>
              <a href="mailto:${supportEmail}" style="color: #fa2f40;">${supportEmail}</a>
            </p>
          </div>
        </div>
      </div>
    `
  } : {
    subject: 'Your child\'s HockeyStars account has been activated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fa2f40; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">HOCKEYSTARS</h1>
          </div>
          
          <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You have successfully given consent for your child <strong>${childName}</strong> to create an account.
          </p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-weight: bold;">
              ✅ Account Activated
            </p>
            <p style="color: #155724; margin: 10px 0 0 0;">
              Your child can now log in to the app and start using HockeyStars.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-top: 30px;">
            <strong>Important:</strong> If you believe this happened by mistake, or want to revoke consent and delete your child's account, 
            please contact us at <a href="mailto:${supportEmail}" style="color: #fa2f40;">${supportEmail}</a>.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            You can also review our <a href="https://hockey-stars.com/privacy-en.html" style="color: #fa2f40;">Privacy Policy</a> at any time.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Best regards,<br>
              HockeyStars Team<br>
              <a href="mailto:${supportEmail}" style="color: #fa2f40;">${supportEmail}</a>
            </p>
          </div>
        </div>
      </div>
    `
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HockeyStars <noreply@hockey-stars.com>',
        to: [parentEmail],
        subject: emailContent.subject,
        html: emailContent.html
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Resend API error:', error)
      return { success: false, error: `Resend API error: ${error}` }
    }

    const result = await response.json()
    console.log('✅ Activation confirmation email sent:', result.id)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Для публичных запросов (ссылки из писем) не требуем авторизацию
  // Используем SERVICE_ROLE_KEY для доступа к БД
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    console.log('🔍 Получен запрос на верификацию токена')
    console.log('🔍 URL:', req.url)
    console.log('🔍 Токен из URL:', token)

    if (!token) {
      console.error('❌ Токен не предоставлен в URL')
      return new Response(
        JSON.stringify({ error: 'Токен не предоставлен' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем токен напрямую в таблице players
    console.log('🔍 Ищем токен в таблице players:', token)
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, name, parent_email, consent_token, consent_token_expires_at, status, country')
      .eq('consent_token', token)
      .single()

    console.log('🔍 Результат поиска игрока:', { playerData, playerError })

    if (playerError) {
      console.error('❌ Ошибка при поиске игрока:', playerError)
      // Если это ошибка "не найдено", проверяем, может токен просто не существует
      if (playerError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Токен не найден. Возможно, ссылка уже была использована или истекла.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'Ошибка проверки токена', details: playerError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!playerData) {
      console.error('❌ Игрок с таким токеном не найден')
      return new Response(
        JSON.stringify({ error: 'Токен не найден или недействителен' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем, не истек ли токен
    if (playerData.consent_token_expires_at && new Date(playerData.consent_token_expires_at) < new Date()) {
      console.error('❌ Токен истек:', playerData.consent_token_expires_at)
      return new Response(
        JSON.stringify({ error: 'Срок действия ссылки истек. Пожалуйста, запросите новую ссылку.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем, не активирован ли уже аккаунт
    if (playerData.status === 'active') {
      console.log('✅ Аккаунт уже активирован')
      // Возвращаем страницу успеха, но без повторной активации
      const playerNameSafe = (playerData.name || 'вашего ребенка').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const alreadyActivePage = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Аккаунт уже активирован - HockeyStars</title>
          ${HTML_STYLES}
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Аккаунт уже активирован</h1>
            <p>Аккаунт вашего ребенка <strong>${playerNameSafe}</strong> уже был активирован ранее.</p>
            <p>Ваш ребенок может войти в приложение HockeyStars.</p>
          </div>
        </body>
        </html>
      `
      return new Response(alreadyActivePage, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Активируем аккаунт напрямую
    console.log('✅ Активируем аккаунт для игрока:', playerData.id)
    
    // Извлекаем исходный статус из поля team (формат: "team|originalStatus")
    let originalStatus = 'player' // По умолчанию
    let teamWithoutStatus = playerData.team || ''
    
    if (playerData.team && playerData.team.includes('|')) {
      const parts = playerData.team.split('|')
      if (parts.length >= 2) {
        teamWithoutStatus = parts[0] // Команда без статуса
        originalStatus = parts[1] || 'player' // Исходный статус
        console.log('📋 Восстанавливаем исходный статус:', originalStatus, 'из команды:', teamWithoutStatus)
      }
    }
    
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({
        status: originalStatus, // Восстанавливаем исходный статус вместо 'active'
        team: teamWithoutStatus, // Восстанавливаем команду без статуса
        consent_token: null,
        consent_token_expires_at: null,
        // parent_email оставляем для истории (можно удалить, если нужно)
      })
      .eq('id', playerData.id)
      .select('id, name, parent_email, status')
      .single()

    if (updateError || !updatedPlayer) {
      console.error('❌ Ошибка активации аккаунта:', updateError)
      return new Response(
        JSON.stringify({ error: 'Ошибка активации аккаунта', details: updateError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Аккаунт успешно активирован:', updatedPlayer)

    // Определяем язык письма подтверждения на основе страны
    let emailLanguage = 'en'; // По умолчанию английский

    // Русскоязычные страны
    const russianSpeakingCountries = [
      'Россия', 'Беларусь', 'Украина', 'Казахстан', 'Киргизия', 'Таджикистан',
      'Узбекистан', 'Армения', 'Азербайджан', 'Молдова', 'Грузия',
      'Russia', 'Belarus', 'Ukraine', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan',
      'Uzbekistan', 'Armenia', 'Azerbaijan', 'Moldova', 'Georgia'
    ];

    if (playerData.country && russianSpeakingCountries.some(rc => playerData.country!.toLowerCase().includes(rc.toLowerCase()))) {
      emailLanguage = 'ru';
    }

    console.log(`📧 Отправляем письмо подтверждения на языке: ${emailLanguage} (страна: ${playerData.country})`)

    // Отправляем второе письмо (Email-Plus) - не критично, если не отправится
    try {
      const emailResult = await sendActivationConfirmationEmail(
        playerData.parent_email || updatedPlayer.parent_email,
        playerData.name || updatedPlayer.name,
        emailLanguage
      )

      if (!emailResult.success) {
        console.warn('⚠️ Confirmation email не отправлен:', emailResult.error)
      } else {
        console.log('✅ Confirmation email отправлен')
      }
    } catch (emailError) {
      console.warn('⚠️ Ошибка при отправке confirmation email (не критично):', emailError)
    }

    // Логируем успешную верификацию - не критично, если не залогируется
    try {
      await supabase
        .from('parental_consent_logs')
        .insert({
          player_id: updatedPlayer.id,
          parent_email: updatedPlayer.parent_email || playerData.parent_email,
          token: token,
          action: 'verified',
          processed_at: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        })
      console.log('✅ Верификация залогирована')
    } catch (logError) {
      console.warn('⚠️ Ошибка логирования верификации (не критично):', logError)
    }

    // Возвращаем HTML страницу успеха
    const playerName = (updatedPlayer.name || playerData.name || 'вашего ребенка').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const successPage = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Согласие подтверждено - HockeyStars</title>
        ${HTML_STYLES}
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Согласие подтверждено!</h1>
          <p>Спасибо! Вы успешно подтвердили согласие на создание аккаунта для вашего ребенка <strong>${playerName}</strong>.</p>
          <div class="info-box">
            <p style="margin: 0;"><strong>Аккаунт активирован</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Теперь ваш ребенок может войти в приложение HockeyStars.</p>
          </div>
          <p style="font-size: 14px; color: #aaaaaa;">
            Если у вас есть вопросы, свяжитесь с нами: <a href="mailto:support@hockey-stars.com">support@hockey-stars.com</a>
          </p>
        </div>
      </body>
      </html>
    `

    return new Response(successPage, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('❌ Error in verify-parental-consent:', error)
    
    // Если ошибка произошла, но токен был передан, проверяем, может аккаунт уже активирован
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    
    if (token) {
      try {
        const { data: checkPlayer } = await supabase
          .from('players')
          .select('id, name, status')
          .eq('consent_token', token)
          .or('status.eq.active,status.eq.pending_verification')
          .single()
        
        // Если аккаунт активен, возвращаем страницу успеха
        if (checkPlayer && checkPlayer.status === 'active') {
          const playerName = (checkPlayer.name || 'вашего ребенка').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          const successPage = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Согласие подтверждено - HockeyStars</title>
              ${HTML_STYLES}
            </head>
            <body>
              <div class="container">
                <div class="success-icon">✅</div>
                <h1>Согласие подтверждено!</h1>
                <p>Аккаунт вашего ребенка <strong>${playerName}</strong> активирован.</p>
                <p>Теперь ваш ребенок может войти в приложение HockeyStars.</p>
              </div>
            </body>
            </html>
          `
          return new Response(successPage, {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
          })
        }
      } catch (checkError) {
        console.error('❌ Ошибка при проверке статуса аккаунта:', checkError)
      }
    }
    
    // Если не удалось проверить или аккаунт не активирован, возвращаем ошибку
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

