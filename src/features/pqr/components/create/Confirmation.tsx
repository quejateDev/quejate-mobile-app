import React, { RefObject } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { RecaptchaRef } from 'react-native-recaptcha-that-works';
import type { UseFormGetValues } from 'react-hook-form';
import { typeMap } from '@core/types';
import type { CustomField } from '@core/types';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';
import type { FormData } from './createPQRTypes';
import { SummaryRow } from './SummaryRow';
import { styles } from './createPQRStyles';

import type { NamedItem } from './createPQRTypes';

interface Props {
  entities: NamedItem[];
  entityDepartments: NamedItem[];
  visibleFields: CustomField[];
  customFieldValues: Record<string, string>;
  attachments: LocalAttachment[];
  pinLatitude: number | null;
  pinLongitude: number | null;
  pinAddress: string | null;
  recaptchaToken: string | null;
  recaptchaRef: RefObject<RecaptchaRef | null>;
  isPending: boolean;
  stepError: string | null;
  onSubmit: () => void;
  getValues: UseFormGetValues<FormData>;
}

export function Confirmation({
  entities,
  entityDepartments,
  visibleFields,
  customFieldValues,
  attachments,
  pinLatitude,
  pinLongitude,
  pinAddress,
  recaptchaToken,
  recaptchaRef,
  isPending,
  stepError,
  onSubmit,
  getValues,
}: Props) {
  const values = getValues();
  const selectedEntity = entities.find((e) => e.id === values.entityId);
  const selectedEntityDept = entityDepartments.find((d) => d.id === values.entityDepartmentId);

  return (
    <View testID="step5-content">
      <Text style={styles.stepTitle}>Paso 5 — Confirmación</Text>
      <Text style={styles.confirmNote}>
        Revisa los datos antes de enviar tu PQRSD.
      </Text>

      <View style={styles.summaryCard}>
        <SummaryRow label="Entidad" value={selectedEntity?.name ?? '—'} />
        {selectedEntityDept && (
          <SummaryRow label="Área / Departamento" value={selectedEntityDept.name} />
        )}
        <SummaryRow label="Tipo" value={typeMap[values.type]?.label ?? '—'} />
        {values.subject ? (
          <SummaryRow label="Asunto" value={values.subject} />
        ) : null}
        {values.description ? (
          <SummaryRow label="Descripción" value={values.description} />
        ) : null}
        <SummaryRow label="Anónimo" value={values.isAnonymous ? 'Sí' : 'No'} />
        <SummaryRow label="Privado" value={values.isPrivate ? 'Sí' : 'No'} />
        {visibleFields.map((field) => (
          <SummaryRow
            key={field.id}
            label={field.name}
            value={customFieldValues[field.name] ?? '—'}
          />
        ))}
        {pinLatitude != null && pinLongitude != null && (
          <SummaryRow
            label="Ubicación"
            value={pinAddress ?? `${pinLatitude.toFixed(4)}, ${pinLongitude.toFixed(4)}`}
          />
        )}
        <SummaryRow
          label="Adjuntos"
          value={attachments.length > 0 ? `${attachments.length} archivo(s)` : 'Ninguno'}
        />
      </View>

      {/* reCAPTCHA */}
      <View style={styles.captchaRow}>
        {recaptchaToken ? (
          <View style={styles.captchaVerified}>
            <Text style={styles.captchaVerifiedText}>✓ Verificación completada</Text>
          </View>
        ) : (
          <TouchableOpacity
            testID="captcha-btn"
            style={styles.captchaButton}
            onPress={() => recaptchaRef.current?.open()}
          >
            <Text style={styles.captchaButtonText}>
              Verificar que no soy un robot
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {stepError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{stepError}</Text>
        </View>
      )}

      <TouchableOpacity
        testID="submit-btn"
        style={[styles.button, (!recaptchaToken || isPending) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={!recaptchaToken || isPending}
        accessibilityRole="button"
        accessibilityLabel="Enviar PQRSD"
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar PQRSD</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
