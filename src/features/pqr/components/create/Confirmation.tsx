import React, { RefObject, useState } from 'react';
import { StepHeader } from './StepHeader';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RecaptchaRef } from 'react-native-recaptcha-that-works';
import type { UseFormGetValues } from 'react-hook-form';
import { typeMap } from '@core/types';
import type { CustomField } from '@core/types';
import { PRIVACY_URL, TERMS_URL } from '@shared/constants/legalUrls';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';
import { WebViewModal } from '@features/users/components/profile/WebViewModal';
import type { FormData } from './createPQRTypes';
import { SummaryRow } from './SummaryRow';
import { styles } from './createPQRStyles';

import type { NamedItem } from './createPQRTypes';

/**
 * Quéjate se presenta como facilitador antes de enviar. Texto aprobado por la
 * dirección, el mismo de la web (`components/forms/new-pqr.tsx`): va tal cual.
 */
const FACILITATOR_NOTICE =
  'Quéjate es un facilitador. Te ayuda a escribir tu PQRSD y la envía a la entidad en tu nombre, porque tú lo pides. Quéjate no es la entidad ni una autoridad: no radica tu petición, no la responde y no puede garantizar que te respondan. El número que te da Quéjate es de seguimiento.';

/**
 * Cómo termina el aviso. En una anónima la entidad no tiene el correo de
 * quien la envía, así que no se promete nada por ese medio.
 */
const OFFICIAL_NUMBER = {
  anonymous: 'El radicado oficial lo asigna la entidad.',
  identified:
    'El radicado oficial lo asigna la entidad, que te lo enviará a tu correo junto con su respuesta.',
};

/** Las dos páginas que nombra la autorización, como en Perfil → Configuración. */
const LEGAL_PAGES = {
  privacy: { url: PRIVACY_URL, title: 'Política de privacidad' },
  terms: { url: TERMS_URL, title: 'Términos y condiciones' },
};

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
  const [legalPage, setLegalPage] = useState<keyof typeof LEGAL_PAGES | null>(null);
  const values = getValues();
  const selectedEntity = entities.find((e) => e.id === values.entityId);
  const selectedEntityDept = entityDepartments.find((d) => d.id === values.entityDepartmentId);

  return (
    <View testID="step5-content">
      <StepHeader step={5} title="Confirmación" />
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

      <View style={styles.facilitatorNotice}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#334155"
          style={styles.facilitatorNoticeIcon}
        />
        <Text style={styles.facilitatorNoticeText}>
          {`${FACILITATOR_NOTICE} ${
            values.isAnonymous ? OFFICIAL_NUMBER.anonymous : OFFICIAL_NUMBER.identified
          }`}
        </Text>
      </View>

      {/* Texto aprobado de la web (`new-pqr.tsx`), tal cual. Aceptar la
          respuesta por correo es lo que le permite a la entidad notificar por
          ese medio (CPACA, art. 56); en una anónima no hay correo que aceptar. */}
      <Text style={styles.consentText}>
        {`Al enviar, autorizas a Quéjate a enviar tu PQRSD a ${
          selectedEntity?.name?.trim() || 'la entidad'
        }${
          values.isAnonymous ? '' : ' y aceptas recibir su respuesta en tu correo'
        }. Tus datos se tratan según la `}
        <Text
          style={styles.consentLink}
          onPress={() => setLegalPage('privacy')}
          accessibilityRole="link"
        >
          Política de Privacidad
        </Text>
        {', y al enviar aceptas los '}
        <Text
          style={styles.consentLink}
          onPress={() => setLegalPage('terms')}
          accessibilityRole="link"
        >
          Términos y Condiciones
        </Text>
        .
      </Text>

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

      {legalPage ? (
        <WebViewModal
          visible
          url={LEGAL_PAGES[legalPage].url}
          title={LEGAL_PAGES[legalPage].title}
          onClose={() => setLegalPage(null)}
        />
      ) : null}
    </View>
  );
}
