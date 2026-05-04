import React from 'react';
import { Text, View } from 'react-native';
import { RatingStars } from '@features/lawyers/components/RatingStars';
import type { Rating } from '@core/types';
import { styles } from './lawyerDetailStyles';
import { timeAgo } from '@shared/utils/dateUtils';

interface Props {
  rating: Rating;
}

export function RatingItem({ rating }: Props) {
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
