import React from 'react';
import { Image, Text, View } from 'react-native';
import type { Comment } from '@core/types';
import { styles } from './pqrDetailStyles';

interface Props {
  comment: Comment;
}

export const CommentItem = React.memo(function CommentItem({ comment }: Props) {
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
});
