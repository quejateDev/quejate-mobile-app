import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Recaptcha, { RecaptchaRef } from 'react-native-recaptcha-that-works';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@core/auth/useAuth';
import { useDepartments, useMunicipalities } from '@features/pqr/hooks/useLocations';
import { useEntities } from '@features/pqr/hooks/useEntities';
import { usePQRConfig } from '@features/pqr/hooks/usePQRConfig';
import { useCreatePQR } from '@features/pqr/hooks/useCreatePQR';
import type { LocalAttachment } from '@features/pqr/hooks/useCreatePQR';
import type { CustomField } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';
import { schema, type FormData } from '@features/pqr/components/create/createPQRTypes';
import { styles } from '@features/pqr/components/create/createPQRStyles';
import { StepIndicator } from '@features/pqr/components/create/StepIndicator';
import { EntitySelector } from '@features/pqr/components/create/EntitySelector';
import { TypeAndContent } from '@features/pqr/components/create/TypeAndContent';
import { Attachments } from '@features/pqr/components/create/Attachments';
import { LocationPicker } from '@features/pqr/components/create/LocationPicker';
import { Confirmation } from '@features/pqr/components/create/Confirmation';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CreatePQR'>;

export default function CreatePQRScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const recaptchaRef = useRef<RecaptchaRef>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [pinLatitude, setPinLatitude] = useState<number | null>(null);
  const [pinLongitude, setPinLongitude] = useState<number | null>(null);
  const [pinAddress, setPinAddress] = useState<string | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isMunOpen, setIsMunOpen] = useState(false);
  const [isEntityOpen, setIsEntityOpen] = useState(false);
  const [isEntityDeptOpen, setIsEntityDeptOpen] = useState(false);
  const [geoDepId, setGeoDepId] = useState('');
  const [geoMunId, setGeoMunId] = useState('');

  useEffect(() => {
    if (currentStep !== 4 || pinLatitude != null) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setPinLatitude(loc.coords.latitude);
      setPinLongitude(loc.coords.longitude);
    })();
  }, [currentStep, pinLatitude]);

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

  const watchedEntityId = watch('entityId');
  const watchedEntityDeptId = watch('entityDepartmentId');
  const watchedIsAnonymous = watch('isAnonymous');

  const { departments, isLoading: loadingDepts } = useDepartments();
  const { municipalities, isLoading: loadingMuns } = useMunicipalities(geoDepId || undefined);
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

  async function handleNextStep() {
    setStepError(null);
    if (currentStep === 1) {
      const valid = await trigger(['entityId']);
      if (!valid) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await trigger(['type']);
      if (!valid) return;
      if (pqrConfig && !pqrConfig.allowAnonymous) setValue('isAnonymous', false);
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
    } else if (currentStep === 4) {
      setCurrentStep(5);
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
        latitude: pinLatitude,
        longitude: pinLongitude,
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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StepIndicator currentStep={currentStep} totalSteps={5} />

      {currentStep === 1 && (
        <EntitySelector
          geoDepId={geoDepId}
          setGeoDepId={setGeoDepId}
          geoMunId={geoMunId}
          setGeoMunId={setGeoMunId}
          isDeptOpen={isDeptOpen}
          setIsDeptOpen={setIsDeptOpen}
          isMunOpen={isMunOpen}
          setIsMunOpen={setIsMunOpen}
          isEntityOpen={isEntityOpen}
          setIsEntityOpen={setIsEntityOpen}
          isEntityDeptOpen={isEntityDeptOpen}
          setIsEntityDeptOpen={setIsEntityDeptOpen}
          departments={departments}
          loadingDepts={loadingDepts}
          municipalities={municipalities}
          loadingMuns={loadingMuns}
          entities={entities}
          loadingEntities={loadingEntities}
          entityDepartments={entityDepartments}
          loadingConfig={loadingConfig}
          entityIdError={errors.entityId?.message}
          watchedEntityId={watchedEntityId}
          watchedEntityDeptId={watchedEntityDeptId}
          setValue={setValue}
        />
      )}

      {currentStep === 2 && (
        <TypeAndContent
          control={control}
          errors={errors}
          allowAnonymous={pqrConfig?.allowAnonymous ?? true}
        />
      )}

      {currentStep === 3 && (
        <Attachments
          visibleFields={getVisibleCustomFields()}
          requireEvidence={pqrConfig?.requireEvidence ?? false}
          customFieldValues={customFieldValues}
          setCustomFieldValues={setCustomFieldValues}
          attachments={attachments}
          onPickImage={handlePickImage}
          onPickDocument={handlePickDocument}
          onRemoveAttachment={handleRemoveAttachment}
        />
      )}

      {currentStep === 4 && (
        <LocationPicker
          pinLatitude={pinLatitude}
          pinLongitude={pinLongitude}
          pinAddress={pinAddress}
          mapModalVisible={mapModalVisible}
          setMapModalVisible={setMapModalVisible}
          onLocationChange={(lat, lng, addr) => {
            setPinLatitude(lat);
            setPinLongitude(lng);
            setPinAddress(addr);
          }}
        />
      )}

      {currentStep === 5 && (
        <Confirmation
          entities={entities}
          entityDepartments={entityDepartments}
          visibleFields={getVisibleCustomFields()}
          customFieldValues={customFieldValues}
          attachments={attachments}
          pinLatitude={pinLatitude}
          pinLongitude={pinLongitude}
          pinAddress={pinAddress}
          recaptchaToken={recaptchaToken}
          recaptchaRef={recaptchaRef}
          isPending={isPending}
          stepError={stepError}
          onSubmit={handleSubmit}
          getValues={getValues}
        />
      )}

      {stepError && currentStep !== 5 && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{stepError}</Text>
        </View>
      )}

      {currentStep < 5 && (
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
        onVerify={(token) => setRecaptchaToken(token)}
        onExpire={() => setStepError('El captcha expiró. Intenta de nuevo.')}
        onError={() => setStepError('Error en el captcha. Intenta de nuevo.')}
        size="normal"
      />
    </ScrollView>
  );
}
