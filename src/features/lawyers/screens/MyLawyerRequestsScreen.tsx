import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMyLawyerRequests } from '@features/lawyers/hooks/useLawyers';
import type { LawyerRequestWithLawyer } from '@features/lawyers/hooks/useLawyers';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import { getInitials } from '@features/users/components/profile/userProfileUtils';
import { timeAgo } from '@shared/utils/dateUtils';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendiente',  color: '#92400E', bg: '#FEF3C7' },
  ACCEPTED:  { label: 'Aceptada',   color: '#065F46', bg: '#D1FAE5' },
  REJECTED:  { label: 'Rechazada',  color: '#991B1B', bg: '#FEE2E2' },
  COMPLETED: { label: 'Completada', color: '#1E40AF', bg: '#DBEAFE' },
};

function RequestItem({
  item,
  onPress,
}: {
  item: LawyerRequestWithLawyer;
  onPress: () => void;
}) {
  const status = STATUS_MAP[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F3F4F6' };
  const lawyerName = item.lawyer?.user.name ?? 'Abogado';
  const lawyerImage = item.lawyer?.user.image ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.lawyerRow}>
          {lawyerImage ? (
            <Image source={{ uri: lawyerImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(lawyerName)}</Text>
            </View>
          )}
          <Text style={styles.lawyerName} numberOfLines={1}>{lawyerName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      <Text style={styles.date}>{timeAgo(item.createdAt)}</Text>
    </TouchableOpacity>
  );
}

export default function MyLawyerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: requests, isLoading, isError, refetch, isRefetching } = useMyLawyerRequests();

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState message="No se pudieron cargar tus solicitudes." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<LawyerRequestWithLawyer>
          data={requests ?? []}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          renderItem={({ item }) => (
            <RequestItem
              item={item}
              onPress={() =>
                item.lawyer ? navigation.navigate('LawyerDetail', { lawyerId: item.lawyerId }) : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No has realizado solicitudes aún</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          contentContainerStyle={
            (requests ?? []).length === 0 ? styles.emptyFill : { paddingBottom: 24, paddingTop: 8 }
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyFill: { flex: 1 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lawyerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginRight: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  lawyerName: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 1 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  message: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 6 },
  date: { fontSize: 12, color: '#9CA3AF' },
});
