import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRegisterAsLawyer } from './useLawyers';
import type { DocumentType } from '@core/types';

export function useRegisterLawyerForm() {
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
    const specialties = specialtiesText.split(',').map((s) => s.trim()).filter(Boolean);
    if (specialties.length === 0) return 'Ingresa al menos una especialidad.';
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) {
      Alert.alert('Campos incompletos', error);
      return;
    }
    const specialties = specialtiesText.split(',').map((s) => s.trim()).filter(Boolean);
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

  return {
    documentType, setDocumentType,
    showDocPicker, setShowDocPicker,
    identityDocument, setIdentityDocument,
    identityDocumentImageUri, setIdentityDocumentImageUri,
    professionalCardImageUri, setProfessionalCardImageUri,
    licenseNumber, setLicenseNumber,
    specialtiesText, setSpecialtiesText,
    description, setDescription,
    feePerHour, setFeePerHour,
    pickImage,
    handleSubmit,
    isPending: registerMutation.isPending,
  };
}
