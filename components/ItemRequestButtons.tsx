import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface ItemRequestButtonsProps {
  starId: string;
  playerId: string;
  onRequestSent?: () => void;
}

const ItemRequestButtons: React.FC<ItemRequestButtonsProps> = ({ 
  starId, 
  playerId, 
  onRequestSent 
}) => {
  const { t } = useLanguage();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'autograph' | 'stick' | 'puck' | 'jersey'>('autograph');
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestItem = async () => {
    if (!requestMessage.trim()) {
      Alert.alert(t('common.error'), t('gifts.pleaseWriteMessage'));
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('item_requests')
        .insert([{
          requester_id: playerId,
          owner_id: starId,
          item_type: selectedItemType,
          message: requestMessage.trim(),
          status: 'pending'
        }]);

      if (error) {
        console.error('Ошибка создания запроса:', error);
        Alert.alert(t('common.error'), t('gifts.failedToSendRequest'));
        return;
      }

      setShowRequestModal(false);
      setRequestMessage('');
      if (onRequestSent) {
        onRequestSent();
      }
      Alert.alert(
        t('gifts.requestSent'), 
        t('gifts.requestSentMessage', { itemType: getItemTypeName(selectedItemType) })
      );
    } catch (error) {
      console.error('Ошибка создания запроса:', error);
      Alert.alert(t('common.error'), t('gifts.failedToSendRequest'));
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'autograph': return t('gifts.autograph');
      case 'stick': return t('gifts.stick');
      case 'puck': return t('gifts.puck');
      case 'jersey': return t('gifts.jersey');
      default: return type;
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'autograph': return 'pencil'; // Изменил с 'create' на 'pencil' для автографа
      case 'stick': return 'sports-hockey'; // Используем MaterialIcons sports-hockey для хоккейной клюшки
      case 'puck': return 'ellipse'; // Изменил с 'radio-button-on' на 'ellipse' для шайбы
      case 'jersey': return 'shirt';
      default: return 'cube';
    }
  };

  const openRequestModal = (itemType: 'autograph' | 'stick' | 'puck' | 'jersey') => {
    setSelectedItemType(itemType);
    setShowRequestModal(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('gifts.requestGift')}</Text>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.requestButton} onPress={() => openRequestModal('autograph')}>
          <Ionicons name="pencil-outline" size={24} color="#ff4444" />
          <Text style={styles.buttonText}>{t('gifts.autograph')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.requestButton} onPress={() => openRequestModal('stick')}>
          <MaterialIcons name="sports-hockey" size={24} color="#ff4444" />
          <Text style={styles.buttonText}>{t('gifts.stick')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.requestButton} onPress={() => openRequestModal('puck')}>
          <Ionicons name="ellipse-outline" size={24} color="#ff4444" />
          <Text style={styles.buttonText}>{t('gifts.puck')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.requestButton} onPress={() => openRequestModal('jersey')}>
          <Ionicons name="shirt-outline" size={24} color="#ff4444" />
          <Text style={styles.buttonText}>{t('gifts.jersey')}</Text>
        </TouchableOpacity>
      </View>

      {/* Модальное окно запроса */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('gifts.requestItem', { itemType: getItemTypeName(selectedItemType) })}
            </Text>
            <TouchableOpacity
              onPress={() => setShowRequestModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.itemTypeDisplay}>
              {selectedItemType === 'stick' ? (
                <MaterialIcons name="sports-hockey" size={28} color="#ff4444" />
              ) : (
                <Ionicons 
                  name={getItemTypeIcon(selectedItemType) as any} 
                  size={28} 
                  color="#ff4444" 
                />
              )}
              <Text style={styles.itemTypeText}>
                {getItemTypeName(selectedItemType).charAt(0).toUpperCase() + 
                 getItemTypeName(selectedItemType).slice(1)}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('gifts.requestMessage')} *</Text>
              <Text style={styles.helperText}>
                {t('gifts.requestMessageHelper')}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={requestMessage}
                onChangeText={setRequestMessage}
                placeholder={t('gifts.requestMessagePlaceholder')}
                                 placeholderTextColor="#666"
                multiline
                numberOfLines={6}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {requestMessage.length}/500 {t('gifts.characters')}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleRequestItem}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? t('gifts.sending') : t('gifts.sendRequest')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#ff4444" />
              <Text style={styles.infoText}>
                {t('gifts.requestInfo')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 15,
    textAlign: 'left',
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  requestButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minHeight: 60,
  },
  buttonText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: '#fff',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 6,
  },
  modalContent: {
    flex: 1,
    padding: 12,
  },
  itemTypeDisplay: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
  },
  itemTypeText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#ff4444',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#fff',
    lineHeight: 16,
  },
});

export default ItemRequestButtons;
