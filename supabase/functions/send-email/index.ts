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

  // URL логотипа - используем абсолютный URL
  const baseUrl = Deno.env.get('SITE_URL') || 'https://hockey-stars.com'
  const logoUrl = `${baseUrl}/logo.png`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HockeyStars <noreply@hockey-stars.com>',
      to: [email],
      subject: subject,
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
            
            <h2 style="color: #fff; margin-bottom: 20px; font-family: Arial, sans-serif; text-align: center;">Verification Code</h2>
            
            <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px; font-family: Arial, sans-serif; text-align: center;">
              Your verification code for HockeyStars registration:
            </p>
            
            <div style="background-color: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0; border: 1px solid rgba(255, 255, 255, 0.2);">
              <p style="color: #ccc; margin: 0 0 15px 0; font-size: 16px; font-family: Arial, sans-serif;">Your verification code:</p>
              <h1 style="color: #fa2f40; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px; font-family: Arial, sans-serif;">${code}</h1>
            </div>
            
            <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px; font-family: Arial, sans-serif; text-align: center;">
              <strong style="color: #ccc;">Important:</strong> This code is valid for <strong style="color: #fff;">10 minutes</strong>.<br>
              If you did not request this code, please ignore this email.
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
    const { email, code, subject = 'HockeyStars Verification Code' }: EmailRequest = await req.json()

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
