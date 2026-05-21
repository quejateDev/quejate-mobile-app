import React, { Dispatch, SetStateAction, useState } from 'react';
import { StepHeader } from './StepHeader';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UseFormSetValue } from 'react-hook-form';
import type { FormData } from './createPQRTypes';
import { styles } from './createPQRStyles';

import type { NamedItem } from './createPQRTypes';

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
}: Props) {
  const [entitySearch, setEntitySearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

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
});
