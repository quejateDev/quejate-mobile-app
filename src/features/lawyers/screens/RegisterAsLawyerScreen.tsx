import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRegisterAsLawyer } from '@features/lawyers/hooks/useLawyers';
import type { DocumentType } from '@core/types';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PPT', label: 'Permiso por protección temporal' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'LICENSE', label: 'Licencia' },
  { value: 'NIT', label: 'NIT' },
];

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function ImagePickerField({
  label,
  uri,
  onPick,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
}) {
  return (
    <View style={styles.imagePickerField}>
      <SectionLabel text={label} />
      <TouchableOpacity style={styles.imagePicker} onPress={onPick} activeOpacity={0.8}>
        {uri ? (
          <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Toca para seleccionar</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function RegisterAsLawyerScreen() {
  const navigation = useNavigation();
  const registerMutation = useRegisterAsLawyer();

  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [identityDocument, setIdentityDocument] = useState('');
  const [identityDocumentImageUri, setIdentityDocumentImageUri] = useState<string | null>(null);
  const [professionalCardImageUri, setProfessionalCardImageUri] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [description, setDescription] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [feePerHour, setFeePerHour] = useState('');

  async function pickImage(onSelect: (uri: string) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para adjuntar imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelect(result.assets[0].uri);
    }
  }

  function validate(): string | null {
    if (!identityDocument.trim()) return 'Ingresa tu número de documento.';
    if (!identityDocumentImageUri) return 'Adjunta una imagen de tu documento de identidad.';
    if (!professionalCardImageUri) return 'Adjunta una imagen de tu tarjeta profesional.';
    if (!licenseNumber.trim()) return 'Ingresa tu número de licencia.';
    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (specialties.length === 0) return 'Ingresa al menos una especialidad.';
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) {
      Alert.alert('Campos incompletos', error);
      return;
    }

    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    registerMutation.mutate(
      {
        documentType,
        identityDocument: identityDocument.trim(),
        identityDocumentImageUri: identityDocumentImageUri!,
        professionalCardImageUri: professionalCardImageUri!,
        licenseNumber: licenseNumber.trim(),
        specialties,
        description: description.trim() || undefined,
        feePerHour: feePerHour ? parseFloat(feePerHour) : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert(
            'Solicitud enviada',
            'Tu registro como abogado está pendiente de verificación. Te notificaremos cuando sea aprobado.',
            [{ text: 'Aceptar', onPress: () => navigation.goBack() }],
          );
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo completar el registro. Intenta de nuevo.');
        },
      },
    );
  }

  const selectedDocLabel = DOCUMENT_TYPES.find((d) => d.value === documentType)?.label ?? documentType;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Completa el formulario para registrarte como abogado en la plataforma.
          Tu solicitud será revisada y recibirás una notificación con el resultado.
        </Text>

        {/* Profile photo */}
        <ImagePickerField
          label="Foto profesional (recomendado)"
          uri={profilePhotoUri}
          onPick={() => pickImage(setProfilePhotoUri)}
        />

        {/* Document type */}
        <SectionLabel text="Tipo de documento *" />
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowDocPicker((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.selectorText}>{selectedDocLabel}</Text>
          <Text style={styles.selectorArrow}>{showDocPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDocPicker && (
          <View style={styles.dropdownList}>
            {DOCUMENT_TYPES.map((dt) => (
              <TouchableOpacity
                key={dt.value}
                style={[styles.dropdownItem, documentType === dt.value && styles.dropdownItemActive]}
                onPress={() => { setDocumentType(dt.value); setShowDocPicker(false); }}
              >
                <Text style={[styles.dropdownItemText, documentType === dt.value && styles.dropdownItemTextActive]}>
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Identity document number */}
        <SectionLabel text="Número de documento *" />
        <TextInput
          style={styles.input}
          value={identityDocument}
          onChangeText={setIdentityDocument}
          placeholder="Ej. 1234567890"
          placeholderTextColor="#9CA3AF"
          keyboardType="default"
          autoCapitalize="none"
        />

        {/* License number */}
        <SectionLabel text="Número de licencia profesional *" />
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="Ej. 123456-A"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />

        {/* Specialties */}
        <SectionLabel text="Especialidades * (separadas por coma)" />
        <TextInput
          style={styles.input}
          value={specialtiesText}
          onChangeText={setSpecialtiesText}
          placeholder="Ej. Derecho civil, Derecho laboral"
          placeholderTextColor="#9CA3AF"
        />

        {/* Description */}
        <SectionLabel text="Descripción profesional" />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe tu experiencia y áreas de práctica…"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          maxLength={500}
        />

        {/* Fee */}
        <SectionLabel text="Tarifa por hora (COP, opcional)" />
        <TextInput
          style={styles.input}
          value={feePerHour}
          onChangeText={setFeePerHour}
          placeholder="Ej. 150000"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        {/* Document image */}
        <ImagePickerField
          label="Foto del documento de identidad *"
          uri={identityDocumentImageUri}
          onPick={() => pickImage(setIdentityDocumentImageUri)}
        />

        {/* Professional card image */}
        <ImagePickerField
          label="Foto de la tarjeta profesional *"
          uri={professionalCardImageUri}
          onPick={() => pickImage(setProfessionalCardImageUri)}
        />

        <TouchableOpacity
          style={[styles.submitBtn, registerMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={registerMutation.isPending}
          activeOpacity={0.85}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Enviar solicitud</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  intro: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { fontSize: 14, color: '#111827' },
  selectorArrow: { fontSize: 12, color: '#9CA3AF' },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemTextActive: { color: '#2563EB', fontWeight: '600' },
  imagePickerField: { marginTop: 4 },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    height: 140,
    backgroundColor: '#fff',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: 14, color: '#9CA3AF' },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
