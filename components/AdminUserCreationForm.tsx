import React, { useState } from 'react';
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
  Image,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COUNTRIES } from '../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import { Player, createPlayerManually } from '../utils/playerStorage';
import DateTimePicker from '@react-native-community/datetimepicker';

const iceBg = require('../assets/images/led.jpg');

const grips = ['Левый', 'Правый'];
const positions = ['Центральный нападающий', 'Крайний нападающий', 'Защитник', 'Вратарь'];

interface AdminUserCreationFormProps {
  onClose: () => void;
  onUserCreated?: (player: Player) => void;
  currentUserId: string;
  visible: boolean;
}

export default function AdminUserCreationForm({ 
  onClose, 
  onUserCreated, 
  currentUserId,
  visible 
}: AdminUserCreationFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Partial<Player>>({
    phone: '',
    name: '',
    status: 'player',
    birthDate: '',
    country: 'Беларусь',
    team: '',
    position: '',
    number: '',
    grip: '',
    height: '',
    weight: '',
    avatar: null
  });

  const [selectedDate, setSelectedDate] = useState(new Date(2008, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pickImage = async () => {
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужно разрешение для доступа к галерее');
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
      Alert.alert('Ошибка', 'Не удалось загрузить фото из галереи.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нужно разрешение для доступа к камере');
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
      Alert.alert('Ошибка', 'Не удалось снять фото');
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
    if (!currentUserId) {
      Alert.alert('Ошибка', 'Не удалось определить администратора');
      return;
    }

    // Для админа: все поля необязательны. Проверяем только, если введены
    if (formData.phone) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        Alert.alert('Ошибка', 'Пожалуйста, введите корректный номер телефона с кодом страны');
        return;
      }
    }

    try {
      const createdPlayer = await createPlayerManually(
        {
          ...formData,
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
          team: formData.team || '',
          avatar: formData.avatar || ''
        } as Player,
        currentUserId
      );

      if (createdPlayer) {
        Alert.alert('Успех', `Пользователь ${createdPlayer.name} создан`);
        onUserCreated?.(createdPlayer);
        onClose();
      } else {
        Alert.alert('Ошибка', 'Не удалось создать пользователя');
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      Alert.alert('Ошибка', 'Не удалось создать пользователя');
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <ImageBackground 
          source={iceBg} 
          style={styles.container} 
          resizeMode="cover"
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.formContainer}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title}>Создание пользователя</Text>
                
                {/* Аватар */}
                <TouchableOpacity 
                  style={styles.avatarContainer} 
                  onPress={pickImage}
                >
                  {formData.avatar ? (
                    <Image 
                      source={{ uri: formData.avatar }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="camera" size={24} color="#fff" />
                      <Text style={styles.avatarPlaceholderText}>Добавить фото</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Статус */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Статус</Text>
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
                          {status === 'player' ? 'Игрок' : 
                           status === 'coach' ? 'Тренер' : 
                           status === 'scout' ? 'Скаут' : 
                           status === 'star' ? 'Звезда' : 
                           status === 'shop' ? 'Магазин' : 'Заточка коньков'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Телефон */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Номер телефона</Text>
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

                {/* Имя */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Имя и фамилия</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => {
                      // Фильтруем только латинские буквы, пробелы и дефисы
                      const latinOnly = text.replace(/[^a-zA-Z\s\-]/g, '');
                      // Преобразуем в верхний регистр
                      const upperCaseText = latinOnly.toUpperCase();
                      setFormData({...formData, name: upperCaseText});
                    }}
                    placeholder="ВВЕДИТЕ ИМЯ"
                    placeholderTextColor="#888"
                    autoCapitalize="characters"
                  />
                  <Text style={styles.hintText}>
                    Только латинские буквы (A-Z)
                  </Text>
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
                        {formData.birthDate || 'Выберите дату рождения'}
                      </Text>
                      <Ionicons name="calendar" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Позиция */}
                {(formData.status === 'player' || formData.status === 'star') && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Позиция</Text>
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

                {/* Номер */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Номер игрока</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.number}
                    onChangeText={(text) => setFormData({...formData, number: text})}
                    placeholder="Номер на форме"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>

                {/* Хват */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Хват</Text>
                  <View style={styles.pickerContainer}>
                    {grips.map((grip) => (
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
                          {t(`profile.${grip}`) || grip}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Рост и вес */}
                <View style={styles.row}>
                  <View style={[styles.inputContainer, styles.halfInput]}>
                    <Text style={styles.label}>Рост (см)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.height}
                      onChangeText={(text) => setFormData({...formData, height: text})}
                      placeholder="Рост"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.halfInput]}>
                    <Text style={styles.label}>Вес (кг)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.weight}
                      onChangeText={(text) => setFormData({...formData, weight: text})}
                      placeholder="Вес"
                      placeholderTextColor="#888"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* Команда */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Команда</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.team}
                    onChangeText={(text) => setFormData({...formData, team: text})}
                    placeholder="НАЗВАНИЕ КОМАНДЫ"
                    placeholderTextColor="#888"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Услуги заточки коньков - только для заточки коньков */}
                {formData.status === 'skateSharpening' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Услуги</Text>
                    <View style={styles.pickerContainer}>
                      {[
                        'skateSharpeningService',
                        'skateForming', 
                        'skateProfiling',
                        'equipmentRepair',
                        'stickRepair',
                        'usedEquipmentSale',
                        'newEquipmentSale'
                      ].map((service) => (
                        <TouchableOpacity
                          key={service}
                          style={[
                            styles.pickerOption,
                            formData.skate_services?.includes(service) && styles.pickerOptionSelected
                          ]}
                          onPress={() => {
                            const currentServices = formData.skate_services || [];
                            const newServices = currentServices.includes(service)
                              ? currentServices.filter(s => s !== service)
                              : [...currentServices, service];
                            setFormData({...formData, skate_services: newServices});
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.skate_services?.includes(service) && styles.pickerOptionTextSelected
                          ]}>
                            {service === 'skateSharpeningService' ? 'Заточка коньков' :
                             service === 'skateForming' ? 'Формовка коньков' :
                             service === 'skateProfiling' ? 'Профилирование коньков' :
                             service === 'equipmentRepair' ? 'Ремонт экипировки' :
                             service === 'stickRepair' ? 'Ремонт клюшек' :
                             service === 'usedEquipmentSale' ? 'Продажа б/у формы' :
                             'Продажа новой формы'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Индивидуальные тренировки - только для тренеров */}
                {formData.status === 'coach' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Индивидуальные тренировки</Text>
                    <View style={styles.pickerContainer}>
                      {[
                        'hockeySkills',
                        'skating',
                        'shooting',
                        'fitness',
                        'goalieTraining',
                        'dryLand',
                        'faceOffs'
                      ].map((training) => (
                        <TouchableOpacity
                          key={training}
                          style={[
                            styles.pickerOption,
                            formData.individual_training?.includes(training) && styles.pickerOptionSelected
                          ]}
                          onPress={() => {
                            const currentTraining = formData.individual_training || [];
                            const newTraining = currentTraining.includes(training)
                              ? currentTraining.filter(t => t !== training)
                              : [...currentTraining, training];
                            setFormData({...formData, individual_training: newTraining});
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.individual_training?.includes(training) && styles.pickerOptionTextSelected
                          ]}>
                            {training === 'hockeySkills' ? 'Обучение хоккейному мастерству' :
                             training === 'skating' ? 'Катание' :
                             training === 'shooting' ? 'Броски' :
                             training === 'fitness' ? 'ОФП' :
                             training === 'goalieTraining' ? 'Вратарские тренировки' :
                             training === 'dryLand' ? 'Занятие на сухом льду' :
                             'Отработка вбрасывания'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Годы обучения - только для тренеров */}
                {formData.status === 'coach' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Годы обучения игроков</Text>
                    <View style={styles.pickerContainer}>
                      {[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.pickerOption,
                            formData.coach_years?.includes(year) && styles.pickerOptionSelected
                          ]}
                          onPress={() => {
                            const currentYears = formData.coach_years || [];
                            const newYears = currentYears.includes(year)
                              ? currentYears.filter(y => y !== year)
                              : [...currentYears, year];
                            setFormData({...formData, coach_years: newYears});
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.coach_years?.includes(year) && styles.pickerOptionTextSelected
                          ]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Поля для магазинов и заточки коньков */}
                {(formData.status === 'shop' || formData.status === 'skateSharpening') && (
                  <>
                    {/* Адрес */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Адрес</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.address || ''}
                        onChangeText={(text) => setFormData({...formData, address: text})}
                        placeholder="Адрес магазина/мастерской"
                        placeholderTextColor="#888"
                        autoCapitalize="words"
                      />
                    </View>

                    {/* Рабочие часы */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Рабочие часы</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.workingHours || ''}
                        onChangeText={(text) => setFormData({...formData, workingHours: text})}
                        placeholder="Пн-Пт: 9:00-18:00, Сб: 10:00-16:00"
                        placeholderTextColor="#888"
                      />
                    </View>

                    {/* Email */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.email || ''}
                        onChangeText={(text) => setFormData({...formData, email: text})}
                        placeholder="email@example.com"
                        placeholderTextColor="#888"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="emailAddress"
                      />
                    </View>

                    {/* Скидка для друзей */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Скидка для друзей</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.discountForFriends || ''}
                        onChangeText={(text) => setFormData({...formData, discountForFriends: text})}
                        placeholder="10% скидка для друзей"
                        placeholderTextColor="#888"
                      />
                    </View>
                  </>
                )}

                {/* Страна */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Страна</Text>
                  <View style={styles.pickerContainer}>
                    {COUNTRIES.map((country) => (
                      <TouchableOpacity
                        key={country}
                        style={[
                          styles.pickerOption,
                          formData.country === country && styles.pickerOptionSelected
                        ]}
                        onPress={() => setFormData({...formData, country: country})}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          formData.country === country && styles.pickerOptionTextSelected
                        ]}>
                          {country}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Кнопка создания */}
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleCreateUser}
                >
                  <Text style={styles.submitButtonText}>Создать</Text>
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
                      <Text style={styles.datePickerButtonText}>Отмена</Text>
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
                      <Text style={styles.datePickerButtonText}>Подтвердить</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = {
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.5)', // Полупрозрачный фон
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%', // Ширина модального окна
    maxHeight: '90%', // Максимальная высота
    backgroundColor: '#000',
    borderRadius: 20, // Скругленные углы
    overflow: 'hidden', // Чтобы скругления были видны
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)', // Более темный фон
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)', // Красноватая граница
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
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
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
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
};
