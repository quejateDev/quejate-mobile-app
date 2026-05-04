import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { editStyles, deleteStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  userEmail: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAccountModal({ visible, userEmail, isPending, onConfirm, onCancel }: Props) {
  const [confirmText, setConfirmText] = useState('');

  function handleCancel() {
    setConfirmText('');
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <KeyboardAvoidingView
          style={editStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={deleteStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={editStyles.handle} />
            <Text style={deleteStyles.title}>Eliminar cuenta</Text>
            <Text style={deleteStyles.subtitle}>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta{' '}
              <Text style={deleteStyles.emailHighlight}>{userEmail}</Text> y todos sus datos.
            </Text>
            <Text style={deleteStyles.bullet}>• Todos tus PQRSDs se eliminarán de la plataforma.</Text>
            <Text style={deleteStyles.bullet}>• Tu perfil y datos personales serán borrados.</Text>
            <Text style={deleteStyles.bullet}>• Perderás acceso a todas las funcionalidades.</Text>

            <Text style={[editStyles.label, { marginTop: 16 }]}>Escribe "ELIMINAR" para confirmar:</Text>
            <TextInput
              style={editStyles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="ELIMINAR"
              placeholderTextColor="#9CA3AF"
              editable={!isPending}
              autoCapitalize="characters"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[deleteStyles.deleteBtn, (confirmText !== 'ELIMINAR' || isPending) && deleteStyles.deleteBtnDisabled]}
              onPress={onConfirm}
              disabled={confirmText !== 'ELIMINAR' || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={deleteStyles.deleteBtnText}>Sí, eliminar mi cuenta</Text>
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
