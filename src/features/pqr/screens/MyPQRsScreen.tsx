import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '@navigation/navigationRef';
import { useMyPQRs } from '@features/pqr/hooks/useMyPQRs';
import { useAuth } from '@core/auth/useAuth';
import PQRCard from '@features/pqr/components/PQRCard';
import type { PQRS, PQRSStatus } from '@core/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const STATUS_FILTERS: Array<{ value: PQRSStatus | undefined; label: string; color: string }> = [
  { value: undefined,     label: 'Todas',      color: '#6B7280' },
  { value: 'PENDING',     label: 'Pendiente',  color: '#D97706' },
  { value: 'IN_PROGRESS', label: 'En Proceso', color: '#2563EB' },
  { value: 'RESOLVED',    label: 'Resuelto',   color: '#16A34A' },
  { value: 'CLOSED',      label: 'Cerrado',    color: '#6B7280' },
];

export default function MyPQRsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [activeStatus, setActiveStatus] = useState<PQRSStatus | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useMyPQRs();

  const allPqrs: PQRS[] = Array.from(
    new Map(
      (data?.pages.flatMap((p) => p?.pqrs ?? []) ?? [])
        .filter((p): p is PQRS => !!p?.id)
        .map((p) => [p.id, p]),
    ).values(),
  );
  const pqrs = activeStatus ? allPqrs.filter((p) => p.status === activeStatus) : allPqrs;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.unauthContainer}>
          <Ionicons name="lock-closed-outline" size={52} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <Text style={styles.unauthTitle}>Inicia sesión</Text>
          <Text style={styles.unauthText}>Para ver tus PQRSDs debes iniciar sesión</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterContent}
    >
      {STATUS_FILTERS.map((f) => {
        const isActive = activeStatus === f.value;
        return (
          <TouchableOpacity
            key={f.label}
            style={[
              styles.filterChip,
              isActive && { backgroundColor: f.color, borderColor: f.color },
            ]}
            onPress={() => setActiveStatus(f.value)}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']} />
      <FlatList
        data={pqrs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PQRCard
            pqr={item}
            onPress={() => navigation.navigate('PQRDetail', { id: item.id })}
          />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.blueHeader}>
              <Text style={styles.title}>Mis PQRSDs</Text>
              <Text style={styles.subtitle}>
                {allPqrs.length > 0 ? `${allPqrs.length} radicado${allPqrs.length !== 1 ? 's' : ''}` : 'Sin radicados aún'}
              </Text>
            </View>
            <View style={styles.filterScroll}>{filterBar}</View>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={52} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sin PQRSDs</Text>
              <Text style={styles.emptyText}>
                {activeStatus ? 'No tienes PQRSDs con este estado' : 'Aún no has radicado ninguna PQRSD'}
              </Text>
            </View>
          ) : (
            <ActivityIndicator style={{ margin: 32 }} color="#2563EB" />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 16 }} color="#2563EB" />
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 76 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  safeAreaTop: { backgroundColor: '#1E3A8A' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  blueHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  subtitle: { fontSize: 13, color: '#BFDBFE', marginTop: 2 },
  filterScroll: { marginBottom: 4, marginTop: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F9FAFB',
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  unauthContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  unauthTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  unauthText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
