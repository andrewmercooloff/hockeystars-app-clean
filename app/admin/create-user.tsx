import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ImageBackground, 
  ScrollView, 
  TouchableWithoutFeedback, 
  Keyboard,
  Alert,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Player, createPlayerManually, loadCurrentUser } from '../../utils/playerStorage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { COUNTRIES, GRIPS, POSITIONS } from '../../utils/constants';
import { useLanguage } from '../../contexts/LanguageContext';

const iceBg = require('../../assets/images/led.jpg');

const availableSkateServices = [
  'skateSharpeningService',
  'skateForming',
  'skateProfiling',
  'equipmentRepair',
  'stickRepair',
  'usedEquipmentSale',
  'newEquipmentSale'
];

export default function CreateUserScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [formData, setFormData] = useState<Partial<Player>>({
    phone: '',
    name: '',
    status: 'player',
    birthDate: '',
    country: 'Беларусь',
    position: '',
    number: '',
    grip: '',
    height: '',
    weight: '',
    avatar: null,
    // Поля для магазина
    address: '',
    workingHours: '',
    email: '',
    discountForFriends: '',
    // Поля для заточки коньков
    skate_services: []
  });

  const [selectedDate, setSelectedDate] = useState(new Date(2008, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchText, setCountrySearchText] = useState('');
  const [skateServices, setSkateServices] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentUser().then(setCurrentUser);
  }, []);

  const filteredCountries = COUNTRIES.filter(country =>
    country.toLowerCase().includes(countrySearchText.toLowerCase())
  );

  const pickImage = async () => {
    Alert.alert(
      t('createUser.selectPhotoSource'),
      t('createUser.selectPhotoMessage'),
      [
        {
          text: t('createUser.gallery'),
          onPress: () => {
            pickFromGallery();
          }
        },
        {
          text: t('createUser.camera'),
          onPress: () => {
            takePhoto();
          }
        },
        {
          text: t('createUser.cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('createUser.error'), t('createUser.permissionError'));
        return;
      }

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
      Alert.alert(t('createUser.error'), t('createUser.errorLoadingPhoto'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('createUser.error'), t('createUser.permissionErrorCamera'));
        return;
      }

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
      Alert.alert(t('createUser.error'), t('createUser.errorTakingPhoto'));
    }
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

  const handleCreateUser = async () => {
    // Проверяем, что текущий пользователь загружен
    if (!currentUser) {
      Alert.alert(t('createUser.error'), 'Пользователь не загружен. Попробуйте еще раз.');
      return;
    }

    // Проверяем обязательные поля
    if (!formData.name || !formData.phone || !formData.status || !formData.country) {
      Alert.alert(t('createUser.error'), t('createUser.fillRequiredFields'));
      return;
    }

    // Проверка формата телефона
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      Alert.alert(t('createUser.error'), t('createUser.enterValidPhone'));
      return;
    }

    // Дополнительные проверки в зависимости от статуса
    if ((formData.status === 'player' || formData.status === 'star') && 
        (!formData.birthDate || !formData.position)) {
      Alert.alert(t('createUser.error'), t('createUser.requiredForPlayers'));
      return;
    }

    try {
      const createdPlayer = await createPlayerManually(
        {
          ...formData,
          id: Date.now().toString(),
          age: 0,
          goals: '',
          assists: '',
          games: '',
          pullUps: '',
          pushUps: '',
          plankTime: '',
          sprint100m: '',
          longJump: '',
          // Обнуляем необязательные поля, если они не заполнены
          number: formData.number || '',
          grip: formData.grip || '',
          height: formData.height || '',
          weight: formData.weight || '',
          avatar: formData.avatar || '',
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
        } as Player,
        currentUser?.id || 'unknown' // Используем ID текущего пользователя
      );

      if (createdPlayer) {
        Alert.alert(t('createUser.success'), t('createUser.userCreated', { name: createdPlayer.name }), [
          {
            text: t('common.ok'),
            onPress: () => router.back()
          }
        ]);
      } else {
        Alert.alert(t('createUser.error'), t('createUser.errorCreatingUser'));
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      Alert.alert(t('createUser.error'), t('createUser.errorCreatingUser'));
    }
  };

  // Показываем загрузку, пока пользователь не загружен
  if (!currentUser) {
    return (
      <View style={styles.container}>
        <ImageBackground 
          source={iceBg} 
          style={styles.background} 
          resizeMode="cover"
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Загрузка пользователя...</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={iceBg} 
        style={styles.background} 
        resizeMode="cover"
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.formContainer}>
              <Text style={styles.title}>{t('createUser.title')}</Text>
              
              {/* Аватар */}
              <TouchableOpacity 
                style={styles.avatarContainer} 
                onPress={pickImage}
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
                    style={styles.avatar} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons 
                      name={(formData.status === 'shop' || formData.status === 'skateSharpening') ? 'storefront-outline' : 'camera'} 
                      size={24} 
                      color="#fff" 
                    />
                    <Text style={styles.avatarPlaceholderText}>
                      {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.selectLogo') : t('createUser.addPhoto')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Статус */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('createUser.status')}</Text>
                <View style={styles.pickerContainer}>
                  {['player', 'coach', 'scout', 'star', 'shop', 'skateSharpening'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.pickerOption,
                        formData.status === status && styles.pickerOptionSelected
                      ]}
                      onPress={() => setFormData({...formData, status: status as Player['status']})}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        formData.status === status && styles.pickerOptionTextSelected
                      ]}>
                        {status === 'player' ? t('createUser.player') : 
                         status === 'coach' ? t('createUser.coach') : 
                         status === 'scout' ? t('createUser.scout') : 
                         status === 'shop' ? t('createUser.shop') : 
                         status === 'skateSharpening' ? t('profile.skateSharpening') : t('createUser.star')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Телефон */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('createUser.phone')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text.trim()})}
                  placeholder="+375 (29) 123-45-67"
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>

              {/* Имя/Название */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {(formData.status === 'shop' || formData.status === 'skateSharpening') ? t('profile.organizationName') : t('createUser.name')}
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
                      : t('createUser.namePlaceholder')
                  }
                  placeholderTextColor="#888"
                  autoCapitalize={(formData.status === 'shop' || formData.status === 'skateSharpening') ? 'words' : 'characters'}
                />
                {(formData.status !== 'shop' && formData.status !== 'skateSharpening') && (
                <Text style={styles.hintText}>
                  {t('createUser.nameHint')}
                </Text>
                )}
              </View>

              {/* Дата рождения */}
              {(formData.status === 'player' || formData.status === 'star') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('profile.birthDate')}</Text>
                  <TouchableOpacity 
                    style={styles.dateInput} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateInputText}>
                      {formData.birthDate || t('profile.selectBirthDate')}
                    </Text>
                    <Ionicons name="calendar" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Позиция */}
              {(formData.status === 'player' || formData.status === 'star') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('profile.position')}</Text>
                  <View style={styles.pickerContainer}>
                    {POSITIONS.map((pos) => (
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
                          {t(`profile.${pos}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Номер - только для игроков и звезд */}
              {(formData.status === 'player' || formData.status === 'star') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('profile.playerNumber')}</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.number}
                    onChangeText={(text) => setFormData({...formData, number: text})}
                    placeholder={t('profile.playerNumberPlaceholder')}
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              )}

              {/* Хват - только для игроков и звезд */}
              {(formData.status === 'player' || formData.status === 'star') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{t('profile.grip')}</Text>
                  <View style={styles.pickerContainer}>
                    {GRIPS.map((grip) => (
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
                          {t(`profile.${grip}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Рост и вес - только для игроков и звезд */}
              {(formData.status === 'player' || formData.status === 'star') && (
                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfInput]}>
                    <Text style={styles.label}>{t('profile.heightWithUnit')}</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.height}
                      onChangeText={(text) => setFormData({...formData, height: text})}
                      placeholder={t('createUser.heightPlaceholder')}
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.halfInput]}>
                    <Text style={styles.label}>{t('profile.weightWithUnit')}</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.weight}
                      onChangeText={(text) => setFormData({...formData, weight: text})}
                      placeholder={t('createUser.weightPlaceholder')}
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              )}

              {/* Страна */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('profile.country')}</Text>
                <TouchableOpacity
                  style={styles.countryButton}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.countryButtonText}>
                    {formData.country || t('profile.selectCountry')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

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

              {/* Кнопка создания */}
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleCreateUser}
              >
                <Text style={styles.submitButtonText}>{t('createUser.create')}</Text>
              </TouchableOpacity>
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
                  <Text style={styles.datePickerButtonText}>{t('common.cancel')}</Text>
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
                  <Text style={styles.datePickerButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

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
                    setFormData({...formData, country: country});
                    setShowCountryPicker(false);
                    setCountrySearchText('');
                  }}
                >
                  <Text style={[
                    styles.countryOptionText,
                    formData.country === country && styles.countryOptionTextSelected
                  ]}>
                    {country}
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
    </ImageBackground>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)', // Более темный фон
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)', // Красноватая граница
    maxWidth: Platform.OS === 'web' ? 500 : 'auto', // Ограничиваем ширину для веб
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch', // Центрируем на веб
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4444', // Красный цвет заголовка
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', // Прозрачный фон
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)', // Красноватая граница
    fontFamily: 'Gilroy-Regular',
    // Убираем width, чтобы поле адаптировалось к контейнеру
  },
  hintText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'Gilroy-Regular',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 10,
    minWidth: '30%',
  },
  pickerOptionSelected: {
    backgroundColor: '#FF4444',
  },
  pickerOptionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  submitButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,68,68,0.1)', // Красноватый прозрачный фон
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)', // Красноватая граница
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    marginTop: 10,
    fontFamily: 'Gilroy-Regular',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)', // Красноватая граница
  },
  dateInputText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  datePickerOverlay: {
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
  datePickerModal: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%',
  },
  datePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  confirmButton: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
};
