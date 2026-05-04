import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { modalStyles } from './lawyerDetailStyles';

interface Props {
  visible: boolean;
  lawyerName: string;
  isPending: boolean;
  requestMsg: string;
  setRequestMsg: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export function RequestServiceModal({
  visible,
  lawyerName,
  isPending,
  requestMsg,
  setRequestMsg,
  contactEmail,
  setContactEmail,
  contactPhone,
  setContactPhone,
  onSend,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.backdropArea} onPress={() => !isPending && onClose()}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable onPress={() => {}}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Solicitar servicio</Text>
              <Text style={modalStyles.subtitle}>{lawyerName}</Text>

              <Text style={modalStyles.label}>Mensaje *</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.multiline]}
                value={requestMsg}
                onChangeText={setRequestMsg}
                placeholder="Describe tu caso brevemente…"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
                editable={!isPending}
              />

              <Text style={modalStyles.label}>Email de contacto</Text>
              <TextInput
                style={modalStyles.input}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isPending}
              />

              <Text style={modalStyles.label}>Teléfono de contacto</Text>
              <TextInput
                style={modalStyles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Tu teléfono"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!isPending}
              />

              <TouchableOpacity
                style={[modalStyles.actionBtn, (!requestMsg.trim() || isPending) && modalStyles.actionBtnDisabled]}
                onPress={onSend}
                disabled={!requestMsg.trim() || isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modalStyles.actionBtnText}>Enviar solicitud</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={onClose}
                disabled={isPending}
              >
                <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
