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
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@features/notifications/hooks/useNotifications';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { Notification, NotificationType } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';
import { timeAgo } from '@shared/utils/dateUtils';

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  follow:                    { label: 'Nuevo seguidor',      icon: 'person-add-outline',       color: '#2563EB' },
  like:                      { label: 'Me gusta',            icon: 'heart-outline',            color: '#E11D48' },
  comment:                   { label: 'Comentario',          icon: 'chatbubble-outline',       color: '#0891B2' },
  lawyer_request_accepted:   { label: 'Solicitud aceptada',  icon: 'checkmark-circle-outline', color: '#16A34A' },
  lawyer_request_rejected:   { label: 'Solicitud rechazada', icon: 'close-circle-outline',     color: '#DC2626' },
  new_lawyer_request:        { label: 'Nueva solicitud',     icon: 'briefcase-outline',        color: '#7C3AED' },
  pqrsd_time_expired:        { label: 'PQRSD vencida',       icon: 'time-outline',             color: '#D97706' },
};

const NotificationItem = React.memo(function NotificationItem({
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
  const config = TYPE_CONFIG[item.type] ?? { label: item.type, icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap, color: '#6B7280' };

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
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${config.label}: ${item.message}`}
    >
      {!item.read && <View style={styles.unreadBar} />}
      <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
});

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data, isLoading, isError, isRefetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications: Notification[] = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          message="No se pudieron cargar las notificaciones."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadSubtitle}>{unreadCount} sin leer</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => markAll.mutate()}
          disabled={unreadCount === 0 || markAll.isPending}
          style={[styles.markAllBtn, (unreadCount === 0 || markAll.isPending) && styles.markAllBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={[styles.markAllText, (unreadCount === 0 || markAll.isPending) && styles.markAllTextDisabled]}>
            Marcar todas
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<Notification>
          data={notifications}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
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
              <Ionicons name="notifications-off-outline" size={52} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sin notificaciones</Text>
              <Text style={styles.emptyText}>Cuando recibas actividad aparecerá aquí</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyFill : { paddingBottom: 16, paddingTop: 4 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  backBtn: { marginRight: 4 },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  unreadSubtitle: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  markAllBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  markAllBtnDisabled: { backgroundColor: '#F3F4F6' },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  markAllTextDisabled: { color: '#9CA3AF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyFill: { flex: 1 },
  emptyEmoji: { fontSize: 40, marginBottom: 12, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  cardUnread: { backgroundColor: '#F0F7FF' },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#2563EB',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  typeLabel: { fontSize: 11, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
  message: { fontSize: 14, color: '#374151', lineHeight: 20 },
  time: { fontSize: 12, color: '#9CA3AF', marginTop: 5 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 8,
    marginTop: 4,
    flexShrink: 0,
  },
});
