import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  ImageBackground,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { processPuckSpeedVideo } from '../utils/puckSpeedProcessor';
import { savePuckSpeedResult } from '../utils/playerStorage';
import CachedBackground from '../components/CachedBackground';

const iceBg = require('../assets/images/led.jpg');

export default function PuckSpeedScreen() {
  const { t } = useLanguage();
  const { currentUser } = useUser();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [measuredSpeed, setMeasuredSpeed] = useState<number | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [puckInZone, setPuckInZone] = useState(false); // Шайба в зоне калибровки
  const [isCalibrated, setIsCalibrated] = useState(false); // Калибровка завершена

  const handleCalibrate = () => {
    // Имитируем детекцию шайбы в зоне
    setPuckInZone(true);
    setTimeout(() => {
      setIsCalibrated(true);
      // Через секунду автоматически запускаем запись
      setTimeout(() => {
        startRecording();
      }, 500);
    }, 500);
  };

  const startRecording = async () => {
    // Проверяем калибровку
    if (!isCalibrated) {
      Alert.alert(
        t('error') || 'Ошибка', 
        t('puckSpeed.calibrationRequired') || 'Сначала необходимо откалибровать размер шайбы'
      );
      return;
    }

    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('error') || 'Ошибка', 'Запись видео не поддерживается в веб-версии');
        return;
      }

      // Запрашиваем разрешение на камеру
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error') || 'Ошибка', t('puckSpeed.cameraPermissionRequired') || 'Требуется доступ к камере');
        return;
      }

      console.log('🎬 Запускаем запись видео через ImagePicker');
      
      // Запускаем камеру для записи видео - только задняя камера
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: 10, // Максимум 10 секунд
        cameraType: ImagePicker.CameraType.back, // Только задняя камера
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Видео записано успешно:', result.assets[0].uri);
        setRecordingUri(result.assets[0].uri);
        // Сбрасываем калибровку для следующего измерения
        setIsCalibrated(false);
        setPuckInZone(false);
      } else {
        console.log('ℹ️ Запись видео отменена пользователем');
        // Сбрасываем калибровку
        setIsCalibrated(false);
        setPuckInZone(false);
      }
    } catch (error: any) {
      console.error('❌ Ошибка записи видео:', error);
      Alert.alert(t('error') || 'Ошибка', t('puckSpeed.recordingError') || 'Не удалось записать видео');
      setIsCalibrated(false);
      setPuckInZone(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;
    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      console.error('❌ Ошибка остановки записи:', error);
      setIsRecording(false);
    }
  };

  const processVideo = async () => {
    if (!recordingUri) return;

    setIsProcessing(true);
    try {
      // Обрабатываем видео и вычисляем скорость
      const speed = await processPuckSpeedVideo(recordingUri);
      
      if (speed && speed > 0) {
        setMeasuredSpeed(speed);
        setShowResultModal(true);
      } else {
        Alert.alert(
          t('error') || 'Ошибка',
          t('puckSpeed.detectionError') || 'Не удалось определить скорость шайбы. Убедитесь, что шайба видна в кадре.'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка обработки видео:', error);
      Alert.alert(
        t('error') || 'Ошибка',
        t('puckSpeed.processingError') || 'Ошибка при обработке видео'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const saveResult = async () => {
    if (!measuredSpeed || !currentUser) return;

    try {
      await savePuckSpeedResult(currentUser.id, measuredSpeed);
      Alert.alert(
        t('success') || 'Успешно',
        t('puckSpeed.saved') || 'Результат сохранен!',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Ошибка сохранения результата:', error);
      Alert.alert(t('error') || 'Ошибка', t('puckSpeed.saveError') || 'Не удалось сохранить результат');
    }
  };

  const retakeVideo = () => {
    setRecordingUri(null);
    setMeasuredSpeed(null);
    setShowResultModal(false);
    setIsCalibrated(false);
    setPuckInZone(false);
  };

  const resetCalibration = () => {
    setIsCalibrated(false);
    setPuckInZone(false);
  };

  return (
    <View style={styles.container}>
      <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>
              {t('puckSpeed.title') || 'Измерение скорости шайбы'}
            </Text>
            <View style={styles.backButton} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Инструкции для пользователя */}
            {!isCalibrated && !recordingUri && (
              <View style={styles.instructionsContainer}>
                <View style={{ alignSelf: 'center', marginBottom: 10 }}>
                  <Ionicons name="information-circle" size={40} color="#fa2f40" />
                </View>
                <Text style={styles.instructionsTitle}>
                  {t('puckSpeed.instructions') || 'Инструкции:'}
                </Text>
                <Text style={styles.instructionsText}>
                  {t('puckSpeed.instruction1') || '1. Расположите телефон в метре от места удара'}
                </Text>
                <Text style={styles.instructionsText}>
                  {t('puckSpeed.instruction2_new') || '2. Поместите шайбу в зону калибровки (круг снизу слева экрана записи)'}
                </Text>
                <Text style={styles.instructionsText}>
                  {t('puckSpeed.instruction3_new') || '3. Когда шайба в зоне, нажмите "Калибровать"'}
                </Text>
                <Text style={styles.instructionsText}>
                  {t('puckSpeed.instruction4_new') || '4. После калибровки выполните удар и видео запишется автоматически'}
                </Text>
              </View>
            )}

            {/* Зона калибровки */}
            {isCalibrated && !recordingUri && (
              <View style={styles.calibrationSuccess}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                <Text style={styles.calibrationSuccessText}>
                  {t('puckSpeed.calibrationComplete') || 'Калибровка завершена!'}
                </Text>
                <Text style={styles.calibrationInfoText}>
                  {t('puckSpeed.calibrationInfo') || 'Нажмите "Начать запись" когда будете готовы выполнить удар'}
                </Text>
                <TouchableOpacity
                  style={styles.recalibrateButton}
                  onPress={resetCalibration}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.recalibrateButtonText}>
                    {t('puckSpeed.recalibrate') || 'Откалибровать заново'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Кнопки управления */}
            <View style={styles.controlsContainer}>
          {!recordingUri ? (
            <>
              {!isCalibrated ? (
                <TouchableOpacity
                  style={styles.calibrateButton}
                  onPress={handleCalibrate}
                >
                  <Ionicons name="scan" size={48} color="#fff" />
                  <Text style={styles.calibrateButtonText}>
                    {t('puckSpeed.calibrate') || 'Калибровать шайбу'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Ionicons name="videocam" size={64} color="#fff" />
                  <Text style={styles.recordButtonText}>
                    {t('puckSpeed.startRecording') || 'Начать запись'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.processContainer}>
              <View style={styles.videoRecordedInfo}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.videoRecordedText}>
                  {t('puckSpeed.videoRecorded') || 'Видео записано!'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.processButton}
                onPress={processVideo}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processButtonText}>
                      {t('puckSpeed.processing') || 'Обработка...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="analytics" size={32} color="#fff" />
                    <Text style={styles.processButtonText}>
                      {t('puckSpeed.processVideo') || 'Вычислить скорость'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakeVideo}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.retakeButtonText}>
                  {t('puckSpeed.retake') || 'Переснять'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
            </View>
          </ScrollView>
        </View>
      </CachedBackground>

      {/* Модальное окно с результатом */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.resultTitle}>
              {t('puckSpeed.result') || 'Результат измерения'}
            </Text>
            <Text style={styles.speedValue}>
              {measuredSpeed?.toFixed(1)} {t('puckSpeed.kmh') || 'км/ч'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveResult}
              >
                <Text style={styles.modalButtonText}>
                  {t('common.save') || 'Сохранить'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowResultModal(false)}
              >
                <Text style={styles.modalButtonText}>
                  {t('common.cancel') || 'Отмена'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 52, // Отступ для абсолютного заголовка
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.5)',
    marginBottom: 30,
    width: '100%',
    maxWidth: 500,
    alignItems: 'flex-start',
  },
  instructionsTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'center',
    alignSelf: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginBottom: 10,
    lineHeight: 22,
    textAlign: 'left',
  },
  controlsContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
  },
  recordButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 40,
    paddingVertical: 25,
    borderRadius: 15,
    width: '100%',
    gap: 12,
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  calibrateButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 25,
    borderRadius: 15,
    width: '100%',
    gap: 12,
  },
  calibrateButtonText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  calibrationSuccess: {
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 25,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 30,
    width: '100%',
    maxWidth: 500,
  },
  calibrationSuccessText: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  calibrationInfoText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  recalibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recalibrateButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  processContainer: {
    alignItems: 'center',
    gap: 15,
    width: '100%',
  },
  videoRecordedInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  videoRecordedText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    width: '100%',
  },
  processButtonText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  retakeButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fa2f40',
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 20,
  },
  speedValue: {
    fontSize: 48,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#fa2f40',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
});

