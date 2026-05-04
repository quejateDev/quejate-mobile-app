import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '@navigation/navigationRef';
import { useAuth } from '@core/auth/useAuth';
import type { Comment } from '@core/types';
import { usePQRDetail } from '@features/pqr/hooks/usePQRDetail';
import { useComments, useAddComment } from '@features/pqr/hooks/useComments';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { DetailHeader } from '@features/pqr/components/detail/DetailHeader';
import { CommentItem } from '@features/pqr/components/detail/CommentItem';
import { styles } from '@features/pqr/components/detail/pqrDetailStyles';

type Route = RouteProp<AppStackParamList, 'PQRDetail'>;

export default function PQRDetailScreen() {
  const route = useRoute<Route>();
  const { id } = route.params;
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: comments, isLoading: loadingComments, refetch: refetchComments } = useComments(id);
  const { isError: isDetailError, error: detailError, refetch: refetchDetail, isRefetching } = usePQRDetail(id);
  const addComment = useAddComment(id);

  const [commentText, setCommentText] = useState('');

  if (isDetailError) {
    const status = (detailError as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      return <ErrorState message="Esta PQRSD es privada y no tienes permiso para verla." />;
    }
    if (status === 404) {
      return <ErrorState message="Esta PQRSD no existe o fue eliminada." />;
    }
    return (
      <ErrorState
        message="No se pudo cargar la PQRSD. Verifica tu conexión."
        onRetry={refetchDetail}
      />
    );
  }

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
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        renderItem={({ item }) => <CommentItem comment={item} />}
        ListHeaderComponent={<DetailHeader pqrId={id} commentCount={commentList.length} />}
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
