// Cloudflare Worker для отправки email через MailChannels
export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // Parse request body
      const { email, code, subject = 'Код подтверждения HockeyStars' } = await request.json();

      // Validate input
      if (!email || !code) {
        return new Response(JSON.stringify({ error: 'Email и код обязательны' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Неверный формат email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate code format (6 digits)
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: 'Код должен содержать 6 цифр' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`📧 Отправляем код ${code} на email: ${email}`);

      // Send email via MailChannels
      const emailResponse = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email }],
            }
          ],
          from: {
            email: 'noreply@hockeystars.by',
            name: 'HockeyStars'
          },
          subject: subject,
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                  <div style="background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <h1 style="color: #fa2f40; margin: 0;">🏒 HockeyStars</h1>
                    </div>
                    
                    <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Код подтверждения</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 16px;">Ваш код подтверждения:</p>
                      <h1 style="color: #fa2f40; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 5px;">${code}</h1>
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
            }
          ]
        })
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('❌ MailChannels error:', errorText);
        
        return new Response(JSON.stringify({
          error: 'Ошибка отправки email',
          details: errorText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await emailResponse.json();
      console.log('✅ Email отправлен успешно:', result);

      return new Response(JSON.stringify({
        success: true,
        message: 'Код подтверждения отправлен на email',
        messageId: result.id || 'unknown'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Worker error:', error);

      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
