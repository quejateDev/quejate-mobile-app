import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuth } from '@core/auth/useAuth';
import { uploadToS3 } from '@shared/utils/s3Upload';
import { getErrorStatus, isUnauthorized } from '@shared/utils/httpError';
import type { UserProfile } from '@core/types';

interface UpdateInput {
  name: string;
  phone: string;
  imageUri: string | null;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface Callbacks {
  onUpdated: () => void;
  onPasswordChanged: () => void;
  onDeleted: () => void;
}

export function useProfileActions({ onUpdated, onPasswordChanged, onDeleted }: Callbacks) {
  const { user: sessionUser, signOut, setUser } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<UserProfile>({
    queryKey: ['user', sessionUser?.id],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USERS.DETAIL(sessionUser!.id));
      return res.data;
    },
    enabled: !!sessionUser?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ name, phone, imageUri }: UpdateInput) => {
      let imageUrl: string | undefined;
      if (imageUri) {
        imageUrl = await uploadToS3(imageUri, 'image/jpeg', 'avatars');
      }
      const res = await apiClient.patch<{
        id: string;
        name: string;
        email: string;
        phone?: string;
        image?: string;
      }>(ENDPOINTS.USERS.UPDATE(sessionUser!.id), {
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(imageUrl ? { image: imageUrl } : {}),
      });
      return res.data;
    },
    onSuccess: (updated) => {
      setUser({ ...sessionUser!, name: updated.name, image: updated.image ?? sessionUser!.image });
      queryClient.invalidateQueries({ queryKey: ['user', sessionUser?.id] });
      onUpdated();
    },
    onError: (error) => {
      if (isUnauthorized(error)) return;
      Alert.alert('Error', 'No se pudo actualizar el perfil. Inténtalo de nuevo.');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: ChangePasswordInput) => {
      await apiClient.patch(
        ENDPOINTS.USERS.UPDATE(sessionUser!.id),
        { name: sessionUser!.name ?? '', currentPassword, newPassword },
        { skipAuth401: true },
      );
    },
    onSuccess: () => {
      onPasswordChanged();
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada exitosamente.');
    },
    onError: (error) => {
      const status = getErrorStatus(error);
      const msg = (
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      ).toLowerCase();
      if (status === 401 || msg.includes('contraseña') || msg.includes('credencial')) {
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
      onDeleted();
      signOut();
    },
    onError: (error) => {
      if (isUnauthorized(error)) return;
      Alert.alert('Error', 'No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    },
  });

  return {
    profile: profileQuery.data,
    isProfileError: profileQuery.isError,
    refetchProfile: profileQuery.refetch,
    updateMutation,
    changePasswordMutation,
    deleteAccountMutation,
  };
}
