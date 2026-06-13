import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { StepHeader } from './StepHeader';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import type { UseFormSetValue } from 'react-hook-form';
import type { FormData, NamedItem } from './createPQRTypes';
import { styles } from './createPQRStyles';
import { findByName } from '@shared/utils/geoMatch';

interface Props {
  geoDepId: string;
  setGeoDepId: (id: string) => void;
  geoMunId: string;
  setGeoMunId: (id: string) => void;
  isDeptOpen: boolean;
  setIsDeptOpen: Dispatch<SetStateAction<boolean>>;
  isMunOpen: boolean;
  setIsMunOpen: Dispatch<SetStateAction<boolean>>;
  isEntityOpen: boolean;
  setIsEntityOpen: Dispatch<SetStateAction<boolean>>;
  isEntityDeptOpen: boolean;
  setIsEntityDeptOpen: Dispatch<SetStateAction<boolean>>;
  departments: NamedItem[];
  loadingDepts: boolean;
  municipalities: NamedItem[];
  loadingMuns: boolean;
  entities: NamedItem[];
  loadingEntities: boolean;
  entityDepartments: NamedItem[];
  loadingConfig: boolean;
  entityIdError?: string;
  watchedEntityId: string;
  watchedEntityDeptId?: string;
  setValue: UseFormSetValue<FormData>;
  preselectedEntityName?: string;
  /** Si true, al entrar se autodetecta y aplica el departamento por defecto
   *  (sin selección manual). Solo para el flujo genérico de "Nueva PQRSD". */
  autoDetectOnMount?: boolean;
}

function findName(list: NamedItem[], id: string): string {
  return list.find((item) => item.id === id)?.name ?? '';
}

