import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { COUNTRIES } from '../utils/constants';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Alert,
    Image,
    ImageBackground,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '../components/CustomAlert';
import { addPlayer, saveCurrentUser, Team, createPlayer } from '../utils/playerStorage';
import { generateVerificationCode, saveVerificationCode, sendVerificationSMS, verifyCode } from '../utils/emailService';

const iceBg = require('../assets/images/led.jpg');

const availableSkateServices = [
  'skateSharpeningService',
  'skateForming',
  'skateProfiling',
  'equipmentRepair',
  'stickRepair',
  'usedEquipmentSale',
  'newEquipmentSale'
];

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    status: '' as 'player' | 'coach' | 'scout' | 'star' | 'shop' | 'skateSharpening' | '',
    birthDate: '',
    country: 'Беларусь', // По умолчанию
    team: '', // основная команда (для обратной совместимости)
    position: '',
    number: '',
    grip: '', // хват
    height: '', // рост
    weight: '', // вес
    avatar: null as string | null,
    // Поля для магазина
    address: '',
    workingHours: '',
    email: '',
    discountForFriends: '',
    // Поля для заточки коньков
    skate_services: [] as string[]
  });
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2008, 0, 1)); // 1 января 2008
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchText, setCountrySearchText] = useState('');
  const [skateServices, setSkateServices] = useState<string[]>([]);
  
  const filteredCountries = COUNTRIES.filter(country =>
    country.toLowerCase().includes(countrySearchText.toLowerCase())
  );

  // Функция для нормализации названий стран для поиска переводов
  const normalizeCountryName = (country: string) => {
    return country.toLowerCase()
      .replace(/\s+/g, '') // убираем пробелы
      .replace(/[^а-яa-z]/g, ''); // оставляем только буквы
  };
  
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    onConfirm: () => {},
    onCancel: () => {},
    onSecondary: () => {},
    showCancel: false,
    showSecondary: false,
    confirmText: t('common.ok'),
    cancelText: 'Отмена',
    secondaryText: 'Дополнительно'
  });

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

  useEffect(() => {
    if (verificationCode.length === 6) {
      handleVerifyAndRegister();
    }
  }, [verificationCode]);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', onConfirm?: () => void) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, visible: false }))),
      onCancel: () => {},
      onSecondary: () => {},
      showCancel: false,
      showSecondary: false,
      confirmText: t('common.ok'),
      cancelText: 'Отмена',
      secondaryText: 'Дополнительно'
    });
  };

  const selectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({...formData, avatar: result.assets[0].uri});
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      showAlert(t('common.error'), t('register.photoError'), 'error');
    }
  };

  const handleAlertClose = () => {
    // Если это успешное завершение регистрации - идем на главную
    if (alert.type === 'success' && alert.title === t('register.welcome')) {
      setAlert(prev => ({ ...prev, visible: false }));
      setTimeout(() => {
        router.push('/');
      }, 100);
    } else {
      // Во всех остальных случаях просто закрываем алерт
      setAlert(prev => ({ ...prev, visible: false }));
    }
  };

  const pickImage = async () => {
    // Показываем системное окно выбора источника фото
    Alert.alert(
      'Выберите источник фото',
      'Откуда хотите загрузить фото?',
      [
        {
          text: 'Галерея',
          onPress: () => {
            pickFromGallery();
          }
        },
        {
          text: 'Камера',
          onPress: () => {
            takePhoto();
          }
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // Запрашиваем разрешение на доступ к галерее
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('createUser.permissionError'));
        return;
      }

      // Открываем галерею для выбора фото
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({...formData, avatar: result.assets[0].uri});
      }
    } catch (error) {
      console.error('❌ Ошибка выбора фото из галереи:', error);
      Alert.alert(t('common.error'), t('createUser.errorLoadingPhoto'));
    }
  };

  const takePhoto = async () => {
    try {
      // Запрашиваем разрешение на доступ к камере
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('createUser.permissionErrorCamera'));
        return;
      }

      // Открываем камеру для съемки фото
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({...formData, avatar: result.assets[0].uri});
      }
    } catch (error) {
      console.error('❌ Ошибка при съемке фото:', error);
      Alert.alert(t('common.error'), t('createUser.errorTakingPhoto'));
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'ios') {
      // На iOS календарь не закрывается автоматически
      if (date) {
        setSelectedDate(date);
      }
    } else {
      // На Android календарь закрывается только при полном выборе
      if (event.type === 'set' && date) {
        setShowDatePicker(false);
        setSelectedDate(date);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        const formattedDate = `${day}.${month}.${year}`;
        setFormData({...formData, birthDate: formattedDate});
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    }
  };

  // Отправка кода подтверждения
  const handleSendCode = async () => {
    // Проверяем, что все обязательные поля заполнены
    if (!formData.phone || !formData.name || !formData.status || !formData.country) {
      showAlert('Ошибка', 'Пожалуйста, заполните все обязательные поля', 'error');
      return;
    }

    // Проверка формата телефона - обязательный знак +
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const isBypassNumber = formData.phone.endsWith('######');
    
    if (!isBypassNumber && !phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      showAlert('Ошибка', 'Пожалуйста, введите корректный номер телефона с кодом страны (например: +1234567890)', 'error');
      return;
    }

    // Дополнительные проверки в зависимости от статуса
    if (formData.status === 'player' && (!formData.birthDate || !formData.position)) {
      showAlert('Ошибка', 'Пожалуйста, заполните все поля', 'error');
      return;
    }

    if (formData.status === 'star' && (!formData.birthDate || !formData.position)) {
      showAlert('Ошибка', 'Пожалуйста, заполните все поля', 'error');
      return;
    }

    setLoading(true);

    try {
      // Проверяем, заканчивается ли номер на ######
      const isBypassNumber = formData.phone.endsWith('######');
      
      if (isBypassNumber) {
        // Для номеров с суффиксом ###### пропускаем SMS и сразу переходим к регистрации
        console.log('🔓 Обнаружен bypass номер, пропускаем SMS подтверждение');
        showAlert(
          'Режим разработчика', 
          'Номер заканчивается на ######, SMS подтверждение пропущено', 
          'success',
          () => {
            // Имитируем успешную верификацию и переходим к регистрации
            setVerificationCode('123456');
            setTimeout(() => handleVerifyAndRegister(), 100);
          }
        );
        return;
      }

      // Генерируем и отправляем код для обычных номеров
      const code = generateVerificationCode();
      const savedCode = await saveVerificationCode(formData.phone, code);
      
      if (!savedCode) {
        throw new Error('Не удалось сохранить код');
      }
      
      const smsSent = await sendVerificationSMS(formData.phone, code);
      if (!smsSent) {
        throw new Error('Не удалось отправить SMS');
      }
      
      setStep('verification');
      
      // Запускаем таймер для повторной отправки (60 секунд)
      setResendTimer(60);
      setCanResend(false);
      
      // Скрываем клавиатуру и показываем уведомление с задержкой
      Keyboard.dismiss();
      
    } catch (error) {
      console.error('❌ Ошибка отправки кода:', error);
      showAlert('Ошибка', 'Не удалось отправить код. Попробуйте еще раз.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Подтверждение кода и регистрация
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
      
      // Запускаем таймер снова
      setResendTimer(60);
      setCanResend(false);
      
      showAlert(t('auth.codeResent'), t('auth.codeResent'), 'success');
    } catch (error) {
      console.error('❌ Ошибка повторной отправки:', error);
      showAlert('Ошибка', 'Не удалось отправить код повторно', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showAlert('Ошибка', 'Пожалуйста, введите 6-значный код', 'error');
      return;
    }

    setLoading(true);

    try {
      // Проверяем, это bypass номер или нет
      const isBypassNumber = formData.phone.endsWith('######');
      
      if (!isBypassNumber) {
        // Для обычных номеров проверяем код
        const verification = await verifyCode(formData.phone, verificationCode);
        
        if (!verification.success) {
          showAlert('Ошибка', verification.message, 'error');
          return;
        }
      } else {
        // Для bypass номеров логируем успешный обход
        console.log('🔓 Bypass номер - верификация пропущена');
      }
      
      // Создаем игрока в базе данных
      const playerData = {
        id: Date.now().toString(),
        phone: formData.phone,
        name: formData.name,
        status: formData.status,
        birthDate: formData.birthDate || '',
        country: formData.country,
        team: formData.team || '',
        position: formData.position || '',
        grip: formData.grip || '',
        height: formData.height || '',
        weight: formData.weight || '',
        number: formData.number || '',
        avatar: formData.avatar || '',
        age: 0,
        city: '',
        goals: '',
        assists: '',
        games: '',
        pullUps: '',
        pushUps: '',
        plankTime: '',
        sprint100m: '',
        longJump: '',
        // Добавляем поля для магазина
        ...(formData.status === 'shop' ? {
          address: formData.address || '',
          workingHours: formData.workingHours || '',
          email: formData.email || '',
          discountForFriends: formData.discountForFriends || ''
        } : {}),
        // Добавляем услуги для заточки коньков
        ...(formData.status === 'skateSharpening' ? {
          skate_services: skateServices
        } : {})
      };
      
      const newPlayer = await createPlayer(playerData);
      
      if (newPlayer) {
        await saveCurrentUser(newPlayer);
      } else {
        // Fallback - сохраняем локально
        await saveCurrentUser(playerData);
      }
      
      showAlert(
        t('register.welcome'), 
        t('register.registrationSuccess'),
        'success',
        () => {
          setAlert(prev => ({ ...prev, visible: false }));
          setTimeout(() => {
            router.push('/');
          }, 100);
        }
      );
      
    } catch (error) {
      console.error('❌ Ошибка регистрации:', error);
      showAlert('Ошибка', 'Не удалось завершить регистрацию', 'error');
    } finally {
      setLoading(false);
    }
  };

  const positions = ['Центральный нападающий', 'Крайний нападающий', 'Защитник', 'Вратарь'];

  return (
    <ImageBackground source={iceBg} style={styles.container} resizeMode="cover">
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.formContainer}>

          
          <Text style={styles.title}>{t('register.title')}</Text>
          
          {/* Статус */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('register.status')}</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'player' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'player'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'player' && styles.pickerOptionTextSelected
                ]}>
                  {t('register.player')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'coach' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'coach'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'coach' && styles.pickerOptionTextSelected
                ]}>
                  {t('register.coach')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'scout' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'scout'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'scout' && styles.pickerOptionTextSelected
                ]}>
                  {t('register.scout')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'star' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'star'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'star' && styles.pickerOptionTextSelected
                ]}>
                  {t('register.star')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'shop' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'shop'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'shop' && styles.pickerOptionTextSelected
                ]}>
                  {t('register.shop')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  formData.status === 'skateSharpening' && styles.pickerOptionSelected
                ]}
                onPress={() => setFormData({...formData, status: 'skateSharpening'})}
              >
                <Text style={[
                  styles.pickerOptionText,
                  formData.status === 'skateSharpening' && styles.pickerOptionTextSelected
                ]}>
                  Заточка коньков
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Телефон */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('register.phone')}</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
              autoCorrect={false}
              selectTextOnFocus={true}
              autoFocus={false}
            />
          </View>


          {/* Имя/Название */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.organizationName') : t('register.name')}
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => {
                if (formData.status === 'shop' || formData.status === 'skateSharpening') {
                  // Для магазинов и заточки коньков разрешаем любые символы
                  setFormData({...formData, name: text});
                } else {
                  // Фильтруем только латинские буквы, пробелы и дефисы для игроков
                  const latinOnly = text.replace(/[^a-zA-Z\s\-]/g, '');
                  // Преобразуем в верхний регистр
                  const upperCaseText = latinOnly.toUpperCase();
                  setFormData({...formData, name: upperCaseText});
                }
              }}
              placeholder={
                (formData.status === 'shop' || formData.status === 'skateSharpening')
                  ? t('profile.organizationNamePlaceholder')
                  : t('register.name').toUpperCase()
              }
              placeholderTextColor="#888"
              autoCapitalize={(formData.status === 'shop' || formData.status === 'skateSharpening') ? 'words' : 'characters'}
              selectTextOnFocus={true}
              autoFocus={false}
            />
            {(formData.status !== 'shop' && formData.status !== 'skateSharpening') && (
              <Text style={styles.hintText}>
                {t('profile.nameHint')}
              </Text>
            )}
          </View>

          {/* Фото/Логотип */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.logo') : t('profile.photo')}
            </Text>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={selectPhoto}
            >
              {formData.avatar ? (
                <Image 
                  source={{ 
                    uri: formData.avatar,
                    cache: 'force-cache',
                    headers: {
                      'Cache-Control': 'max-age=3600'
                    }
                  }} 
                  style={styles.avatarPreview}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons 
                    name={(formData.status === 'shop' || formData.status === 'skateSharpening') ? 'storefront-outline' : 'person-outline'} 
                    size={40} 
                    color="#888" 
                  />
                  <Text style={styles.photoPlaceholderText}>
                    {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.selectLogo') : t('profile.selectPhoto')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Дата рождения - для игроков и звезд */}
          {(formData.status === 'player' || formData.status === 'star') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.birthDate')}</Text>
              <TouchableOpacity style={styles.dateInput} onPress={showDatePickerModal}>
                <Text style={styles.dateInputText}>
                  {formData.birthDate || t('register.selectDate')}
                </Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Страна */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('register.country')}</Text>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryButtonText}>
                {formData.country ? (t(`profile.countries.${formData.country}`) || formData.country) : t('profile.selectCountry')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>
          </View>



          {/* Позиция - для игроков и звезд */}
          {(formData.status === 'player' || formData.status === 'star') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.position')}</Text>
              <View style={styles.pickerContainer}>
                {positions.map((pos) => (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.pickerOption,
                      formData.position === pos && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, position: pos})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.position === pos && styles.pickerOptionTextSelected
                    ]}>
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Номер - только для игроков */}
          {formData.status === 'player' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.number')}</Text>
              <TextInput
                style={styles.input}
                value={formData.number}
                onChangeText={(text) => setFormData({...formData, number: text})}
                placeholder={t('register.number')}
                placeholderTextColor="#888"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          )}

          {/* Хват - только для игроков */}
          {formData.status === 'player' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.grip')}</Text>
              <View style={styles.pickerContainer}>
                {['Левый', 'Правый'].map((grip) => (
                  <TouchableOpacity
                    key={grip}
                    style={[
                      styles.pickerOption,
                      formData.grip === grip && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, grip: grip})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.grip === grip && styles.pickerOptionTextSelected
                    ]}>
                      {grip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Рост - только для игроков */}
          {formData.status === 'player' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.height')}</Text>
              <TextInput
                style={styles.input}
                value={formData.height}
                onChangeText={(text) => setFormData({...formData, height: text})}
                placeholder={t('register.height')}
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Вес - только для игроков */}
          {formData.status === 'player' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('register.weight')}</Text>
              <TextInput
                style={styles.input}
                value={formData.weight}
                onChangeText={(text) => setFormData({...formData, weight: text})}
                placeholder={t('register.weight')}
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Поля для магазина */}
          {formData.status === 'shop' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.address')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholder={t('profile.address')}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.workingHours')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.workingHours}
                  onChangeText={(text) => setFormData({...formData, workingHours: text})}
                  placeholder={t('profile.workingHours')}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="example@email.com"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.discountForFriends')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.discountForFriends}
                  onChangeText={(text) => setFormData({...formData, discountForFriends: text})}
                  placeholder={t('profile.discountForFriends')}
                  placeholderTextColor="#888"
                />
              </View>
            </>
          )}

          {/* Поля для заточки коньков */}
          {formData.status === 'skateSharpening' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.address')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholder={t('profile.address')}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.workingHours')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.workingHours}
                  onChangeText={(text) => setFormData({...formData, workingHours: text})}
                  placeholder={t('profile.workingHours')}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="example@email.com"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.discountForFriends')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.discountForFriends}
                  onChangeText={(text) => setFormData({...formData, discountForFriends: text})}
                  placeholder={t('profile.discountForFriends')}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.services')}</Text>
                <View style={styles.pickerContainer}>
                  {availableSkateServices.map((service) => (
                    <TouchableOpacity
                      key={service}
                      style={[
                        styles.pickerOption,
                        skateServices.includes(service) && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        if (skateServices.includes(service)) {
                          setSkateServices(skateServices.filter(s => s !== service));
                        } else {
                          setSkateServices([...skateServices, service]);
                        }
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        skateServices.includes(service) && styles.pickerOptionTextSelected
                      ]}>
                        {t(`profile.${service}`) || service}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Кнопки */}
          {step === 'form' ? (
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
              onPress={handleSendCode}
              disabled={loading}
            >
              <Ionicons 
                name={loading ? "hourglass" : "mail"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.registerButtonText}>
                {loading ? t('common.loading') : t('auth.sendCode')}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Поле для ввода кода */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('auth.code')}</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder={t('auth.codePlaceholder')}
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  selectTextOnFocus={true}
                  autoFocus={false}
                />
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
              </View>

              {/* Кнопка подтверждения */}
              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
                onPress={handleVerifyAndRegister}
                disabled={loading}
              >
                <Ionicons 
                  name={loading ? "hourglass" : "checkmark-circle"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.registerButtonText}>
                  {loading ? t('common.loading') : t('register.register')}
                </Text>
              </TouchableOpacity>

              {/* Кнопка "Назад" */}
              <TouchableOpacity 
                style={[styles.registerButton, styles.backButton]} 
                onPress={() => {
                  setStep('form');
                  setVerificationCode('');
                }}
                disabled={loading}
              >
                <Ionicons name="arrow-back" size={20} color="#FF4444" />
                <Text style={[styles.registerButtonText, styles.backButtonText]}>
                  {t('common.back')}
                </Text>
              </TouchableOpacity>
            </>
          )}


          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      
      {/* DateTimePicker */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1990, 0, 1)}
              textColor="#fff"
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerButtons}>
                <TouchableOpacity 
                  style={styles.datePickerButton} 
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>{t('register.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.confirmButton]} 
                  onPress={() => {
                    const day = selectedDate.getDate().toString().padStart(2, '0');
                    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                    const year = selectedDate.getFullYear().toString();
                    const formattedDate = `${day}.${month}.${year}`;
                    setFormData({...formData, birthDate: formattedDate});
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerButtonText}>{t('register.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Кастомный алерт */}
      {/* Country Picker Modal */}
      {showCountryPicker && (
        <View style={styles.countryPickerOverlay}>
          <View style={styles.countryPickerModal}>
            <Text style={styles.countryPickerTitle}>{t('profile.selectCountry')}</Text>
            
            <TextInput
              style={styles.countrySearchInput}
              value={countrySearchText}
              onChangeText={setCountrySearchText}
              placeholder={t('profile.searchCountry')}
              placeholderTextColor="#888"
            />
            
            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={[
                    styles.countryOption,
                    formData.country === country && styles.countryOptionSelected
                  ]}
                  onPress={() => {
                    setFormData({...formData, country: country, team: ''}); // Сбрасываем команду при смене страны
                    setSelectedTeams([]); // Сбрасываем выбранные команды при смене страны
                    setShowCountryPicker(false);
                    setCountrySearchText('');
                  }}
                >
                  <Text style={[
                    styles.countryOptionText,
                    formData.country === country && styles.countryOptionTextSelected
                  ]}>
                    {t(`profile.countries.${country}`) || country}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.countryPickerCloseButton}
              onPress={() => {
                setShowCountryPicker(false);
                setCountrySearchText('');
              }}
            >
              <Text style={styles.countryPickerCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onConfirm={alert.onConfirm || handleAlertClose}
        onCancel={alert.onCancel}
        onSecondary={alert.onSecondary}
        showCancel={alert.showCancel}
        showSecondary={alert.showSecondary}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        secondaryText={alert.secondaryText}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    padding: 25,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: Platform.OS === 'web' ? 500 : 'auto', // Ограничиваем ширину для веб
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch', // Центрируем на веб
  },
  title: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
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
    // Убираем width, чтобы поле адаптировалось к контейнеру
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pickerOptionSelected: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  pickerOptionText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  dateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dateInputText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: '#000',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 300,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },

  registerButton: {
    backgroundColor: '#FF4444',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    letterSpacing: 8,
    color: '#fff',
  },
  emailHint: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
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
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  backButtonText: {
    color: '#FF4444',
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    textAlign: 'left',
    marginTop: 5,
    fontStyle: 'italic',
  },
  countryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  countryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  countryPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countryPickerModal: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  countryPickerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 15,
  },
  countrySearchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    width: '100%',
    marginBottom: 15,
  },
  countryList: {
    maxHeight: 300,
    width: '100%',
  },
  countryOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(255,68,68,0.2)',
  },
  countryOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  countryOptionTextSelected: {
    color: '#FF4444',
    fontFamily: 'Gilroy-Bold',
  },
  countryPickerCloseButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 15,
  },
  countryPickerCloseText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  photoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginTop: 8,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

}); 