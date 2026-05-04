import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@core/auth/useAuth';
import { useMyPQRs } from '@features/pqr/hooks/useMyPQRs';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { uploadToS3 } from '@shared/utils/s3Upload';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { UserProfile } from '@core/types';
import PQRCard from '@features/pqr/components/PQRCard';
import { getInitials, ROLE_LABEL } from '@features/users/components/profile/userProfileUtils';
import { styles } from '@features/users/components/profile/userProfileStyles';
import { PeopleModal } from '@features/users/components/profile/PeopleModal';
import { EditProfileModal } from '@features/users/components/profile/EditProfileModal';
import { ChangePasswordModal } from '@features/users/components/profile/ChangePasswordModal';
import { DeleteAccountModal } from '@features/users/components/profile/DeleteAccountModal';
import { WebViewModal } from '@features/users/components/profile/WebViewModal';

const PRIVACY_URL = 'https://www.quejate.com.co/policy';
const TERMS_URL = 'https://www.quejate.com.co/terms';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function UserProfileScreen() {
  const { user: sessionUser, signOut, isLoading: authLoading, setUser } = useAuth();
  const navigation = useNavigation<Nav>();
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
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
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
        onSave={() => updateMutation.mutate({ name: editName, phone: editPhone, imageUri: editImageUri })}
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
