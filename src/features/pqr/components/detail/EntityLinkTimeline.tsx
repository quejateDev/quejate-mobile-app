import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PQREntityLink } from '@core/types';
import { formatColombiaDateTime, nonBreakingHyphens } from './detailUtils';
import { styles } from './pqrDetailStyles';

/** Un paso de la cronología. */
export interface EntityLinkStep {
  key: string;
  done: boolean;
  /** Lo que pasó o, si todavía no, que no ha pasado. */
  text: string;
  /** Cuándo pasó, si se sabe. */
  at: Date | string | null;
  detail?: { label: string; value: string };
}

/** Los mismos pasos y textos que la web (`components/pqr/entity-link-timeline.tsx`). */
export function entityLinkSteps(
  entityName: string,
  createdAt: Date | string,
  link: PQREntityLink,
): EntityLinkStep[] {
  // Solo se confirma desde la página del enlace, así que una confirmación
  // también es una apertura, aunque no conste su fecha: el aviso del navegador
  // pudo fallar, o la entidad confirmar antes de que existiera.
  const opened = link.openedAt != null || link.confirmedAt != null;

  return [
    {
      key: 'sent',
      done: true,
      text: `Enviada a ${entityName}`,
      at: createdAt,
    },
    // Aquí irá «Entregada al buzón de la entidad».
    opened
      ? {
          key: 'opened',
          done: true,
          text: 'La entidad abrió el enlace del correo',
          at: link.openedAt,
        }
      : {
          key: 'opened',
          done: false,
          text: 'La entidad todavía no ha abierto el enlace.',
          at: null,
        },
    link.confirmedAt != null
      ? {
          key: 'confirmed',
          done: true,
          text: 'La entidad confirmó que la recibió',
          at: link.confirmedAt,
          detail: link.radicado
            ? { label: 'Radicado de la entidad', value: link.radicado }
            : undefined,
        }
      : {
          key: 'confirmed',
          done: false,
          text: 'La entidad todavía no ha confirmado que la recibió.',
          at: null,
        },
  ];
}

interface Props {
  entityName: string;
  createdAt: Date | string;
  link: PQREntityLink;
}

/**
 * «Seguimiento del envío»: cuándo se envió la PQRSD a la entidad, cuándo la
 * entidad abrió el enlace del correo y cuándo confirmó que la recibió (R-42).
 * Fechas en hora de Colombia. Un paso nuevo es un elemento más de
 * {@link entityLinkSteps}.
 */
export function EntityLinkTimeline({ entityName, createdAt, link }: Props) {
  const steps = entityLinkSteps(entityName, createdAt, link);

  return (
    <View style={entityLinkStyles.container}>
      <Text style={styles.sectionTitle}>Seguimiento del envío</Text>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const dateLabel = step.at ? formatColombiaDateTime(step.at) : null;
        return (
          <View key={step.key} style={entityLinkStyles.row}>
            {/* El círculo repite lo que ya dice el texto del paso. */}
            <View
              style={entityLinkStyles.markerCol}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {step.done ? (
                <View style={entityLinkStyles.markerDone}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
              ) : (
                <View style={entityLinkStyles.markerPending} />
              )}
              {!isLast && <View style={entityLinkStyles.line} />}
            </View>
            <View style={[entityLinkStyles.content, isLast && entityLinkStyles.contentLast]}>
              <Text style={step.done ? entityLinkStyles.textDone : entityLinkStyles.textPending}>
                {step.text}
              </Text>
              {dateLabel ? <Text style={entityLinkStyles.date}>{dateLabel}</Text> : null}
              {step.detail ? (
                <Text
                  style={entityLinkStyles.detail}
                  accessibilityLabel={`${step.detail.label}: ${step.detail.value}`}
                >
                  {step.detail.label}:{' '}
                  <Text style={entityLinkStyles.detailValue}>
                    {nonBreakingHyphens(step.detail.value)}
                  </Text>
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      <Text style={entityLinkStyles.disclaimer}>
        Quéjate no puede garantizar que la entidad abra el correo ni que responda.
      </Text>
    </View>
  );
}

const MARKER_SIZE = 22;

const entityLinkStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  row: { flexDirection: 'row' },
  markerCol: { width: 28, alignItems: 'center' },
  markerDone: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPending: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 2, minHeight: 16 },
  content: { flex: 1, minWidth: 0, paddingLeft: 8, paddingTop: 2, paddingBottom: 16 },
  contentLast: { paddingBottom: 0 },
  textDone: { fontSize: 14, fontWeight: '600', color: '#111827' },
  textPending: { fontSize: 14, color: '#6B7280' },
  date: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  detail: { fontSize: 13, color: '#374151', marginTop: 4 },
  detailValue: { fontWeight: '600', color: '#1E3A8A' },
  disclaimer: { fontSize: 11, color: '#6B7280', marginTop: 16, lineHeight: 15 },
});
