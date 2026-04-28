import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@core/auth/useAuth';
import { useMyPQRs } from '@features/pqr/hooks/useMyPQRs';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { UserProfile } from '@core/types';
import PQRCard from '@features/pqr/components/PQRCard';

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
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
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
        </View>
      </View>
    </Modal>
  );
}

export default function UserProfileScreen() {
  const { user: sessionUser, signOut, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [modal, setModal] = useState<'followers' | 'following' | null>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['user', sessionUser?.id],
    queryFn: async () => {
      const res = await apiClient.get(ENDPOINTS.USERS.DETAIL(sessionUser!.id));
      return res.data;
    },
    enabled: !!sessionUser?.id,
  });

  const pqrsQuery = useMyPQRs();
  const allPqrs = pqrsQuery.data?.pages.flatMap((p) => p.pqrs) ?? [];

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
              <TouchableOpacity onPress={handleSignOut} disabled={authLoading}>
                <Text style={styles.signOutText}>Cerrar sesión</Text>
              </TouchableOpacity>
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
    marginBottom: 20,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  statLabelTap: { color: '#2563EB' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
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
