import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/auth/useAuth';
import { typeMap } from '@core/types';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { SelectField } from '@shared/components/ui/SelectField';
import type { AppStackParamList } from '@navigation/navigationRef';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { useGenerateTutela } from '@features/pqr/hooks/useLegalDocs';
import { FUNDAMENTAL_RIGHTS } from '@features/pqr/utils/fundamentalRights';
import { resolveOverdue } from '@features/pqr/utils/businessDays';

type Route = RouteProp<AppStackParamList, 'GenerateTutela'>;

function toYMD(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export default function GenerateTutelaScreen() {
  const { pqrId } = useRoute<Route>().params;
  const { user } = useAuth();
  const { data: pqr, isLoading, isError, refetch } = usePQRDetail(pqrId);
  const { departments } = useDepartments();
  const generate = useGenerateTutela();

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [documentNumber, setDocumentNumber] = useState('');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [rightViolated, setRightViolated] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const { municipalities, isLoading: loadingMunis } = useMunicipalities(departmentId ?? undefined);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.id })),
    [departments],
  );
  const cityOptions = useMemo(
    () => municipalities.map((m) => ({ label: m.name, value: m.name })),
    [municipalities],
  );
  const rightOptions = useMemo(
    () => FUNDAMENTAL_RIGHTS.map((r) => ({ label: r, value: r })),
    [],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
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

  const entityName = pqr.entity?.name ?? '';
  const effectiveDescription = description ?? pqr.description ?? '';

  function handleGenerate() {
    if (!pqr) return;
    const deptName = departments.find((d) => d.id === departmentId)?.name;
    if (
      !fullName.trim() ||
      !documentNumber.trim() ||
      !deptName ||
      !city ||
      !rightViolated ||
      !effectiveDescription.trim()
    ) {
      Alert.alert('Faltan datos', 'Completa todos los campos para generar la tutela.');
      return;
    }

    generate.mutate(
      {
        fullName: fullName.trim(),
        documentNumber: documentNumber.trim(),
        department: deptName,
        city,
        rightViolated,
        entity: entityName,
        pqrType: typeMap[pqr.type]?.label ?? pqr.type ?? 'PQRSD',
        pqrDate: toYMD(pqr.createdAt),
        daysExceeded: resolveOverdue(pqr).businessDaysExceeded,
        pqrDescription: effectiveDescription.trim(),
      },
      {
        onSuccess: (tutela) => setResult(tutela),
        onError: () =>
          Alert.alert(
            'No se pudo generar',
            'Ocurrió un error generando la tutela. Intenta de nuevo en unos segundos.',
          ),
      },
    );
  }

  function handleShare() {
    if (!result) return;
    void Share.share({ message: result });
  }

  if (result) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.resultBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 8 }} />
          <Text style={styles.resultBannerText}>
            Tutela generada. Revísala, ajústala con un abogado si lo necesitas y preséntala ante un juez.
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultText} selectable>
            {result}
          </Text>
        </ScrollView>
        <View style={styles.resultActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setResult(null)}>
            <Ionicons name="arrow-back" size={16} color="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryBtnText}>Editar datos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Genera una acción de tutela con los datos de tu PQRSD. La entidad y la descripción
            vienen pre-llenadas; completa el resto.
          </Text>

          <Field label="Nombre completo">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre completo"
              placeholderTextColor="#9CA3AF"
            />
          </Field>

          <Field label="Número de documento">
            <TextInput
              style={styles.input}
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder="Cédula / documento"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </Field>

          <SelectField
            label="Departamento"
            placeholder="Selecciona un departamento"
            value={departmentId}
            options={deptOptions}
            onSelect={(v) => {
              setDepartmentId(v);
              setCity(null);
            }}
          />

          <SelectField
            label="Ciudad / Municipio"
            placeholder={departmentId ? 'Selecciona una ciudad' : 'Primero el departamento'}
            value={city}
            options={cityOptions}
            onSelect={setCity}
            disabled={!departmentId}
            loading={!!departmentId && loadingMunis}
          />

          <SelectField
            label="Derecho vulnerado"
            placeholder="Selecciona un derecho"
            value={rightViolated}
            options={rightOptions}
            onSelect={setRightViolated}
          />

          <Field label="Entidad demandada">
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.inputDisabledText} numberOfLines={1}>
                {entityName || '—'}
              </Text>
            </View>
          </Field>

          <Field label="Descripción de tu petición">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={effectiveDescription}
              onChangeText={setDescription}
              placeholder="Describe los hechos…"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
          </Field>

          <TouchableOpacity
            style={[styles.generateBtn, generate.isPending && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generate.isPending}
            activeOpacity={0.85}
          >
            {generate.isPending ? (
              <>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.generateBtnText}>Generando tutela…</Text>
              </>
            ) : (
              <Text style={styles.generateBtnText}>Generar tutela</Text>
            )}
          </TouchableOpacity>
          {generate.isPending && (
            <Text style={styles.waitHint}>Esto puede tardar unos segundos.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 19 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', justifyContent: 'center' },
  inputDisabledText: { fontSize: 14, color: '#6B7280' },
  textarea: { minHeight: 110 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 8,
  },
  generateBtnDisabled: { backgroundColor: '#93C5FD' },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waitHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultBannerText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 },
  resultScroll: { padding: 16 },
  resultText: { fontSize: 14, color: '#111827', lineHeight: 21 },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 13,
  },
  secondaryBtnText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
