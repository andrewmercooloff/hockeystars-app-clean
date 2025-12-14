
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ImageBackground,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '../components/CustomAlert';
import WebTextInput from '../components/WebTextInput';
import { saveCurrentUser, getPlayerByPhone, getPlayerByEmail } from '../utils/playerStorage';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { sendVerificationSMS, verifyCode, saveVerificationCode, sendVerificationEmail } from '../utils/emailService';

const iceBg = require('../assets/images/led.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currentUser, isUserLoading, refreshUser } = useUser();
  const contactRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formData, setFormData] = useState({
    contact: '', // Объединенное поле для телефона или email
    code: ''
  });
  
  // Функция для определения типа ввода (email или phone)
  const detectInputType = (value: string): 'email' | 'phone' => {
    const trimmed = value.trim();
    
    // Проверяем, содержит ли значение символ @ - это email
    if (trimmed.includes('@')) {
      return 'email';
    }
    
    // Если содержит буквы (кроме + в начале) - скорее всего email
    if (/[a-zA-Z]/.test(trimmed)) {
      return 'email';
    }
    
    // Если начинается с + и содержит только цифры (после +) - это телефон
    if (trimmed.startsWith('+') && /^\+[0-9]+$/.test(trimmed)) {
      return 'phone';
    }
    
    // Если содержит только цифры и имеет длину >= 10 - это телефон
    if (/^[0-9]+$/.test(trimmed) && trimmed.length >= 10) {
      return 'phone';
    }
    
    // Если начинается с цифр и длина >= 7 - это телефон
    if (/^[0-9]+$/.test(trimmed) && trimmed.length >= 7) {
      return 'phone';
    }
    
    // По умолчанию считаем телефоном (для обратной совместимости)
    return 'phone';
  };
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (currentUser) {
      router.replace('/');
    }
  }, [currentUser, router]);

  // Не показываем форму входа, пока идет проверка авторизации
  if (isUserLoading) {
    return null;
  }

  const closeAlert = () => {
    setAlert({ ...alert, visible: false });
  };

  const closeAlertAndGoHome = () => {
    setAlert({ ...alert, visible: false });
    setTimeout(() => {
      // Переходим на главный экран с параметром refresh для обновления данных
      router.push('/?refresh=true');
    }, 100);
  };

  const handleAlertClose = () => {
    // Если это успешное уведомление о входе - идем на главную
    if (alert.type === 'success' && alert.title === t('auth.welcomeBack')) {
      closeAlertAndGoHome();
    } else {
      // Во всех остальных случаях просто закрываем алерт
      closeAlert();
    }
  };

  // Обработчик ввода для телефона или email
  const handleContactChange = (text: string) => {
    // Определяем тип ввода на основе текущего значения
    const inputType = detectInputType(text);
    
    if (inputType === 'phone') {
      // Для телефона: убираем все символы кроме + и цифр
      const digitsOnly = text.replace(/[^\d]/g, '');
      const hasPlus = text.includes('+');
      const formatted = hasPlus ? '+' + digitsOnly : digitsOnly;
      setFormData({ ...formData, contact: formatted });
    } else {
      // Для email: разрешаем все символы (включая @, точки, буквы)
      // Убираем только пробелы в начале и конце
      setFormData({ ...formData, contact: text });
    }
  };

  const handleCodeChange = (text: string) => {
    // Разрешаем только цифры и ограничиваем до 6 символов
    const numericCode = text.replace(/[^0-9]/g, '').slice(0, 6);
    setFormData({ ...formData, code: numericCode });
  };

  // Таймер для повторной отправки
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  // Отправка кода на телефон или email
  const handleSendCode = async () => {
    const contactValue = formData.contact.trim();
    const inputType = detectInputType(contactValue);

    if (!contactValue) {
      setAlert({
        visible: true,
        title: t('common.error'),
        message: t('auth.phoneOrEmailHint') || 'Please enter your phone number or email address',
        type: 'error'
      });
      return;
    }

    // Проверяем формат в зависимости от типа
    if (inputType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactValue)) {
        setAlert({
          visible: true,
          title: t('common.error'),
          message: t('auth.invalidEmail') || 'Please enter a valid email address',
          type: 'error'
        });
        return;
      }
    }

    // Проверяем, является ли это административным входом (только для телефона)
    if (inputType === 'phone' && contactValue.endsWith('######')) {
      
      // Убираем ###### из номера телефона
      const cleanPhone = contactValue.replace('######', '');
      
      setLoading(true);
      
      try {
        // Ищем пользователя по очищенному номеру телефона
        const user = await getPlayerByPhone(cleanPhone, true); // isAdminAccess = true
        
        if (!user) {
          setAlert({
            visible: true,
            title: 'Пользователь не найден',
            message: `Пользователь с номером ${cleanPhone} не найден`,
            type: 'error'
          });
          return;
        }
        
        // Входим в систему как найденный пользователь
        await saveCurrentUser(user);
        
        // Обновляем контекст пользователя для немедленного обновления интерфейса
        refreshUser(true); // forceRefresh = true
        
        setAlert({
          visible: true,
          title: '🔐 Административный доступ',
          message: `Вход в аккаунт ${user.name} через секретный код`,
          type: 'success'
        });
        
        setTimeout(closeAlertAndGoHome, 1500);
        
      } catch (error) {
        console.error('❌ Ошибка административного входа:', error);
        setAlert({
          visible: true,
          title: 'Ошибка входа',
          message: 'Ошибка при входе в аккаунт',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
      
      return;
    }

    // Для телефона проверяем формат
    if (inputType === 'phone') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      const cleanedPhone = contactValue.replace(/\s/g, '');
      const isBypassNumber = contactValue.endsWith('######');
      
      if (!isBypassNumber && !phoneRegex.test(cleanedPhone)) {
        setAlert({
          visible: true,
          title: t('common.error'),
          message: t('auth.invalidPhone'),
          type: 'error'
        });
        return;
      }

      // Дополнительная проверка длины номера (только для обычных номеров)
      if (!isBypassNumber) {
        const phoneWithoutPlus = cleanedPhone.replace(/^\+/, '');
        if (phoneWithoutPlus.length < 10 || phoneWithoutPlus.length > 15) {
          setAlert({
            visible: true,
            title: t('common.error'),
            message: t('auth.invalidPhone'),
            type: 'error'
          });
          return;
        }
      }
    }

    setLoading(true);

    try {
      const cleanedContact = inputType === 'phone' ? contactValue.replace(/\s/g, '') : contactValue.trim();
      
      // Проверяем, заканчивается ли номер на ###### (только для телефона)
      const isBypassNumber = inputType === 'phone' && cleanedContact.endsWith('######');
      
      if (isBypassNumber) {
        // Для номеров с суффиксом ###### пропускаем SMS и сразу переходим к входу
        console.log('🔓 Обнаружен bypass номер в логине, пропускаем SMS подтверждение');
        setAlert({
          visible: true,
          title: 'Режим разработчика',
          message: 'Номер заканчивается на ######, SMS подтверждение пропущено',
          type: 'success'
        });
        
        // Имитируем успешную верификацию и переходим к входу
        setFormData({ ...formData, code: '123456' });
        setTimeout(() => handleVerifyCode(), 1000);
        return;
      }
      
      // ПРОВЕРЯЕМ существование пользователя ПЕРЕД отправкой кода
      const existingPlayer = inputType === 'email'
        ? await getPlayerByEmail(cleanedContact)
        : await getPlayerByPhone(cleanedContact);
        
      if (!existingPlayer) {
        setLoading(false);
        setAlert({
          visible: true,
          title: t('auth.userNotFound'),
          message: t('auth.userNotFoundMessage'),
          type: 'error'
        });
        return;
      }

      // Генерируем код подтверждения
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем код в Supabase
      await saveVerificationCode(cleanedContact, verificationCode);
      
      // Автоматически определяем тип и отправляем соответствующий код
      if (inputType === 'email') {
        console.log('📧 Автоопределение: отправляем код на email');
        await sendVerificationEmail(cleanedContact, verificationCode);
      } else {
        console.log('📱 Автоопределение: отправляем код на телефон');
        // Отправляем SMS через Twilio
        await sendVerificationSMS(cleanedContact, verificationCode);
      }

      
      setStep('code');
      
      // Запускаем таймер на 60 секунд
      setResendTimer(60);
      setCanResend(false);
      
      // Скрываем клавиатуру и показываем уведомление с задержкой
      Keyboard.dismiss();
      
      setTimeout(() => {
        codeRef.current?.focus();
      }, 100);
      
    } catch (error) {
      console.error('❌ Ошибка отправки кода:', error);
      setAlert({
        visible: true,
        title: t('auth.errorSendingCode'),
        message: error instanceof Error ? error.message : t('auth.errorSendingCodeMessage'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Переключение на email, если SMS не пришло

  // Повторная отправка кода
  const handleResendCode = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      const contactValue = formData.contact.trim();
      const inputType = detectInputType(contactValue);
      const cleanedContact = inputType === 'phone' ? contactValue.replace(/\s/g, '') : contactValue;
      
      // Генерируем новый код подтверждения
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем код в Supabase
      await saveVerificationCode(cleanedContact, verificationCode);
      
      // Автоматически определяем тип и отправляем соответствующий код
      if (inputType === 'email') {
        await sendVerificationEmail(cleanedContact, verificationCode);
      } else {
        await sendVerificationSMS(cleanedContact, verificationCode);
      }

      // Запускаем таймер на 60 секунд
      setResendTimer(60);
      setCanResend(false);
      
      setAlert({
        visible: true,
        title: t('auth.codeSentSuccess'),
        message: t('auth.codeSentMessage'),
        type: 'success'
      });
    } catch (error) {
      console.error('❌ Ошибка повторной отправки кода:', error);
      setAlert({
        visible: true,
        title: t('auth.errorResendingCode'),
        message: error instanceof Error ? error.message : t('auth.errorResendingCodeMessage'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Проверка кода и вход
  const handleVerifyCode = async () => {
    const { contact, code } = formData;
    const contactValue = contact.trim();
    const inputType = detectInputType(contactValue);
    const cleanedContact = inputType === 'phone' ? contactValue.replace(/\s/g, '') : contactValue;

    if (!code.trim()) {
      setAlert({
        visible: true,
        title: t('common.error'),
        message: t('auth.invalidCode'),
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // Проверяем, это bypass номер или универсальный код для ревью (только для телефона)
      const isBypassNumber = inputType === 'phone' && cleanedContact.endsWith('######');
      const isAdminSecretCode = code === '291019';
      
      if (!isBypassNumber && !isAdminSecretCode) {
        // Для обычных проверяем код через Twilio/Supabase
        const verificationResult = await verifyCode(cleanedContact, code);
        if (!verificationResult.success) {
          throw new Error(verificationResult.message || 'Неверный код подтверждения');
        }
      } else {
        // Для bypass и админ-кода логируем успешный обход
        console.log('🔓 Bypass номер или админ-код в логине - проверка пропущена');
      }
      
      // Ищем пользователя по телефону или email
      const user = inputType === 'email'
        ? await getPlayerByEmail(cleanedContact)
        : await getPlayerByPhone(cleanedContact);
      
      // Если пользователь не найден - ошибка (нужна регистрация)
      if (!user) {
        setAlert({
          visible: true,
          title: t('auth.userNotFound'),
          message: t('auth.userNotFoundMessage'),
          type: 'error'
        });
        setStep('phone'); // Возвращаемся к вводу телефона
        return;
      }
      
      // Проверяем статус аккаунта - если ожидается подтверждение родителя, не пускаем
      if (user.status === 'pending_verification') {
        setAlert({
          visible: true,
          title: 'Ожидание подтверждения родителя',
          message: `Ваш аккаунт ожидает подтверждения от родителя. Мы отправили письмо на адрес ${user.parentEmail || 'указанный при регистрации'}. После того как родитель подтвердит согласие, вы сможете войти в приложение.`,
          type: 'warning'
        });
        return;
      }
      
      // Пользователь найден - входим в систему
      await saveCurrentUser(user);
      
      // Обновляем контекст пользователя для немедленного обновления интерфейса
      refreshUser(true); // forceRefresh = true
      
      setAlert({
        visible: true,
        title: t('auth.welcomeBack'),
        message: t('auth.welcomeBackMessage', { name: user.name }),
        type: 'success'
      });
      
      setTimeout(closeAlertAndGoHome, 1500);
      
    } catch (error) {
      console.error('❌ Ошибка проверки кода:', error);
      setAlert({
        visible: true,
        title: t('auth.errorVerifyingCode'),
        message: t('auth.errorVerifyingCodeMessage'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Автоматически проверяем код, если он имеет 6 символов
    if (formData.code.length === 6) {
      handleVerifyCode();
    }
  }, [formData.code]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.hockeyRinkContainer}>
          <ImageBackground 
            source={iceBg}
            style={styles.hockeyRink}
            resizeMode="cover"
          >
            {/* Внутренняя граница хоккейной коробки */}
            <View style={[styles.innerBorder, { pointerEvents: 'none' }]} />
            
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                {/* Заголовок "Выход на лед" */}
                <View style={styles.modalHeader}>
                  <Ionicons name="log-in" size={40} color="#FF4444" />
                  <Text style={styles.modalTitle}>
                    {t('auth.exitToIce')}
                  </Text>
                </View>

                {/* Сообщение */}
                <Text style={styles.modalMessage}>
                  {t('auth.phoneOrEmailHint') || 'Enter your phone number or email address'}
                </Text>

                {/* Поле ввода телефона или email */}
                {step === 'phone' ? (
                  // Шаг 1: Ввод телефона или email
                  <View style={styles.inputContainer}>
                    <WebTextInput
                      ref={contactRef}
                      style={styles.input}
                      value={formData.contact}
                      onChangeText={handleContactChange}
                      placeholder={t('auth.phoneOrEmailPlaceholder') || '+1234567890 or email@example.com'}
                      placeholderTextColor="#888"
                      autoCapitalize="none"
                      autoComplete="off"
                      textContentType="none"
                      keyboardType="default"
                      autoCorrect={false}
                      returnKeyType="done"
                      blurOnSubmit={false}
                      enablesReturnKeyAutomatically={true}
                      clearButtonMode="while-editing"
                      onSubmitEditing={handleSendCode}
                      editable={!loading}
                      selectTextOnFocus={false}
                      autoFocus={false}
                    />
                  </View>
                ) : (
                  // Шаг 2: Ввод кода подтверждения
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>{t('auth.code')}</Text>
                      <TextInput
                        ref={codeRef}
                        style={[styles.input, styles.codeInput]}
                        value={formData.code}
                        onChangeText={handleCodeChange}
                        placeholder={t('auth.codePlaceholder')}
                        placeholderTextColor="#888"
                        keyboardType="number-pad"
                        maxLength={6}
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        returnKeyType="done"
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        onSubmitEditing={handleVerifyCode}
                        editable={!loading}
                        selectTextOnFocus={true}
                        autoFocus={false}
                      />
                    </View>
                    
                    {/* Показываем контакт для справки */}
                    <Text style={styles.emailHint}>
                      {t('auth.codeSent')}: {formData.contact}
                    </Text>
                    
                    {/* Кнопка повторной отправки */}
                    <TouchableOpacity 
                      style={[styles.resendButton, (!canResend || loading) && styles.resendButtonDisabled]} 
                      onPress={handleResendCode}
                      disabled={!canResend || loading}
                    >
                      <Text style={[styles.resendButtonText, (!canResend || loading) && styles.resendButtonTextDisabled]}>
                        {resendTimer > 0 ? `${t('auth.resendCode')} ${resendTimer}с` : t('auth.sendCode')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Кнопки */}
                <View style={styles.modalButtons}>
                  {step === 'phone' ? (
                    <TouchableOpacity 
                      style={[styles.modalButton, loading && styles.modalButtonDisabled]} 
                      onPress={handleSendCode}
                      disabled={loading}
                    >
                      <Ionicons 
                        name={loading ? "hourglass" : "phone-portrait"} 
                        size={20} 
                        color="#fff" 
                      />
                      <Text style={styles.modalButtonText}>
                        {loading ? t('common.loading') : t('auth.sendCode')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={[styles.modalButton, loading && styles.modalButtonDisabled]} 
                        onPress={handleVerifyCode}
                        disabled={loading}
                      >
                        <Ionicons 
                          name={loading ? "hourglass" : "checkmark-circle"} 
                          size={20} 
                          color="#fff" 
                        />
                        <Text style={styles.modalButtonText}>
                          {loading ? t('common.loading') : t('auth.verifyCode')}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.modalButton, styles.modalButtonSecondary]} 
                        onPress={() => {
                          setStep('phone');
                          setFormData({ ...formData, code: '' });
                        }}
                        disabled={loading}
                      >
                        <Ionicons name="arrow-back" size={20} color="#FF4444" />
                        <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                          {t('common.back')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Кнопка регистрации - показываем только на первом шаге */}
                {step === 'phone' && (
                  <TouchableOpacity 
                    style={styles.registerButton} 
                    onPress={() => router.push('/register')}
                    disabled={loading}
                  >
                    <Ionicons name="person-add" size={20} color="#FF4444" />
                    <Text style={styles.registerButtonText}>
                      {t('auth.register')}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Кнопка отмены */}
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => router.back()}
                  disabled={loading}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Кастомный алерт */}
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onConfirm={handleAlertClose}
          confirmText={t('common.ok')}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050008',
  },
  hockeyRinkContainer: {
    flex: 1,
    // Убираем отступы
  },
  hockeyRink: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(5, 0, 8, 0.9)',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    minWidth: Platform.OS === 'web' ? 380 : 320, // Больше места для веб
    maxWidth: Platform.OS === 'web' ? 400 : 'auto', // Ограничиваем максимальную ширину
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    boxShadow: '0 10px 20px rgba(5, 0, 8, 0.5)',
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 0, // Явно устанавливаем стандартное межбуквенное расстояние для placeholder
    // Убираем width, чтобы поле адаптировалось к контейнеру
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  modalButtonTextSecondary: {
    color: '#FF4444',
  },
  modalCancelButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 5,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    letterSpacing: 8,
    color: '#fff',
    minWidth: 280,
    width: '100%',
  },
  emailHint: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginLeft: 8,
  },
  resendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  resendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: '#666',
  },
  resendButtonText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  resendButtonTextDisabled: {
    color: '#666',
  },
  webInput: {
    // Web-specific styles removed for React Native compatibility
  },
}); 