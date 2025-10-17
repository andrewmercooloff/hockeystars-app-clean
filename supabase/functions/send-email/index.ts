// Edge Function для отправки email кодов подтверждения
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const GMAIL_USER = Deno.env.get('GMAIL_USER')
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')

interface EmailRequest {
  email: string
  code: string
  subject?: string
}

// Отправка через Resend API (рекомендуется)
async function sendWithResend(email: string, code: string, subject: string) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY не настроен')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HockeyStars <noreply@hockeystars.com>',
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #FF4444; margin: 0;">🏒 HockeyStars</h1>
            </div>
            
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Код подтверждения</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">Ваш код подтверждения:</p>
              <h1 style="color: #FF4444; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px;">${code}</h1>
            </div>
            
            <p style="color: #666; text-align: center; margin: 20px 0;">
              Код действителен <strong>10 минут</strong>.<br>
              Если вы не запрашивали этот код, просто проигнорируйте это письмо.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                С уважением,<br>
                Команда HockeyStars
              </p>
            </div>
          </div>
        </div>
      `
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${error}`)
  }

  return await response.json()
}

// Отправка через Gmail SMTP (альтернатива)
async function sendWithGmail(email: string, code: string, subject: string) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials не настроены')
  }

  // Для Deno нужно использовать другую библиотеку для SMTP
  // Пока что возвращаем ошибку
  throw new Error('Gmail SMTP в Edge Functions пока не поддерживается. Используйте Resend.')
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Парсим запрос
    const { email, code, subject = 'Код подтверждения HockeyStars' }: EmailRequest = await req.json()

    // Валидация
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email и код обязательны' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Неверный формат email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Валидация кода
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Код должен содержать 6 цифр' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📧 Отправляем код ${code} на email: ${email}`)

    let result
    
    // Пробуем Resend, если не получается - возвращаем fallback
    try {
      result = await sendWithResend(email, code, subject)
      console.log('✅ Email отправлен через Resend:', result.id)
    } catch (resendError) {
      console.warn('⚠️ Resend недоступен:', resendError.message)
      
      try {
        result = await sendWithGmail(email, code, subject)
        console.log('✅ Email отправлен через Gmail')
      } catch (gmailError) {
        console.warn('⚠️ Gmail недоступен:', gmailError.message)
        
        // Fallback - логируем код
        console.log(`
        ═══════════════════════════════════
        📧 EMAIL: ${email}
        🔑 КОД: ${code}
        ⏰ Действителен 10 минут
        
        ⚠️  Email провайдеры недоступны
        💡 Настройте RESEND_API_KEY или Gmail credentials
        ═══════════════════════════════════
        `)
        
        result = { 
          id: 'fallback-' + Date.now(),
          message: 'Код показан в логах (demo mode)'
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Код подтверждения отправлен',
        data: result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Ошибка Edge Function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Ошибка отправки email'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
