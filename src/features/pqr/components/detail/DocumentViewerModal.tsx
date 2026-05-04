import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

interface Props {
  url: string;
  name: string;
  onClose: () => void;
}

export function DocumentViewerModal({ url, name, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const viewerUrl =
    Platform.OS === 'android'
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
      : url;

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[docViewerStyles.container, { paddingTop: insets.top }]}>
        <View style={docViewerStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={docViewerStyles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={docViewerStyles.title} numberOfLines={1}>{name}</Text>
          <View style={{ width: 32 }} />
        </View>
        <WebView
          source={{ uri: viewerUrl }}
          style={{ flex: 1 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        {loading && (
          <ActivityIndicator
            style={docViewerStyles.loadingOverlay}
            color="#2563EB"
            size="large"
          />
        )}
      </View>
    </Modal>
  );
}

const docViewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeText: { fontSize: 20, color: '#6B7280', minWidth: 32 },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
});
