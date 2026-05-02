import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '@core/auth/useAuth';
import {
  useLawyerDetail,
  useLawyerRatings,
  useMyRating,
  useCreateLawyerRequest,
  useSubmitRating,
  useUpdateRating,
} from '@features/lawyers/hooks/useLawyers';
import { RatingStars, RatingStarPicker } from '@features/lawyers/components/RatingStars';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { Rating } from '@core/types';

type Route = RouteProp<AppStackParamList, 'LawyerDetail'>;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendiente',  color: '#92400E', bg: '#FEF3C7' },
  ACCEPTED:  { label: 'Aceptada',   color: '#065F46', bg: '#D1FAE5' },
  REJECTED:  { label: 'Rechazada',  color: '#991B1B', bg: '#FEE2E2' },
  COMPLETED: { label: 'Completada', color: '#1E40AF', bg: '#DBEAFE' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 30) return `Hace ${diff} días`;
  if (diff < 365) return `Hace ${Math.floor(diff / 30)} meses`;
  return `Hace ${Math.floor(diff / 365)} años`;
}

function RatingItem({ rating }: { rating: Rating }) {
  return (
    <View style={styles.ratingItem}>
      <View style={styles.ratingItemHeader}>
        <RatingStars score={rating.score} size={13} />
        <Text style={styles.ratingDate}>{timeAgo(rating.createdAt)}</Text>
      </View>
      {rating.comment ? (
        <Text style={styles.ratingComment}>{rating.comment}</Text>
      ) : null}
    </View>
  );
}

