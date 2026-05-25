import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/auth/useAuth';
import type { PQRS, PQRSStatus, Attachment } from '@core/types';
import { typeMap, statusMap } from '@core/types';
import { isMediaAttachment, isVideoAttachment } from './detail/detailUtils';
import { AttachmentGalleryModal } from './detail/AttachmentGalleryModal';
import { PQRActionsSheet } from './PQRActionsSheet';
import { useTogglePrivacy } from '../hooks/usePQRActions';
import { resolveOverdue } from '../utils/businessDays';

const STATUS_COLORS: Record<PQRSStatus, { bg: string; text: string }> = {
  PENDING:     { bg: '#FEF3C7', text: '#D97706' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#2563EB' },
  RESOLVED:    { bg: '#DCFCE7', text: '#16A34A' },
  CLOSED:      { bg: '#E5E7EB', text: '#4B5563' },
};

const MAX_VISIBLE_MEDIA = 3;

function InlineVideo({ uri, posterUri }: { uri: string; posterUri?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  if (playing) {
    return (
      <View style={styles.inlineVideo}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          nativeControls
          allowsFullscreen
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.inlineVideo}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={0.9}
        onPress={() => {
          setPlaying(true);
          player.play();
        }}
        accessibilityRole="button"
        accessibilityLabel="Reproducir video"
      >
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.inlineVideoDark]} />
        )}
        <View style={styles.inlinePlayOverlay}>
          <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.95)" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  pqr: PQRS;
  onPress: () => void;
}

