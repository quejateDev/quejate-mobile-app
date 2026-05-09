import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path } from 'react-native-svg';

function Isotype({ size = 28, color = '#fff' }: { size?: number; color?: string }) {
  const scale = size / 154.6816;
  return (
    <Svg width={139.7268 * scale} height={size} viewBox="0 0 139.7268 154.6816">
      <G fill={color}>
        <Path d="M89.1536,72.8975v22.4693h-22.397c-10.9813,0-19.7957-8.8867-19.7957-19.7962v-3.4677c0-10.476,8.4528-18.9288,18.9288-18.9288h3.5401c10.9094,0,19.7239,8.814,19.7239,19.7234Z" />
        <Path d="M113.7175,122.1703c14.3772,0,26.0094,11.6317,26.0094,26.0094v6.502h-32.5837v-32.5114h.0723V32.5837H32.5837v89.5866h42.0481v6.8636c0,12.9321,9.3921,23.6251,21.7466,25.6478H26.0812c-14.3772,0-26.0812-11.6317-26.0812-26.0089V26.0812C0,11.7041,11.7041,0,26.0812,0h87.6362c14.3772,0,26.0094,11.7041,26.0094,26.0812v70.0801c0,14.3772-11.6322,26.0089-26.0094,26.0089Z" />
      </G>
    </Svg>
  );
}
import { AppStackParamList } from '@navigation/navigationRef';
import { usePQRList } from '@features/pqr/hooks/usePQRList';
import { useNotifications } from '@features/notifications/hooks/useNotifications';
import PQRCard from '@features/pqr/components/PQRCard';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { PQRS } from '@core/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const FRECUENTES: Array<{
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  entityNameHint: string;
  categoryHint: string;
}> = [
  {
    label: 'Vías en mal estado',
    sublabel: 'Huecos y pavimento',
    icon: 'car-outline',
    color: '#B45309',
    entityNameHint: 'EDUS',
    categoryHint: 'Vías en mal estado',
  },
  {
    label: 'Acueducto y agua',
    sublabel: 'Fugas y suministro',
    icon: 'water-outline',
    color: '#0891B2',
    entityNameHint: 'ESSMAR',
    categoryHint: 'Acueducto y agua',
  },
  {
    label: 'Alumbrado público',
    sublabel: 'Postes sin luz',
    icon: 'flash-outline',
    color: '#D97706',
    entityNameHint: 'ATESA',
    categoryHint: 'Alumbrado público',
  },
  {
    label: 'Recolección basura',
    sublabel: 'Sin recolección',
    icon: 'trash-outline',
    color: '#16A34A',
    entityNameHint: 'ATESA',
    categoryHint: 'Recolección de basura',
  },
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

export default function PQRListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = usePQRList({});

  const allPqrs: PQRS[] = Array.from(
    new Map(
      (data?.pages.flatMap((p) => p?.pqrs ?? []) ?? [])
        .filter((p): p is PQRS => !!p?.id)
        .map((p) => [p.id, p]),
    ).values(),
  );
  const pqrs = search.trim()
    ? allPqrs.filter(
        (p) =>
          p.subject?.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()) ||
          p.entity?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : allPqrs;

  if (isError) {
    return (
      <SafeAreaView style={styles.outerContainer} edges={['top']}>
        <ErrorState
          message="No se pudieron cargar las PQRSDs. Verifica tu conexión."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View>
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => navigation.navigate('CreatePQR')}
        activeOpacity={0.9}
      >
        <View style={styles.heroIconCircle}>
          <Ionicons name="add" size={32} color="#1D4ED8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroCardTitle}>Nueva PQRSD</Text>
          <Text style={styles.heroCardSubtitle}>Radica tu petición, queja o reclamo</Text>
        </View>
        <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Frecuentes en Santa Marta</Text>
      <View style={styles.frecuentesGrid}>
        {FRECUENTES.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.frecuenteItem}
            onPress={() =>
              navigation.navigate('CreatePQR', {
                entityNameHint: item.entityNameHint,
                categoryHint: item.categoryHint,
              })
            }
            activeOpacity={0.75}
          >
            <View style={[styles.frecuenteIconCircle, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.frecuenteLabel} numberOfLines={2}>{item.label}</Text>
            <Text style={styles.frecuenteSublabel} numberOfLines={1}>{item.sublabel}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Comunidad</Text>

      {isLoading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}
    </View>
  );

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Isotype size={30} color="rgba(255,255,255,0.9)" />
            <Text style={styles.headerTitle}>Quéjate</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notificaciones')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ position: 'relative' }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar PQRSD..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={pqrs}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item }) => (
          <PQRCard
            pqr={item}
            onPress={() => navigation.navigate('PQRDetail', { id: item.id })}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search ? 'Sin resultados para tu búsqueda' : 'No hay PQRSDs disponibles'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 16 }} color="#2563EB" />
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage && !search) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor="#fff"
            progressBackgroundColor="#2563EB"
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
  blueHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 99,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#1E3A8A' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  heroCard: {
    backgroundColor: '#1D4ED8',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.2 },
  heroCardSubtitle: { fontSize: 13, color: '#BFDBFE', lineHeight: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  frecuentesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  frecuenteItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  frecuenteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  frecuenteLabel: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 17, marginBottom: 2 },
  frecuenteSublabel: { fontSize: 11, color: '#9CA3AF' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
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
