import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { webViewStyles } from './userProfileStyles';

const ALLOWED_DOMAINS = ['quejate.com.co', 'www.quejate.com.co'];

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return protocol === 'https:' && ALLOWED_DOMAINS.includes(hostname);
  } catch {
    return false;
  }
}

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
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
          <Text style={webViewStyles.title} numberOfLines={1}>{title}</Text>
          <View style={webViewStyles.closePlaceholder} />
        </View>
        {isSafeUrl(url) ? (
          <WebView
            source={{ uri: url }}
            style={{ flex: 1 }}
            javaScriptEnabled={false}
          />
        ) : (
          <View style={webViewStyles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
            <Text style={webViewStyles.errorText}>No se puede abrir esta URL</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
