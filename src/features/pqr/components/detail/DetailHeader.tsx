import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useAuth } from '@core/auth/useAuth';
import { typeMap, statusMap } from '@core/types';
import type { Attachment } from '@core/types';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import {
  useLikePQR,
  useUpdateStatus,
} from '@features/pqr/hooks/usePQRActions';
import { AttachmentGalleryModal } from './AttachmentGalleryModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { OverdueModal } from './OverdueModal';
import { StatusTimeline } from './StatusTimeline';
import { formatBytes, isMediaAttachment, isVideoAttachment } from './detailUtils';
import { dueDaysLeft, resolveOverdue } from '../../utils/businessDays';
import { PQRActionsSheet } from '../PQRActionsSheet';
import { styles } from './pqrDetailStyles';

interface Props {
  pqrId: string;
  commentCount: number;
}

export function DetailHeader({ pqrId, commentCount }: Props) {
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: pqr, isLoading } = usePQRDetail(pqrId);
  const likeMutation = useLikePQR(pqrId);
  const statusMutation = useUpdateStatus(pqrId);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [docViewer, setDocViewer] = useState<{ url: string; name: string } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const overdueShownRef = useRef(false);

  const lat = pqr?.latitude;
  const lng = pqr?.longitude;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';

  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    Location.reverseGeocodeAsync({ latitude: lat as number, longitude: lng as number })
      .then((results) => {
        if (cancelled) return;
        const r = results[0];
        if (!r) return;
        const parts = [r.name || r.street, r.city, r.region].filter(Boolean);
        if (parts.length > 0) setResolvedAddress(parts.join(', '));
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, [hasCoords, lat, lng]);

  useEffect(() => {
    if (overdueShownRef.current) return;
    if (!pqr) return;
    const isOwnerNow = !!user?.id && user.id === pqr.creator?.id;
    if (!isOwnerNow) return;
    if (!resolveOverdue(pqr).isOverdue) return;
    overdueShownRef.current = true;
    setOverdueModalVisible(true);
  }, [pqr, user]);

  if (isLoading || !pqr) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  const type = typeMap[pqr.type] ?? { label: pqr.type ?? '—', color: '#6B7280' };
  const status = statusMap[pqr.status] ?? { label: pqr.status ?? '—' };
  const authorName = pqr.anonymous ? 'Anónimo' : (pqr.creator?.name ?? 'Desconocido');
  // Misma regla que PQRCard: el plazo solo aplica a PQRSDs activas
  // (dueDaysLeft devuelve NaN para RESOLVED/CLOSED/SUGGESTION).
  const daysLeft = dueDaysLeft(pqr);
  const isExpired = resolveOverdue(pqr).isOverdue;
  const isExpiringSoon = !isExpired && Number.isFinite(daysLeft) && daysLeft >= 0 && daysLeft <= 3;
  const likes = pqr.likes ?? [];
  const attachments = pqr.attachments ?? [];
  const statusHistory = pqr.statusHistory ?? [];
  const isLiked = likes.some((l) => l.userId === user?.id);
  const isOwner = !!user?.id && user.id === pqr.creator?.id;
  const isEmployee = user?.role === 'EMPLOYEE' && user?.entityId === pqr.entityId;

  function handleLike() {
    if (!isAuthenticated || !user) return;
    likeMutation.mutate({ userId: user.id });
  }

  function handleMarkResolved() {
    Alert.alert('Marcar como resuelta', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => statusMutation.mutate({ status: 'RESOLVED' }) },
    ]);
  }

  function handleShare() {
    setShareOpen(true);
  }

  function openInMaps() {
    if (!hasCoords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert('No se pudo abrir', 'Verifica que tengas Google Maps o un navegador instalado.');
    });
  }

  const mediaAttachments = attachments.filter((a: Attachment) => isMediaAttachment(a.type, a.name));
  const fileAttachments = attachments.filter((a: Attachment) => !isMediaAttachment(a.type, a.name));

  return (
    <View style={styles.detailHeader}>
      <View style={styles.badgeRow}>
        <View style={[styles.typeBadge, { backgroundColor: type.color + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{status.label}</Text>
        </View>
        {pqr.private && (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>Privada</Text>
          </View>
        )}
        {(isExpired || isExpiringSoon) && (
          <View style={styles.dueBadge}>
            <Text style={styles.dueBadgeText}>
              {isExpired ? 'Vencida' : daysLeft === 0 ? 'Hoy' : `${daysLeft}d`}
            </Text>
          </View>
        )}
      </View>

      {pqr.subject ? <Text style={styles.subject}>{pqr.subject}</Text> : null}
      {pqr.description ? <Text style={styles.description}>{pqr.description}</Text> : null}

      <TouchableOpacity
        style={styles.authorCard}
        disabled={pqr.anonymous || !pqr.creator?.id}
        onPress={() => pqr.creator?.id && navigation.navigate('PublicProfile', { userId: pqr.creator.id })}
        activeOpacity={0.7}
      >
        {pqr.anonymous ? (
          <View style={[styles.authorAvatarPlaceholder, { backgroundColor: '#E5E7EB' }]}>
            <Ionicons name="eye-off-outline" size={18} color="#6B7280" />
          </View>
        ) : pqr.creator?.image ? (
          <Image source={{ uri: pqr.creator.image }} style={styles.authorAvatar} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.authorAvatarPlaceholder}>
            <Text style={styles.authorAvatarText}>
              {(pqr.creator?.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorLabel}>Autor</Text>
          <Text
            style={[
              styles.authorName,
              !pqr.anonymous && pqr.creator?.id && { color: '#2563EB' },
            ]}
            numberOfLines={1}
          >
            {authorName}
          </Text>
        </View>
        {!pqr.anonymous && pqr.creator?.id && (
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        )}
      </TouchableOpacity>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Entidad</Text>
        <Text style={styles.metaValue}>{pqr.entity?.name ?? '—'}</Text>
      </View>
      {pqr.department ? (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Departamento</Text>
          <Text style={styles.metaValue}>{pqr.department.name}</Text>
        </View>
      ) : null}
      {pqr.consecutiveCode ? (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Código</Text>
          <Text style={styles.metaValue}>{pqr.consecutiveCode}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.likeButton, isLiked && styles.likeButtonActive]}
          onPress={handleLike}
          disabled={!isAuthenticated || likeMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Dar like"
          accessibilityState={{ checked: isLiked }}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? '#DC2626' : '#6B7280'} style={{ marginRight: 6 }} />
          <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
            {pqr._count?.likes ?? likes.length}
          </Text>
        </TouchableOpacity>

        {/* Menú ⋮: compartir y (si es dueño) cambiar privacidad. El toggle de
         *  privacidad vive solo aquí, no como botón/ojo aparte. */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#374151" style={{ marginRight: 6 }} />
          <Text style={styles.shareButtonText}>Opciones</Text>
        </TouchableOpacity>
      </View>

      {hasCoords && (
        <View style={styles.locationSection}>
          <Text style={styles.metaLabel}>Ubicación</Text>
          <Text style={styles.locationText} numberOfLines={2}>
            {resolvedAddress ?? `${(lat as number).toFixed(5)}, ${(lng as number).toFixed(5)}`}
          </Text>
          <TouchableOpacity style={styles.openMapsButton} onPress={openInMaps}>
            <Ionicons name="map-outline" size={15} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.openMapsText}>Ver en Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {isEmployee && pqr.status !== 'RESOLVED' && (
        <View style={styles.ownerActions}>
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={handleMarkResolved}
            disabled={statusMutation.isPending}
          >
            <Text style={styles.resolveButtonText}>
              {statusMutation.isPending ? 'Actualizando…' : 'Marcar como resuelta'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {attachments.length > 0 && (
        <View style={styles.attachmentsSection}>
          <Text style={styles.sectionTitle}>Adjuntos</Text>

          {mediaAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {mediaAttachments.map((att: Attachment, i: number) => {
                const isVideo = isVideoAttachment(att.type, att.name);
                return (
                  <TouchableOpacity
                    key={att.id}
                    onPress={() => setGalleryIndex(i)}
                    activeOpacity={0.85}
                    style={styles.thumbnailWrapper}
                  >
                    {isVideo ? (
                      att.thumbnailUrl ? (
                        <View style={styles.thumbnail}>
                          <Image
                            source={{ uri: att.thumbnailUrl }}
                            style={styles.thumbnail}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={150}
                          />
                          <View style={styles.thumbnailPlayOverlay}>
                            <Ionicons name="play-circle" size={40} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.thumbnail, styles.videoThumbnail]}>
                          <Ionicons name="play-circle" size={40} color="#fff" />
                        </View>
                      )
                    ) : (
                      <Image
                        source={{ uri: att.url }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    )}
                    {isVideo && (
                      <View style={styles.videoOverlayBadge}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {fileAttachments.map((att: Attachment) => (
            <TouchableOpacity
              key={att.id}
              style={styles.attachmentRow}
              onPress={() => setDocViewer({ url: att.url, name: att.name })}
            >
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                <Text style={styles.attachmentSize}>{formatBytes(att.size)}</Text>
              </View>
              <Text style={styles.attachmentOpen}>Abrir</Text>
            </TouchableOpacity>
          ))}

          {galleryIndex !== null && (
            <AttachmentGalleryModal
              media={mediaAttachments}
              initialIndex={galleryIndex}
              onClose={() => setGalleryIndex(null)}
            />
          )}
          {docViewer !== null && (
            <DocumentViewerModal
              url={docViewer.url}
              name={docViewer.name}
              onClose={() => setDocViewer(null)}
            />
          )}
        </View>
      )}

      {statusHistory.length > 0 && (
        <StatusTimeline history={statusHistory} />
      )}

      <Text style={styles.sectionTitle}>Comentarios ({commentCount})</Text>

      <OverdueModal
        visible={overdueModalVisible}
        daysExceeded={resolveOverdue(pqr).businessDaysExceeded}
        onConfirmResolved={() => {
          setOverdueModalVisible(false);
          statusMutation.mutate({ status: 'RESOLVED' });
        }}
        onStartFollowup={() => {
          setOverdueModalVisible(false);
          navigation.navigate('FormalFollowup', { pqrId });
        }}
        onDismiss={() => setOverdueModalVisible(false)}
      />

      {shareOpen && (
        <PQRActionsSheet pqr={pqr} isOwner={isOwner} onClose={() => setShareOpen(false)} />
      )}
    </View>
  );
}