export function EntitySelector({
  geoDepId,
  setGeoDepId,
  geoMunId,
  setGeoMunId,
  isDeptOpen,
  setIsDeptOpen,
  isMunOpen,
  setIsMunOpen,
  isEntityOpen,
  setIsEntityOpen,
  isEntityDeptOpen,
  setIsEntityDeptOpen,
  departments,
  loadingDepts,
  municipalities,
  loadingMuns,
  entities,
  loadingEntities,
  entityDepartments,
  loadingConfig,
  entityIdError,
  watchedEntityId,
  watchedEntityDeptId,
  setValue,
  preselectedEntityName,
  autoDetectOnMount,
}: Props) {
  const [entitySearch, setEntitySearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [pendingCity, setPendingCity] = useState<string | null>(null);
  const [autoApplied, setAutoApplied] = useState(false);
  // El usuario eligió manualmente dep/mun/entidad → la autodetección NO debe
  // sobreescribir su selección, aunque el GPS resuelva después.
  const manualPickRef = useRef(false);
  const autoTriedRef = useRef(false);

  /** Marca que hubo interacción manual y oculta el banner de ubicación. */
  function markManual() {
    manualPickRef.current = true;
    setAutoApplied(false);
  }

  // Cuando muns cargan tras detectar el dep, intentamos matchear la ciudad.
  useEffect(() => {
    if (!pendingCity || municipalities.length === 0) return;
    if (manualPickRef.current) {
      setPendingCity(null);
      return;
    }
    const match = findByName(municipalities, pendingCity);
    if (match) setGeoMunId(match.id);
    setPendingCity(null);
  }, [municipalities, pendingCity, setGeoMunId]);

  type GeoResult =
    | { ok: true; depMatch: NamedItem; city: string }
    | { ok: false; reason: 'denied' | 'no-position' | 'no-dep' | 'error'; region?: string };

  async function resolveLocation(): Promise<GeoResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { ok: false, reason: 'denied' };
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const r = results[0];
      if (!r) return { ok: false, reason: 'no-position' };
      const region = r.region ?? r.subregion ?? '';
      const city = r.city ?? r.district ?? r.subregion ?? '';
      const depMatch = region ? findByName(departments, region) : undefined;
      if (!depMatch) return { ok: false, reason: 'no-dep', region };
      return { ok: true, depMatch, city };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  function applyDetectedLocation(depMatch: NamedItem, city: string) {
    setGeoDepId(depMatch.id);
    setGeoMunId('');
    setValue('entityId', '');
    setValue('entityDepartmentId', '');
    setPendingCity(city || null);
  }

  // Autodetección silenciosa al entrar (default): aplica el departamento sin
  // alertas ni selección manual. Respeta cualquier elección manual previa.
  useEffect(() => {
    if (!autoDetectOnMount || autoTriedRef.current) return;
    if (departments.length === 0) return;
    if (manualPickRef.current || geoDepId || watchedEntityId) return;
    autoTriedRef.current = true;
    let cancelled = false;
    setDetecting(true);
    resolveLocation()
      .then((res) => {
        if (cancelled || manualPickRef.current) return;
        if (res.ok) {
          applyDetectedLocation(res.depMatch, res.city);
          setAutoApplied(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });
    return () => {
      cancelled = true;
    };
    // Se ejecuta una sola vez cuando los departamentos ya están cargados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetectOnMount, departments]);

  // Botón manual: igual que la autodetección pero con alertas explícitas.
  async function runAutodetect() {
    manualPickRef.current = false; // acción explícita de ubicación
    setDetecting(true);
    try {
      const res = await resolveLocation();
      if (!res.ok) {
        if (res.reason === 'denied') {
          Alert.alert(
            'Permiso requerido',
            'Habilita la ubicación en ajustes para detectar automáticamente tu departamento y ciudad.',
          );
        } else if (res.reason === 'no-position') {
          Alert.alert('Sin resultados', 'No pudimos detectar tu ubicación. Selecciona manualmente.');
        } else if (res.reason === 'no-dep') {
          Alert.alert(
            'Departamento no encontrado',
            res.region
              ? `No pudimos asociar "${res.region}" a un departamento disponible.`
              : 'No pudimos detectar tu departamento.',
          );
        } else {
          Alert.alert('Error', 'No se pudo obtener tu ubicación. Intenta de nuevo o selecciona manualmente.');
        }
        return;
      }
      applyDetectedLocation(res.depMatch, res.city);
      setAutoApplied(true);
    } finally {
      setDetecting(false);
    }
  }

  const filteredEntities = entitySearch.trim()
    ? entities.filter((e) => e.name.toLowerCase().includes(entitySearch.toLowerCase()))
    : entities;

  const filteredDepartments = deptSearch.trim()
    ? departments.filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
    : departments;

  function closeAll() {
    setIsDeptOpen(false);
    setIsMunOpen(false);
    setIsEntityOpen(false);
    setIsEntityDeptOpen(false);
  }

  const entityName = watchedEntityId
    ? (findName(entities, watchedEntityId) || preselectedEntityName || watchedEntityId)
    : '';

  return (
    <View testID="step1-content">
      <StepHeader step={1} title="Ubicación y entidad" />

      {autoApplied && geoDepId ? (
        <View style={selectorStyles.locationBanner}>
          <Ionicons name="location" size={15} color="#2563EB" />
          <Text style={selectorStyles.locationBannerText} numberOfLines={1}>
            Mostrando entidades de {findName(departments, geoDepId)}
            {geoMunId ? `, ${findName(municipalities, geoMunId)}` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => {
              markManual();
              setGeoDepId('');
              setGeoMunId('');
              setPendingCity(null);
              setValue('entityId', '');
              setValue('entityDepartmentId', '');
              closeAll();
            }}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las entidades"
          >
            <Text style={selectorStyles.locationBannerClear}>Ver todas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={selectorStyles.autodetectBtn}
          onPress={runAutodetect}
          disabled={detecting}
          accessibilityRole="button"
          accessibilityLabel="Detectar mi ubicación"
        >
          {detecting ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Ionicons name="locate" size={16} color="#2563EB" />
          )}
          <Text style={selectorStyles.autodetectText}>
            {detecting ? 'Detectando ubicación…' : 'Usar mi ubicación'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Departamento geográfico */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Departamento (opcional)</Text>
        <View style={selectorStyles.row}>
          <TouchableOpacity
            testID="dept-selector"
            style={[styles.selector, { flex: 1 }]}
            onPress={() => { closeAll(); setIsDeptOpen((v) => !v); }}
          >
            <Text style={geoDepId ? styles.selectorText : styles.selectorPlaceholder}>
              {geoDepId ? findName(departments, geoDepId) : 'Selecciona un departamento'}
            </Text>
          </TouchableOpacity>
          {geoDepId ? (
            <TouchableOpacity
              style={selectorStyles.clearBtn}
              onPress={() => {
                markManual();
                setGeoDepId('');
                setGeoMunId('');
                setValue('entityId', '');
                setValue('entityDepartmentId', '');
                closeAll();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        {isDeptOpen && (
          <View style={styles.optionList}>
            <View style={selectorStyles.searchContainer}>
              <Ionicons name="search-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                style={selectorStyles.searchInput}
                placeholder="Buscar departamento..."
                placeholderTextColor="#9CA3AF"
                value={deptSearch}
                onChangeText={setDeptSearch}
                autoFocus
                maxFontSizeMultiplier={1.2}
              />
              {deptSearch ? (
                <TouchableOpacity onPress={() => setDeptSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
            {loadingDepts ? (
              <ActivityIndicator style={styles.optionLoader} />
            ) : (
              <ScrollView style={styles.optionScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredDepartments.length === 0 ? (
                  <Text style={selectorStyles.noResults}>Sin resultados</Text>
                ) : (
                  filteredDepartments.map((dept) => (
                    <TouchableOpacity
                      key={dept.id}
                      testID={`dept-option-${dept.id}`}
                      style={styles.optionItem}
                      onPress={() => {
                        markManual();
                        setGeoDepId(dept.id);
                        setGeoMunId('');
                        setValue('entityId', '');
                        setValue('entityDepartmentId', '');
                        setDeptSearch('');
                        setIsDeptOpen(false);
                      }}
                    >
                      <Text style={styles.optionText}>{dept.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Municipio geográfico */}
      {geoDepId ? (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Municipio (opcional)</Text>
          <View style={selectorStyles.row}>
            <TouchableOpacity
              testID="municipality-selector"
              style={[styles.selector, { flex: 1 }]}
              onPress={() => { closeAll(); setIsMunOpen((v) => !v); }}
            >
              <Text style={geoMunId ? styles.selectorText : styles.selectorPlaceholder}>
                {geoMunId ? findName(municipalities, geoMunId) : 'Selecciona un municipio'}
              </Text>
            </TouchableOpacity>
            {geoMunId ? (
              <TouchableOpacity
                style={selectorStyles.clearBtn}
                onPress={() => {
                  markManual();
                  setGeoMunId('');
                  setValue('entityId', '');
                  setValue('entityDepartmentId', '');
                  closeAll();
                }}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          {isMunOpen && (
            <View style={styles.optionList}>
              {loadingMuns ? (
                <ActivityIndicator style={styles.optionLoader} />
              ) : (
                <ScrollView style={styles.optionScroll} nestedScrollEnabled>
                  {municipalities.map((mun) => (
                    <TouchableOpacity
                      key={mun.id}
                      testID={`municipality-option-${mun.id}`}
                      style={styles.optionItem}
                      onPress={() => {
                        markManual();
                        setGeoMunId(mun.id);
                        setValue('entityId', '');
                        setValue('entityDepartmentId', '');
                        setIsMunOpen(false);
                      }}
                    >
                      <Text style={styles.optionText}>{mun.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      ) : null}

      {/* Entidad */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Entidad *</Text>
        <View style={selectorStyles.row}>
          <TouchableOpacity
            testID="entity-selector"
            style={[styles.selector, { flex: 1 }, entityIdError && styles.selectorError]}
            onPress={() => { closeAll(); setIsEntityOpen((v) => !v); }}
          >
            <Text style={watchedEntityId ? styles.selectorText : styles.selectorPlaceholder}>
              {entityName || 'Selecciona una entidad'}
            </Text>
          </TouchableOpacity>
          {watchedEntityId ? (
            <TouchableOpacity
              style={selectorStyles.clearBtn}
              onPress={() => {
                markManual();
                setValue('entityId', '');
                setValue('entityDepartmentId', '');
                setEntitySearch('');
                closeAll();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        {entityIdError && (
          <Text style={styles.fieldError}>{entityIdError}</Text>
        )}
        {isEntityOpen && (
          <View style={styles.optionList}>
            <View style={selectorStyles.searchContainer}>
              <Ionicons name="search-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                style={selectorStyles.searchInput}
                placeholder="Buscar entidad..."
                placeholderTextColor="#9CA3AF"
                value={entitySearch}
                onChangeText={setEntitySearch}
                autoFocus
                maxFontSizeMultiplier={1.2}
              />
              {entitySearch ? (
                <TouchableOpacity onPress={() => setEntitySearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
            {loadingEntities ? (
              <ActivityIndicator style={styles.optionLoader} />
            ) : (
              <ScrollView style={styles.optionScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredEntities.length === 0 ? (
                  <Text style={selectorStyles.noResults}>Sin resultados</Text>
                ) : (
                  filteredEntities.map((entity) => (
                    <TouchableOpacity
                      key={entity.id}
                      testID={`entity-option-${entity.id}`}
                      style={styles.optionItem}
                      onPress={() => {
                        markManual();
                        setValue('entityId', entity.id);
                        setValue('entityDepartmentId', '');
                        setIsEntityOpen(false);
                        setEntitySearch('');
                      }}
                    >
                      <Text style={styles.optionText}>{entity.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Sub-departamento de la entidad */}
      {watchedEntityId && entityDepartments.length > 0 && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Área / Departamento (opcional)</Text>
          <View style={selectorStyles.row}>
            <TouchableOpacity
              testID="entity-dept-selector"
              style={[styles.selector, { flex: 1 }]}
              onPress={() => { closeAll(); setIsEntityDeptOpen((v) => !v); }}
            >
              <Text style={watchedEntityDeptId ? styles.selectorText : styles.selectorPlaceholder}>
                {watchedEntityDeptId
                  ? findName(entityDepartments, watchedEntityDeptId)
                  : 'Selecciona un área (opcional)'}
              </Text>
            </TouchableOpacity>
            {watchedEntityDeptId ? (
              <TouchableOpacity
                style={selectorStyles.clearBtn}
                onPress={() => { setValue('entityDepartmentId', ''); closeAll(); }}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          {isEntityDeptOpen && (
            <View style={styles.optionList}>
              <ScrollView style={styles.optionScroll} nestedScrollEnabled>
                {entityDepartments.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    testID={`entity-dept-option-${dept.id}`}
                    style={styles.optionItem}
                    onPress={() => {
                      setValue('entityDepartmentId', dept.id);
                      setIsEntityDeptOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{dept.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {loadingConfig && watchedEntityId ? (
        <ActivityIndicator style={styles.configLoader} />
      ) : null}
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  clearBtn: { paddingLeft: 8, paddingVertical: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 2 },
  noResults: { textAlign: 'center', color: '#9CA3AF', padding: 16, fontSize: 13 },
  autodetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  autodetectText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  locationBannerText: { flex: 1, fontSize: 13, color: '#1E40AF', fontWeight: '600' },
  locationBannerClear: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
});
