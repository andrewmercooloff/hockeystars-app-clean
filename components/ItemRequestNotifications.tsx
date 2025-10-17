import SafeIcon from './SafeIcon';
import React, { useEffect, useState } from 'react';
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

interface ItemRequest {
  id: string;
  requester_id: string;
  owner_id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey';
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  owner?: {
    name: string;
    avatar_url?: string;
  };
}

interface ItemRequestNotificationsProps {
  playerId: string;
  onRequestUpdated?: () => void;
}

const ItemRequestNotifications: React.FC<ItemRequestNotificationsProps> = ({ playerId }) => {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [playerId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('item_requests')
        .select(`
          *,
          owner:players!item_requests_owner_id_fkey(
            name,
            avatar_url
          )
        `)
        .eq('requester_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки запросов:', error);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Ошибка загрузки запросов:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
    if (onRequestUpdated) {
      onRequestUpdated();
    }
  };

  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'autograph': return t('items.autograph');
      case 'stick': return t('items.stick');
      case 'puck': return t('items.puck');
      case 'jersey': return t('items.jersey');
      default: return type;
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'autograph': return 'create';
      case 'stick': return 'fitness';
      case 'puck': return 'radio-button-on';
      case 'jersey': return 'shirt';
      default: return 'cube';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'accepted': return '#34C759';
      case 'rejected': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('requests.pending');
      case 'accepted': return t('requests.accepted');
      case 'rejected': return t('requests.rejected');
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time';
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const acceptedRequests = requests.filter(req => req.status === 'accepted');
  const rejectedRequests = requests.filter(req => req.status === 'rejected');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('requests.giftRequests')}</Text>
                 <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
           <Ionicons name="refresh" size={18} color="#ff4444" />
         </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.requestsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Ожидающие запросы */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ожидают ответа ({pendingRequests.length})
            </Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.starInfo}>
                    {request.owner?.avatar_url ? (
                      <Image 
                        source={{ uri: request.owner.avatar_url }} 
                        style={styles.avatar} 
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#8E8E93" />
                      </View>
                    )}
                    <View style={styles.starDetails}>
                      <Text style={styles.starName}>
                        {request.owner?.name || 'Неизвестная звезда'}
                      </Text>
                      <Text style={styles.requestDate}>
                        {formatDate(request.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <Ionicons 
                      name={getStatusIcon(request.status) as any} 
                      size={20} 
                      color={getStatusColor(request.status)} 
                    />
                    <Text style={[
                      styles.statusText, 
                      { color: getStatusColor(request.status) }
                    ]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemTypeContainer}>
                  <Ionicons 
                    name={getItemTypeIcon(request.item_type) as any} 
                    size={20} 
                    color="#007AFF" 
                  />
                  <Text style={styles.itemType}>
                    {getItemTypeName(request.item_type)}
                  </Text>
                </View>

                <Text style={styles.requestMessage}>{request.message}</Text>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={16} color="#007AFF" />
                  <Text style={styles.infoText}>
                    Ожидайте ответа от звезды. Если запрос будет принят, подарок появится в вашем Музее подарков.
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Принятые запросы */}
        {acceptedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Принятые ({acceptedRequests.length})
            </Text>
            {acceptedRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.starInfo}>
                    {request.owner?.avatar_url ? (
                      <Image 
                        source={{ uri: request.owner.avatar_url }} 
                        style={styles.avatar} 
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#8E8E93" />
                      </View>
                    )}
                    <View style={styles.starDetails}>
                      <Text style={styles.starName}>
                        {request.owner?.name || 'Неизвестная звезда'}
                      </Text>
                      <Text style={styles.requestDate}>
                        {formatDate(request.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <Ionicons 
                      name={getStatusIcon(request.status) as any} 
                      size={20} 
                      color={getStatusColor(request.status)} 
                    />
                    <Text style={[
                      styles.statusText, 
                      { color: getStatusColor(request.status) }
                    ]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemTypeContainer}>
                  <Ionicons 
                    name={getItemTypeIcon(request.item_type) as any} 
                    size={20} 
                    color="#34C759" 
                  />
                  <Text style={[styles.itemType, { color: '#34C759' }]}>
                    {getItemTypeName(request.item_type)}
                  </Text>
                </View>

                <Text style={styles.requestMessage}>{request.message}</Text>

                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.successText}>
                    Поздравляем! Подарок добавлен в ваш Музей подарков. Проверьте раздел "Музей подарков" в профиле.
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Отклоненные запросы */}
        {rejectedRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Отклоненные ({rejectedRequests.length})
            </Text>
            {rejectedRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.starInfo}>
                    {request.owner?.avatar_url ? (
                      <Image 
                        source={{ uri: request.owner.avatar_url }} 
                        style={styles.avatar} 
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#8E8E93" />
                      </View>
                    )}
                    <View style={styles.starDetails}>
                      <Text style={styles.starName}>
                        {request.owner?.name || 'Неизвестная звезда'}
                      </Text>
                      <Text style={styles.requestDate}>
                        {formatDate(request.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <Ionicons 
                      name={getStatusIcon(request.status) as any} 
                      size={20} 
                      color={getStatusColor(request.status)} 
                    />
                    <Text style={[
                      styles.statusText, 
                      { color: getStatusColor(request.status) }
                    ]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemTypeContainer}>
                  <Ionicons 
                    name={getItemTypeIcon(request.item_type) as any} 
                    size={20} 
                    color="#FF3B30" 
                  />
                  <Text style={[styles.itemType, { color: '#FF3B30' }]}>
                    {getItemTypeName(request.item_type)}
                  </Text>
                </View>

                <Text style={styles.requestMessage}>{request.message}</Text>

                <View style={styles.rejectionBox}>
                  <Ionicons name="close-circle" size={16} color="#FF3B30" />
                  <Text style={styles.rejectionText}>
                                         К сожалению, звезда отклонила ваш запрос. Попробуйте обратиться к другой звезде или попросить другой подарок.
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {requests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="mail-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyStateText}>У вас пока нет запросов</Text>
            <Text style={styles.emptyStateSubtext}>
                               Отправьте запросы звездам, чтобы получить подарки
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  refreshButton: {
    padding: 6,
  },
  requestsList: {
    flex: 1,
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  requestCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  starInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  starDetails: {
    flex: 1,
  },
  starName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 11,
    color: '#999',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  itemType: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '500',
  },
  requestMessage: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a3a5a',
    borderRadius: 6,
    padding: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#87ceeb',
    lineHeight: 14,
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#1a3a1a',
    borderRadius: 6,
    padding: 8,
  },
  successText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#90ee90',
    lineHeight: 14,
  },
  rejectionBox: {
    flexDirection: 'row',
    backgroundColor: '#3a1a1a',
    borderRadius: 6,
    padding: 8,
  },
  rejectionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    color: '#ffb6c1',
    lineHeight: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ItemRequestNotifications;