function PQRCardBase({ pqr, onPress }: Props) {
  const { user } = useAuth();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = !!user?.id && user.id === pqr.creator?.id;
  const privacy = useTogglePrivacy(pqr);
  const type = typeMap[pqr.type] ?? { label: pqr.type ?? '—', color: '#6B7280' };
  const status = statusMap[pqr.status] ?? { label: pqr.status ?? '—' };
  const statusColors = STATUS_COLORS[pqr.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
  const authorName = pqr.anonymous ? 'Anónimo' : (pqr.creator?.name ?? 'Desconocido');
  const dueTime = pqr.dueDate ? new Date(pqr.dueDate).getTime() : NaN;
  const daysLeft = Number.isFinite(dueTime) ? Math.ceil((dueTime - Date.now()) / 86400000) : NaN;
  const isExpired = resolveOverdue(pqr).isOverdue;
  const isExpiringSoon = !isExpired && Number.isFinite(daysLeft) && daysLeft >= 0 && daysLeft <= 3;
  const likes = pqr._count?.likes ?? 0;
  const comments = pqr._count?.comments ?? 0;
  const entityName = pqr.entity?.name ?? '';
  const mediaAttachments = (pqr.attachments ?? []).filter((a: Attachment) =>
    isMediaAttachment(a.type, a.name),
  );
  // El primer video se reproduce inline en el muro; el resto va al carrusel de miniaturas.
  const firstVideoIndex = mediaAttachments.findIndex((a) => isVideoAttachment(a.type, a.name));
  const inlineVideo = firstVideoIndex >= 0 ? mediaAttachments[firstVideoIndex] : null;
  const tileMedia = mediaAttachments.filter((_, i) => i !== firstVideoIndex);
  const visibleMedia = tileMedia.slice(0, MAX_VISIBLE_MEDIA);
  const extraMediaCount = Math.max(0, tileMedia.length - MAX_VISIBLE_MEDIA);

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Ver PQRSD: ${pqr.subject ?? pqr.type}`}
      >
        <View style={styles.header}>
          <Text style={[styles.typeText, { color: type.color }]} numberOfLines={1}>
            {type.label}
          </Text>
          <View style={[styles.statusBox, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{status.label}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {isOwner ? (
            <TouchableOpacity
              onPress={privacy.toggle}
              disabled={privacy.isPending}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.privacyIcon}
              accessibilityRole="button"
              accessibilityLabel={pqr.private ? 'Hacer pública' : 'Hacer privada'}
            >
              <Ionicons
                name={pqr.private ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={pqr.private ? '#7C3AED' : '#9CA3AF'}
              />
            </TouchableOpacity>
          ) : pqr.private ? (
            <Ionicons
              name="eye-off-outline"
              size={17}
              color="#7C3AED"
              style={styles.privacyIcon}
              accessibilityLabel="PQRSD privada"
            />
          ) : null}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {isExpired ? (
          <View style={styles.dueRow}>
            <View style={styles.overdueDot} accessibilityLabel="PQRSD vencida" />
            <Text style={styles.overdueText}>Vencida</Text>
          </View>
        ) : isExpiringSoon ? (
          <View style={styles.dueRow}>
            <View style={styles.soonDot} />
            <Text style={styles.soonText}>{daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`}</Text>
          </View>
        ) : null}

        {pqr.subject ? (
          <Text style={styles.subject} numberOfLines={2}>{pqr.subject}</Text>
        ) : null}
        {pqr.description ? (
          <Text style={styles.description} numberOfLines={3}>{pqr.description}</Text>
        ) : null}

        {inlineVideo && (
          <InlineVideo uri={inlineVideo.url} posterUri={inlineVideo.thumbnailUrl} />
        )}

        {tileMedia.length > 0 && (
          <View style={styles.mediaRow}>
            {visibleMedia.map((att, i) => {
              const isLastVisible = i === visibleMedia.length - 1;
              const isVideo = isVideoAttachment(att.type, att.name);
              const galleryIdx = mediaAttachments.indexOf(att);
              return (
                <TouchableOpacity
                  key={att.id ?? att.url ?? `media-${i}`}
                  onPress={() => setGalleryIndex(galleryIdx)}
                  activeOpacity={0.85}
                  style={styles.mediaTile}
                  accessibilityRole="button"
                  accessibilityLabel={isVideo ? 'Reproducir video' : 'Ver imagen'}
                >
                  {isVideo ? (
                    att.thumbnailUrl ? (
                      <View style={styles.mediaImage}>
                        <Image
                          source={{ uri: att.thumbnailUrl }}
                          style={styles.mediaImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={150}
                        />
                        <View style={styles.mediaPlayOverlay}>
                          <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.95)" />
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.mediaImage, styles.mediaVideoBg]}>
                        <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.95)" />
                      </View>
                    )
                  ) : (
                    <Image
                      source={{ uri: att.url }}
                      style={styles.mediaImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  )}
                  {isVideo && (
                    <View style={styles.mediaBadge}>
                      <Ionicons name="videocam" size={11} color="#fff" />
                    </View>
                  )}
                  {isLastVisible && extraMediaCount > 0 && (
                    <View style={styles.mediaOverlay}>
                      <Text style={styles.mediaOverlayText}>+{extraMediaCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.meta}>
          <Text style={styles.metaText} numberOfLines={1}>
            {authorName}
            {entityName ? `  ·  ${entityName}` : ''}
            {pqr.department?.name ? `  ·  ${pqr.department.name}` : ''}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.counter}>
            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
            <Text style={styles.counterText}>{likes}</Text>
          </View>
          <View style={styles.counter}>
            <Ionicons name="chatbubble-outline" size={13} color="#9CA3AF" />
            <Text style={styles.counterText}>{comments}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {galleryIndex !== null && (
        <AttachmentGalleryModal
          media={mediaAttachments}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      {menuOpen && (
        <PQRActionsSheet
          pqr={pqr}
          isOwner={isOwner}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}

const PQRCard = React.memo(PQRCardBase);
export default PQRCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  privacyIcon: {
    marginLeft: 4,
  },
  menuButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  overdueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  overdueText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  soonDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  soonText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  subject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 10,
  },
  inlineVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 10,
  },
  inlineVideoDark: {
    backgroundColor: '#111827',
  },
  inlinePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mediaTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaVideoBg: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlayOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  mediaOverlayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  meta: {
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});
