import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { useAuth } from '@core/auth/useAuth';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { UserProfile, PQRS } from '@core/types';
import PQRCard from '@features/pqr/components/PQRCard';

const ROLE_LABEL: Record<string, string> = {
  CLIENT: 'Ciudadano',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
  EMPLOYEE: 'Empleado',
  LAWYER: 'Abogado',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function PublicProfileScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'PublicProfile'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const { userId } = route.params;

  const { data: user, isLoading, isError, refetch } = useQuery<UserProfile>({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USERS.DETAIL(userId));
      return res.data;
    },
  });

  const { data: pqrsData, isLoading: pqrsLoading } = useQuery<{ pqrs: PQRS[] }>({
    queryKey: ['pqrs-by-user', userId],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.PQR.BY_USER(userId), {
        params: { page: 1, limit: 20 },
      });
      const d = res.data as Record<string, unknown>;
      return { pqrs: (d.pqrs ?? d.data ?? []) as PQRS[] };
    },
    enabled: !!userId,
  });

  const { isAuthenticated } = useAuth();

  const followMutation = useMutation({
    mutationFn: () => apiClient.post(ENDPOINTS.USERS.FOLLOW(userId)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState
          message="No se pudo cargar el perfil. Verifica tu conexión."
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const initials = getInitials(user.name);
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const pqrs = pqrsData?.pqrs ?? [];

  return (
    <FlatList
      style={styles.container}
      data={pqrs}
      keyExtractor={(item) => item.id}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
      renderItem={({ item }) => (
        <PQRCard
          pqr={item}
          onPress={() => navigation.navigate('PQRDetail', { id: item.id })}
        />
      )}
      ListEmptyComponent={
        pqrsLoading ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No ha publicado PQRSDs</Text>
          </View>
        )
      }
      ListHeaderComponent={
        <View>
          <SafeAreaView edges={['top']} />
          <View style={styles.avatarContainer}>
            {user.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{user.name ?? 'Sin nombre'}</Text>
          <Text style={styles.role}>{roleLabel}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user._count?.PQRS ?? 0}</Text>
              <Text style={styles.statLabel}>PQRSDs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user._count?.followers ?? 0}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user._count?.following ?? 0}</Text>
              <Text style={styles.statLabel}>Siguiendo</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.followBtn, user.isFollowing && styles.followBtnActive]}
            onPress={() => followMutation.mutate()}
            disabled={followMutation.isPending || !isAuthenticated}
            activeOpacity={0.8}
          >
            {followMutation.isPending ? (
              <ActivityIndicator color={user.isFollowing ? '#2563EB' : '#fff'} />
            ) : (
              <Text style={[styles.followBtnText, user.isFollowing && styles.followBtnTextActive]}>
                {user.isFollowing ? 'Dejar de seguir' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>PQRSDs publicadas</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarContainer: { alignItems: 'center', marginTop: 24, marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 4 },
  role: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 16, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  followBtn: {
    marginHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginBottom: 24,
  },
  followBtnActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2563EB' },
  followBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  followBtnTextActive: { color: '#2563EB' },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    paddingHorizontal: 16, marginBottom: 8,
  },
  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  errorText: { fontSize: 15, color: '#9CA3AF' },
});