export default function LawyerDetailScreen() {
  const route = useRoute<Route>();
  const { lawyerId } = route.params;
  const { user, isAuthenticated } = useAuth();

  const { data: lawyer, isLoading, isError, refetch } = useLawyerDetail(lawyerId);
  const { data: ratingsData } = useLawyerRatings(lawyer?.userId ?? '');
  const { data: myRatingData } = useMyRating(lawyer?.userId ?? '');

  const createRequest = useCreateLawyerRequest();
  const submitRating = useSubmitRating();
  const updateRating = useUpdateRating();

  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  const [requestMsg, setRequestMsg] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [selectedScore, setSelectedScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !lawyer) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState message="No se pudo cargar el perfil del abogado." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const isOwnProfile = user?.id === lawyer.userId;
  const myRating = myRatingData?.rating ?? null;
  const ratings = ratingsData?.data ?? [];

  function handleOpenRequest() {
    setRequestMsg('');
    setContactEmail(user?.email ?? '');
    setContactPhone('');
    setRequestModalVisible(true);
  }

  function handleSendRequest() {
    if (!requestMsg.trim() || !lawyer) return;
    if (!contactEmail.trim() && !contactPhone.trim()) {
      Alert.alert('Contacto requerido', 'Indica al menos un email o teléfono de contacto.');
      return;
    }
    createRequest.mutate(
      {
        lawyerId: lawyer.id,
        message: requestMsg.trim(),
        ...(contactEmail.trim() ? { clientContactEmail: contactEmail.trim() } : {}),
        ...(contactPhone.trim() ? { clientContactPhone: contactPhone.trim() } : {}),
      },
      {
        onSuccess: () => {
          setRequestModalVisible(false);
          Alert.alert('Solicitud enviada', 'El abogado recibirá tu solicitud.');
        },
        onError: () => {
          Alert.alert('Error', 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
        },
      },
    );
  }

  function handleOpenRating() {
    setSelectedScore(myRating?.score ?? 0);
    setRatingComment(myRating?.comment ?? '');
    setRatingModalVisible(true);
  }

  function handleSaveRating() {
    if (selectedScore === 0) return;
    if (myRating) {
      updateRating.mutate(
        {
          ratingId: myRating.id,
          lawyerId,
          lawyerUserId: lawyer!.userId,
          score: selectedScore,
          comment: ratingComment.trim() || undefined,
        },
        {
          onSuccess: () => setRatingModalVisible(false),
          onError: () => Alert.alert('Error', 'No se pudo actualizar la calificación.'),
        },
      );
    } else if (lawyer) {
      submitRating.mutate(
        {
          lawyerId,
          lawyerUserId: lawyer.userId,
          score: selectedScore,
          comment: ratingComment.trim() || undefined,
        },
        {
          onSuccess: () => setRatingModalVisible(false),
          onError: () => Alert.alert('Error', 'No se pudo enviar la calificación.'),
        },
      );
    }
  }

  const ratingPending = submitRating.isPending || updateRating.isPending;

  return (
    <>
      <FlatList<Rating>
        style={styles.container}
        data={ratings}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        renderItem={({ item }) => <RatingItem rating={item} />}
        ListEmptyComponent={
          <View style={styles.emptyRatings}>
            <Text style={styles.emptyText}>Sin reseñas aún</Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.profileSection}>
              {lawyer.user.image ? (
                <Image source={{ uri: lawyer.user.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(lawyer.user.name)}</Text>
                </View>
              )}
              <Text style={styles.name}>{lawyer.user.name}</Text>
              <View style={styles.badgeRow}>
                {lawyer.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verificado</Text>
                  </View>
                )}
              </View>

              <View style={styles.ratingRow}>
                <RatingStars score={lawyer.averageRating} size={20} />
                <Text style={styles.ratingLabel}>
                  {lawyer.averageRating.toFixed(1)} · {lawyer.ratingCount} reseñas
                </Text>
              </View>
            </View>

            {lawyer.specialties.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Especialidades</Text>
                <View style={styles.specialtiesRow}>
                  {lawyer.specialties.map((s) => (
                    <View key={s} style={styles.specialtyPill}>
                      <Text style={styles.specialtyText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {lawyer.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Descripción</Text>
                <Text style={styles.description}>{lawyer.description}</Text>
              </View>
            ) : null}

            {(lawyer.feePerHour != null || lawyer.feePerService != null) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tarifas</Text>
                {lawyer.feePerHour != null && (
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Por hora</Text>
                    <Text style={styles.feeValue}>${lawyer.feePerHour.toLocaleString()}</Text>
                  </View>
                )}
                {lawyer.feePerService != null && (
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Por servicio</Text>
                    <Text style={styles.feeValue}>${lawyer.feePerService.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            {isAuthenticated && !isOwnProfile && (
              <TouchableOpacity
                style={styles.requestBtn}
                onPress={handleOpenRequest}
                activeOpacity={0.8}
              >
                <Text style={styles.requestBtnText}>Solicitar servicio</Text>
              </TouchableOpacity>
            )}

            {isAuthenticated && !isOwnProfile && (
              <TouchableOpacity
                style={styles.rateBtn}
                onPress={handleOpenRating}
                activeOpacity={0.8}
              >
                <Text style={styles.rateBtnText}>
                  {myRating ? 'Editar mi calificación' : 'Calificar abogado'}
                </Text>
              </TouchableOpacity>
            )}

            {myRating && (
              <View style={styles.myRatingBox}>
                <Text style={styles.myRatingLabel}>Tu calificación</Text>
                <RatingStars score={myRating.score} size={15} />
                {myRating.comment ? (
                  <Text style={styles.myRatingComment}>{myRating.comment}</Text>
                ) : null}
              </View>
            )}

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>
                Reseñas ({ratingsData?.pagination.total ?? ratings.length})
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <Pressable style={modalStyles.backdropArea} onPress={() => !createRequest.isPending && setRequestModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <Pressable onPress={() => {}}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Solicitar servicio</Text>
            <Text style={modalStyles.subtitle}>{lawyer.user.name}</Text>

            <Text style={modalStyles.label}>Mensaje *</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.multiline]}
              value={requestMsg}
              onChangeText={setRequestMsg}
              placeholder="Describe tu caso brevemente…"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!createRequest.isPending}
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
              editable={!createRequest.isPending}
            />

            <Text style={modalStyles.label}>Teléfono de contacto</Text>
            <TextInput
              style={modalStyles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="Tu teléfono"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={!createRequest.isPending}
            />

            <TouchableOpacity
              style={[modalStyles.actionBtn, (!requestMsg.trim() || createRequest.isPending) && modalStyles.actionBtnDisabled]}
              onPress={handleSendRequest}
              disabled={!requestMsg.trim() || createRequest.isPending}
            >
              {createRequest.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.actionBtnText}>Enviar solicitud</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={() => setRequestModalVisible(false)}
              disabled={createRequest.isPending}
            >
              <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <Pressable style={modalStyles.backdropArea} onPress={() => !ratingPending && setRatingModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <Pressable onPress={() => {}}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>
              {myRating ? 'Editar calificación' : 'Calificar abogado'}
            </Text>
            <Text style={modalStyles.subtitle}>{lawyer.user.name}</Text>

            <View style={modalStyles.starsRow}>
              <RatingStarPicker value={selectedScore} onChange={setSelectedScore} size={36} />
            </View>
            {selectedScore > 0 && (
              <Text style={modalStyles.scoreLabel}>{selectedScore} de 5 estrellas</Text>
            )}

            <Text style={modalStyles.label}>Comentario (opcional)</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.multiline]}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="¿Cómo fue tu experiencia?"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={300}
              editable={!ratingPending}
            />

            <TouchableOpacity
              style={[modalStyles.actionBtn, (selectedScore === 0 || ratingPending) && modalStyles.actionBtnDisabled]}
              onPress={handleSaveRating}
              disabled={selectedScore === 0 || ratingPending}
            >
              {ratingPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.actionBtnText}>
                  {myRating ? 'Actualizar' : 'Enviar calificación'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={() => setRatingModalVisible(false)}
              disabled={ratingPending}
            >
              <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileSection: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarFallbackText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 14, color: '#6B7280' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyPill: {
    backgroundColor: '#EFF6FF', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
  },
  specialtyText: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  description: { fontSize: 14, color: '#374151', lineHeight: 22 },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  feeLabel: { fontSize: 14, color: '#6B7280' },
  feeValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  requestBtn: {
    backgroundColor: '#2563EB', marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rateBtn: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#2563EB',
  },
  rateBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  myRatingBox: {
    backgroundColor: '#EFF6FF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 12,
  },
  myRatingLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  myRatingComment: { fontSize: 13, color: '#374151', marginTop: 4 },
  sectionDivider: { backgroundColor: '#fff', padding: 16, marginBottom: 2 },
  ratingItem: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  ratingItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ratingDate: { fontSize: 12, color: '#9CA3AF' },
  ratingComment: { fontSize: 13, color: '#374151', lineHeight: 20 },
  emptyRatings: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdropArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  starsRow: { alignItems: 'center', marginBottom: 8 },
  scoreLabel: { textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#F9FAFB', marginBottom: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actionBtn: {
    backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10,
  },
  actionBtnDisabled: { backgroundColor: '#93C5FD' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14, color: '#6B7280' },
});
