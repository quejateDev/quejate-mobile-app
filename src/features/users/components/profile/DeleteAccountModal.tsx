import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { editStyles, deleteStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  userEmail: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('screen').height;

export function DeleteAccountModal({ visible, userEmail, isPending, onConfirm, onCancel }: Props) {
  const [confirmText, setConfirmText] = useState('');
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

  function handleCancel() {
    setConfirmText('');
    onCancel();
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleCancel}>
      <View style={editStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={handleCancel} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[deleteStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
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
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
