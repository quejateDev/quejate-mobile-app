import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { editStyles } from './userProfileStyles';

const SCREEN_HEIGHT = Dimensions.get('screen').height;
const SUPPORT_EMAIL = 'soporte@quejate.com.co';

interface Props {
  visible: boolean;
  userEmail?: string;
  userName?: string;
  onClose: () => void;
}

export function SupportModal({ visible, userEmail, userName, onClose }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setSubject('');
      setMessage('');
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start();
    }
  }, [visible, slideAnim]);

  function handleClose() {
    setSubject('');
    setMessage('');
    onClose();
  }

  async function handleSend() {
    if (!subject.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el asunto de tu mensaje.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe tu mensaje.');
      return;
    }

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Sin cliente de correo',
        `No se encontró una aplicación de correo configurada en tu dispositivo. Escríbenos directamente a ${SUPPORT_EMAIL}`,
      );
      return;
    }

    setIsSending(true);
    try {
      const body = userName
        ? `${message.trim()}\n\n—\n${userName}${userEmail ? ` (${userEmail})` : ''}`
        : message.trim();

      const result = await MailComposer.composeAsync({
        recipients: [SUPPORT_EMAIL],
        subject: subject.trim(),
        body,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert('Mensaje enviado', 'Nuestro equipo de soporte te responderá pronto.');
        handleClose();
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={editStyles.overlay} behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <Animated.View
          style={[
            editStyles.sheet,
            editStyles.sheetCapped,
            { transform: [{ translateY: slideAnim }], paddingBottom: 32 + insets.bottom },
          ]}
        >
          <View style={editStyles.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={editStyles.sheetScrollContent}
          >
            <View style={s.headerCenter}>
              <View style={s.iconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#2563EB" />
              </View>
              <Text style={s.title}>Contactar soporte</Text>
              <Text style={s.subtitle}>Te respondemos a la brevedad posible</Text>
            </View>

            <Text style={editStyles.label}>Asunto *</Text>
            <TextInput
              style={editStyles.input}
              placeholder="¿En qué podemos ayudarte?"
              placeholderTextColor="#9CA3AF"
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
              editable={!isSending}
              returnKeyType="next"
            />

            <Text style={editStyles.label}>Mensaje *</Text>
            <TextInput
              style={[editStyles.input, s.textArea]}
              placeholder="Describe tu consulta o problema con el mayor detalle posible..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
              editable={!isSending}
            />
            <Text style={s.charCount}>{message.length}/1000</Text>

            <View style={s.emailNote}>
              <Ionicons name="mail-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={s.emailNoteText}>Se enviará a {SUPPORT_EMAIL}</Text>
            </View>

            <TouchableOpacity
              style={[editStyles.saveBtn, isSending && editStyles.saveBtnDisabled]}
              onPress={handleSend}
              disabled={isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={s.sendInner}>
                  <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={editStyles.saveBtnText}>Enviar</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={editStyles.cancelBtn}
              onPress={handleClose}
              disabled={isSending}
              activeOpacity={0.7}
            >
              <Text style={editStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  headerCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  textArea: {
    height: 120,
    paddingTop: 11,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 12,
  },
  emailNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailNoteText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sendInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
