import React, { useState } from 'react';
import { StepHeader } from './StepHeader';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useWatch } from 'react-hook-form';
import type { Control, FieldErrors } from 'react-hook-form';
import { typeMap } from '@core/types';
import { PQRS_TYPES, type FormData } from './createPQRTypes';
import { styles } from './createPQRStyles';

interface Props {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  allowAnonymous: boolean;
}

/**
 * Qué implica enviarla como anónima. Texto aprobado por la dirección, el que
 * la web enseña al marcar la casilla (`components/forms/new-pqr.tsx`): va tal
 * cual. Las respuestas que la entidad da desde Quéjate sí le llegan al correo.
 */
const ANONYMOUS_HELP =
  'Si la envías como anónima, la entidad no sabrá quién eres y no podrá contestarte por correo. Si responde desde Quéjate, verás la respuesta aquí y te llegará a tu correo; si no, puede publicarla en su página web. Para que la tramite, cuenta hechos concretos (qué pasó, dónde y cuándo) y adjunta pruebas si las tienes.';

const INFO_CONTENT = {
  anonymous: {
    title: '¿Qué significa enviar anónimamente?',
    body: ANONYMOUS_HELP,
  },
  private: {
    title: '¿Qué significa mantener privado?',
    body: 'Una PQRSD privada solo puede ser vista por ti y por la entidad a la que la diriges.\n\nLas PQRSD públicas pueden ser vistas por otros usuarios de la comunidad, lo cual puede generar más apoyo (likes) hacia tu solicitud.',
  },
};

function InfoModal({ type, onClose }: { type: 'anonymous' | 'private'; onClose: () => void }) {
  const info = INFO_CONTENT[type];
  const iconName: keyof typeof Ionicons.glyphMap =
    type === 'anonymous' ? 'eye-off-outline' : 'lock-closed-outline';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={infoStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={infoStyles.card} activeOpacity={1}>
          <View style={infoStyles.iconCircle}>
            <Ionicons name={iconName} size={28} color="#2563EB" />
          </View>
          <Text style={infoStyles.title}>{info.title}</Text>
          <Text style={infoStyles.body}>{info.body}</Text>
          <TouchableOpacity style={infoStyles.btn} onPress={onClose}>
            <Text style={infoStyles.btnText}>Entendido</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export function TypeAndContent({ control, errors, allowAnonymous }: Props) {
  const [infoModal, setInfoModal] = useState<'anonymous' | 'private' | null>(null);
  const isAnonymous = useWatch({ control, name: 'isAnonymous' });

  return (
    <View testID="step2-content">
      <StepHeader step={2} title="Tipo y contenido" />

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
                  <Text style={[styles.typeChipText, value === t && styles.typeChipTextActive]}>
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

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Asunto *</Text>
        <Controller
          control={control}
          name="subject"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              testID="subject-input"
              style={[styles.input, errors.subject && styles.inputError]}
              placeholder="Resumen breve del problema"
              placeholderTextColor="#9CA3AF"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              maxLength={200}
            />
          )}
        />
        {errors.subject && (
          <Text style={styles.fieldError}>{errors.subject.message}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Descripción *</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              testID="description-input"
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
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
        {errors.description && (
          <Text style={styles.fieldError}>{errors.description.message}</Text>
        )}
      </View>

      <View style={[styles.toggleRow, isAnonymous && styles.toggleRowWithHelp]}>
        <View style={styles.toggleInfo}>
          <View style={infoStyles.labelRow}>
            <Text style={styles.toggleLabel}>Enviar anónimamente</Text>
            <TouchableOpacity
              testID="anonymous-info"
              onPress={() => setInfoModal('anonymous')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
            </TouchableOpacity>
          </View>
          {!allowAnonymous && (
            <Text style={styles.toggleHint}>Esta entidad no permite envíos anónimos</Text>
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
      {/* Como en la web, se lee al encenderlo, sin tener que abrir la ventana
          de información. Región viva para que un lector de pantalla lo anuncie. */}
      {isAnonymous ? (
        <Text style={styles.toggleHelp} accessibilityLiveRegion="polite">
          {ANONYMOUS_HELP}
        </Text>
      ) : null}

      <View style={styles.toggleRow}>
        <View style={infoStyles.labelRow}>
          <Text style={styles.toggleLabel}>Mantener privado</Text>
          <TouchableOpacity
            onPress={() => setInfoModal('private')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>
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

      {infoModal && (
        <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </View>
  );
}

const infoStyles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 22,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
