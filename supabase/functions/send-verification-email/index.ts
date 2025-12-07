// Supabase Edge Function для отправки email через Resend API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка CORS preflight запроса
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, subject = 'HockeyStars Verification Code' } = await req.json()

    // Проверяем обязательные параметры
    if (!email || !code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email и код обязательны' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Получаем API ключ Resend из переменных окружения
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY не настроен')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY не настроен' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📧 Отправляем email через Resend API:', email)

    // HTML шаблон для email
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF4444; margin: 0;">🏒 HockeyStars</h1>
          <p style="color: #666; margin: 5px 0 0 0;">I'm gonna be a hockey star</p>
        </div>
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Verification Code</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">Your verification code:</p>
          <h1 style="color: #FF4444; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px;">${code}</h1>
        </div>
        
        <p style="color: #666; text-align: center; margin: 20px 0;">
          This code is valid for <strong>10 minutes</strong>.<br>
          If you did not request this code, please ignore this email.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Best regards,<br>
            HockeyStars Team
          </p>
        </div>
      </div>
    </div>`

    // Отправляем email через Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HockeyStars <noreply@hockey-stars.com>',
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Email отправлен через Resend:', result.id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            messageId: result.id,
            message: 'Email отправлен успешно'
          } 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('❌ Ошибка Resend API:', result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Ошибка отправки email' 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Ошибка Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Внутренняя ошибка сервера' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
