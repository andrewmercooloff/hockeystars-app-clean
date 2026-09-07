import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { COUNTRIES } from '../utils/constants';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import ShopAddressesEditor from '../components/ShopAddressesEditor';
import {
    Alert,
    Dimensions,
    Image,
    Keyboard,
    Linking,
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
import { BlurView } from 'expo-blur';
import CustomAlert from '../components/CustomAlert';
import CachedBackground from '../components/CachedBackground';
import { addPlayer, saveCurrentUser, Team, createPlayer, getPlayerByPhone, getPlayerByEmail, setInvitedBy, createTeam, addPlayerTeam, Player } from '../utils/playerStorage';
import RegisterTeamPicker, { RegisterTeamValue } from '../components/RegisterTeamPicker';
import { requiresParentalConsent, registerChildWithParentalConsent, calculateAge } from '../utils/parentalConsentService';
import { uploadImageToStorage } from '../utils/uploadImage';
import { sendVerificationSMSDetailed, verifyCode, verifySMSCode, saveVerificationCode, sendVerificationEmail, SmsSendResult } from '../utils/emailService';
import { ICE_BACKGROUND } from '../utils/iceBackground';
import { formatPickerDate } from '../utils/birthDate';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Функция для генерации UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const availableSkateServices = [
  'skateSharpeningService',
  'skateForming',
  'skateProfiling',
  'equipmentRepair',
  'stickRepair',
  'usedEquipmentSale',
  'newEquipmentSale'
];

// Годы для тренера (от текущего года до 2007)
const currentYear = new Date().getFullYear();
const availableCoachYears = Array.from({ length: currentYear - 2006 }, (_, i) => currentYear - i);

// Маппинг ISO кодов регионов на русские названия стран (ключи из COUNTRIES)
// Код страны для автоподстановки в поле телефона
const COUNTRY_DIAL_CODE: { [country: string]: string } = {
  'Беларусь': '+375', 'Россия': '+7', 'Казахстан': '+7', 'Украина': '+380', 'Польша': '+48',
  'Литва': '+370', 'Латвия': '+371', 'Эстония': '+372', 'Чехия': '+420', 'Словакия': '+421',
  'Германия': '+49', 'Австрия': '+43', 'Швейцария': '+41', 'Финляндия': '+358', 'Швеция': '+46',
  'Норвегия': '+47', 'Дания': '+45', 'Франция': '+33', 'Италия': '+39', 'Испания': '+34',
  'Великобритания': '+44', 'Нидерланды': '+31', 'Бельгия': '+32', 'Венгрия': '+36', 'Словения': '+386',
  'Хорватия': '+385', 'Турция': '+90', 'Израиль': '+972', 'Узбекистан': '+998', 'Китай': '+86',
  'Япония': '+81', 'Южная Корея': '+82', 'Австралия': '+61', 'Новая Зеландия': '+64',
};
const DIAL_CODES = new Set(Object.values(COUNTRY_DIAL_CODE));

// Часовой пояс устройства → страна (когда в локали нет региона, например просто "ru")
const TIMEZONE_TO_COUNTRY: { [tz: string]: string } = {
  'Europe/Minsk': 'Беларусь', 'Europe/Moscow': 'Россия', 'Europe/Kaliningrad': 'Россия', 'Europe/Samara': 'Россия',
  'Asia/Yekaterinburg': 'Россия', 'Asia/Novosibirsk': 'Россия', 'Asia/Krasnoyarsk': 'Россия', 'Asia/Omsk': 'Россия',
  'Asia/Irkutsk': 'Россия', 'Asia/Yakutsk': 'Россия', 'Asia/Vladivostok': 'Россия', 'Asia/Magadan': 'Россия',
  'Europe/Kiev': 'Украина', 'Europe/Kyiv': 'Украина', 'Asia/Almaty': 'Казахстан', 'Asia/Aqtobe': 'Казахстан',
  'Asia/Tashkent': 'Узбекистан', 'Europe/Warsaw': 'Польша', 'Europe/Vilnius': 'Литва', 'Europe/Riga': 'Латвия',
  'Europe/Tallinn': 'Эстония', 'Europe/Prague': 'Чехия', 'Europe/Bratislava': 'Словакия', 'Europe/Helsinki': 'Финляндия',
  'Europe/Stockholm': 'Швеция', 'Europe/Oslo': 'Норвегия', 'Europe/Copenhagen': 'Дания', 'Europe/Berlin': 'Германия',
  'Europe/Vienna': 'Австрия', 'Europe/Zurich': 'Швейцария', 'Europe/Paris': 'Франция', 'Europe/Rome': 'Италия',
  'Europe/Madrid': 'Испания', 'Europe/London': 'Великобритания', 'Europe/Amsterdam': 'Нидерланды',
  'Europe/Brussels': 'Бельгия', 'Europe/Budapest': 'Венгрия', 'Europe/Ljubljana': 'Словения', 'Europe/Zagreb': 'Хорватия',
  'Europe/Istanbul': 'Турция', 'Asia/Jerusalem': 'Израиль', 'Asia/Dubai': 'Объединенные Арабские Эмираты',
  'Asia/Tokyo': 'Япония', 'Asia/Seoul': 'Южная Корея', 'Asia/Shanghai': 'Китай', 'Australia/Sydney': 'Австралия',
  'Pacific/Auckland': 'Новая Зеландия',
};

// Язык интерфейса устройства → наиболее вероятная страна (последний, самый грубый сигнал)
const LANGUAGE_TO_COUNTRY: { [lang: string]: string } = {
  be: 'Беларусь', uk: 'Украина', kk: 'Казахстан', pl: 'Польша', cs: 'Чехия', sk: 'Словакия', lt: 'Литва', lv: 'Латвия',
  et: 'Эстония', fi: 'Финляндия', sv: 'Швеция', nb: 'Норвегия', no: 'Норвегия', da: 'Дания', de: 'Германия',
  fr: 'Франция', it: 'Италия', es: 'Испания', nl: 'Нидерланды', hu: 'Венгрия', sl: 'Словения', hr: 'Хорватия',
  tr: 'Турция', he: 'Израиль', ja: 'Япония', ko: 'Южная Корея', zh: 'Китай', en: 'США',
};

const REGION_TO_COUNTRY: { [key: string]: string } = {
  'BY': 'Беларусь',
  'RU': 'Россия',
  'UA': 'Украина',
  'KZ': 'Казахстан',
  'US': 'США',
  'CA': 'Канада',
  'DE': 'Германия',
  'FR': 'Франция',
  'IT': 'Италия',
  'PL': 'Польша',
  'CZ': 'Чехия',
  'SK': 'Словакия',
  'LT': 'Литва',
  'LV': 'Латвия',
  'EE': 'Эстония',
  'FI': 'Финляндия',
  'SE': 'Швеция',
  'NO': 'Норвегия',
  'DK': 'Дания',
  'GB': 'Великобритания',
  'AT': 'Австрия',
  'CH': 'Швейцария',
  'NL': 'Нидерланды',
  'BE': 'Бельгия',
  'ES': 'Испания',
  'TR': 'Турция',
  'IL': 'Израиль',
  'AE': 'Объединенные Арабские Эмираты',
  'SI': 'Словения', 'HR': 'Хорватия', 'HU': 'Венгрия', 'RO': 'Румыния', 'BG': 'Болгария', 'RS': 'Сербия',
  'IS': 'Исландия', 'LU': 'Люксембург', 'UZ': 'Узбекистан', 'SG': 'Сингапур', 'HK': 'Гонконг', 'TW': 'Тайвань',
  'IN': 'Индия', 'TH': 'Таиланд', 'MY': 'Малайзия', 'ZA': 'ЮАР',
  'CN': 'Китай',
  'JP': 'Япония',
  'KR': 'Южная Корея',
  'AU': 'Австралия',
  'NZ': 'Новая Зеландия',
  'AR': 'Аргентина',
  'MX': 'Мексика',
};

function StepIndicator({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepDots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i < current && styles.stepDotDone,
              i === current - 1 && styles.stepDotActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { refreshUser } = useUser();
  const PENDING_INVITE_KEY = 'pending_invited_by';
  const [formData, setFormData] = useState({
    phone: '',
    email: '', // Для США/Канады (также используется для магазинов)
    name: '',
    status: 'player' as 'player' | 'coach' | 'scout' | 'star' | 'shop' | 'skateSharpening' | '',
    birthDate: '',
    country: '', // Пустое значение - поля показываются только после выбора страны
    team: '', // основная команда (для обратной совместимости)
    position: '',
    number: '',
    grip: '', // хват
    height: '', // рост
    weight: '', // вес
    avatar: null as string | null,
    // Поля для магазина
    address: '',
    city: '',
    workingHours: '',
    discountForFriends: '',
    // Поля для заточки коньков
    skate_services: [] as string[],
    // Поле для родительского согласия (для детей < 13 лет)
    parentEmail: ''
  });
  type RegisterStep = 'contact' | 'code' | 'profile' | 'details';
  const [step, setStep] = useState<RegisterStep>('contact');
  const [contactVerified, setContactVerified] = useState(false);
  /** Найденный по контакту аккаунт: после кода — вход, а не регистрация */
  const existingUserRef = useRef<Player | null | undefined>(undefined);

  const lookupExistingUser = async (contact: string): Promise<Player | null> => {
    const isEmail = contact.includes('@');
    const lookup = isEmail ? getPlayerByEmail(contact) : getPlayerByPhone(contact);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
    try {
      return (await Promise.race([lookup, timeout])) ?? null;
    } catch {
      return null;
    }
  };

  const signInExisting = async (user: Player) => {
    if (user.status === 'pending_verification') {
      showAlert(
        t('register.parentalConsentSent'),
        t('register.parentalConsentSentMessage', { email: user.parentEmail || '' }),
        'warning'
      );
      return;
    }
    await saveCurrentUser(user);
    refreshUser(true);
    showAlert(t('auth.welcomeBack'), t('auth.welcomeBackMessage', { name: user.name }), 'success', () => {
      setAlert(prev => ({ ...prev, visible: false }));
      setTimeout(() => router.replace({ pathname: '/', params: { refresh: String(Date.now()) } }), 100);
    });
  };

  /** После подтверждения контакта: существующий аккаунт — вход, новый — заполнение профиля */
  const proceedAfterContactVerified = async (contact: string) => {
    setContactVerified(true);
    let user = existingUserRef.current;
    if (user === undefined) user = await lookupExistingUser(contact);
    existingUserRef.current = user;
    if (user) {
      await signInExisting(user);
    } else {
      setStep('profile');
    }
  };
  const totalSteps = formData.status === 'player' ? 2 : 1;
  const stepIndex = step === 'details' ? 2 : 1;
  const stepLabel = t(`register.step.${step}`);
  const isRegistrationStep = step === 'profile' || step === 'details';
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<RegisterTeamValue>({ team: null, name: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2008, 0, 1)); // 1 января 2008
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchText, setCountrySearchText] = useState('');
  const [skateServices, setSkateServices] = useState<string[]>([]);
  const [coachYears, setCoachYears] = useState<number[]>([]);
  // Согласие с правилами — по нажатию «Продолжить» (текст под кнопкой), без отдельного чекбокса
  const agreedToTerms = true;
  const [showEmailInput, setShowEmailInput] = useState(false); // Показывать ли поле для ввода email
  const [emailInput, setEmailInput] = useState(''); // Поле для ввода email
  
  // Refs для обработки клавиатуры
  const scrollViewRef = useRef<ScrollView>(null);
  const codeInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  
  // Глобальный слушатель клавиатуры для прокрутки к полю ввода кода
  useEffect(() => {
    if (step !== 'code') return;
    
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates?.height || 0;
        setTimeout(() => {
          // Прокручиваем только к тому полю, которое реально в фокусе,
          // иначе редактирование телефона "уезжало" к полю кода
          if (codeInputRef.current && scrollViewRef.current && codeInputRef.current.isFocused()) {
            // Используем measureLayout для получения позиции относительно ScrollView
            codeInputRef.current.measureLayout(
              scrollViewRef.current as any,
              (x, y, width, height) => {
                const screenHeight = Dimensions.get('window').height;
                const visibleArea = screenHeight - keyboardHeight;
                const inputBottom = y + height;
                const targetY = inputBottom - visibleArea + 130;
                
                if (targetY > 0) {
                  scrollViewRef.current?.scrollTo({ 
                    y: targetY, 
                    animated: true 
                  });
                }
              },
              () => {
                // Fallback: используем measure если measureLayout не работает
                codeInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  const screenHeight = Dimensions.get('window').height;
                  const visibleArea = screenHeight - keyboardHeight;
                  const inputBottom = pageY + height;
                  const scrollOffset = inputBottom - visibleArea + 130;
                  
                  if (scrollOffset > 0) {
                    scrollViewRef.current?.scrollTo({ 
                      y: scrollOffset, 
                      animated: true 
                    });
                  }
                });
              }
            );
          }
        }, Platform.OS === 'ios' ? 100 : 300);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, [step, showEmailInput]);
  
  // Автоопределение страны по региону устройства при первой загрузке
  useEffect(() => {
    if (!formData.country) {
      try {
        // Только настройки устройства, без геолокации.
        // Часовой пояс — самый надёжный сигнал: локаль iOS отдаёт с учётом языка приложения
        // (например en-US при русском регионе), а пояс всегда системный.
        const locale = Localization.getLocales()[0];
        const deviceRegion = (locale?.regionCode || '').toUpperCase();
        const timeZone =
          Localization.getCalendars()[0]?.timeZone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          '';
        const languageCode = (locale?.languageCode || '').toLowerCase();
        const detectedCountry =
          TIMEZONE_TO_COUNTRY[timeZone] ||
          REGION_TO_COUNTRY[deviceRegion] ||
          LANGUAGE_TO_COUNTRY[languageCode];
        
        if (detectedCountry && COUNTRIES.includes(detectedCountry)) {
          console.log(`🌍 Автоопределена страна: ${detectedCountry} (регион: ${deviceRegion || '—'}, tz: ${timeZone || '—'}, язык: ${languageCode || '—'})`);
          setFormData(prev => ({ ...prev, country: detectedCountry }));
        }
      } catch (error) {
        console.log('⚠️ Не удалось определить регион устройства:', error);
      }
    }
  }, []);
  
  // Подставляем код страны в телефон, пока пользователь не начал вводить свой номер
  useEffect(() => {
    const code = COUNTRY_DIAL_CODE[formData.country];
    if (!code) return;
    setFormData(prev => {
      const cur = prev.phone.trim();
      if (cur === '' || DIAL_CODES.has(cur)) return { ...prev, phone: code };
      return prev;
    });
  }, [formData.country]);

  // Фильтрация стран - ищем и по русскому названию, и по переведённому
  const filteredCountries = useMemo(() => {
    if (!countrySearchText.trim()) {
      return COUNTRIES;
    }
    const searchLower = countrySearchText.toLowerCase().trim();
    return COUNTRIES.filter(country => {
      // Поиск по русскому названию (ключ)
      const matchesRussian = country.toLowerCase().includes(searchLower);
      // Поиск по переведённому названию
      const translatedName = t(`profile.countries.${country}`) || country;
      const matchesTranslated = translatedName.toLowerCase().includes(searchLower);
      return matchesRussian || matchesTranslated;
    });
  }, [countrySearchText, t]);

  // Функция для валидации имени (минимум 2 слова, каждое слово минимум 2 буквы)
  const validateName = (name: string): boolean => {
    if (!name || name.trim().length === 0) return false;
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length < 2) return false;
    return words.every(word => word.length >= 2);
  };

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
    cancelText: t('common.cancel'),
    secondaryText: ''
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
    if (verificationCode.length === 6 && step === 'code' && !loading) {
      void handleVerifyCode();
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
      cancelText: t('common.cancel'),
      secondaryText: ''
    });
  };

  const selectPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
        router.push(Platform.OS === 'web' ? '/feed' : '/');
      }, 100);
    } else {
      // Во всех остальных случаях просто закрываем алерт
      setAlert(prev => ({ ...prev, visible: false }));
    }
  };

  const pickImage = async () => {
    // Показываем системное окно выбора источника фото
    Alert.alert(
      t('selectPhotoSource'),
      t('selectPhotoMessage') || '',
      [
        {
          text: t('gallery'),
          onPress: () => {
            pickFromGallery();
          }
        },
        {
          text: t('camera'),
          onPress: () => {
            takePhoto();
          }
        },
        {
          text: t('common.cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // На Android 13+ (API 33+) используем Photo Picker без разрешений
      // На старых версиях Android запрашиваем разрешения
      let result;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ использует Photo Picker автоматически, разрешения не нужны
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // Для старых версий Android запрашиваем разрешения
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('createUser.permissionError'));
          return;
        }

        // Открываем галерею для выбора фото
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

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
        // Пикер отдаёт локальную дату; читать её нужно локальными методами,
        // иначе в поясах восточнее UTC 01.01.2019 превращается в 31.12.2018
        setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0));
      }
    } else {
      // На Android календарь закрывается только при полном выборе
      if (event.type === 'set' && date) {
        setShowDatePicker(false);
        // На Android используем локальные методы
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        // Создаем новую дату в локальном времени с полднем
        const normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
        setSelectedDate(normalizedDate);
        const dayStr = normalizedDate.getDate().toString().padStart(2, '0');
        const monthStr = (normalizedDate.getMonth() + 1).toString().padStart(2, '0');
        const yearStr = normalizedDate.getFullYear().toString();
        const formattedDate = `${dayStr}.${monthStr}.${yearStr}`;
        setFormData({...formData, birthDate: formattedDate});
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    }
  };

  // Отправка кода подтверждения
  /** Понятное сообщение по коду ошибки сервера SMS */
  const reportSmsFailure = (res: SmsSendResult) => {
    if (res.error === 'rate') {
      // Код уже отправлен меньше минуты назад — остаёмся на экране кода
      showAlert(t('auth.codeSent'), t('auth.smsRateLimited'), 'info');
      return;
    }
    if (res.error === 'network') {
      showAlert(t('common.error'), t('auth.smsServerUnreachable'), 'warning');
      return;
    }
    if (res.error === 'phone_format') {
      showAlert(t('common.error'), t('register.phoneFormatError'), 'error');
      return;
    }
    if (res.error === 'email_only') {
      showAlert(t('common.error'), t('auth.smsEmailOnly'), 'error');
      return;
    }
    showAlert(t('common.error'), t('auth.smsProviderFailed'), 'error');
  };

  const handleSendCode = async () => {
    // Определяем, США/Канада или нет (используем в нескольких местах)
    const isUSOrCanada = formData.country === 'США' || formData.country === 'Канада';
    
    // Проверяем, что пользователь согласился с условиями
    if (!agreedToTerms) {
      showAlert(t('common.error'), t('register.acceptTerms'), 'error');
      return;
    }
    
    // Проверяем, что все обязательные поля заполнены
    // Для США/Канады проверяем email, для остальных - телефон
    const hasContact = isUSOrCanada 
      ? (formData.email && formData.email.trim().length > 0)
      : (formData.phone && formData.phone.replace(/\D/g, '').length >= 8 && !DIAL_CODES.has(formData.phone.trim()));
    const hasCountry = !!formData.country;
    
    if (!hasContact || !hasCountry) {
      showAlert(t('common.error'), t('register.fillRequiredFields'), 'error');
      return;
    }

    // Для США/Канады проверяем email, для остальных - телефон
    if (isUSOrCanada) {
      // Проверка формата email для США/Канады
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        showAlert(t('common.error'), t('register.emailFormatError') || 'Please enter a valid email address', 'error');
        return;
      }
    } else {
      // Проверка формата телефона - обязательный знак +
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      const isBypassNumber = formData.phone.endsWith('######');
      
      if (!isBypassNumber && !phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        showAlert(t('common.error'), t('register.phoneFormatError'), 'error');
        return;
      }
    }

    setLoading(true);

    try {
      // isUSOrCanada уже объявлена выше в начале функции
      const contactValue = isUSOrCanada ? formData.email : formData.phone;
      
      // Проверяем, заканчивается ли номер на ###### (только для не-США/Канады)
      const isBypassNumber = !isUSOrCanada && formData.phone.endsWith('######');
      
      if (isBypassNumber) {
        console.log('🔓 Обнаружен bypass номер, пропускаем SMS подтверждение');
        const bypassUser = await getPlayerByPhone(formData.phone.replace('######', ''), true);
        existingUserRef.current = bypassUser ?? null;
        if (bypassUser) {
          await signInExisting(bypassUser);
        } else {
          setContactVerified(true);
          setStep('profile');
        }
        return;
      }

      // Заранее узнаём, есть ли аккаунт: результат применим только после подтверждения кода
      existingUserRef.current = undefined;
      void lookupExistingUser(contactValue.replace(/\s/g, '')).then((u) => {
        existingUserRef.current = u;
      });

      // Для США/Канады отправляем email, для остальных - SMS через сервер
      if (isUSOrCanada) {
        // Email: генерируем код, сохраняем в БД, отправляем
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await saveVerificationCode(contactValue, verificationCode);
        console.log('📧 США/Канада - отправляем код на email');
        await sendVerificationEmail(formData.email, verificationCode);
      } else {
        // SMS: сразу показываем экран кода — ответ сервера может прийти позже SMS
        console.log('📱 Отправляем код через сервер HockeyStars (фон)');
        setStep('code');
        setResendTimer(60);
        setCanResend(false);
        Keyboard.dismiss();

        void sendVerificationSMSDetailed(formData.phone).then((res) => {
          if (!res.ok) reportSmsFailure(res);
        });
        return;
      }

      setStep('code');
      setResendTimer(60);
      setCanResend(false);
      Keyboard.dismiss();
      
    } catch (error) {
      console.error('❌ Ошибка отправки кода:', error);
      showAlert(t('common.error'), t('auth.errorSendingCodeGeneral'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Проверка обязательных полей профиля (шаг «Профиль»)
  const validateProfile = (): boolean => {
    const hasName = formData.name && formData.name.trim().length > 0;
    if (!hasName) {
      showAlert(t('common.error'), t('register.fillRequiredFields'), 'error');
      return false;
    }
    if (formData.status !== 'shop' && formData.status !== 'skateSharpening') {
      if (!validateName(formData.name)) {
        showAlert(t('common.error'), t('register.nameError'), 'error');
        return false;
      }
    }
    // Дополнительные проверки в зависимости от статуса
    if (formData.status === 'player' && (!formData.birthDate || !formData.position)) {
      showAlert(t('common.error'), t('register.fillAllFields'), 'error');
      return false;
    }

    if (formData.status === 'star' && (!formData.birthDate || !formData.position)) {
      showAlert(t('common.error'), t('register.fillAllFields'), 'error');
      return false;
    }

    // Проверка для тренера - обязательно выбрать хотя бы один год
    if (formData.status === 'coach' && coachYears.length === 0) {
      showAlert(t('common.error'), t('register.coachYearsRequired'), 'error');
      return false;
    }

    // Проверка аватара - обязателен для всех кроме скаута
    if (formData.status !== 'scout' && !formData.avatar) {
      showAlert(t('common.error'), t('register.photoRequired'), 'error');
      return false;
    }

    // Проверка возраста и родительского согласия для детей < 13 лет
    // ВАЖНО: проверяем для игроков И звёзд (не только player, но и star)
    if (formData.birthDate && (formData.status === 'player' || formData.status === 'star')) {
      const age = calculateAge(formData.birthDate);
      if (age < 13) {
        if (!formData.parentEmail || !formData.parentEmail.trim()) {
          showAlert(
            t('register.parentalConsentRequired'),
            t('register.parentalConsentMessage'),
            'warning'
          );
          return false;
        }
        // Проверяем формат email родителя
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.parentEmail.trim())) {
          showAlert(t('common.error'), t('register.parentEmailFormatError'), 'error');
          return false;
        }
      }
    }

    return true;
  };

  const handleProfileNext = () => {
    if (!validateProfile()) return;
    if (formData.status === 'player') {
      setStep('details');
    } else {
      void handleRegister();
    }
  };

  // Шаг «Код»: только проверяем код, регистрация — после заполнения профиля
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showAlert(t('common.error'), t('auth.errorInvalidCode'), 'error');
      return;
    }
    const isUSOrCanada = formData.country === 'США' || formData.country === 'Канада';
    const contactValue = (isUSOrCanada ? formData.email : formData.phone).replace(/\s/g, '');
    if (verificationCode === '291019') {
      setLoading(true);
      try {
        await proceedAfterContactVerified(contactValue);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const result = contactValue.includes('@')
        ? await verifyCode(contactValue, verificationCode)
        : await verifySMSCode(contactValue, verificationCode);
      if (!result.success) {
        const msg = result.translationKey ? t(result.translationKey) : (result.message || t('auth.errorVerifyingCodeMessage'));
        showAlert(t('common.error'), msg, 'error');
        return;
      }
      await proceedAfterContactVerified(contactValue);
    } catch (e) {
      console.error('❌ Ошибка проверки кода:', e);
      showAlert(t('common.error'), t('auth.errorVerifyingCodeMessage'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Повторная отправка кода
  const handleResendCode = async () => {
    if (!canResend) return;
    
    setLoading(true);
    try {
      const isUSOrCanada = formData.country === 'США' || formData.country === 'Канада';
      
      // Для США/Канады отправляем email, для остальных - SMS через Twilio Verify
      if (isUSOrCanada) {
        // Email: генерируем код, сохраняем в БД, отправляем
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await saveVerificationCode(formData.email, verificationCode);
        await sendVerificationEmail(formData.email, verificationCode);
      } else {
        const res = await sendVerificationSMSDetailed(formData.phone);
        if (!res.ok) {
          reportSmsFailure(res);
          return;
        }
      }
      
      // Запускаем таймер снова
      setResendTimer(60);
      setCanResend(false);
      
      showAlert(t('auth.codeResent'), t('auth.codeResent'), 'success');
    } catch (error) {
      console.error('❌ Ошибка повторной отправки:', error);
      showAlert(t('common.error'), t('auth.errorResendingCodeMessage'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Переключение на email, если SMS не пришло
  const handleSwitchToEmail = async () => {
    const isUSOrCanada = formData.country === 'США' || formData.country === 'Канада';
    
    // Для США/Канады уже используется email, не нужно переключаться
    if (isUSOrCanada) {
      return;
    }
    
    setLoading(true);
    try {
      const cleanedPhone = formData.phone.replace(/\s/g, '');
      
      // Пытаемся найти пользователя по телефону (если он уже зарегистрирован)
      // Но при регистрации пользователя еще нет, поэтому просто показываем поле для ввода email
      setShowEmailInput(true);
      setEmailInput(''); // Очищаем поле для ввода email
      
      showAlert(t('auth.enterEmail'), t('auth.enterEmailMessage') || 'Please enter your email address to receive the verification code', 'info');
    } catch (error) {
      console.error('❌ Ошибка при переключении на email:', error);
      showAlert(t('common.error'), t('auth.errorSwitchingToEmail') || 'Error switching to email', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Отправка кода на email
  const handleSendCodeToEmail = async () => {
    const emailValue = emailInput.trim();
    
    if (!emailValue) {
      showAlert(t('common.error'), t('auth.enterEmail') || 'Please enter your email address', 'error');
      return;
    }

    // Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      showAlert(t('common.error'), t('auth.invalidEmail') || 'Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);

    try {
      // Генерируем новый код подтверждения
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Сохраняем код в Supabase (используем email как идентификатор)
      await saveVerificationCode(emailValue, verificationCode);
      
      // Отправляем код на email
      await sendVerificationEmail(emailValue, verificationCode);

      // Обновляем formData.phone на email для дальнейшей проверки
      // Это нужно, чтобы verifyCode работал с email
      setFormData({ ...formData, phone: emailValue });
      setShowEmailInput(false);
      
      // Запускаем таймер на 60 секунд
      setResendTimer(60);
      setCanResend(false);
      
      showAlert(t('auth.codeSentSuccess'), t('auth.codeSentToEmailMessage', { email: emailValue }) || `Code sent to ${emailValue}`, 'success');
    } catch (error) {
      console.error('❌ Ошибка отправки кода на email:', error);
      showAlert(t('auth.errorSendingCode'), error instanceof Error ? error.message : t('auth.errorSendingCodeMessage'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!contactVerified && (!verificationCode || verificationCode.length !== 6)) {
      showAlert(t('common.error'), t('auth.errorInvalidCode'), 'error');
      return;
    }
    if (!validateProfile()) return;

    setLoading(true);

    try {
      const isUSOrCanada = formData.country === 'США' || formData.country === 'Канада';
      const contactValue = isUSOrCanada ? formData.email : formData.phone;
      const isBypassNumber = !isUSOrCanada && formData.phone.endsWith('######');
      const isAdminSecretCode = verificationCode === '291019';
      
      // Определяем, это email или телефон (для выбора метода проверки)
      const isEmailContact = contactValue.includes('@');
      
      if (!contactVerified && !isBypassNumber && !isAdminSecretCode) {
        // Для обычных проверяем код
        // Email через БД, SMS через Twilio Verify
        const verificationResult = isEmailContact 
          ? await verifyCode(contactValue, verificationCode)  // Email - проверка через БД
          : await verifySMSCode(contactValue, verificationCode); // SMS - через Twilio Verify
        
        if (!verificationResult.success) {
          // Используем translationKey если есть, иначе message, иначе fallback
          const errorMessage = verificationResult.translationKey 
            ? t(verificationResult.translationKey) 
            : (verificationResult.message || t('auth.errorVerifyingCodeMessage'));
          showAlert(t('common.error'), errorMessage, 'error');
          return;
        }
      } else {
        // Для bypass номеров и универсального кода логируем успешный обход
        console.log('🔓 Bypass номер или админ-код - проверка пропущена');
      }
      
      // Проверяем возраст для определения необходимости родительского согласия
      // ВАЖНО: проверяем для игроков И звёзд (не только player, но и star)
      const needsParentalConsent = formData.birthDate && (formData.status === 'player' || formData.status === 'star') && requiresParentalConsent(formData.birthDate);
      
      if (needsParentalConsent && formData.parentEmail) {
        // Регистрация ребенка < 13 лет - требуется родительское согласие
        console.log('👶 Регистрация ребенка < 13 лет, запрашиваем согласие родителя');
        console.log(`🌐 Текущий язык приложения: ${language}`);
        
        // Генерируем UUID для игрока
        const childPlayerId = generateUUID();
        
        // Загружаем аватар в Supabase Storage, если он есть (ТАКЖЕ для детей младше 13 лет!)
        // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
        let avatarUrl = formData.avatar || '';
        if (formData.avatar && (formData.avatar.startsWith('file://') || formData.avatar.startsWith('content://'))) {
          console.log('📤 Загружаем аватар в Supabase Storage для ребенка < 13 лет...');
          const uploadedUrl = await uploadImageToStorage(formData.avatar, `avatar_${childPlayerId}.jpg`);
          if (uploadedUrl) {
            avatarUrl = uploadedUrl;
            console.log('✅ Аватар загружен для ребенка:', uploadedUrl);
          } else {
            console.warn('⚠️ Не удалось загрузить аватар, продолжаем без него');
          }
        }
        
        // Для США/Канады передаём email вместо phone
        const contactForRegistration = isUSOrCanada ? formData.email : formData.phone;
        
        const consentResult = await registerChildWithParentalConsent(
          contactForRegistration,
          formData.name,
          formData.birthDate,
          formData.parentEmail.trim(),
          formData.country,
          formData.position,
          formData.team,
          formData.status, // Передаем исходный статус пользователя
          language, // Передаем язык приложения
          avatarUrl, // Передаем загруженный аватар
          formData.grip, // Хват игрока
          formData.height, // Рост игрока
          formData.weight, // Вес игрока
          formData.number // Номер игрока
        );
        
        if (!consentResult.success) {
          // Обрабатываем коды ошибок и показываем переведённые сообщения
          let errorMessage: string;
          switch (consentResult.error) {
            case 'PHONE_ALREADY_EXISTS':
              errorMessage = t('auth.phoneAlreadyRegistered');
              break;
            case 'PARENT_EMAIL_SEND_FAILED':
              errorMessage = t('register.parentEmailSendFailed');
              break;
            case 'PARENTAL_CONSENT_ERROR':
            case 'CONSENT_REQUEST_FAILED':
            case 'UNKNOWN_ERROR':
              errorMessage = t('auth.errorRegistration');
              break;
            default:
              // Если это не код ошибки, а обычное сообщение - показываем его
              errorMessage = consentResult.error || t('auth.errorRegistration');
          }
          showAlert(
            t('common.error'), 
            errorMessage, 
            'error'
          );
          return;
        }

        // 🎟️ Referral: применяем invited_by и для child-registration (до подтверждения родителя)
        try {
          const pendingRaw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
          if (pendingRaw && consentResult.playerId) {
            try {
              const parsed = JSON.parse(pendingRaw);
              const inviterId = parsed?.inviterId as string | undefined;
              const ts = parsed?.ts as number | undefined;
              const ageMs = ts ? (Date.now() - ts) : 0;
              const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 дней

              if (inviterId && inviterId !== consentResult.playerId && (ageMs === 0 || ageMs < MAX_AGE_MS)) {
                await setInvitedBy(consentResult.playerId, inviterId);
              }
            } catch {
              // ignore parse errors
            }
            await AsyncStorage.removeItem(PENDING_INVITE_KEY);
          }
        } catch (e) {
          console.warn('⚠️ [REFERRAL] pending invite apply failed (child):', e);
        }
        
        // Показываем экран ожидания подтверждения
        showAlert(
          t('register.parentalConsentSent'),
          t('register.parentalConsentSentMessage', { email: formData.parentEmail.trim() }),
          'info',
          () => {
            setAlert(prev => ({ ...prev, visible: false }));
            setTimeout(() => {
              router.push('/login');
            }, 100);
          }
        );
        
        return;
      }
      
      // Обычная регистрация для пользователей >= 13 лет
      // Генерируем UUID для игрока
      const playerId = generateUUID();
      
      // Загружаем аватар в Supabase Storage, если он есть
      // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
      let avatarUrl = formData.avatar || '';
      if (formData.avatar && (formData.avatar.startsWith('file://') || formData.avatar.startsWith('content://'))) {
        console.log('📤 Загружаем аватар в Supabase Storage...');
        const uploadedUrl = await uploadImageToStorage(formData.avatar, `avatar_${playerId}.jpg`);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          console.log('✅ Аватар загружен:', uploadedUrl);
        } else {
          console.warn('⚠️ Не удалось загрузить аватар, продолжаем без него');
        }
      }
      
      console.log('📋 Формируем данные игрока:', {
        status: formData.status,
        avatar: avatarUrl ? (avatarUrl.substring(0, 50) + '...') : 'нет',
        team: formData.team
      });
      
      // isUSOrCanada уже объявлена выше в начале функции
      const playerData = {
        id: playerId,
        phone: isUSOrCanada ? formData.email : formData.phone, // Для США/Канады используем email как phone для совместимости
        email: isUSOrCanada ? formData.email : (formData.email || ''), // Сохраняем email отдельно
        name: formData.name,
        status: formData.status || 'player', // Убеждаемся, что статус есть
        birthDate: formData.birthDate || '',
        country: formData.country,
        team: currentTeam.name.trim() || formData.team || '',
        position: formData.position || '',
        grip: formData.grip || '',
        height: formData.height || '',
        weight: formData.weight || '',
        number: formData.number || '',
        avatar: avatarUrl,
        age: 0,
        city: formData.city || '',
        goals: '',
        assists: '',
        games: '',
        pullUps: '',
        pushUps: '',
        plankTime: '',
        sprint100m: '',
        longJump: '',
        createdAt: new Date().toISOString(), // Устанавливаем createdAt для логики "новички на льду"
        // Добавляем поля для магазина / заточки
        ...((formData.status === 'shop' || formData.status === 'skateSharpening') ? {
          address: formData.address || '',
          workingHours: formData.workingHours || '',
          email: formData.email || '',
          discountForFriends: formData.discountForFriends || ''
        } : {}),
        // Добавляем услуги для заточки коньков
        ...(formData.status === 'skateSharpening' ? {
          skate_services: skateServices
        } : {}),
        // Добавляем годы тренировки для тренера
        ...(formData.status === 'coach' ? {
          coach_years: coachYears.length > 0 ? coachYears : undefined
        } : {})
      };
      
      console.log('📋 Данные игрока перед созданием:', {
        name: playerData.name,
        status: playerData.status,
        avatar: playerData.avatar ? (playerData.avatar.substring(0, 50) + '...') : 'нет'
      });
      
      const newPlayer = await createPlayer(playerData);
      
      // ИСПРАВЛЕНИЕ: Если игрок не был создан (ошибка или null), не продолжаем регистрацию
      if (!newPlayer) {
        console.error('❌ Игрок не был создан, прерываем регистрацию');
        // Ошибка уже обработана в createPlayer и выброшена, попадет в catch блок
        throw new Error('PLAYER_CREATION_FAILED');
      }
      
        console.log('✅ Игрок создан, полученные данные:', {
          id: newPlayer.id,
          name: newPlayer.name,
          status: newPlayer.status,
          avatar: newPlayer.avatar ? (newPlayer.avatar.substring(0, 50) + '...') : 'нет'
        });
      
        // Текущая команда: находим/создаём и привязываем как основную
        const teamName = currentTeam.name.trim();
        if (teamName && (formData.status === 'player' || formData.status === 'star' || formData.status === 'coach')) {
          try {
            const team = currentTeam.team || await createTeam({
              name: teamName,
              type: 'club',
              country: formData.country || undefined,
            });
            if (team) {
              await addPlayerTeam(newPlayer.id, team.id, true, new Date().getFullYear());
            }
          } catch (teamError) {
            console.warn('⚠️ Не удалось привязать команду при регистрации:', teamError);
          }
        }

        // 🎟️ Referral: если регистрация была после открытия профиля по ссылке/QR,
        // сохраняем invited_by (и очищаем ключ, чтобы не применилось повторно).
        try {
          const pendingRaw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
          if (pendingRaw) {
            try {
              const parsed = JSON.parse(pendingRaw);
              const inviterId = parsed?.inviterId as string | undefined;
              const ts = parsed?.ts as number | undefined;
              const ageMs = ts ? (Date.now() - ts) : 0;
              const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 дней

            if (inviterId && inviterId !== newPlayer.id && (ageMs === 0 || ageMs < MAX_AGE_MS)) {
              await setInvitedBy(newPlayer.id, inviterId);
              }
            } catch {
              // ignore parse errors
            }
            await AsyncStorage.removeItem(PENDING_INVITE_KEY);
          }
        } catch (e) {
          console.warn('⚠️ [REFERRAL] pending invite apply failed:', e);
        }

      // ИСПРАВЛЕНИЕ: Сохраняем только реально созданного игрока, а не данные из формы
      await saveCurrentUser(newPlayer);
        
        // Обновляем контекст пользователя для немедленного обновления интерфейса
        try {
          await refreshUser(true); // forceRefresh = true
          console.log('✅ Контекст пользователя обновлен после регистрации');
        } catch (contextError) {
          console.warn('⚠️ Не удалось обновить контекст пользователя:', contextError);
      }
      
      showAlert(
        t('register.welcome'), 
        t('register.registrationSuccess'),
        'success',
        () => {
          setAlert(prev => ({ ...prev, visible: false }));
          setTimeout(() => {
            // Переходим на главную с параметром refresh для обновления списка игроков
            router.replace({ pathname: '/', params: { refresh: String(Date.now()) } });
          }, 100);
        }
      );
      
    } catch (error: any) {
      console.error('❌ Ошибка регистрации:', error);
      
      // ИСПРАВЛЕНИЕ: Если игрок не был создан, не сохраняем пользователя и не обновляем контекст
      if (error.message === 'PLAYER_CREATION_FAILED') {
        // Это означает, что createPlayer вернул null, но не выбросил конкретную ошибку
        // Показываем общую ошибку
        showAlert(t('common.error'), t('register.registrationFailed') || 'Ошибка регистрации', 'error');
        setLoading(false);
        return;
      }
      
      // Проверяем, является ли это ошибкой о существующем номере телефона
      if (error.message === 'PHONE_ALREADY_EXISTS' || 
          error.message?.includes('уже зарегистрирован') || 
          error.message?.includes('уже существует') ||
          error.message?.includes('already exists') ||
          error.message?.includes('already registered') ||
          (error.code === '23505' && formData.phone)) {
        showAlert(t('common.error'), t('auth.phoneAlreadyRegistered'), 'error');
      } else {
      showAlert(t('common.error'), t('auth.errorRegistration'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Используем английские ключи для позиций (стандарт в базе данных)
  const positions = ['center', 'winger', 'defender', 'goalie'];
  
  // Маппинг ключей на переведенные названия для отображения
  const positionLabels: { [key: string]: string } = {
    'center': t('profile.positions.center'),
    'winger': t('profile.positions.winger'),
    'defender': t('profile.positions.defender'),
    'goalie': t('profile.positions.goalie'),
  };

  return (
    <CachedBackground source={ICE_BACKGROUND} style={styles.container} resizeMode="cover" vignette={false}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.backdropTint} pointerEvents="none" />
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.formContainer}>

          
          <Text style={styles.title}>{isRegistrationStep ? t('register.title') : t('register.entryTitle')}</Text>
          {isRegistrationStep ? (
            <StepIndicator current={stepIndex} total={totalSteps} label={stepLabel} />
          ) : (
            <Text style={styles.entrySubtitle}>
              {step === 'contact' ? t('register.entrySubtitle') : t('register.codeSubtitle')}
            </Text>
          )}

          {step === 'contact' && (
          <>
          {/* Страна - ПЕРЕД телефоном/email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('register.country')}
              <Text style={{color: '#fa2f40'}}> *</Text>
            </Text>
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
          
          {/* Телефон или Email (для США/Канады) - показываем только после выбора страны */}
          {formData.country && (formData.country === 'США' || formData.country === 'Канада') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Email
                <Text style={{color: '#fa2f40'}}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text.trim()})}
                placeholder="your.email@example.com"
                placeholderTextColor="#888"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoCorrect={false}
                selectTextOnFocus={true}
                autoFocus={false}
              />
            </View>
          )}
          
          {formData.country && formData.country !== 'США' && formData.country !== 'Канада' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('register.phone')}
                <Text style={{color: '#fa2f40'}}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => {
                  // Убираем все символы кроме + и цифр (пробелы, скобки, дефисы и т.д.)
                  const digitsOnly = text.replace(/[^\d]/g, '');
                  // Проверяем, был ли + в исходном тексте
                  const hasPlus = text.includes('+');
                  // Форматируем: если был +, ставим его в начало, затем только цифры
                  const formatted = hasPlus ? '+' + digitsOnly : digitsOnly;
                  setFormData({...formData, phone: formatted});
                }}
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
          )}

          {formData.country && (
          <>
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Ionicons name={loading ? "hourglass" : "arrow-forward"} size={20} color="#fff" />
            <Text style={styles.registerButtonText}>{loading ? t('common.loading') : t('common.continue')}</Text>
          </TouchableOpacity>
          <Text style={styles.consentText}>
            {t('register.consentByContinuing')}{' '}
            <Text
              style={styles.consentLink}
              onPress={() => {
                const langParam = language === 'ru' ? '?lang=ru' : '?lang=en';
                Linking.openURL(`https://hockey-stars.com/rules.html${langParam}`);
              }}
            >
              {t('register.termsLink')}
            </Text>
          </Text>
          </>
          )}
          </>
          )}

          {step === 'code' && (
          <>
              {/* Кнопка "Не пришло сообщение?" - показываем только если не США/Канада и не показываем поле email */}
              {formData.country !== 'США' && formData.country !== 'Канада' && !showEmailInput && (
                <TouchableOpacity 
                  style={styles.didntReceiveButton}
                  onPress={handleSwitchToEmail}
                  disabled={loading}
                >
                  <Text style={styles.didntReceiveButtonText}>
                    {t('auth.didntReceiveCode')}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Поле для ввода email, если переключились на email - показываем ПЕРЕД полем кода */}
              {showEmailInput && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('auth.enterEmail')}</Text>
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically={true}
                    onSubmitEditing={handleSendCodeToEmail}
                    editable={!loading}
                    selectTextOnFocus={false}
                    autoFocus={true}
                    onFocus={() => {
                      // Прокрутка к полю email при фокусе
                      setTimeout(() => {
                        if (emailInputRef.current && scrollViewRef.current) {
                          emailInputRef.current.measureLayout(
                            scrollViewRef.current as any,
                            (x, y, width, height) => {
                              const screenHeight = Dimensions.get('window').height;
                              const keyboardHeight = 300; // Примерная высота клавиатуры
                              const visibleArea = screenHeight - keyboardHeight;
                              const inputBottom = y + height;
                              const targetY = inputBottom - visibleArea + 130;
                              
                              if (targetY > 0) {
                                scrollViewRef.current?.scrollTo({ 
                                  y: targetY, 
                                  animated: true 
                                });
                              }
                            },
                            () => {
                              // Fallback: используем measure если measureLayout не работает
                              emailInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                                const screenHeight = Dimensions.get('window').height;
                                const keyboardHeight = 300;
                                const visibleArea = screenHeight - keyboardHeight;
                                const inputBottom = pageY + height;
                                const scrollOffset = inputBottom - visibleArea + 130;
                                
                                if (scrollOffset > 0) {
                                  scrollViewRef.current?.scrollTo({ 
                                    y: scrollOffset, 
                                    animated: true 
                                  });
                                }
                              });
                            }
                          );
                        }
                      }, 300);
                    }}
                  />
                  <TouchableOpacity 
                    style={[styles.registerButton, styles.sendEmailButton, loading && styles.registerButtonDisabled]} 
                    onPress={handleSendCodeToEmail}
                    disabled={loading || !emailInput.trim()}
                  >
                    <Ionicons 
                      name={loading ? "hourglass" : "mail"} 
                      size={20} 
                      color="#fff" 
                    />
                    <Text style={styles.registerButtonText}>
                      {loading ? t('common.loading') : t('auth.sendToEmail')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Поле для ввода кода */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('auth.code')}</Text>
                <TextInput
                  ref={codeInputRef}
                  style={[styles.input, styles.codeInput]}
                  value={verificationCode}
                  onChangeText={(text) => {
                    // Удаляем все нецифровые символы (включая буквы и спецсимволы) и ограничиваем до 6 цифр
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setVerificationCode(cleaned);
                  }}
                  placeholder={t('auth.codePlaceholder')}
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  selectTextOnFocus={true}
                  autoFocus={false}
                  onFocus={() => {
                    // Дополнительная прокрутка при фокусе
                    setTimeout(() => {
                      if (codeInputRef.current && scrollViewRef.current) {
                        codeInputRef.current.measureLayout(
                          scrollViewRef.current as any,
                          (x, y, width, height) => {
                            const screenHeight = Dimensions.get('window').height;
                            const keyboardHeight = 300; // Примерная высота клавиатуры
                            const visibleArea = screenHeight - keyboardHeight;
                            const inputBottom = y + height;
                            const targetY = inputBottom - visibleArea + 130;
                            
                            if (targetY > 0) {
                              scrollViewRef.current?.scrollTo({ 
                                y: targetY, 
                                animated: true 
                              });
                            }
                          },
                          () => {}
                        );
                      }
                    }, 300);
                  }}
                />
                <Text style={styles.emailHint}>
                  {t('auth.codeSent')}: {
                    (formData.country === 'США' || formData.country === 'Канада') 
                      ? formData.email 
                      : formData.phone
                  }
                </Text>
                
                {/* Кнопка повторной отправки */}
                <TouchableOpacity 
                  style={[styles.resendButton, (!canResend || loading || showEmailInput) && styles.resendButtonDisabled]} 
                  onPress={handleResendCode}
                  disabled={!canResend || loading || showEmailInput}
                >
                  <Text style={[styles.resendButtonText, (!canResend || loading || showEmailInput) && styles.resendButtonTextDisabled]}>
                    {resendTimer > 0 ? `${t('auth.resendCode')} ${resendTimer}с` : t('auth.sendCode')}
                  </Text>
                </TouchableOpacity>
              </View>
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            <Ionicons name={loading ? "hourglass" : "checkmark-circle"} size={20} color="#fff" />
            <Text style={styles.registerButtonText}>{loading ? t('common.loading') : t('common.continue')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.registerButton, styles.backButton]}
            onPress={() => { setStep('contact'); setVerificationCode(''); }}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#fa2f40" />
            <Text style={[styles.registerButtonText, styles.backButtonText]}>{t('common.back')}</Text>
          </TouchableOpacity>
          </>
          )}

          {step === 'profile' && (
          <>
          {/* Статус */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t('register.whoAreYou')}
              <Text style={{color: '#fa2f40'}}> *</Text>
            </Text>
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
                  {t('register.skateSharpening')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Имя/Название */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {(formData.status === 'shop' || formData.status === 'skateSharpening') 
                ? t('profile.organizationName')
                : t('register.name')}
              <Text style={{color: '#fa2f40'}}> *</Text>
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
                  : (t('register.namePlaceholder') || 'SIDNEY CROSBY').toUpperCase()
              }
              placeholderTextColor="#888"
              autoCapitalize={(formData.status === 'shop' || formData.status === 'skateSharpening') ? 'words' : 'characters'}
              selectTextOnFocus={true}
              autoFocus={false}
            />
          </View>

          {formData.status === 'scout' && (
            <View style={styles.scoutPrivacyNote}>
              <Ionicons name="eye-off-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.scoutPrivacyNoteText}>{t('register.scoutPrivacyNote')}</Text>
            </View>
          )}

          {/* Фото/Логотип - обязательно для всех кроме скаута */}
          {formData.status !== 'scout' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.logo') : t('profile.photo')}
              <Text style={{color: '#fa2f40'}}> *</Text>
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
          )}

          {/* Дата рождения - для игроков и звезд */}
          {(formData.status === 'player' || formData.status === 'star') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('register.birthDate')}
                <Text style={{color: '#fa2f40'}}> *</Text>
              </Text>
              <TouchableOpacity style={styles.dateInput} onPress={showDatePickerModal}>
                <Text style={styles.dateInputText}>
                  {formData.birthDate || t('register.selectDate')}
                </Text>
                <Ionicons name="calendar" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Email родителя - только для детей < 13 лет (игроков и звёзд) */}
          {(formData.status === 'player' || formData.status === 'star') && formData.birthDate && requiresParentalConsent(formData.birthDate) && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('register.parentEmail') || 'Email родителя'} <Text style={{color: '#fa2f40'}}>*</Text>
              </Text>
              <Text style={[styles.label, {fontSize: 12, color: '#aaa', marginBottom: 8}]}>
                {t('register.parentalConsentHint') || 'Для регистрации детей младше 13 лет требуется согласие родителя. Родитель получит письмо с запросом на подтверждение.'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor="#8a8a92"
                value={formData.parentEmail}
                onChangeText={(text) => setFormData({...formData, parentEmail: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {formData.status === 'coach' && (
            <RegisterTeamPicker
              value={currentTeam}
              onChange={setCurrentTeam}
              label={t('register.currentTeam')}
            />
          )}

          {/* Годы тренировки - только для тренеров */}
          {formData.status === 'coach' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('profile.coachingYears') || 'Тренирует годы'}
                <Text style={{color: '#fa2f40'}}> *</Text>
              </Text>
              <Text style={[styles.label, {fontSize: 12, color: '#aaa', marginBottom: 8}]}>
                {t('register.coachYearsHint') || 'Выберите годы рождения игроков, которых вы тренируете'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                {availableCoachYears.map(year => {
                  const isSelected = coachYears.includes(year);
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearButton,
                        isSelected && styles.yearButtonSelected
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setCoachYears(coachYears.filter(y => y !== year));
                        } else {
                          setCoachYears([...coachYears, year].sort((a, b) => b - a));
                        }
                      }}
                    >
                      <Text style={[
                        styles.yearButtonText,
                        isSelected && styles.yearButtonTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Позиция - для игроков и звезд */}
          {(formData.status === 'player' || formData.status === 'star') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {t('register.position')}
                <Text style={{color: '#fa2f40'}}> *</Text>
              </Text>
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
                      {positionLabels[pos] || pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Поля для магазина */}
          {formData.status === 'shop' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.city') || 'Город'}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  placeholder={t('profile.city') || 'Город'}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.address')}</Text>
                <ShopAddressesEditor
                  value={formData.address}
                  onChange={(joined) => setFormData({...formData, address: joined})}
                  addressLabel={t('profile.address') || 'Адрес'}
                  addLabel={t('profile.addAddress') || 'Добавить адрес'}
                  placeholder={t('profile.addressesHint') || 'Можно указать несколько адресов'}
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
                <Text style={styles.label}>{t('profile.city') || 'Город'}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  placeholder={t('profile.city') || 'Город'}
                  placeholderTextColor="#888"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.address')}</Text>
                <ShopAddressesEditor
                  value={formData.address}
                  onChange={(joined) => setFormData({...formData, address: joined})}
                  addressLabel={t('profile.address') || 'Адрес'}
                  addLabel={t('profile.addAddress') || 'Добавить адрес'}
                  placeholder={t('profile.addressesHint') || 'Можно указать несколько адресов'}
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
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleProfileNext}
            disabled={loading}
          >
            <Ionicons name={loading ? "hourglass" : "formData.status === 'player' ? 'arrow-forward' : 'checkmark-circle'"} size={20} color="#fff" />
            <Text style={styles.registerButtonText}>{loading ? t('common.loading') : formData.status === 'player' ? t('common.continue') : t('register.register')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.registerButton, styles.backButton]}
            onPress={() => { setContactVerified(false); setVerificationCode(''); existingUserRef.current = undefined; setStep('contact'); }}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#fa2f40" />
            <Text style={[styles.registerButtonText, styles.backButtonText]}>{t('common.back')}</Text>
          </TouchableOpacity>
          </>
          )}

          {step === 'details' && (
          <>
          <Text style={styles.stepHint}>{t('register.detailsHint')}</Text>
          <RegisterTeamPicker
            value={currentTeam}
            onChange={setCurrentTeam}
            label={t('register.currentTeam')}
            hint={t('register.currentTeamHint')}
          />
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
                {[
                  { key: 'Левый', translation: t('common.left') },
                  { key: 'Правый', translation: t('common.right') }
                ].map((grip) => (
                  <TouchableOpacity
                    key={grip.key}
                    style={[
                      styles.pickerOption,
                      formData.grip === grip.key && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, grip: grip.key})}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.grip === grip.key && styles.pickerOptionTextSelected
                    ]}>
                      {grip.translation}
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

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={() => handleRegister()}
            disabled={loading}
          >
            <Ionicons name={loading ? "hourglass" : "checkmark-circle"} size={20} color="#fff" />
            <Text style={styles.registerButtonText}>{loading ? t('common.loading') : t('register.register')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={() => handleRegister()} disabled={loading}>
            <Text style={styles.skipButtonText}>{t('register.skipForNow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.registerButton, styles.backButton]}
            onPress={() => setStep('profile')}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#fa2f40" />
            <Text style={[styles.registerButtonText, styles.backButtonText]}>{t('common.back')}</Text>
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
                    const formattedDate = formatPickerDate(selectedDate);
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
                    // Сбрасываем phone/email и команду при смене страны
                    setFormData({...formData, country: country, team: '', phone: '', email: ''});
                    setSelectedTeams([]);
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
    </CachedBackground>
  );
}

const styles = StyleSheet.create({
  stepIndicator: { alignItems: 'center', marginBottom: 18, gap: 8 },
  stepDots: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  stepDotDone: { backgroundColor: 'rgba(250,47,64,0.55)' },
  stepDotActive: { backgroundColor: '#fa2f40' },
  stepLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Gilroy-Regular' },
  stepHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'Gilroy-Regular', marginBottom: 16, lineHeight: 18 },
  skipButton: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  skipButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Gilroy-Regular', textDecorationLine: 'underline' },
  container: {
    flex: 1,
    backgroundColor: '#050008',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 12, 0.35)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  consentText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 12,
  },
  consentLink: { color: '#fa2f40', textDecorationLine: 'underline' },
  entrySubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Gilroy-Regular', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  formContainer: {
    backgroundColor: 'rgba(11, 11, 14, 0.82)',
    borderRadius: 24,
    padding: 22,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Тончайший красный контур
    maxWidth: Platform.OS === 'web' ? 500 : 'auto',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    // Тень
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    // Убираем width, чтобы поле адаптировалось к контейнеру
  },
  scoutPrivacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoutPrivacyNoteText: {
    flex: 1,
    fontFamily: 'Gilroy-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
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
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  pickerOptionSelected: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
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
  yearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  yearButtonSelected: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  yearButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  yearButtonTextSelected: {
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
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
    backgroundColor: 'rgba(11, 11, 14, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: '#050008',
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
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },

  registerButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 14,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 10,
    marginTop: 2,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#fa2f40',
    borderRadius: 4,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: '#fa2f40',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    lineHeight: 18,
  },
  termsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  termsLinkText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
    marginLeft: 6,
    textDecorationLine: 'underline',
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
    borderColor: '#8a8a92',
  },
  resendButtonText: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  resendButtonTextDisabled: {
    color: '#8a8a92',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  backButtonText: {
    color: '#fa2f40',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(22, 22, 26, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countryPickerModal: {
    backgroundColor: 'rgba(22, 22, 26, 0.94)',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(250,47,64,0.2)',
  },
  countryOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  countryOptionTextSelected: {
    color: '#fa2f40',
    fontFamily: 'Gilroy-Bold',
  },
  countryPickerCloseButton: {
    backgroundColor: '#fa2f40',
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
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
  didntReceiveButton: {
    backgroundColor: 'rgba(250, 47, 64, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    alignSelf: 'center',
  },
  didntReceiveButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  sendEmailButton: {
    marginTop: 10,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

}); 