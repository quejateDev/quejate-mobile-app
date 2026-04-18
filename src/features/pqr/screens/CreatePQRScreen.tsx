import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Recaptcha, { RecaptchaRef } from 'react-native-recaptcha-that-works';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@core/auth/useAuth';
import { typeMap } from '@core/types';
import type { PQRSType, CustomField } from '@core/types';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { useEntities } from '@features/pqr/hooks/useEntities';
import { usePQRConfig } from '@features/pqr/hooks/usePQRConfig';
import { useCreatePQR } from '@features/pqr/hooks/useCreatePQR';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';
import type { AppStackParamList } from '@navigation/AppNavigator';

const schema = z.object({
  entityId: z.string().min(1, 'Selecciona una entidad'),
  entityDepartmentId: z.string().optional(),
  type: z.enum(
    ['PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION', 'REPORT'],
    { error: 'Selecciona un tipo de PQRSD' },
  ),
  subject: z.string().optional(),
  description: z.string().optional(),
  isAnonymous: z.boolean(),
  isPrivate: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type Nav = NativeStackNavigationProp<AppStackParamList, 'CreatePQR'>;

const PQRS_TYPES: PQRSType[] = [
  'PETITION',
  'COMPLAINT',
  'CLAIM',
  'SUGGESTION',
  'REPORT',
];

export default function CreatePQRScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const recaptchaRef = useRef<RecaptchaRef>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isMunOpen, setIsMunOpen] = useState(false);
  const [isEntityOpen, setIsEntityOpen] = useState(false);

  const { createPQR, isPending } = useCreatePQR(user?.id);

  const {
    control,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entityId: '',
      entityDepartmentId: '',
      type: undefined,
      subject: '',
      description: '',
      isAnonymous: false,
      isPrivate: false,
    },
  });

  const [geoDepId, setGeoDepId] = useState('');
  const [geoMunId, setGeoMunId] = useState('');
  const [isEntityDeptOpen, setIsEntityDeptOpen] = useState(false);

  const watchedEntityId = watch('entityId');
  const watchedEntityDeptId = watch('entityDepartmentId');
  const watchedIsAnonymous = watch('isAnonymous');

  const { departments, isLoading: loadingDepts } = useDepartments();
  const { municipalities, isLoading: loadingMuns } = useMunicipalities(
    geoDepId || undefined,
  );
  const { entities, isLoading: loadingEntities } = useEntities({
    departmentId: geoDepId || undefined,
    municipalityId: geoMunId || undefined,
  });
  const { pqrConfig, entityDepartments, isLoading: loadingConfig } = usePQRConfig(
    watchedEntityId || undefined,
  );

  function getVisibleCustomFields(): CustomField[] {
    if (!pqrConfig) return [];
    return pqrConfig.customFields.filter(
      (field) => !(field.isForAnonymous === false && watchedIsAnonymous),
    );
  }

  function findName<T extends { id: string; name: string }>(
    list: T[],
    id: string,
  ): string {
    return list.find((item) => item.id === id)?.name ?? '';
  }

  async function handleNextStep() {
    setStepError(null);

    if (currentStep === 1) {
      const valid = await trigger(['entityId']);
      if (!valid) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await trigger(['type']);
      if (!valid) return;
      if (pqrConfig && !pqrConfig.allowAnonymous) {
        setValue('isAnonymous', false);
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const visibleFields = getVisibleCustomFields();
      for (const field of visibleFields) {
        if (field.required && !customFieldValues[field.name]?.trim()) {
          setStepError(`El campo "${field.name}" es requerido`);
          return;
        }
      }
      if (pqrConfig?.requireEvidence && attachments.length === 0) {
        setStepError('Debes adjuntar al menos un archivo de evidencia');
        return;
      }
      setCurrentStep(4);
    }
  }

  function handlePrevStep() {
    setStepError(null);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName ?? `imagen_${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
          size: asset.fileSize ?? 0,
        },
      ]);
    }
  }

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'video/*'],
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
          size: asset.size ?? 0,
        },
      ]);
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRecaptchaVerify(token: string) {
    setRecaptchaToken(token);
  }

  async function handleSubmit() {
    if (!recaptchaToken) {
      setStepError('Debes completar la verificación de seguridad.');
      return;
    }
    setStepError(null);

    const values = getValues();
    const visibleFields = getVisibleCustomFields();
    const customFieldsPayload = visibleFields.map((field) => ({
      name: field.name,
      value: customFieldValues[field.name] ?? '',
      type: field.type,
      placeholder: field.placeholder ?? '',
      required: field.required,
    }));

    try {
      const result = await createPQR({
        type: values.type,
        entityId: values.entityId,
        departmentId: values.entityDepartmentId || undefined,
        subject: values.subject || undefined,
        description: values.description || undefined,
        isAnonymous: values.isAnonymous,
        isPrivate: values.isPrivate,
        creatorId: user?.id,
        customFields: customFieldsPayload,
        localAttachments: attachments,
        recaptchaToken,
      });

      Alert.alert(
        '¡PQRSD enviada!',
        `Tu solicitud fue registrada con el código:\n${result.consecutiveCode}`,
        [{ text: 'Aceptar', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; details?: string } } };
      const status = axiosErr?.response?.status;
      const detail = axiosErr?.response?.data?.details ?? axiosErr?.response?.data?.error;
      setStepError(
        detail
          ? `Error ${status ?? ''}: ${detail}`
          : 'Error al enviar la PQRSD. Intenta de nuevo.',
      );
    }
  }

  function renderStepIndicator() {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep === step && styles.stepDotActive,
              currentStep > step && styles.stepDotDone,
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                currentStep === step && styles.stepDotTextActive,
                currentStep > step && styles.stepDotTextDone,
              ]}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderStep1() {
    return (
      <View testID="step1-content">
        <Text style={styles.stepTitle}>Paso 1 — Ubicación y entidad</Text>

        {/* Departamento geográfico (solo filtro) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Departamento (opcional)</Text>
          <TouchableOpacity
            testID="dept-selector"
            style={styles.selector}
            onPress={() => {
              setIsDeptOpen((v) => !v);
              setIsMunOpen(false);
              setIsEntityOpen(false);
              setIsEntityDeptOpen(false);
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

        {/* Municipio geográfico (solo filtro) */}
        {geoDepId ? (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Municipio (opcional)</Text>
            <TouchableOpacity
              testID="municipality-selector"
              style={styles.selector}
              onPress={() => {
                setIsMunOpen((v) => !v);
                setIsDeptOpen(false);
                setIsEntityOpen(false);
                setIsEntityDeptOpen(false);
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
            style={[styles.selector, errors.entityId && styles.selectorError]}
            onPress={() => {
              setIsEntityOpen((v) => !v);
              setIsDeptOpen(false);
              setIsMunOpen(false);
              setIsEntityDeptOpen(false);
            }}
          >
            <Text style={watchedEntityId ? styles.selectorText : styles.selectorPlaceholder}>
              {watchedEntityId ? findName(entities, watchedEntityId) : 'Selecciona una entidad'}
            </Text>
          </TouchableOpacity>
          {errors.entityId && (
            <Text style={styles.fieldError}>{errors.entityId.message}</Text>
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

        {/* Sub-departamento de la entidad (UUID) — solo si la entidad tiene áreas */}
        {watchedEntityId && entityDepartments.length > 0 && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Área / Departamento (opcional)</Text>
            <TouchableOpacity
              testID="entity-dept-selector"
              style={styles.selector}
              onPress={() => {
                setIsEntityDeptOpen((v) => !v);
                setIsEntityOpen(false);
                setIsDeptOpen(false);
                setIsMunOpen(false);
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

  function renderStep2() {
    const allowAnonymous = pqrConfig?.allowAnonymous ?? true;

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

  function renderStep3() {
    const visibleFields = getVisibleCustomFields();

    return (
      <View testID="step3-content">
        <Text style={styles.stepTitle}>Paso 3 — Información adicional</Text>

        {/* Campos personalizados */}
        {visibleFields.length > 0 && (
          <View style={styles.fieldContainer}>
            <Text style={styles.sectionLabel}>Campos requeridos por la entidad</Text>
            {visibleFields.map((field) => (
              <View key={field.id} style={styles.fieldContainer}>
                <Text style={styles.label}>
                  {field.name}
                  {field.required ? ' *' : ''}
                </Text>
                <TextInput
                  testID={`custom-field-${field.name}`}
                  style={styles.input}
                  placeholder={field.placeholder ?? field.name}
                  value={customFieldValues[field.name] ?? ''}
                  onChangeText={(text) =>
                    setCustomFieldValues((prev) => ({
                      ...prev,
                      [field.name]: text,
                    }))
                  }
                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                />
              </View>
            ))}
          </View>
        )}

        {/* Adjuntos */}
        <View style={styles.fieldContainer}>
          <Text style={styles.sectionLabel}>
            Adjuntos
            {pqrConfig?.requireEvidence ? ' (mínimo 1 requerido)' : ' (opcional)'}
          </Text>

          <View style={styles.attachmentButtons}>
            <TouchableOpacity
              testID="add-image-btn"
              style={styles.attachmentBtn}
              onPress={handlePickImage}
            >
              <Text style={styles.attachmentBtnText}>+ Imagen / Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="add-doc-btn"
              style={styles.attachmentBtn}
              onPress={handlePickDocument}
            >
              <Text style={styles.attachmentBtnText}>+ Documento</Text>
            </TouchableOpacity>
          </View>

          {attachments.map((file, index) => (
            <View key={file.uri} style={styles.attachmentItem}>
              <Text style={styles.attachmentName} numberOfLines={1}>
                {file.name}
              </Text>
              <TouchableOpacity
                testID={`remove-attachment-${index}`}
                onPress={() => handleRemoveAttachment(index)}
              >
                <Text style={styles.removeText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  }

  function renderStep4() {
    const values = getValues();
    const selectedEntity = entities.find((e) => e.id === values.entityId);
    const selectedEntityDept = entityDepartments.find((d) => d.id === values.entityDepartmentId);
    const visibleFields = getVisibleCustomFields();

    return (
      <View testID="step4-content">
        <Text style={styles.stepTitle}>Paso 4 — Confirmación</Text>
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
          <SummaryRow
            label="Anónimo"
            value={values.isAnonymous ? 'Sí' : 'No'}
          />
          <SummaryRow
            label="Privado"
            value={values.isPrivate ? 'Sí' : 'No'}
          />
          {visibleFields.map((field) => (
            <SummaryRow
              key={field.id}
              label={field.name}
              value={customFieldValues[field.name] ?? '—'}
            />
          ))}
          <SummaryRow
            label="Adjuntos"
            value={
              attachments.length > 0
                ? `${attachments.length} archivo(s)`
                : 'Ninguno'
            }
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
          onPress={handleSubmit}
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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {renderStepIndicator()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {stepError && currentStep !== 4 && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{stepError}</Text>
        </View>
      )}

      {/* Navigation buttons (steps 1-3) */}
      {currentStep < 4 && (
        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              testID="step-back"
              style={styles.backButton}
              onPress={handlePrevStep}
            >
              <Text style={styles.backButtonText}>Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="step-next"
            style={styles.button}
            onPress={handleNextStep}
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      )}

      <Recaptcha
        ref={recaptchaRef}
        siteKey={process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}
        baseUrl="https://www.quejate.com.co"
        onVerify={handleRecaptchaVerify}
        onExpire={() => setStepError('El captcha expiró. Intenta de nuevo.')}
        onError={() => setStepError('Error en el captcha. Intenta de nuevo.')}
        size="normal"
      />
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  stepDotDone: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepDotTextDone: {
    color: '#1D4ED8',
  },

  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  selector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  selectorText: {
    fontSize: 15,
    color: '#111827',
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  optionList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  optionScroll: {
    maxHeight: 200,
  },
  optionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 15,
    color: '#111827',
  },
  optionLoader: {
    padding: 12,
  },
  configLoader: {
    marginTop: 8,
  },

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#fff',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  attachmentButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  attachmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  attachmentBtnText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginRight: 12,
  },
  removeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },

  confirmNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },

  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  captchaRow: {
    marginBottom: 16,
  },
  captchaButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  captchaButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  captchaVerified: {
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  captchaVerifiedText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
});
