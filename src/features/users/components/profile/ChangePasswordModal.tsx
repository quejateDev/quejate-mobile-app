import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { editStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  isPending: boolean;
  onSubmit: (current: string, next: string) => void;
  onCancel: () => void;
}

export function ChangePasswordModal({ visible, isPending, onSubmit, onCancel }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <KeyboardAvoidingView
          style={editStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={editStyles.sheet} onStartShouldSetResponder={() => true}>
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
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
