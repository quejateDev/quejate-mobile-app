import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { webViewStyles } from './userProfileStyles';

const ALLOWED_DOMAINS = ['quejate.com.co', 'www.quejate.com.co'];
const ALLOWED_ORIGINS = ['https://quejate.com.co', 'https://www.quejate.com.co'];

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return protocol === 'https:' && ALLOWED_DOMAINS.includes(hostname);
  } catch {
    return false;
  }
}

const FIT_TO_SCREEN = `
(function() {
  function apply() {
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.setAttribute('name', 'viewport'); head.appendChild(vp); }
    vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    if (!document.getElementById('rn-fit-style')) {
      var st = document.createElement('style');
      st.id = 'rn-fit-style';
      st.innerHTML = 'html,body{margin:0!important;padding:0!important;overflow-x:hidden!important;width:100%!important;}*{max-width:100%!important;box-sizing:border-box!important;overflow-wrap:break-word!important;word-break:break-word!important;}';
      head.appendChild(st);
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  true;
})();
true;
`;

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
            originWhitelist={ALLOWED_ORIGINS}
            javaScriptEnabled
            scalesPageToFit
            injectedJavaScriptBeforeContentLoaded={FIT_TO_SCREEN}
            injectedJavaScript={FIT_TO_SCREEN}
            onMessage={() => {}}
            setBuiltInZoomControls={false}
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
