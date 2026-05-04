import React, { useState } from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Attachment } from '@core/types';

interface Props {
  images: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

export function AttachmentGalleryModal({ images, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const current = images[idx];
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[galleryStyles.container, { paddingTop: insets.top }]}>
        <View style={galleryStyles.topBar}>
          <Text style={galleryStyles.counter} numberOfLines={1}>
            {idx + 1} / {images.length}
          </Text>
          <Text style={galleryStyles.imageName} numberOfLines={1}>
            {current.name}
          </Text>
          <TouchableOpacity
            style={galleryStyles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={galleryStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Image
          source={{ uri: current.url }}
          style={galleryStyles.image}
          resizeMode="contain"
        />

        {images.length > 1 && (
          <View style={[galleryStyles.navRow, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[galleryStyles.navBtn, idx === 0 && galleryStyles.navBtnDisabled]}
              onPress={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <Text style={galleryStyles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[galleryStyles.navBtn, idx === images.length - 1 && galleryStyles.navBtnDisabled]}
              onPress={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
              disabled={idx === images.length - 1}
            >
              <Text style={galleryStyles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const galleryStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  counter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    minWidth: 36,
  },
  imageName: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
  },
  closeBtn: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#fff',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  navBtn: {
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
  navBtnDisabled: {
    opacity: 0.25,
  },
  navBtnText: {
    fontSize: 48,
    color: '#fff',
    lineHeight: 52,
  },
});
