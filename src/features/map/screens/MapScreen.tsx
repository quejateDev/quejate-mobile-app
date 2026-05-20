import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { typeMap, statusMap } from '@core/types';
import type { PQRS, PQRSType, PQRSStatus } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';

// Match the create-PQR MiniMap: centre on Santa Marta and its surroundings.
const SANTA_MARTA_REGION: Region = {
  latitude: 11.2408,
  longitude: -74.199,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const TYPE_OPTIONS: PQRSType[] = ['PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION', 'REPORT'];
const STATUS_OPTIONS: PQRSStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

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
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const { data: pqrs, isLoading, isError, error, refetch, isRefetching } = useMapPQRs();
  const [selectedType, setSelectedType] = useState<PQRSType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PQRSStatus | null>(null);
  const [selected, setSelected] = useState<PQRS | null>(null);

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={{ marginRight: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={[styles.title, { flex: 1 }]}>Mapa ciudadano</Text>
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
        <MapView
          style={styles.map}
          initialRegion={SANTA_MARTA_REGION}
          mapPadding={{ top: 0, left: 0, right: 0, bottom: insets.bottom }}
          onPress={() => setSelected(null)}
        >
          {markers.map((p) => {
            const pType = typeMap[p.type] ?? { label: p.type ?? '—', color: '#6B7280' };
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                pinColor={pType.color}
                onPress={() => setSelected(p)}
              />
            );
          })}
        </MapView>

        {selected && (() => {
          const sType = typeMap[selected.type] ?? { label: selected.type ?? '—', color: '#6B7280' };
          const sStatus = statusMap[selected.status] ?? { label: selected.status ?? '—' };
          const author = selected.anonymous ? 'Anónimo' : selected.creator?.name ?? null;
          return (
            <View style={[styles.previewCard, { bottom: insets.bottom + 14 }]}>
              <TouchableOpacity
                style={styles.previewClose}
                onPress={() => setSelected(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar vista previa"
              >
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.previewSubject} numberOfLines={2}>
                {selected.subject ?? sType.label}
              </Text>

              <View style={styles.previewBadges}>
                <View style={[styles.previewBadge, { backgroundColor: sType.color + '22' }]}>
                  <Text style={[styles.previewBadgeText, { color: sType.color }]}>{sType.label}</Text>
                </View>
                <View style={styles.previewStatusBadge}>
                  <Text style={styles.previewStatusText}>{sStatus.label}</Text>
                </View>
              </View>

              {author ? (
                <View style={styles.previewRow}>
                  {selected.creator?.image ? (
                    <Image source={{ uri: selected.creator.image }} style={styles.previewAvatar} />
                  ) : (
                    <View style={styles.previewAvatarFallback}>
                      <Text style={styles.previewAvatarInitial}>{author.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.previewAuthor} numberOfLines={1}>{author}</Text>
                </View>
              ) : null}

              {selected.entity?.name ? (
                <View style={styles.previewRow}>
                  <Ionicons name="business-outline" size={14} color="#6B7280" />
                  <Text style={styles.previewMeta} numberOfLines={1}>{selected.entity.name}</Text>
                </View>
              ) : null}

              <View style={styles.previewRow}>
                <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                <Text style={styles.previewDate}>{formatDate(selected.createdAt)}</Text>
              </View>

              <TouchableOpacity
                style={styles.previewBtn}
                onPress={() => navigation.navigate('PQRDetail', { id: selected.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.previewBtnText}>Ver PQRSD</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          );
        })()}
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
  previewCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  previewClose: { position: 'absolute', top: 10, right: 10, padding: 4, zIndex: 1 },
  previewSubject: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8, paddingRight: 28 },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  previewBadgeText: { fontSize: 12, fontWeight: '700' },
  previewStatusBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  previewStatusText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  previewAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' },
  previewAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarInitial: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  previewAuthor: { fontSize: 13, color: '#374151', fontWeight: '600', flex: 1 },
  previewMeta: { fontSize: 13, color: '#374151', flex: 1 },
  previewDate: { fontSize: 13, color: '#9CA3AF' },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },
  previewBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
