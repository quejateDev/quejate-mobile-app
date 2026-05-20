import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';

const SCREEN_HEIGHT = Dimensions.get('screen').height;

interface Props {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}

type Step = 'email' | 'code' | 'success';

function isAxiosErrorWithMessage(err: unknown): err is { response?: { data?: { message?: string; error?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

function describeError(err: unknown, fallback: string): string {
  if (isAxiosErrorWithMessage(err)) {
    const data = err.response?.data;
    return data?.message ?? data?.error ?? fallback;
  }
  return fallback;
}

export function ForgotPasswordModal({ visible, initialEmail, onClose }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setStep('email');
      setEmail(initialEmail ?? '');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setError(null);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start();
    }
  }, [visible, initialEmail, slideAnim]);

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleRequestCode() {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Ingresa un correo válido.');
      return;
    }
    setIsPending(true);
    try {
      await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: trimmed });
      setStep('code');
    } catch (err) {
      setError(describeError(err, 'No se pudo enviar el código. Intenta de nuevo.'));
    } finally {
      setIsPending(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    if (code.trim().length < 4) {
      setError('Ingresa el código que te llegó al correo.');
      return;
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setIsPending(true);
    try {
      await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      setStep('success');
    } catch (err) {
      setError(describeError(err, 'El código es incorrecto o expiró.'));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <Animated.View
          style={[
            s.sheet,
            s.sheetCapped,
            { transform: [{ translateY: slideAnim }], paddingBottom: 32 + insets.bottom },
          ]}
        >
          <View style={s.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {step === 'email' && (
              <>
                <View style={s.headerCenter}>
                  <View style={s.iconCircle}>
                    <Ionicons name="lock-closed-outline" size={26} color="#2563EB" />
                  </View>
                  <Text style={s.title}>Recuperar contraseña</Text>
                  <Text style={s.subtitle}>
                    Te enviaremos un código de 6 dígitos a tu correo para que puedas crear una nueva contraseña.
                  </Text>
                </View>

                <Text style={s.label}>Correo electrónico</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="tu@correo.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!isPending}
                    returnKeyType="send"
                    onSubmitEditing={handleRequestCode}
                  />
                </View>

                {error && <Text style={s.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[s.primaryBtn, isPending && s.btnDisabled]}
                  onPress={handleRequestCode}
                  disabled={isPending}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Enviar código</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={s.secondaryBtn} onPress={handleClose} disabled={isPending}>
                  <Text style={s.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'code' && (
              <>
                <View style={s.headerCenter}>
                  <View style={s.iconCircle}>
                    <Ionicons name="mail-open-outline" size={26} color="#2563EB" />
                  </View>
                  <Text style={s.title}>Revisa tu correo</Text>
                  <Text style={s.subtitle}>
                    Enviamos un código a <Text style={s.emailHighlight}>{email}</Text>. Ingrésalo abajo y crea tu nueva contraseña.
                  </Text>
                </View>

                <Text style={s.label}>Código</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="key-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                  <TextInput
                    style={[s.input, s.codeInput]}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                    editable={!isPending}
                  />
                </View>

                <Text style={s.label}>Nueva contraseña</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isPending}
                  />
                  {newPassword.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={s.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={s.label}>Confirmar contraseña</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#9CA3AF" style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="Repite la contraseña"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isPending}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                </View>

                {error && <Text style={s.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[s.primaryBtn, isPending && s.btnDisabled]}
                  onPress={handleResetPassword}
                  disabled={isPending}
                  activeOpacity={0.85}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Actualizar contraseña</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => {
                    setStep('email');
                    setError(null);
                  }}
                  disabled={isPending}
                >
                  <Text style={s.secondaryBtnText}>Cambiar correo</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'success' && (
              <>
                <View style={s.headerCenter}>
                  <View style={[s.iconCircle, s.iconCircleSuccess]}>
                    <Ionicons name="checkmark" size={28} color="#fff" />
                  </View>
                  <Text style={s.title}>¡Contraseña actualizada!</Text>
                  <Text style={s.subtitle}>
                    Ya puedes iniciar sesión con tu nueva contraseña.
                  </Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>Volver al inicio</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  sheetCapped: { maxHeight: '90%' },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  headerCenter: { alignItems: 'center', marginBottom: 18, paddingHorizontal: 4 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleSuccess: { backgroundColor: '#16A34A' },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  emailHighlight: { color: '#111827', fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  codeInput: { letterSpacing: 6, fontWeight: '700', fontSize: 18 },
  eyeBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 10 },
  secondaryBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});
