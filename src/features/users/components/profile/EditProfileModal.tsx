import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getInitials } from './userProfileUtils';
import { editStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  name: string;
  phone: string;
  imageUri: string | null;
  currentImage: string | null | undefined;
  isPending: boolean;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onPickImage: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function EditProfileModal({
  visible,
  name,
  phone,
  imageUri,
  currentImage,
  isPending,
  onChangeName,
  onChangePhone,
  onPickImage,
  onSave,
  onCancel,
}: Props) {
  const avatarUri = imageUri ?? currentImage ?? null;
  const initials = getInitials(name);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <KeyboardAvoidingView
          style={editStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={editStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={editStyles.handle} />

            <TouchableOpacity
              style={editStyles.avatarContainer}
              onPress={onPickImage}
              disabled={isPending}
              activeOpacity={0.7}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={editStyles.avatar} />
              ) : (
                <View style={editStyles.avatarFallback}>
                  <Text style={editStyles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
              <View style={editStyles.avatarOverlay}>
                <Text style={editStyles.avatarOverlayText}>Cambiar</Text>
              </View>
            </TouchableOpacity>

            <Text style={editStyles.label}>Nombre</Text>
            <TextInput
              style={editStyles.input}
              value={name}
              onChangeText={onChangeName}
              placeholder="Tu nombre"
              placeholderTextColor="#9CA3AF"
              editable={!isPending}
              maxLength={100}
              returnKeyType="next"
            />

            <Text style={editStyles.label}>Teléfono</Text>
            <TextInput
              style={editStyles.input}
              value={phone}
              onChangeText={onChangePhone}
              placeholder="Tu teléfono"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={!isPending}
              maxLength={20}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[editStyles.saveBtn, (!name.trim() || isPending) && editStyles.saveBtnDisabled]}
              onPress={onSave}
              disabled={!name.trim() || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={editStyles.saveBtnText}>Guardar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={editStyles.cancelBtn}
              onPress={onCancel}
              disabled={isPending}
              activeOpacity={0.7}
            >
              <Text style={editStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
