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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@navigation/AppNavigator';
import { usePQRList } from '@features/pqr/hooks/usePQRList';
import PQRCard from '@features/pqr/components/PQRCard';
import { typeMap } from '@core/types';
import type { PQRS, PQRSType } from '@core/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const TYPE_FILTERS: Array<{ value: PQRSType | undefined; label: string }> = [
  { value: undefined, label: 'Todas' },
  { value: 'PETITION', label: typeMap.PETITION.label },
  { value: 'COMPLAINT', label: typeMap.COMPLAINT.label },
  { value: 'CLAIM', label: typeMap.CLAIM.label },
  { value: 'SUGGESTION', label: typeMap.SUGGESTION.label },
  { value: 'REPORT', label: typeMap.REPORT.label },
];

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
    </View>
  );
}

function ListHeader({
  onNew,
  onMyPQRs,
  isLoading,
  activeType,
  onTypeChange,
}: {
  onNew: () => void;
  onMyPQRs: () => void;
  isLoading: boolean;
  activeType: PQRSType | undefined;
  onTypeChange: (type: PQRSType | undefined) => void;
}) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>PQRSDs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.myPQRsButton} onPress={onMyPQRs}>
            <Text style={styles.myPQRsButtonText}>Mis PQRSDs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={onNew}>
            <Text style={styles.newButtonText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {TYPE_FILTERS.map((f) => {
          const active = f.value === activeType;
          const color = f.value ? typeMap[f.value].color : '#2563EB';
          return (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterChip,
                active && { backgroundColor: color + '18', borderColor: color },
              ]}
              onPress={() => onTypeChange(f.value)}
            >
              <Text style={[styles.filterChipText, active && { color, fontWeight: '700' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}
    </View>
  );
}

export default function PQRListScreen() {
  const navigation = useNavigation<Nav>();
  const [activeType, setActiveType] = useState<PQRSType | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = usePQRList(activeType ? { type: activeType } : {});

  const pqrs: PQRS[] = data?.pages.flatMap((p) => p.pqrs) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <ListHeader
            onNew={() => navigation.navigate('CreatePQR')}
            onMyPQRs={() => navigation.navigate('MyPQRs')}
            isLoading={isLoading}
            activeType={activeType}
            onTypeChange={setActiveType}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay PQRSDs disponibles</Text>
            </View>
          ) : null
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  myPQRsButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  myPQRsButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  newButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  skeletonCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    height: 100,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    width: '90%',
  },
});
