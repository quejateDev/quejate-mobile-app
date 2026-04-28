import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications, useMarkNotificationRead } from '@features/notifications/hooks/useNotifications';
import type { Notification } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';

const typeLabels: Record<string, string> = {
  follow: 'Nuevo seguidor',
  like: 'Me gusta',
  comment: 'Comentario',
  lawyer_request_accepted: 'Solicitud aceptada',
  lawyer_request_rejected: 'Solicitud rechazada',
  new_lawyer_request: 'Nueva solicitud',
  pqrsd_time_expired: 'PQRSD vencida',
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

function NotificationItem({
  item,
  onMarkRead,
  onNavigatePQR,
  onNavigateProfile,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  onNavigatePQR: (pqrId: string) => void;
  onNavigateProfile: (userId: string) => void;
}) {
  const handlePress = () => {
    if (!item.read) onMarkRead(item.id);
    if (item.type === 'follow' && item.data?.followerId) {
      onNavigateProfile(item.data.followerId as string);
    } else if (item.data?.pqrId) {
      onNavigatePQR(item.data.pqrId);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {!item.read && <View style={styles.unreadDot} />}
      <View style={styles.itemContent}>
        <Text style={styles.itemType}>{typeLabels[item.type] ?? item.type}</Text>
        <Text style={styles.itemMessage}>{item.message}</Text>
        <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data, isLoading, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  const notifications: Notification[] = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notificaciones</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<Notification>
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkRead={(id) => markRead.mutate({ notificationId: id })}
              onNavigatePQR={(pqrId) => navigation.navigate('PQRDetail', { id: pqrId })}
              onNavigateProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No tienes notificaciones</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563EB"
            />
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyFill : { paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  badge: {
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyFill: { flex: 1 },
  empty: { fontSize: 15, color: '#9CA3AF' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemUnread: { backgroundColor: '#EFF6FF' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginTop: 5,
    marginRight: 10,
  },
  itemContent: { flex: 1 },
  itemType: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginBottom: 2 },
  itemMessage: { fontSize: 14, color: '#374151', lineHeight: 20 },
  itemTime: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
