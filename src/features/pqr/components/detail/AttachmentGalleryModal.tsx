import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Attachment } from '@core/types';
import { isVideoAttachment } from './detailUtils';

interface MediaItem {
  attachment: Attachment;
  kind: 'image' | 'video';
}

interface Props {
  media: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;

function clampScale(v: number) {
  return Math.max(1, Math.min(v, MAX_ZOOM));
}

function ImagePage({
  uri,
  width,
  height,
  setPagingEnabled,
}: {
  uri: string;
  width: number;
  height: number;
  setPagingEnabled: (v: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(1);
  const liveScale = useRef(1);

  function applyZoomed(zoomed: boolean) {
    setPagingEnabled(!zoomed);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      setPagingEnabled(false);
    })
    .onUpdate((e) => {
      const next = clampScale(baseScale.current * e.scale);
      liveScale.current = next;
      scale.setValue(next);
    })
    .onEnd(() => {
      baseScale.current = clampScale(liveScale.current);
      if (baseScale.current <= 1.01) {
        baseScale.current = 1;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }
      applyZoomed(baseScale.current > 1.01);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(() => {
      const target = baseScale.current > 1.01 ? 1 : DOUBLE_TAP_ZOOM;
      baseScale.current = target;
      liveScale.current = target;
      Animated.spring(scale, { toValue: target, useNativeDriver: true }).start();
      applyZoomed(target > 1.01);
    });

  const composed = Gesture.Simultaneous(pinch, doubleTap);

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={{ width, height, transform: [{ scale }] }}>
          <Image
            source={{ uri }}
            style={{ width, height }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function VideoPage({
  uri,
  thumbnailUrl,
  width,
  height,
}: {
  uri: string;
  thumbnailUrl?: string | null;
  width: number;
  height: number;
}) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  function start() {
    setPlaying(true);
    player.play();
  }

  return (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      {playing ? (
        <VideoView
          style={{ width, height: height * 0.85 }}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
          contentFit="contain"
        />
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={start}
          style={{ width, height: height * 0.85, justifyContent: 'center', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Reproducir video"
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={{ width, height: height * 0.85 }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : null}
          <View style={galleryStyles.playOverlay}>
            <Ionicons name="play-circle" size={76} color="rgba(255,255,255,0.95)" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AttachmentGalleryModal({ media, initialIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const items: MediaItem[] = media.map((att) => ({
    attachment: att,
    kind: isVideoAttachment(att.type, att.name) ? 'video' : 'image',
  }));
  const [idx, setIdx] = useState(initialIndex);
  const [pagingEnabled, setPagingEnabled] = useState(true);
  const listRef = useRef<FlatList<MediaItem>>(null);
  const pageHeight = height - 120;
  const current = items[idx];

  function scrollTo(newIdx: number) {
    listRef.current?.scrollToIndex({ index: newIdx, animated: true });
    setIdx(newIdx);
  }

  function onMomentumScrollEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIdx !== idx && newIdx >= 0 && newIdx < items.length) {
      setIdx(newIdx);
    }
  }

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={[galleryStyles.container, { paddingTop: insets.top }]}>
        <View style={galleryStyles.topBar}>
          <Text style={galleryStyles.counter} numberOfLines={1}>
            {idx + 1} / {items.length}
          </Text>
          <Text style={galleryStyles.imageName} numberOfLines={1}>
            {current?.attachment.name}
          </Text>
          <TouchableOpacity
            style={galleryStyles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList<MediaItem>
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={pagingEnabled}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyExtractor={(item) => item.attachment.id}
          renderItem={({ item }) =>
            item.kind === 'video' ? (
              <VideoPage
                uri={item.attachment.url}
                thumbnailUrl={item.attachment.thumbnailUrl}
                width={width}
                height={pageHeight}
              />
            ) : (
              <ImagePage
                uri={item.attachment.url}
                width={width}
                height={pageHeight}
                setPagingEnabled={setPagingEnabled}
              />
            )
          }
        />

        {items.length > 1 && (
          <View style={[galleryStyles.navRow, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[galleryStyles.navBtn, idx === 0 && galleryStyles.navBtnDisabled]}
              onPress={() => scrollTo(Math.max(0, idx - 1))}
              disabled={idx === 0}
            >
              <Ionicons name="chevron-back" size={36} color="#fff" />
            </TouchableOpacity>
            <Text style={galleryStyles.hint} numberOfLines={1}>
              {current?.kind === 'image' ? 'Pellizca para hacer zoom · Desliza' : 'Desliza para ver más'}
            </Text>
            <TouchableOpacity
              style={[
                galleryStyles.navBtn,
                idx === items.length - 1 && galleryStyles.navBtnDisabled,
              ]}
              onPress={() => scrollTo(Math.min(items.length - 1, idx + 1))}
              disabled={idx === items.length - 1}
            >
              <Ionicons name="chevron-forward" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </GestureHandlerRootView>
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navBtnDisabled: {
    opacity: 0.25,
  },
  hint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 8,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
