import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@core/auth/useAuth';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useProfileActions } from '@features/users/hooks/useProfileActions';
import { getInitials, ROLE_LABEL } from '@features/users/components/profile/userProfileUtils';
import { styles } from '@features/users/components/profile/userProfileStyles';
import { PeopleModal } from '@features/users/components/profile/PeopleModal';
import { EditProfileModal } from '@features/users/components/profile/EditProfileModal';
import { ChangePasswordModal } from '@features/users/components/profile/ChangePasswordModal';
import { DeleteAccountModal } from '@features/users/components/profile/DeleteAccountModal';
import { WebViewModal } from '@features/users/components/profile/WebViewModal';
import { SupportModal } from '@features/users/components/profile/SupportModal';
import { StyleSheet } from 'react-native';

const PRIVACY_URL = 'https://quejate.com.co/policy';
const TERMS_URL = 'https://quejate.com.co/terms';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61581217178815';
const INSTAGRAM_URL = 'https://www.instagram.com/quejate.com.co';
const APP_VERSION = '1.0.0';

type Nav = NativeStackNavigationProp<AppStackParamList>;

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={profileStyles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[profileStyles.settingsIcon, danger && profileStyles.settingsIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? '#DC2626' : '#4B5563'} />
      </View>
      <Text style={[profileStyles.settingsLabel, danger && profileStyles.settingsDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const { user: sessionUser, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const [modal, setModal] = useState<'followers' | 'following' | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [webView, setWebView] = useState<{ url: string; title: string } | null>(null);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);

  const {
    profile,
    isProfileError,
    refetchProfile,
    updateMutation,
    changePasswordMutation,
    deleteAccountMutation,
  } = useProfileActions({
    onUpdated: () => setEditModalVisible(false),
    onPasswordChanged: () => setChangePasswordVisible(false),
    onDeleted: () => setDeleteAccountVisible(false),
  });

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile]),
  );

  function handleOpenEdit() {
    setEditName(profile?.name ?? sessionUser?.name ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditImageUri(null);
    setEditModalVisible(true);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
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

  const displayName = profile?.name ?? sessionUser?.name;
  const displayImage = profile?.image ?? sessionUser?.image;
  const displayEmail = profile?.email ?? sessionUser?.email;
  const initials = getInitials(displayName);
  const roleLabel = ROLE_LABEL[sessionUser?.role ?? ''] ?? sessionUser?.role ?? '';
  const followers = profile?.followers ?? [];
  const following = profile?.following ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Perfil</Text>
          <TouchableOpacity onPress={handleOpenEdit} style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleOpenEdit} activeOpacity={0.8}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{displayName ?? 'Usuario'}</Text>
          <Text style={styles.email}>{displayEmail ?? ''}</Text>
          {roleLabel ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?._count?.PQRS ?? 0}</Text>
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

        {/* Contact info */}
        <Text style={profileStyles.sectionHeader}>Datos de contacto</Text>
        <View style={profileStyles.infoCard}>
          <View style={profileStyles.infoRow}>
            <View style={profileStyles.infoIconCircle}>
              <Ionicons name="mail-outline" size={16} color="#2563EB" />
            </View>
            <View style={profileStyles.infoContent}>
              <Text style={profileStyles.infoLabel}>Correo electrónico</Text>
              <Text style={profileStyles.infoValue}>{displayEmail ?? '—'}</Text>
            </View>
          </View>
          {profile?.phone ? (
            <>
              <View style={profileStyles.divider} />
              <View style={profileStyles.infoRow}>
                <View style={profileStyles.infoIconCircle}>
                  <Ionicons name="call-outline" size={16} color="#2563EB" />
                </View>
                <View style={profileStyles.infoContent}>
                  <Text style={profileStyles.infoLabel}>Teléfono</Text>
                  <Text style={profileStyles.infoValue}>{profile.phone}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Settings */}
        <Text style={profileStyles.sectionHeader}>Configuración</Text>
        <View style={profileStyles.settingsCard}>
          <SettingsRow
            icon="lock-closed-outline"
            label="Cambiar contraseña"
            onPress={() => setChangePasswordVisible(true)}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="document-text-outline"
            label="Política de privacidad"
            onPress={() => setWebView({ url: PRIVACY_URL, title: 'Política de privacidad' })}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="clipboard-outline"
            label="Términos y condiciones"
            onPress={() => setWebView({ url: TERMS_URL, title: 'Términos y condiciones' })}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="log-out-outline"
            label="Cerrar sesión"
            onPress={handleSignOut}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="trash-outline"
            label="Eliminar cuenta"
            onPress={() => setDeleteAccountVisible(true)}
            danger
          />
        </View>

        {/* Support */}
        <Text style={profileStyles.sectionHeader}>Soporte</Text>
        <View style={profileStyles.settingsCard}>
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Contactar soporte"
            onPress={() => setSupportModalVisible(true)}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="logo-facebook"
            label="Facebook"
            onPress={() => Linking.openURL(FACEBOOK_URL)}
          />
          <View style={profileStyles.divider} />
          <SettingsRow
            icon="logo-instagram"
            label="Instagram"
            onPress={() => Linking.openURL(INSTAGRAM_URL)}
          />
        </View>

        <View style={profileStyles.versionRow}>
          <Text style={profileStyles.versionText}>Quéjate v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      <PeopleModal
        visible={modal === 'followers'}
        title="Seguidores"
        people={followers}
        onClose={() => setModal(null)}
        onPressPerson={(userId) => {
          setModal(null);
          navigation.navigate('PublicProfile', { userId });
        }}
      />
      <PeopleModal
        visible={modal === 'following'}
        title="Siguiendo"
        people={following}
        onClose={() => setModal(null)}
        onPressPerson={(userId) => {
          setModal(null);
          navigation.navigate('PublicProfile', { userId });
        }}
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
      <SupportModal
        visible={supportModalVisible}
        userEmail={sessionUser?.email ?? undefined}
        userName={sessionUser?.name ?? undefined}
        onClose={() => setSupportModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const profileStyles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsIconDanger: { backgroundColor: '#FEF2F2' },
  settingsLabel: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },
  settingsDanger: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  versionRow: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
});
