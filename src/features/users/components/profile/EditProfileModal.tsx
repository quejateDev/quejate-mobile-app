import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const SCREEN_HEIGHT = Dimensions.get('screen').height;

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
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onCancel}>
      <View style={editStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[editStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={editStyles.handle} />
            <Text style={[editStyles.label, { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }]}>
              Editar perfil
            </Text>

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
                <Ionicons name="camera" size={14} color="#fff" style={{ marginRight: 4 }} />
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
                <Text style={editStyles.saveBtnText}>Guardar cambios</Text>
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
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
