import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import WebView from 'react-native-webview';
import { useAuth } from '@core/auth/useAuth';
import { useMyPQRs } from '@features/pqr/hooks/useMyPQRs';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { uploadToS3 } from '@shared/utils/s3Upload';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { UserProfile } from '@core/types';
import PQRCard from '@features/pqr/components/PQRCard';

const PRIVACY_URL = 'https://www.quejate.com.co/policy';
const TERMS_URL = 'https://www.quejate.com.co/terms';

function WebViewModal({
  visible,
  title,
  url,
  onClose,
}: {
  visible: boolean;
  title: string;
  url: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[webViewStyles.container, { paddingTop: insets.top }]}>
        <View style={webViewStyles.header}>
          <TouchableOpacity onPress={onClose} style={webViewStyles.closeBtn} activeOpacity={0.7}>
            <Text style={webViewStyles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={webViewStyles.title} numberOfLines={1}>{title}</Text>
          <View style={webViewStyles.closePlaceholder} />
        </View>
        <WebView source={{ uri: url }} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Ciudadano',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
  EMPLOYEE: 'Empleado',
  LAWYER: 'Abogado',
};

function PeopleModal({
  visible,
  title,
  people,
  onClose,
}: {
  visible: boolean;
  title: string;
  people: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          {people.length === 0 ? (
            <Text style={modalStyles.empty}>Sin resultados</Text>
          ) : (
            <FlatList
              data={people}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={modalStyles.personRow}>
                  <View style={modalStyles.personAvatar}>
                    <Text style={modalStyles.personInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={modalStyles.personName}>{item.name}</Text>
                </View>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EditProfileModal({
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
}: {
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
}) {
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

function ChangePasswordModal({
  visible,
  isPending,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  isPending: boolean;
  onSubmit: (current: string, next: string) => void;
  onCancel: () => void;
}) {
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

function DeleteAccountModal({
  visible,
  userEmail,
  isPending,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  userEmail: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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

export default function UserProfileScreen() {
  const { user: sessionUser, signOut, isLoading: authLoading, setUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<'followers' | 'following' | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [webView, setWebView] = useState<{ url: string; title: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);

  const { data: profile, isError: isProfileError, refetch: refetchProfile } = useQuery<UserProfile>({
    queryKey: ['user', sessionUser?.id],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USERS.DETAIL(sessionUser!.id));
      return res.data;
    },
    enabled: !!sessionUser?.id,
  });

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile]),
  );

  const pqrsQuery = useMyPQRs();
  const allPqrs = pqrsQuery.data?.pages.flatMap((p) => p.pqrs) ?? [];

  const updateMutation = useMutation({
    mutationFn: async ({ name, phone, imageUri }: { name: string; phone: string; imageUri: string | null }) => {
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = await uploadToS3(imageUri, 'image/jpeg', 'avatars');
      }
      const res = await apiClient.patch<{ id: string; name: string; email: string; phone?: string; image?: string }>(
        ENDPOINTS.USERS.UPDATE(sessionUser!.id),
        {
          name: name.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      );
      return res.data;
    },
    onSuccess: (updated) => {
      setUser({ ...sessionUser!, name: updated.name, image: updated.image ?? sessionUser!.image });
      queryClient.invalidateQueries({ queryKey: ['user', sessionUser?.id] });
      setEditModalVisible(false);
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo actualizar el perfil. Inténtalo de nuevo.');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      await apiClient.patch(ENDPOINTS.USERS.UPDATE(sessionUser!.id), {
        name: sessionUser!.name ?? '',
        currentPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setChangePasswordVisible(false);
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada exitosamente.');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const msg: string = error?.response?.data?.message ?? '';
      if (status === 401 || msg.toLowerCase().includes('contraseña') || msg.toLowerCase().includes('credencial')) {
        Alert.alert('Error', 'La contraseña actual es incorrecta.');
      } else {
        Alert.alert('Error', 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(ENDPOINTS.USERS.DELETE(sessionUser!.id));
    },
    onSuccess: () => {
      setDeleteAccountVisible(false);
      signOut();
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    },
  });

  function handleOpenEdit() {
    setEditName(sessionUser?.name ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditImageUri(null);
    setEditModalVisible(true);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setEditImageUri(result.assets[0].uri);
    }
  }

  function handleSaveEdit() {
    updateMutation.mutate({ name: editName, phone: editPhone, imageUri: editImageUri });
  }

  if (isProfileError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          message="No se pudo cargar tu perfil. Verifica tu conexión."
          onRetry={refetchProfile}
        />
      </SafeAreaView>
    );
  }

  function handleSignOut() {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ],
    );
  }

  const initials = getInitials(sessionUser?.name);
  const roleLabel = ROLE_LABEL[sessionUser?.role ?? ''] ?? sessionUser?.role ?? '';
  const followers = profile?.followers ?? [];
  const following = profile?.following ?? [];

  return (
    <>
      <FlatList
        style={styles.container}
        data={allPqrs}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        onEndReached={() => {
          if (pqrsQuery.hasNextPage && !pqrsQuery.isFetchingNextPage) {
            pqrsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <PQRCard
            pqr={item}
            onPress={() => navigation.navigate('PQRDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          pqrsQuery.isLoading ? (
            <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No has publicado PQRSDs</Text>
            </View>
          )
        }
        ListFooterComponent={
          pqrsQuery.isFetchingNextPage ? (
            <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} />
          ) : null
        }
        ListHeaderComponent={
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Perfil</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleOpenEdit} style={styles.editButton}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSignOut} disabled={authLoading}>
                  <Text style={styles.signOutText}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.avatarSection}>
              {sessionUser?.image ? (
                <Image source={{ uri: sessionUser.image }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.name}>{sessionUser?.name ?? 'Usuario'}</Text>
              <Text style={styles.email}>{sessionUser?.email ?? ''}</Text>
              {roleLabel ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?._count?.PQRS ?? allPqrs.length}</Text>
                <Text style={styles.statLabel}>PQRSDs</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.stat} onPress={() => setModal('followers')}>
                <Text style={styles.statValue}>{profile?._count?.followers ?? 0}</Text>
                <Text style={[styles.statLabel, styles.statLabelTap]}>Seguidores</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.stat} onPress={() => setModal('following')}>
                <Text style={styles.statValue}>{profile?._count?.following ?? 0}</Text>
                <Text style={[styles.statLabel, styles.statLabelTap]}>Siguiendo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setChangePasswordVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.infoRowText}>Cambiar contraseña</Text>
                <Text style={styles.infoRowArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.infoRowDivider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setWebView({ url: PRIVACY_URL, title: 'Política de privacidad' })}
                activeOpacity={0.7}
              >
                <Text style={styles.infoRowText}>Política de privacidad</Text>
                <Text style={styles.infoRowArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.infoRowDivider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setWebView({ url: TERMS_URL, title: 'Términos y condiciones' })}
                activeOpacity={0.7}
              >
                <Text style={styles.infoRowText}>Términos y condiciones</Text>
                <Text style={styles.infoRowArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.infoRowDivider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setDeleteAccountVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.infoRowText, { color: '#DC2626' }]}>Eliminar cuenta</Text>
                <Text style={[styles.infoRowArrow, { color: '#DC2626' }]}>›</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Mis PQRSDs</Text>
          </SafeAreaView>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      <PeopleModal
        visible={modal === 'followers'}
        title="Seguidores"
        people={followers}
        onClose={() => setModal(null)}
      />
      <PeopleModal
        visible={modal === 'following'}
        title="Siguiendo"
        people={following}
        onClose={() => setModal(null)}
      />
      <EditProfileModal
        visible={editModalVisible}
        name={editName}
        phone={editPhone}
        imageUri={editImageUri}
        currentImage={sessionUser?.image}
        isPending={updateMutation.isPending}
        onChangeName={setEditName}
        onChangePhone={setEditPhone}
        onPickImage={handlePickImage}
        onSave={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
      />
      <ChangePasswordModal
        visible={changePasswordVisible}
        isPending={changePasswordMutation.isPending}
        onSubmit={(current, next) =>
          changePasswordMutation.mutate({ currentPassword: current, newPassword: next })
        }
        onCancel={() => setChangePasswordVisible(false)}
      />
      <DeleteAccountModal
        visible={deleteAccountVisible}
        userEmail={sessionUser?.email ?? ''}
        isPending={deleteAccountMutation.isPending}
        onConfirm={() => deleteAccountMutation.mutate()}
        onCancel={() => setDeleteAccountVisible(false)}
      />
      <WebViewModal
        visible={webView !== null}
        title={webView?.title ?? ''}
        url={webView?.url ?? ''}
        onClose={() => setWebView(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editButton: {
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  email: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  roleBadge: { backgroundColor: '#EFF6FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 16, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statLabelTap: { color: '#2563EB' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  infoSection: {
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16,
    marginBottom: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoRowText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  infoRowArrow: { fontSize: 18, color: '#9CA3AF' },
  infoRowDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 8 },
  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, maxHeight: '60%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  close: { fontSize: 18, color: '#6B7280' },
  empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 24 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  personAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  personInitial: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  personName: { fontSize: 15, color: '#111827' },
});

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  avatarContainer: { alignSelf: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  avatarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    paddingVertical: 4, alignItems: 'center',
  },
  avatarOverlayText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  saveBtnDisabled: { backgroundColor: '#93C5FD' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});

const deleteStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#991B1B', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 20 },
  emailHighlight: { fontWeight: '700', color: '#111827' },
  bullet: { fontSize: 12, color: '#6B7280', marginBottom: 3, lineHeight: 18 },
  deleteBtn: {
    backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  deleteBtnDisabled: { backgroundColor: '#FCA5A5' },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const webViewStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, color: '#6B7280' },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#111827' },
  closePlaceholder: { width: 26 },
});
