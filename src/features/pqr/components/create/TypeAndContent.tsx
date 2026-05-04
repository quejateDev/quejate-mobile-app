import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { typeMap } from '@core/types';
import { PQRS_TYPES, type FormData } from './createPQRTypes';
import { styles } from './createPQRStyles';

interface Props {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  allowAnonymous: boolean;
}

export function TypeAndContent({ control, errors, allowAnonymous }: Props) {
  return (
    <View testID="step2-content">
      <Text style={styles.stepTitle}>Paso 2 — Tipo y contenido</Text>

      {/* Tipo de PQRSD */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Tipo de PQRSD *</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.typeRow}>
              {PQRS_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  testID={`type-option-${t}`}
                  style={[
                    styles.typeChip,
                    value === t && {
                      backgroundColor: typeMap[t].color,
                      borderColor: typeMap[t].color,
                    },
                  ]}
                  onPress={() => onChange(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      value === t && styles.typeChipTextActive,
                    ]}
                  >
                    {typeMap[t].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.type && (
          <Text style={styles.fieldError}>{errors.type.message}</Text>
        )}
      </View>

      {/* Asunto */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Asunto (opcional)</Text>
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              testID="subject-input"
              style={styles.input}
              placeholder="Resumen breve del problema"
              placeholderTextColor="#9CA3AF"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              maxLength={200}
            />
          )}
        />
      </View>

      {/* Descripción */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Descripción (opcional)</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              testID="description-input"
              style={[styles.input, styles.textArea]}
              placeholder="Describe el problema con el mayor detalle posible"
              placeholderTextColor="#9CA3AF"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          )}
        />
      </View>

      {/* Toggle: Enviar anónimamente */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Enviar anónimamente</Text>
          {!allowAnonymous && (
            <Text style={styles.toggleHint}>
              Esta entidad no permite envíos anónimos
            </Text>
          )}
        </View>
        <Controller
          control={control}
          name="isAnonymous"
          render={({ field: { onChange, value } }) => (
            <Switch
              testID="anonymous-toggle"
              value={value}
              onValueChange={onChange}
              disabled={!allowAnonymous}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor="#fff"
            />
          )}
        />
      </View>

      {/* Toggle: Mantener privado */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Mantener privado</Text>
        <Controller
          control={control}
          name="isPrivate"
          render={({ field: { onChange, value } }) => (
            <Switch
              testID="private-toggle"
              value={value}
              onValueChange={onChange}
              trackColor={{ false: '#D1D5DB', true: '#2563EB' }}
              thumbColor="#fff"
            />
          )}
        />
      </View>
    </View>
  );
}
