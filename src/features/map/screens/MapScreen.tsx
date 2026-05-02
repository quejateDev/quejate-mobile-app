import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { typeMap, statusMap } from '@core/types';
import type { PQRS, PQRSType, PQRSStatus } from '@core/types';

const COLOMBIA_REGION: Region = {
  latitude: 4.711,
  longitude: -74.0721,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const TYPE_OPTIONS: PQRSType[] = ['PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION', 'REPORT'];
const STATUS_OPTIONS: PQRSStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface PQRListResponse {
  pqrs: PQRS[];
}

function useMapPQRs() {
  return useQuery<PQRS[]>({
    queryKey: ['pqrs-map'],
    queryFn: () =>
      apiClient
        .get<PQRListResponse>(ENDPOINTS.PQR.LIST, { params: { limit: 50 } })
        .then((r) => r.data.pqrs),
    staleTime: 30_000,
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MapScreen() {
  const { data: pqrs, isLoading, isError, error, refetch, isRefetching } = useMapPQRs();
  const [selectedType, setSelectedType] = useState<PQRSType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PQRSStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const markers = useMemo(() => {
    if (!pqrs) return [];
    return pqrs.filter(
      (p) =>
        p.latitude != null &&
        p.longitude != null &&
        (selectedType == null || p.type === selectedType) &&
        (selectedStatus == null || p.status === selectedStatus),
    );
  }, [pqrs, selectedType, selectedStatus]);

  const hasFilters = selectedType != null || selectedStatus != null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa de PQRSDs</Text>
        <View style={styles.headerRight}>
          {markers.length > 0 && (
            <Text style={styles.counter}>{markers.length} ubicación{markers.length !== 1 ? 'es' : ''}</Text>
          )}
          <TouchableOpacity
            onPress={() => refetch()}
            disabled={isRefetching}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.refreshBtn, isRefetching && styles.refreshBtnDisabled]}>
              Actualizar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {TYPE_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, selectedType === t && { backgroundColor: typeMap[t].color, borderColor: typeMap[t].color }]}
              onPress={() => setSelectedType(selectedType === t ? null : t)}
            >
              <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>
                {typeMap[t].label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.chipDivider} />
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedStatus === s && styles.chipSelected]}
              onPress={() => setSelectedStatus(selectedStatus === s ? null : s)}
            >
              <Text style={[styles.chipText, selectedStatus === s && styles.chipTextActive]}>
                {statusMap[s].label}
              </Text>
            </TouchableOpacity>
          ))}
          {hasFilters && (
            <TouchableOpacity
              style={styles.clearChip}
              onPress={() => { setSelectedType(null); setSelectedStatus(null); }}
            >
              <Text style={styles.clearChipText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View style={styles.mapContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#2563EB" />
          </View>
        )}
        {isError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>
              Error al cargar los datos
            </Text>
            {error instanceof Error && (
              <Text style={styles.errorDetail} numberOfLines={2}>
                {error.message}
              </Text>
            )}
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        <MapView style={styles.map} initialRegion={COLOMBIA_REGION}>
          {markers.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
              pinColor={typeMap[p.type].color}
            >
              <Callout style={styles.callout}>
                <Text style={styles.calloutSubject} numberOfLines={2}>
                  {p.subject ?? typeMap[p.type].label}
                </Text>
                <Text style={styles.calloutMeta}>
                  {typeMap[p.type].label} · {statusMap[p.status].label}
                </Text>
                <Text style={styles.calloutEntity} numberOfLines={1}>
                  {p.entity.name}
                </Text>
                <Text style={styles.calloutDate}>{formatDate(p.createdAt)}</Text>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counter: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  refreshBtn: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  refreshBtnDisabled: { color: '#93C5FD' },
  filtersWrapper: { paddingBottom: 6 },
  filtersRow: { paddingHorizontal: 16, gap: 6, paddingVertical: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 2 },
  clearChip: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearChipText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  errorOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    zIndex: 10,
    alignItems: 'center',
  },
  errorText: { fontSize: 14, fontWeight: '600', color: '#DC2626', marginBottom: 4 },
  errorDetail: { fontSize: 12, color: '#B91C1C', textAlign: 'center', marginBottom: 8 },
  retryBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  callout: { width: 200, padding: 4 },
  calloutSubject: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  calloutMeta: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  calloutEntity: { fontSize: 11, color: '#2563EB', fontWeight: '600', marginBottom: 2 },
  calloutDate: { fontSize: 11, color: '#9CA3AF' },
});
