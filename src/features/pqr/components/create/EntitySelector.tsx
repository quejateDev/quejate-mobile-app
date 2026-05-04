import React, { Dispatch, SetStateAction } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
}: Props) {
  function closeAll() {
    setIsDeptOpen(false);
    setIsMunOpen(false);
    setIsEntityOpen(false);
    setIsEntityDeptOpen(false);
  }

  return (
    <View testID="step1-content">
      <Text style={styles.stepTitle}>Paso 1 — Ubicación y entidad</Text>

      {/* Departamento geográfico */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Departamento (opcional)</Text>
        <TouchableOpacity
          testID="dept-selector"
          style={styles.selector}
          onPress={() => {
            closeAll();
            setIsDeptOpen((v) => !v);
          }}
        >
          <Text style={geoDepId ? styles.selectorText : styles.selectorPlaceholder}>
            {geoDepId ? findName(departments, geoDepId) : 'Selecciona un departamento'}
          </Text>
        </TouchableOpacity>
        {isDeptOpen && (
          <View style={styles.optionList}>
            {loadingDepts ? (
              <ActivityIndicator style={styles.optionLoader} />
            ) : (
              <ScrollView style={styles.optionScroll} nestedScrollEnabled>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept.id}
                    testID={`dept-option-${dept.id}`}
                    style={styles.optionItem}
                    onPress={() => {
                      setGeoDepId(dept.id);
                      setGeoMunId('');
                      setValue('entityId', '');
                      setValue('entityDepartmentId', '');
                      setIsDeptOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{dept.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Municipio geográfico */}
      {geoDepId ? (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Municipio (opcional)</Text>
          <TouchableOpacity
            testID="municipality-selector"
            style={styles.selector}
            onPress={() => {
              closeAll();
              setIsMunOpen((v) => !v);
            }}
          >
            <Text style={geoMunId ? styles.selectorText : styles.selectorPlaceholder}>
              {geoMunId ? findName(municipalities, geoMunId) : 'Selecciona un municipio'}
            </Text>
          </TouchableOpacity>
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
        <TouchableOpacity
          testID="entity-selector"
          style={[styles.selector, entityIdError && styles.selectorError]}
          onPress={() => {
            closeAll();
            setIsEntityOpen((v) => !v);
          }}
        >
          <Text style={watchedEntityId ? styles.selectorText : styles.selectorPlaceholder}>
            {watchedEntityId ? findName(entities, watchedEntityId) : 'Selecciona una entidad'}
          </Text>
        </TouchableOpacity>
        {entityIdError && (
          <Text style={styles.fieldError}>{entityIdError}</Text>
        )}
        {isEntityOpen && (
          <View style={styles.optionList}>
            {loadingEntities ? (
              <ActivityIndicator style={styles.optionLoader} />
            ) : (
              <ScrollView style={styles.optionScroll} nestedScrollEnabled>
                {entities.map((entity) => (
                  <TouchableOpacity
                    key={entity.id}
                    testID={`entity-option-${entity.id}`}
                    style={styles.optionItem}
                    onPress={() => {
                      setValue('entityId', entity.id);
                      setValue('entityDepartmentId', '');
                      setIsEntityOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{entity.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Sub-departamento de la entidad */}
      {watchedEntityId && entityDepartments.length > 0 && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Área / Departamento (opcional)</Text>
          <TouchableOpacity
            testID="entity-dept-selector"
            style={styles.selector}
            onPress={() => {
              closeAll();
              setIsEntityDeptOpen((v) => !v);
            }}
          >
            <Text style={watchedEntityDeptId ? styles.selectorText : styles.selectorPlaceholder}>
              {watchedEntityDeptId
                ? findName(entityDepartments, watchedEntityDeptId)
                : 'Selecciona un área (opcional)'}
            </Text>
          </TouchableOpacity>
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
