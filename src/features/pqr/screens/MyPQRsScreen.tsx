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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

  const allPqrs: PQRS[] = data?.pages.flatMap((p) => p.pqrs) ?? [];
  const pqrs = activeStatus ? allPqrs.filter((p) => p.status === activeStatus) : allPqrs;

  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
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

  if (!isAuthenticated) {
    return (
      <View style={styles.unauthContainer}>
        <Text style={styles.unauthText}>Inicia sesión para ver tus PQRSDs</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <View style={styles.headerRow}>
              <Text style={styles.title}>Mis PQRSDs</Text>
              <Text style={styles.subtitle}>Todas tus solicitudes en un lugar</Text>
            </View>
            {filterBar}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no tienes PQRSDs</Text>
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
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  unauthContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unauthText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F9FAFB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});
