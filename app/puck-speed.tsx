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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { processPuckSpeedVideo } from '../utils/puckSpeedProcessor';
import { savePuckSpeedResult } from '../utils/playerStorage';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PuckSpeedScreen() {
  const { t } = useLanguage();
  const { currentUser } = useUser();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [measuredSpeed, setMeasuredSpeed] = useState<number | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [puckInZone, setPuckInZone] = useState(false); // Шайба в зоне
  
  // Размеры и позиция зоны для шайбы (круг снизу слева)
  const ZONE_SIZE = 100; // Диаметр зоны
  const ZONE_LEFT = 30;
  const ZONE_BOTTOM = 150;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const confirmPuckInZone = async () => {
    // Пользователь подтверждает, что шайба в зоне
    setPuckInZone(true);
    
    // Визуальная обратная связь
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Автоматически запускаем запись
    startRecording();
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('error') || 'Ошибка', 'Запись видео не поддерживается в веб-версии');
        return;
      }

      console.log('🎬 Запускаем запись видео через ImagePicker');
      
      // Запускаем камеру для записи видео - только передняя камера (фронтальная)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1.0, // Максимальное качество для лучшего анализа
        videoMaxDuration: 10, // Максимум 10 секунд
        cameraType: ImagePicker.CameraType.front, // ПЕРЕДНЯЯ камера, чтобы видеть экран
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Видео записано успешно:', result.assets[0].uri);
        setRecordingUri(result.assets[0].uri);
        setPuckInZone(false);
        
        // АВТОМАТИЧЕСКИ начинаем обработку сразу после записи
        setIsProcessing(true);
        try {
          const speed = await processPuckSpeedVideo(result.assets[0].uri);
          
          if (speed && speed > 0) {
            setMeasuredSpeed(speed);
            setShowResultModal(true);
          } else {
            Alert.alert(
              t('error') || 'Ошибка',
              t('puckSpeed.detectionError') || 'Не удалось определить скорость шайбы.'
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
      } else {
        console.log('ℹ️ Запись видео отменена пользователем');
        setPuckInZone(false);
      }
    } catch (error: any) {
      console.error('❌ Ошибка записи видео:', error);
      Alert.alert(t('error') || 'Ошибка', t('puckSpeed.recordingError') || 'Не удалось записать видео');
      setPuckInZone(false);
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
    setPuckInZone(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fa2f40" />
          <Text style={styles.loadingText}>{t('puckSpeed.requestingPermission') || 'Запрос разрешения...'}</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#fa2f40" />
          <Text style={styles.permissionText}>
            {t('puckSpeed.cameraPermissionRequired') || 'Требуется доступ к камере для измерения скорости шайбы'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>
              {t('common.grantPermission') || 'Предоставить доступ'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!recordingUri ? (
        // Экран с камерой и зоной для шайбы
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front" // ПЕРЕДНЯЯ камера
            onCameraReady={() => {
              console.log('📷 Камера готова');
              setIsCameraReady(true);
            }}
          />
          
          {/* Затемненный overlay с "дыркой" для шайбы */}
          <View style={styles.cameraOverlay} pointerEvents="box-none">
            {/* Заголовок */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>
                {t('puckSpeed.title') || 'Измерение скорости шайбы'}
              </Text>
            </View>

            {/* Инструкция */}
            <View style={styles.cameraInstruction}>
              <Text style={styles.cameraInstructionText}>
                {t('puckSpeed.placePuckInZone') || 'Поместите шайбу в круг снизу слева'}
              </Text>
            </View>

            {/* Зона для шайбы (круг снизу слева) */}
            <View
              style={[
                styles.puckZone,
                {
                  left: ZONE_LEFT,
                  bottom: ZONE_BOTTOM,
                  width: ZONE_SIZE,
                  height: ZONE_SIZE,
                  borderRadius: ZONE_SIZE / 2,
                },
                puckInZone && styles.puckZoneActive
              ]}
            >
              {puckInZone && (
                <View style={styles.puckZoneCheck}>
                  <Ionicons name="checkmark" size={48} color="#4CAF50" />
                </View>
              )}
            </View>

            {/* Кнопка подтверждения */}
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={[styles.confirmButton, puckInZone && styles.confirmButtonActive]}
                onPress={confirmPuckInZone}
                disabled={!isCameraReady}
              >
                {puckInZone ? (
                  <>
                    <Ionicons name="checkmark-circle" size={32} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      {t('puckSpeed.puckDetected') || 'Шайба обнаружена!'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="scan-circle" size={32} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      {isCameraReady ? (t('puckSpeed.confirmPuck') || 'Подтвердить шайбу') : (t('puckSpeed.preparingCamera') || 'Подготовка...')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // Экран обработки результата
        <View style={styles.resultBackground}>
          <View style={styles.resultOverlay}>
            {/* Заголовок */}
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {t('puckSpeed.title') || 'Измерение скорости шайбы'}
              </Text>
              <View style={styles.backButton} />
            </View>

            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#fa2f40" />
              <Text style={styles.processingText}>
                {t('puckSpeed.analyzingVideo') || 'Анализ видео...'}
              </Text>
              <Text style={styles.processingSubtext}>
                {t('puckSpeed.analyzingDetails') || 'Отслеживание движения шайбы и вычисление скорости'}
              </Text>
            </View>
          </View>
        </View>
      )}

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
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Затемнение
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeButton: {
    padding: 8,
  },
  cameraTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 10,
  },
  cameraInstruction: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cameraInstructionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    textAlign: 'center',
  },
  puckZone: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(250, 47, 64, 0.8)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0)', // Прозрачная "дырка"
  },
  puckZoneActive: {
    borderColor: '#4CAF50',
    borderStyle: 'solid',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  puckZoneCheck: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 30,
    gap: 10,
    minWidth: 250,
  },
  confirmButtonActive: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  resultBackground: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
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
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginTop: 30,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
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

