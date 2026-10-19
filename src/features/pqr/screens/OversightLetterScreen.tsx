import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { OversightEntity } from '@core/types';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { usePdfDownload } from '@features/pqr/hooks/usePdfDownload';
import {
  sendOversightLetter,
  useGenerateOversightLetter,
  useOversightEntities,
} from '@features/pqr/hooks/useOversightLetter';
import { downloadLegalDocPdf } from '@features/pqr/utils/legalDocShare';
import { LegalDocDraftNotice } from '@features/pqr/components/LegalDocDraftNotice';
import {
  LEGAL_DOC_RETENTION_NOTICE,
  OVERSIGHT_NOT_SAVED_NOTICE,
  OVERSIGHT_SEND_ANONYMOUS_NOTICE,
  OVERSIGHT_SEND_IDENTITY_NOTICE,
} from '@features/pqr/utils/legalDocsCopy';
import { resolveOverdue } from '@features/pqr/utils/businessDays';
import {
  buildOversightLetterInput,
  describeDraftFailure,
  formatPlaceName,
} from '@features/pqr/utils/oversightLetter';
import {
  allowsAnotherSend,
  describeOversightSend,
  mayHaveReached,
} from '@features/pqr/utils/oversightSend';
import type { OversightSendNotice, OversightSendResult } from '@features/pqr/utils/oversightSend';

type Route = RouteProp<AppStackParamList, 'OversightLetter'>;

/** El oficio redactado y el ente al que va dirigido. */
interface Letter {
  entity: OversightEntity;
  content: string;
  /** `null` si el servidor no lo guardó: entonces no hay PDF ni envío. */
  id: string | null;
}

function hasMailbox(entity: OversightEntity): boolean {
  return !!entity.email?.trim();
}

/**
 * Oficio al ente de control, en tres pasos: escoger el ente, redactar el
 * oficio y verlo, descargarlo o enviarlo por correo.
 *
 * Sigue a la web (`OversightEntityListView`, `OversightDocumentExport` y
 * `usePQRFollowUp` en `quejate-app`): redacta al escoger el ente, con los
 * mismos datos, y lee el resultado del envío con los mismos casos.
 */
