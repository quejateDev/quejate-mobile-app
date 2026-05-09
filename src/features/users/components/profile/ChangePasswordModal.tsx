import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { editStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  isPending: boolean;
  onSubmit: (current: string, next: string) => void;
  onCancel: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('screen').height;

export function ChangePasswordModal({ visible, isPending, onSubmit, onCancel }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
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

  function handleSubmit() {
    if (!current.trim()) return Alert.alert('Error', 'Ingresa tu contraseña actual.');
    if (next.length < 6) return Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.');
    if (next !== confirm) return Alert.alert('Error', 'Las contraseñas no coinciden.');
    onSubmit(current, next);
  }

  function handleCancel() {
    setCurrent('');
    setNext('');
    setConfirm('');
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleCancel}>
      <View style={editStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={handleCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[editStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={editStyles.handle} />
            <Text style={[editStyles.label, { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 }]}>
              Cambiar contraseña
            </Text>

            <Text style={editStyles.label}>Contraseña actual</Text>
            <TextInput
              style={editStyles.input}
              value={current}
              onChangeText={setCurrent}
              placeholder="••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              editable={!isPending}
              returnKeyType="next"
            />

            <Text style={editStyles.label}>Nueva contraseña</Text>
            <TextInput
              style={editStyles.input}
              value={next}
              onChangeText={setNext}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              editable={!isPending}
              returnKeyType="next"
            />

            <Text style={editStyles.label}>Confirmar nueva contraseña</Text>
            <TextInput
              style={editStyles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              editable={!isPending}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={[editStyles.saveBtn, isPending && editStyles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={editStyles.saveBtnText}>Actualizar contraseña</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={editStyles.cancelBtn}
              onPress={handleCancel}
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
