import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { webViewStyles } from './userProfileStyles';

interface Props {
  visible: boolean;
  title: string;
  url: string;
  onClose: () => void;
}

export function WebViewModal({ visible, title, url, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[webViewStyles.container, { paddingTop: insets.top }]}>
        <View style={webViewStyles.header}>
          <TouchableOpacity onPress={onClose} style={webViewStyles.closeBtn} activeOpacity={0.7}>
            <Text style={webViewStyles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={webViewStyles.title} numberOfLines={1}>{title}</Text>
          <View style={webViewStyles.closePlaceholder} />
        </View>
        <WebView source={{ uri: url }} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}
