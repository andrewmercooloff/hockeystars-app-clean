# 📞 Голосовые вызовы Twilio для США

## ✅ Да, голосовые вызовы НЕ требуют A2P 10DLC!

**Отличная новость:** Голосовые вызовы (voice calls) в Twilio **не требуют** регистрации A2P 10DLC, в отличие от SMS.

## 🎯 Как это работает

Twilio может **диктовать код** в голосовом вызове вместо отправки SMS. Это идеальное решение для США!

### Преимущества:
- ✅ **Не требует A2P 10DLC** регистрации
- ✅ Работает для всех стран, включая США
- ✅ Автоматическая диктовка кода
- ✅ Можно настроить язык и голос
- ✅ Дешевле чем SMS в некоторых случаях

### Недостатки:
- ❌ Пользователь должен ответить на звонок
- ❌ Может быть неудобно в шумных местах
- ❌ Немного дороже чем SMS (~$0.013 за минуту)

---

## 🔧 Настройка голосовых вызовов

### 1. В Twilio Console

1. Убедись, что у тебя есть номер телефона (можно использовать тот же, что для SMS)
2. Голосовые вызовы включены по умолчанию для всех номеров

### 2. Создай TwiML для диктовки кода

TwiML (Twilio Markup Language) - это XML, который говорит Twilio что делать во время звонка.

Пример TwiML для диктовки кода:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Your HockeyStars verification code is: 1, 2, 3, 4, 5, 6.
        I repeat: 1, 2, 3, 4, 5, 6.
    </Say>
</Response>
```

### 3. Варианты реализации

#### Вариант A: Использовать Twilio Functions (рекомендуется)

Создай Twilio Function, которая генерирует TwiML динамически:

```javascript
exports.handler = function(context, event, callback) {
    const code = event.code; // Код передается как параметр
    const twiml = new Twilio.twiml.VoiceResponse();
    
    // Диктуем код по цифрам
    const codeDigits = code.split('').join(', ');
    twiml.say({
        voice: 'alice',
        language: 'en-US'
    }, `Your HockeyStars verification code is: ${codeDigits}. I repeat: ${codeDigits}.`);
    
    callback(null, twiml);
};
```

#### Вариант B: Хостить TwiML на своем сервере

Создай endpoint на своем сервере, который возвращает TwiML:

```javascript
// Express.js пример
app.post('/twilio/voice', (req, res) => {
    const code = req.body.code; // Передается через webhook
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Your HockeyStars verification code is: ${code.split('').join(', ')}.
        I repeat: ${code.split('').join(', ')}.
    </Say>
</Response>`;
    res.type('text/xml');
    res.send(twiml);
});
```

---

## 💻 Интеграция в приложение

### Добавь функцию отправки голосового вызова

В `utils/smsService.ts` добавь:

```typescript
export const sendVoiceCallViaTwilio = async (phone: string, code: string): Promise<boolean> => {
  try {
    console.log('📞 Отправляем голосовой вызов через Twilio API');
    
    const accountSid = Constants.expoConfig?.extra?.twilioAccountSid;
    const authToken = Constants.expoConfig?.extra?.twilioAuthToken;
    const fromNumber = getSenderNumber(phone); // Используем ту же логику выбора номера
    
    if (!accountSid || !authToken || !fromNumber) {
      return false;
    }
    
    // URL к TwiML (вариант A: Twilio Function)
    const twimlUrl = `https://${accountSid}:${authToken}@handler.twilio.com/twiml/EH...?code=${code}`;
    
    // Или вариант B: свой сервер
    // const twimlUrl = `https://your-server.com/twilio/voice?code=${code}`;
    
    const formattedPhone = formatPhoneNumber(phone);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: `From=${encodeURIComponent(fromNumber)}&To=${encodeURIComponent(formattedPhone)}&Url=${encodeURIComponent(twimlUrl)}`
      }
    );
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ Голосовой вызов инициирован:', responseData.sid);
      return true;
    } else {
      console.error('❌ Ошибка Twilio Voice API:', responseData);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка отправки голосового вызова:', error);
    return false;
  }
};
```

### Обнови `sendVerificationSMS` для использования голосовых вызовов для США

```typescript
export const sendVerificationSMS = async (phoneNumber: string, code: string): Promise<boolean> => {
  try {
    console.log('📱 Отправляем код подтверждения на:', phoneNumber);
    
    const countryCode = getCountryCode(phoneNumber);
    
    // Для США используем голосовой вызов вместо SMS
    if (countryCode === '1') {
      console.log('🇺🇸 США - используем голосовой вызов');
      return await sendVoiceCallViaTwilio(phoneNumber, code);
    }
    
    // Для остальных стран используем SMS
    const smsSuccess = await sendSMSViaTwilio(phoneNumber, code);
    if (smsSuccess) {
      return true;
    }
    
    // Fallback
    return await sendSMSFallback(phoneNumber, code);
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
    return await sendSMSFallback(phoneNumber, code);
  }
};
```

---

## 💰 Стоимость

- **Голосовой вызов в США**: ~$0.013 за минуту
- **SMS в США**: ~$0.0075 за сообщение
- **Разница**: Голосовой вызов немного дороже, но не требует A2P 10DLC

---

## 🎤 Настройка голоса и языка

Twilio поддерживает разные голоса и языки:

```xml
<Say voice="alice" language="en-US">...</Say>  <!-- Английский (женский) -->
<Say voice="alice" language="ru-RU">...</Say>  <!-- Русский -->
<Say voice="alice" language="de-DE">...</Say>  <!-- Немецкий -->
```

Или можно использовать разные голоса:
- `alice` - женский голос (по умолчанию)
- `man` - мужской голос
- `woman` - другой женский голос

---

## ✅ Рекомендация

**Используй голосовые вызовы для США** - это простое и эффективное решение без бюрократии A2P 10DLC!

1. Для США (+1): Голосовой вызов
2. Для остальных стран: SMS

---

## 📚 Полезные ссылки

- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Twilio TwiML](https://www.twilio.com/docs/voice/twiml)
- [Twilio Functions](https://www.twilio.com/docs/runtime/functions)
- [Twilio Pricing - Voice](https://www.twilio.com/voice/pricing)


















































