import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@core/auth/useAuth';
import { typeMap, statusMap } from '@core/types';
import type { Attachment } from '@core/types';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import {
  useLikePQR,
  useUpdateStatus,
  useUpdatePrivacy,
} from '@features/pqr/hooks/usePQRActions';
import { AttachmentGalleryModal } from './AttachmentGalleryModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { styles } from './pqrDetailStyles';

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

  const type = typeMap[pqr.type];
  const status = statusMap[pqr.status];
  const authorName = pqr.anonymous ? 'Anónimo' : (pqr.creator?.name ?? 'Desconocido');
  const daysLeft = Math.ceil((new Date(pqr.dueDate).getTime() - Date.now()) / 86400000);
  const isExpired = daysLeft < 0;
  const isExpiringSoon = daysLeft <= 3;
  const isLiked = pqr.likes.some((l) => l.userId === user?.id);
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

  const imageAttachments = pqr.attachments.filter((a: Attachment) => isImageAttachment(a.type, a.name));
  const fileAttachments = pqr.attachments.filter((a: Attachment) => !isImageAttachment(a.type, a.name));

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

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Autor</Text>
        <Text style={styles.metaValue}>{authorName}</Text>
      </View>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Entidad</Text>
        <Text style={styles.metaValue}>{pqr.entity.name}</Text>
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
          <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
            {isLiked ? '♥' : '♡'} {pqr._count?.likes ?? pqr.likes.length}
          </Text>
        </TouchableOpacity>

        {!pqr.private && (
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
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

      {pqr.attachments.length > 0 && (
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

      <Text style={styles.sectionTitle}>Comentarios ({commentCount})</Text>
    </View>
  );
}
