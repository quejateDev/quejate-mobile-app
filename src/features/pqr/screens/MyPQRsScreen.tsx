import React, { useCallback, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '@navigation/navigationRef';
import { useMyPQRs } from '@features/pqr/hooks/useMyPQRs';
import { useMyPQRsFilter, MY_PQRS_FILTER_MAX_PQRS } from '@features/pqr/hooks/useMyPQRsFilter';
import type { MyPQRsFilterStatus } from '@features/pqr/hooks/useMyPQRsFilter';
import { useAuth } from '@core/auth/useAuth';
import PQRCard from '@features/pqr/components/PQRCard';
import type { PQRS, PQRSStatus } from '@core/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const STATUS_FILTERS: Array<{ value: PQRSStatus | undefined; label: string; color: string }> = [
  { value: undefined,     label: 'Todas',      color: '#6B7280' },
  { value: 'PENDING',     label: 'Pendiente',  color: '#D97706' },
  { value: 'IN_PROGRESS', label: 'En Proceso', color: '#2563EB' },
  { value: 'RESOLVED',    label: 'Resuelto',   color: '#16A34A' },
  { value: 'CLOSED',      label: 'Cerrado',    color: '#4B5563' },
];

/**
 * Lo que hay que saber de una lista filtrada antes de leerla: que aún no están
 * todas las PQRSD, que no se pudieron traer, o que la persona tiene más de las
 * que se filtran. Va encima de la lista y no al final, como el aviso de la
 * búsqueda del muro, para que una lista a medias no se lea como si fuera entera.
 */
function FilterNotice({
  status,
  limitReached,
  onRetry,
}: {
  status: MyPQRsFilterStatus;
  limitReached: boolean;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <View style={styles.filterNotice}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.filterNoticeText}>Cargando todas tus PQRSD…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.filterNotice}>
        <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
        <Text style={styles.filterNoticeText}>No se pudieron cargar todas tus PQRSD.</Text>
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
        >
          <Text style={styles.filterNoticeAction}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (limitReached) {
    return (
      <View style={styles.filterNotice}>
        <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
        <Text style={styles.filterNoticeText}>
          {`Filtrando entre tus ${MY_PQRS_FILTER_MAX_PQRS} más recientes`}
        </Text>
      </View>
    );
  }
  return null;
}

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
    isError,
  } = useMyPQRs();

  const allPqrs: PQRS[] = Array.from(
    new Map(
      (data?.pages.flatMap((p) => p?.pqrs ?? []) ?? [])
        .filter((p): p is PQRS => !!p?.id)
        .map((p) => [p.id, p]),
    ).values(),
  );
  // Lo cargado es la lista entera cuando el servidor dice que no hay más
  // páginas. Hasta que llega la primera no hay nada que filtrar: su carga y su
  // error los dice la pantalla, igual que con «Todas».
  const loadedIsWhole = !!data && !hasNextPage;
  const filter = useMyPQRsFilter(data ? activeStatus : undefined, allPqrs, loadedIsWhole);
  const { refetch: refetchWholeList } = filter;
  const isFiltering = filter.status !== 'idle';
  const pqrs = isFiltering ? filter.results : allPqrs;

  // «No tienes PQRSDs con este estado» solo se afirma con la lista entera
  // delante. Mientras llega, o si no llegó, lo que pasa lo dice el aviso de
  // encima de la lista.
  let emptyText: string | null = null;
  if (isFiltering) {
    if (filter.status === 'complete') emptyText = 'No tienes PQRSDs con este estado';
  } else if (!activeStatus) {
    emptyText = 'Aún no has radicado ninguna PQRSD';
  }

  // La tab nunca se desmonta, así que al volver del detalle (o de otra tab) la
  // lista no se volvía a pedir y los estados quedaban viejos (p. ej. "Pendiente"
  // en la tarjeta con la PQRSD ya resuelta). Refrescamos en cada re-foco; el
  // primer foco se salta porque el mount ya dispara el fetch inicial.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      refetch();
      // Con un estado elegido, lo que se ve puede salir de la lista entera: se
      // refresca también.
      refetchWholeList();
    }, [refetch, refetchWholeList]),
  );

  // La lista se carga de 10 en 10, así que contar lo cargado dice «10 radicados»
  // a quien tiene 30. El servidor manda el total con cada página, y vale el de
  // la última que llegó. Si no lo mandara, se cuenta lo cargado.
  const lastPage = data?.pages[data.pages.length - 1];
  const total = lastPage?.totalCount ?? allPqrs.length;

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
                {total > 0 ? `${total} radicado${total !== 1 ? 's' : ''}` : 'Sin radicados aún'}
              </Text>
            </View>
            <View style={styles.filterScroll}>{filterBar}</View>
            <FilterNotice
              status={filter.status}
              limitReached={filter.limitReached}
              onRetry={refetchWholeList}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ margin: 32 }} color="#2563EB" />
          ) : isError && !isFiltering ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline-outline" size={52} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Error al cargar</Text>
              <Text style={styles.emptyText}>No se pudieron cargar tus PQRSDs. Verifica tu conexión.</Text>
              <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : emptyText ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={52} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Sin PQRSDs</Text>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: 16 }} color="#2563EB" />
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage && !isFiltering) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => {
              refetch();
              // Con un estado elegido, lo que se ve puede salir de la lista
              // entera: se refresca también.
              refetchWholeList();
            }}
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
  filterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  filterNoticeText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  filterNoticeAction: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
  unauthContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  unauthTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  unauthText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
