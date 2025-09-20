import { Ionicons } from '@expo/vector-icons';

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
import CustomAlert from '../components/CustomAlert';
import WebTextInput from '../components/WebTextInput';
import { findPlayerByCredentials, saveCurrentUser, getPlayerByPhone, createPlayer } from '../utils/playerStorage';
import { generateVerificationCode, saveVerificationCode, sendVerificationSMS, verifyCode } from '../utils/emailService';
import { useLanguage } from '../contexts/LanguageContext';

const iceBg = require('../assets/images/led.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const phoneRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formData, setFormData] = useState({
    phone: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });

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

  // Обработчики ввода для SMS авторизации
  const handlePhoneChange = (text: string) => {
    setFormData({ ...formData, phone: text });
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

  // Отправка кода на телефон
  const handleSendCode = async () => {
    const { phone } = formData;

    if (!phone.trim()) {
      setAlert({
        visible: true,
        title: t('common.error'),
        message: t('auth.phoneHint'),
        type: 'error'
      });
      return;
    }

    // Проверяем, является ли это административным входом
    if (phone.endsWith('######')) {
      console.log('🔐 Административный вход с номером:', phone);
      
      // Убираем ###### из номера телефона
      const cleanPhone = phone.replace('######', '');
      console.log('📱 Очищенный номер телефона:', cleanPhone);
      
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

    // Проверка формата телефона - обязательный знак +
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const cleanedPhone = phone.replace(/\s/g, '');
    
    if (!phoneRegex.test(cleanedPhone)) {
      setAlert({
        visible: true,
        title: t('common.error'),
        message: t('auth.invalidPhone'),
        type: 'error'
      });
      return;
    }

    // Дополнительная проверка длины номера
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

    setLoading(true);

    try {
      console.log('📱 Отправляем код на:', phone);
      
      // Генерируем код
      const code = generateVerificationCode();
      
      // Сохраняем код в базе данных
      const savedCode = await saveVerificationCode(phone, code);
      if (!savedCode) {
        throw new Error('Не удалось сохранить код');
      }
      
      // Отправляем SMS с кодом
      const smsSent = await sendVerificationSMS(phone, code);
      if (!smsSent) {
        throw new Error('Не удалось отправить SMS');
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

  // Повторная отправка кода
  const handleResendCode = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      const code = generateVerificationCode();
      const savedCode = await saveVerificationCode(formData.phone, code);
      
      if (!savedCode) {
        throw new Error('Не удалось сохранить код');
      }
      
      const smsSent = await sendVerificationSMS(formData.phone, code);
      if (!smsSent) {
        throw new Error('Не удалось отправить SMS');
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
    const { phone, code } = formData;

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
      
      // Проверяем код
      const verification = await verifyCode(phone, code);
      
      if (!verification.success) {
        setAlert({
          visible: true,
          title: t('common.error'),
          message: verification.message,
          type: 'error'
        });
        return;
      }
      
      // Ищем пользователя по телефону
      const user = await getPlayerByPhone(phone);
      
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
      
      // Пользователь найден - входим в систему
      await saveCurrentUser(user);
      
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
          <ImageBackground source={iceBg} style={styles.hockeyRink} resizeMode="cover">
            {/* Внутренняя граница хоккейной коробки */}
            <View style={styles.innerBorder} />
            
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>

              
              {/* Заголовок формы */}
              <View style={styles.modalHeader}>
                <Ionicons name="log-in" size={40} color="#FF4444" />
                <Text style={styles.modalTitle}>
                  {step === 'phone' ? t('auth.login') : t('auth.code')}
                </Text>
              </View>
              
              {/* Сообщение */}
              <Text style={styles.modalMessage}>
                {step === 'phone' 
                  ? t('auth.phoneHint')
                  : t('auth.codePlaceholder')
                }
              </Text>
              
              {step === 'phone' ? (
                // Шаг 1: Ввод телефона
                <View style={styles.inputContainer}>
                  <WebTextInput
                    ref={phoneRef}
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={handlePhoneChange}
                    placeholder={t('auth.phonePlaceholder')}
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    keyboardType="phone-pad"
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
                  
                  
                  {/* Показываем телефон для справки */}
                  <Text style={styles.emailHint}>
                    {t('auth.codeSent')}: {formData.phone}
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
        confirmText="OK"
      />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hockeyRinkContainer: {
    flex: 1,
    marginHorizontal: 10,
    marginVertical: 10,
  },
  hockeyRink: {
    flex: 1,
    borderRadius: 50, // Увеличили радиус для более округлых краев
    borderWidth: 4, // Увеличили толщину границы
    borderColor: 'rgba(255, 255, 255, 0.8)', // Сделали границу более заметной
    overflow: 'hidden', // Обрезаем содержимое по границам
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  innerBorder: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    minWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
    fontFamily: 'Gilroy-Medium',
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