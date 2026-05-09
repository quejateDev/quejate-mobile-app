import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Comment } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';
import { styles } from './pqrDetailStyles';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface Props {
  comment: Comment;
}

export const CommentItem = React.memo(function CommentItem({ comment }: Props) {
  const navigation = useNavigation<Nav>();

  function handlePressAuthor() {
    navigation.navigate('PublicProfile', { userId: comment.user.id });
  }

  return (
    <View style={styles.commentItem}>
      <TouchableOpacity onPress={handlePressAuthor} activeOpacity={0.7}>
        {comment.user.image ? (
          <Image source={{ uri: comment.user.image }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentAvatarText}>{comment.user.name[0]?.toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.commentBody}>
        <TouchableOpacity onPress={handlePressAuthor} activeOpacity={0.7}>
          <Text style={styles.commentAuthor}>{comment.user.name}</Text>
        </TouchableOpacity>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
});
