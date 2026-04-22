import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStackParamList } from '@navigation/AppNavigator';
import { useAuth } from '@core/auth/useAuth';
import { typeMap, statusMap } from '@core/types';
import type { Comment } from '@core/types';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { useComments, useAddComment } from '@features/pqr/hooks/useComments';
import {
  useLikePQR,
  useUpdateStatus,
  useUpdatePrivacy,
} from '@features/pqr/hooks/usePQRActions';

type Route = RouteProp<AppStackParamList, 'PQRDetail'>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <View style={styles.commentItem}>
      {comment.user.image ? (
        <Image source={{ uri: comment.user.image }} style={styles.commentAvatar} />
      ) : (
        <View style={styles.commentAvatarPlaceholder}>
          <Text style={styles.commentAvatarText}>{comment.user.name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <Text style={styles.commentAuthor}>{comment.user.name}</Text>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

function DetailHeader({ pqrId }: { pqrId: string }) {
  const { user, isAuthenticated } = useAuth();
  const { data: pqr, isLoading } = usePQRDetail(pqrId);
  const likeMutation = useLikePQR(pqrId);
  const statusMutation = useUpdateStatus(pqrId);
  const privacyMutation = useUpdatePrivacy(pqrId);

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
    if (!pqr) return;
    privacyMutation.mutate({ private: !pqr.private });
  }

  function handleShare() {
    if (!pqr) return;
    void Share.share({
      title: pqr.subject ?? 'PQRSD',
      message: `${pqr.subject ?? 'PQRSD'}\n${pqr.description ?? ''}`,
    });
  }

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
            <Text style={styles.dueBadgeText}>{isExpired ? 'Vencida' : daysLeft === 0 ? 'Hoy' : `${daysLeft}d`}</Text>
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

      {isOwner && (
        <View style={styles.ownerActions}>
          {pqr.status !== 'RESOLVED' && (
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
        </View>
      )}

      {pqr.attachments.length > 0 && (
        <View style={styles.attachmentsSection}>
          <Text style={styles.sectionTitle}>Adjuntos</Text>
          {pqr.attachments.map((att) => (
            <TouchableOpacity
              key={att.id}
              style={styles.attachmentRow}
              onPress={() => Linking.openURL(att.url)}
            >
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                <Text style={styles.attachmentSize}>{formatBytes(att.size)}</Text>
              </View>
              <Text style={styles.attachmentOpen}>Abrir</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Comentarios ({pqr._count?.comments ?? 0})
      </Text>
    </View>
  );
}

export default function PQRDetailScreen() {
  const route = useRoute<Route>();
  const { id } = route.params;
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: comments, isLoading: loadingComments, refetch: refetchComments } = useComments(id);
  const { refetch: refetchDetail, isRefetching } = usePQRDetail(id);
  const addComment = useAddComment(id);

  const [commentText, setCommentText] = useState('');

  function handleSendComment() {
    if (!commentText.trim() || !user) return;
    addComment.mutate(
      { text: commentText.trim(), userId: user.id },
      { onSuccess: () => setCommentText('') },
    );
  }

  async function handleRefresh() {
    await Promise.all([refetchDetail(), refetchComments()]);
  }

  const commentList: Comment[] = comments ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList<Comment>
        data={commentList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CommentItem comment={item} />}
        ListHeaderComponent={<DetailHeader pqrId={id} />}
        ListEmptyComponent={
          !loadingComments ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>Sin comentarios aún</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ margin: 16 }} color="#2563EB" />
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor="#2563EB" />
        }
        contentContainerStyle={{ paddingBottom: 8 }}
      />

      {isAuthenticated && (
        <View style={[styles.commentInputRow, { paddingBottom: insets.bottom || 10 }]}>
          <TextInput
            style={styles.commentInput}
            placeholder="Escribe un comentario…"
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || addComment.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || addComment.isPending}
          >
            <Text style={styles.sendButtonText}>
              {addComment.isPending ? '…' : 'Enviar'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  detailHeader: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  privateBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  privateBadgeText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  dueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dueBadgeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  subject: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metaLabel: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  metaValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  likeButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  likeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  likeButtonTextActive: {
    color: '#DC2626',
  },
  shareButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  shareButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  resolveButton: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resolveButtonText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  privacyButton: {
    backgroundColor: '#F5F3FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  privacyButtonText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  attachmentsSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  attachmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  attachmentOpen: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyComments: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
