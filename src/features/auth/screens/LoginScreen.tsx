import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@core/auth/useAuth';
import { useGoogleAuth } from '@features/auth/hooks/useGoogleAuth';

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

function mapSignInError(error: unknown): string {
  if (error instanceof TypeError) return 'Sin conexión. Verifica tu internet';
  if (error instanceof Error) {
    if (error.message === 'EMAIL_NOT_VERIFIED') return 'Verifica tu correo antes de iniciar sesión';
    if (error.message === 'INVALID_CREDENTIALS') return 'Email o contraseña incorrectos';
    if (error.message === 'SESSION_INVALID') return 'Sesión inválida. Intenta de nuevo.';
  }
  const axiosErr = error as { response?: { status?: number; data?: { error?: string; message?: string } } };
  const backendMsg = axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message;
  if (backendMsg) return `Error ${axiosErr?.response?.status ?? ''}: ${backendMsg}`;
  return 'Email o contraseña incorrectos';
}

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { signInWithCredentials } = useAuth();
  const google = useGoogleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await signInWithCredentials(data.email, data.password);
    } catch (e) {
      setServerError(mapSignInError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || google.isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>Quéjate</Text>
          <Text style={styles.tagline}>Tu voz importa</Text>
        </View>

        {/* Email */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Correo electrónico</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="tu@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                editable={!isLoading}
              />
            )}
          />
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
        </View>

        {/* Contraseña */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordRow}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="••••••"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isLoading}
                />
              )}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Text style={styles.eyeText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
        </View>

        {/* Error servidor */}
        {(serverError || google.error) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{serverError ?? google.error}</Text>
          </View>
        )}

        {/* Botón iniciar sesión */}
        <TouchableOpacity
          testID="login-button"
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/* Separador */}
        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>o continúa con</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Botón Google */}
        <TouchableOpacity
          style={[styles.googleButton, (isLoading || !google.isReady) && styles.buttonDisabled]}
          onPress={() => {
            setServerError(null);
            google.signIn();
          }}
          disabled={isLoading || !google.isReady}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión con Google"
        >
          {google.isLoading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <Text style={styles.googleButtonText}>Google</Text>
          )}
        </TouchableOpacity>

        {/* Links */}
        <TouchableOpacity
          style={styles.link}
          onPress={() => WebBrowser.openBrowserAsync('https://quejate.com.co/auth/reset')}
        >
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    paddingRight: 72,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  eyeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  separatorText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  link: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#2563EB',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
});
