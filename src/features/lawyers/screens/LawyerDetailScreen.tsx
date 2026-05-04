import React, { useState } from 'react';
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
import { RatingStars } from '@features/lawyers/components/RatingStars';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { Rating } from '@core/types';
import { styles } from '@features/lawyers/components/detail/lawyerDetailStyles';
import { RatingItem } from '@features/lawyers/components/detail/RatingItem';
import { RequestServiceModal } from '@features/lawyers/components/detail/RequestServiceModal';
import { RatingModal } from '@features/lawyers/components/detail/RatingModal';
import { getInitials } from '@features/users/components/profile/userProfileUtils';

type Route = RouteProp<AppStackParamList, 'LawyerDetail'>;

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
    if (!requestMsg.trim()) return;
    if (!contactEmail.trim() && !contactPhone.trim()) {
      Alert.alert('Contacto requerido', 'Indica al menos un email o teléfono de contacto.');
      return;
    }
    createRequest.mutate(
      {
        lawyerId: lawyer!.id,
        message: requestMsg.trim(),
        ...(contactEmail.trim() ? { clientContactEmail: contactEmail.trim() } : {}),
        ...(contactPhone.trim() ? { clientContactPhone: contactPhone.trim() } : {}),
      },
      {
        onSuccess: () => {
          setRequestModalVisible(false);
          Alert.alert('Solicitud enviada', 'El abogado recibirá tu solicitud.');
        },
        onError: () => Alert.alert('Error', 'No se pudo enviar la solicitud. Inténtalo de nuevo.'),
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
        { ratingId: myRating.id, lawyerId, lawyerUserId: lawyer!.userId, score: selectedScore, comment: ratingComment.trim() || undefined },
        {
          onSuccess: () => setRatingModalVisible(false),
          onError: () => Alert.alert('Error', 'No se pudo actualizar la calificación.'),
        },
      );
    } else {
      submitRating.mutate(
        { lawyerId, lawyerUserId: lawyer!.userId, score: selectedScore, comment: ratingComment.trim() || undefined },
        {
          onSuccess: () => setRatingModalVisible(false),
          onError: () => Alert.alert('Error', 'No se pudo enviar la calificación.'),
        },
      );
    }
  }

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
              <TouchableOpacity style={styles.requestBtn} onPress={handleOpenRequest} activeOpacity={0.8}>
                <Text style={styles.requestBtnText}>Solicitar servicio</Text>
              </TouchableOpacity>
            )}

            {isAuthenticated && !isOwnProfile && (
              <TouchableOpacity style={styles.rateBtn} onPress={handleOpenRating} activeOpacity={0.8}>
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

      <RequestServiceModal
        visible={requestModalVisible}
        lawyerName={lawyer.user.name}
        isPending={createRequest.isPending}
        requestMsg={requestMsg}
        setRequestMsg={setRequestMsg}
        contactEmail={contactEmail}
        setContactEmail={setContactEmail}
        contactPhone={contactPhone}
        setContactPhone={setContactPhone}
        onSend={handleSendRequest}
        onClose={() => setRequestModalVisible(false)}
      />

      <RatingModal
        visible={ratingModalVisible}
        lawyerName={lawyer.user.name}
        myRating={myRating}
        selectedScore={selectedScore}
        setSelectedScore={setSelectedScore}
        ratingComment={ratingComment}
        setRatingComment={setRatingComment}
        isPending={submitRating.isPending || updateRating.isPending}
        onSave={handleSaveRating}
        onClose={() => setRatingModalVisible(false)}
      />
    </>
  );
}
