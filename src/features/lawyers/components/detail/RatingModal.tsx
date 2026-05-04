import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RatingStarPicker } from '@features/lawyers/components/RatingStars';
import type { Rating } from '@core/types';
import { modalStyles } from './lawyerDetailStyles';

interface Props {
  visible: boolean;
  lawyerName: string;
  myRating: Rating | null;
  selectedScore: number;
  setSelectedScore: (v: number) => void;
  ratingComment: string;
  setRatingComment: (v: string) => void;
  isPending: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function RatingModal({
  visible,
  lawyerName,
  myRating,
  selectedScore,
  setSelectedScore,
  ratingComment,
  setRatingComment,
  isPending,
  onSave,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.backdropArea} onPress={() => !isPending && onClose()}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable onPress={() => {}}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>
                {myRating ? 'Editar calificación' : 'Calificar abogado'}
              </Text>
              <Text style={modalStyles.subtitle}>{lawyerName}</Text>

              <View style={modalStyles.starsRow}>
                <RatingStarPicker value={selectedScore} onChange={setSelectedScore} size={36} />
              </View>
              {selectedScore > 0 && (
                <Text style={modalStyles.scoreLabel}>{selectedScore} de 5 estrellas</Text>
              )}

              <Text style={modalStyles.label}>Comentario (opcional)</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.multiline]}
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="¿Cómo fue tu experiencia?"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={300}
                editable={!isPending}
              />

              <TouchableOpacity
                style={[modalStyles.actionBtn, (selectedScore === 0 || isPending) && modalStyles.actionBtnDisabled]}
                onPress={onSave}
                disabled={selectedScore === 0 || isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={modalStyles.actionBtnText}>
                    {myRating ? 'Actualizar' : 'Enviar calificación'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={onClose}
                disabled={isPending}
              >
                <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