export default function OversightLetterScreen() {
  const { pqrId } = useRoute<Route>().params;
  const { data: pqr, isLoading, isError, refetch } = usePQRDetail(pqrId);
  const entityId = pqr?.entityId ?? pqr?.entity?.id;
  const entities = useOversightEntities(entityId);
  const generate = useGenerateOversightLetter();
  const pdf = usePdfDownload();

  const [draftingFor, setDraftingFor] = useState<OversightEntity | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [sendResult, setSendResult] = useState<OversightSendResult | null>(null);
  /**
   * Los entes a los que el oficio ya salió o pudo salir en esta visita. Si se
   * redacta otro oficio para uno de ellos, no se le vuelve a ofrecer el envío:
   * lo recibiría dos veces.
   */
  const [reached, setReached] = useState<Record<string, OversightSendResult>>({});
  const [sending, setSending] = useState(false);
  // El estado de React no se ve hasta el siguiente pintado; esto sí, y es lo
  // que impide que un doble toque mande el oficio dos veces.
  const sendingRef = useRef(false);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !pqr) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState message="No se pudo cargar la PQRSD." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  // Lo mismo que abre la tutela: una PQRSD vencida de un tipo con plazo.
  if (!resolveOverdue(pqr).isOverdue) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.stateText}>
            El oficio al ente de control solo está disponible para una PQRSD vencida.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const busy = sending || pdf.busy !== null;

  function handleSelect(entity: OversightEntity) {
    if (!pqr || generate.isPending || entities.data?.kind !== 'ok') return;
    setDraftingFor(entity);
    generate.mutate(buildOversightLetterInput(pqr, entity.name, entities.data.location), {
      onSuccess: (doc) => {
        setLetter({ entity, content: doc.content, id: doc.id });
        setSendResult(null);
      },
      onError: (error) => {
        const { title, message } = describeDraftFailure(error);
        Alert.alert(title, message);
      },
    });
  }

  async function handleSend(target: Letter) {
    if (!pqr || !target.id || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    // El aviso del intento anterior no describe el que empieza.
    setSendResult(null);
    try {
      const result = await sendOversightLetter(target.id, {
        pqrId: pqr.id,
        oversightEntityId: target.entity.id,
      });
      setSendResult(result);
      if (mayHaveReached(result)) {
        setReached((prev) => ({ ...prev, [target.entity.id]: result }));
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  /** La confirmación nombra al ente y avisa de qué datos recibirá. */
  function confirmSend(target: Letter) {
    if (!pqr) return;
    const paragraphs = [
      `Enviaremos el oficio a ${target.entity.name}, al correo ${target.entity.email?.trim()}. También te mandaremos una confirmación a tu correo.`,
    ];
    if (pqr.anonymous) paragraphs.push(OVERSIGHT_SEND_ANONYMOUS_NOTICE);
    paragraphs.push(OVERSIGHT_SEND_IDENTITY_NOTICE);

    Alert.alert('¿Enviar el oficio?', paragraphs.join('\n\n'), [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => void handleSend(target) },
    ]);
  }

  function handlePdf(id: string) {
    void pdf.run('pdf', () => downloadLegalDocPdf(id), 'Guardar o compartir el oficio');
  }

  // ── Paso 2: redactando ────────────────────────────────────────────────────
  if (generate.isPending) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={styles.stateTitle}>
            Redactando el oficio{draftingFor ? ` para ${draftingFor.name}` : ''}…
          </Text>
          <Text style={styles.stateText}>Esto puede tardar unos segundos.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Paso 3: el oficio ─────────────────────────────────────────────────────
  if (letter) {
    const result = sendResult ?? reached[letter.entity.id] ?? null;
    const canSend = !!letter.id && hasMailbox(letter.entity);
    const sendOpen = canSend && allowsAnotherSend(result);

    let notice: OversightSendNotice | null = null;
    if (result) notice = describeOversightSend(result, letter.entity);
    // Sin buzón se avisa desde el principio, con el mismo texto que el 409, en
    // vez de esconder el botón sin decir por qué.
    else if (letter.id && !hasMailbox(letter.entity)) {
      notice = describeOversightSend({ kind: 'no-mailbox' }, letter.entity);
    }

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.letterBanner}>
          <Ionicons name="document-text" size={18} color="#6D28D9" style={{ marginRight: 8 }} />
          <Text style={styles.letterBannerText}>
            Oficio para {letter.entity.name}. Revísalo antes de descargarlo o enviarlo.
          </Text>
        </View>
        <LegalDocDraftNotice />

        <ScrollView contentContainerStyle={styles.letterScroll}>
          <Text style={styles.letterText} selectable>
            {letter.content}
          </Text>
        </ScrollView>

        <View style={styles.letterBottom}>
          {notice ? <SendNotice notice={notice} /> : null}

          {letter.id ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                onPress={() => handlePdf(letter.id!)}
                disabled={busy}
                accessibilityRole="button"
              >
                {pdf.busy !== null ? (
                  <ActivityIndicator size="small" color="#6D28D9" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#6D28D9" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.secondaryBtnText}>Descargar PDF</Text>
              </TouchableOpacity>

              {sendOpen ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={() => confirmSend(letter)}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="send" size={15} color="#fff" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {sending ? 'Enviando…' : 'Enviar por correo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.notSaved}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 8 }} />
              <Text style={styles.notSavedText}>{OVERSIGHT_NOT_SAVED_NOTICE}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => {
                setLetter(null);
                setSendResult(null);
              }}
              disabled={busy}
            >
              <Text style={[styles.linkText, busy && styles.btnDisabled]}>Escoger otro ente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void Share.share({ message: letter.content })}
              disabled={busy}
            >
              <Text style={[styles.linkText, busy && styles.btnDisabled]}>Compartir texto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Paso 1: escoger el ente ───────────────────────────────────────────────
  const intro = (
    <View>
      <Text style={styles.intro}>
        Selecciona el ente de control ante el cual deseas escalar tu solicitud. Al
        seleccionarlo redactaremos un oficio con los datos de tu PQRSD, que podrás revisar
        antes de descargarlo o enviarlo.
      </Text>
      <View style={styles.retentionNotice}>
        <Ionicons name="time-outline" size={15} color="#92400E" style={{ marginRight: 8 }} />
        <Text style={styles.retentionNoticeText}>{LEGAL_DOC_RETENTION_NOTICE}</Text>
      </View>
    </View>
  );

  if (!entityId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.stateText}>No se pudo identificar la entidad</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (entities.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (entities.isError || !entities.data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState
          message="No se pudieron cargar los entes de control."
          onRetry={() => void entities.refetch()}
        />
      </SafeAreaView>
    );
  }

  if (entities.data.kind === 'no-department') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Ionicons name="business-outline" size={40} color="#9CA3AF" />
          <Text style={styles.stateText}>La entidad no tiene departamento asignado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList<OversightEntity>
        data={entities.data.entities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={intro}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={40} color="#9CA3AF" />
            <Text style={styles.stateText}>
              No se encontraron entes de control para esta ubicación
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <EntityCard entity={item} onPress={() => handleSelect(item)} />
        )}
      />
    </SafeAreaView>
  );
}

function EntityCard({ entity, onPress }: { entity: OversightEntity; onPress: () => void }) {
  const place = [entity.Municipality?.name, entity.RegionalDepartment?.name]
    .filter((p): p is string => !!p)
    .map(formatPlaceName)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Redactar el oficio para ${entity.name}`}
    >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{entity.name}</Text>
        {entity.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {entity.description}
          </Text>
        ) : null}
        {hasMailbox(entity) ? (
          <InfoLine icon="mail-outline" text={entity.email!.trim()} />
        ) : (
          <Text style={styles.noMailbox}>
            Sin correo registrado: podrás redactar y descargar el oficio, pero no enviarlo desde
            la app.
          </Text>
        )}
        {entity.phone ? <InfoLine icon="call-outline" text={entity.phone} /> : null}
        {place ? <InfoLine icon="location-outline" text={place} /> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function InfoLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={13} color="#6B7280" style={{ marginRight: 6 }} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const NOTICE_STYLES = {
  success: { box: '#F0FDF4', border: '#BBF7D0', text: '#166534', icon: 'checkmark-circle' },
  warning: { box: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: 'warning' },
  error: { box: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: 'close-circle' },
} as const;

/**
 * El resultado del envío, **fijo en la pantalla** y no en una alerta que se
 * cierra: lo que dice (sobre todo «no lo vuelvas a enviar») tiene que seguir
 * ahí cuando el ciudadano decida qué hacer.
 */
function SendNotice({ notice }: { notice: OversightSendNotice }) {
  const tone = NOTICE_STYLES[notice.tone];
  return (
    <View
      style={[styles.notice, { backgroundColor: tone.box, borderColor: tone.border }]}
      accessibilityRole={notice.tone === 'success' ? 'summary' : 'alert'}
    >
      <Ionicons name={tone.icon} size={18} color={tone.text} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.noticeTitle, { color: tone.text }]}>{notice.title}</Text>
        <Text style={[styles.noticeText, { color: tone.text }]}>{notice.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center' },
  stateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  retentionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 16,
  },
  retentionNoticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBody: { flex: 1, marginRight: 8, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDescription: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  noMailbox: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  infoLine: { flexDirection: 'row', alignItems: 'center' },
  infoText: { flex: 1, fontSize: 12, color: '#6B7280' },
  letterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  letterBannerText: { flex: 1, fontSize: 12, color: '#5B21B6', lineHeight: 17 },
  letterScroll: { padding: 16 },
  letterText: { fontSize: 14, color: '#111827', lineHeight: 21 },
  letterBottom: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  noticeText: { fontSize: 12, lineHeight: 17 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 13,
  },
  secondaryBtnText: { color: '#6D28D9', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  notSaved: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
  },
  notSavedText: { flex: 1, fontSize: 12, color: '#B91C1C', lineHeight: 17 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  linkText: { fontSize: 13, fontWeight: '600', color: '#6D28D9' },
});
