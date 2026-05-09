import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useAuth } from '@core/auth/useAuth';
import { typeMap, statusMap } from '@core/types';
import type { Attachment, PQRStatusHistoryEntry, PQRSStatus } from '@core/types';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import {
  useLikePQR,
  useUpdateStatus,
  useUpdatePrivacy,
} from '@features/pqr/hooks/usePQRActions';
import { AttachmentGalleryModal } from './AttachmentGalleryModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { styles } from './pqrDetailStyles';

const STATUS_ICON: Record<PQRSStatus, keyof typeof Ionicons.glyphMap> = {
  PENDING:     'document-outline',
  IN_PROGRESS: 'refresh-outline',
  RESOLVED:    'checkmark-circle-outline',
  CLOSED:      'lock-closed-outline',
};

function StatusTimeline({ history }: { history: PQRStatusHistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <View style={timelineStyles.container}>
      <Text style={styles.sectionTitle}>Seguimiento</Text>
      {history.map((entry, idx) => {
        const isLast = idx === history.length - 1;
        const statusInfo = statusMap[entry.status];
        return (
          <View key={entry.id} style={timelineStyles.row}>
            <View style={timelineStyles.lineCol}>
              <View style={[timelineStyles.dot, isLast && timelineStyles.dotActive]} />
              {!isLast && <View style={timelineStyles.line} />}
            </View>
            <View style={timelineStyles.content}>
              <View style={timelineStyles.labelRow}>
                <Ionicons name={STATUS_ICON[entry.status]} size={14} color={isLast ? '#2563EB' : '#9CA3AF'} style={{ marginRight: 4 }} />
                <Text style={[timelineStyles.statusLabel, isLast && timelineStyles.statusLabelActive]}>
                  {statusInfo.label}
                </Text>
                {entry.user?.name ? (
                  <Text style={timelineStyles.actor}> · {entry.user.name}</Text>
                ) : null}
              </View>
              {entry.comment ? (
                <Text style={timelineStyles.comment}>{entry.comment}</Text>
              ) : null}
              <Text style={timelineStyles.date}>
                {new Date(entry.createdAt).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 0 },
  lineCol: { width: 28, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginTop: 2,
  },
  dotActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2, marginBottom: 0, minHeight: 20 },
  content: { flex: 1, paddingBottom: 16, paddingLeft: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 },
  statusLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  statusLabelActive: { color: '#2563EB' },
  actor: { fontSize: 12, color: '#9CA3AF' },
  comment: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 3 },
  date: { fontSize: 11, color: '#9CA3AF' },
});

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(mimeType: string, name: string): boolean {
  if (mimeType.startsWith('image/')) return true;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext);
}

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
  const privacyMutation = useUpdatePrivacy(pqrId);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [docViewer, setDocViewer] = useState<{ url: string; name: string } | null>(null);

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
  const dueTime = pqr.dueDate ? new Date(pqr.dueDate).getTime() : NaN;
  const daysLeft = Number.isFinite(dueTime) ? Math.ceil((dueTime - Date.now()) / 86400000) : NaN;
  const isExpired = Number.isFinite(daysLeft) && daysLeft < 0;
  const isExpiringSoon = Number.isFinite(daysLeft) && daysLeft <= 3;
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

  function handleTogglePrivacy() {
    privacyMutation.mutate({ private: !pqr!.private });
  }

  function handleShare() {
    void Share.share({
      title: pqr!.subject ?? 'PQRSD',
      message: `${pqr!.subject ?? 'PQRSD'}\n${pqr!.description ?? ''}`,
    });
  }

  const imageAttachments = attachments.filter((a: Attachment) => isImageAttachment(a.type, a.name));
  const fileAttachments = attachments.filter((a: Attachment) => !isImageAttachment(a.type, a.name));

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
        {isExpiringSoon && (
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
          <Image source={{ uri: pqr.creator.image }} style={styles.authorAvatar} />
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

        {!pqr.private && (
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={15} color="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.shareButtonText}>Compartir</Text>
          </TouchableOpacity>
        )}
      </View>

      {(isEmployee || isOwner) && (
        <View style={styles.ownerActions}>
          {isEmployee && pqr.status !== 'RESOLVED' && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleMarkResolved}
              disabled={statusMutation.isPending}
            >
              <Text style={styles.resolveButtonText}>
                {statusMutation.isPending ? 'Actualizando…' : 'Marcar como resuelta'}
              </Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={styles.privacyButton}
              onPress={handleTogglePrivacy}
              disabled={privacyMutation.isPending}
            >
              <Text style={styles.privacyButtonText}>
                {privacyMutation.isPending
                  ? 'Actualizando…'
                  : pqr.private
                  ? 'Hacer pública'
                  : 'Hacer privada'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {attachments.length > 0 && (
        <View style={styles.attachmentsSection}>
          <Text style={styles.sectionTitle}>Adjuntos</Text>

          {imageAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {imageAttachments.map((att: Attachment, i: number) => (
                <TouchableOpacity
                  key={att.id}
                  onPress={() => setGalleryIndex(i)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: att.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
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
              images={imageAttachments}
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
    </View>
  );
}
