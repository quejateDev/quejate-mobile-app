import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { PQRS } from '@core/types';
import { debugLog } from '@core/debug/debugStore';
import { useTogglePrivacy } from '../hooks/usePQRActions';
import { downloadFirstImage, shareImage, shareLink } from '../utils/pqrShare';
import { PQRShareCard } from './share/PQRShareCard';

interface Props {
  pqr: PQRS;
  isOwner: boolean;
  onClose: () => void;
}

function waitUntil(cond: () => boolean, timeout = 2500, interval = 50): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (cond() || Date.now() - start > timeout) return resolve();
      setTimeout(tick, interval);
    };
    tick();
  });
}

export function PQRActionsSheet({ pqr, isOwner, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const privacy = useTogglePrivacy(pqr, onClose);
  const cardRef = useRef<View>(null);
  const bannerReadyRef = useRef(false);
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void downloadFirstImage(pqr).then((uri) => {
      if (!cancelled) setSrcImage(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [pqr]);

  async function handleSharePost() {
    if (busy) return;
    setBusy(true);
    try {
      // espera a que el banner local cargue (si hay) para que la captura lo incluya
      if (srcImage) await waitUntil(() => bannerReadyRef.current);
      else await new Promise((r) => setTimeout(r, 250));

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });
      const ok = await shareImage(uri, pqr.subject ?? 'Compartir en Quéjate');
      if (!ok) await shareLink(pqr);
      onClose();
    } catch (error) {
      debugLog('err', `SHARE post fail: ${String(error)}`);
      try {
        await shareLink(pqr);
        onClose();
      } catch {
        Alert.alert('Error', 'No se pudo compartir. Intenta de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleShareLink() {
    if (busy) return;
    try {
      await shareLink(pqr);
      onClose();
    } catch (error) {
      debugLog('err', `SHARE link fail: ${String(error)}`);
    }
  }

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.scrim} onPress={busy ? undefined : onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.handle} />
            <Text style={styles.title} numberOfLines={1}>
              {pqr.subject ?? 'Opciones'}
            </Text>

            <SheetRow
              icon="image-outline"
              label={busy ? 'Generando…' : 'Compartir como publicación'}
              sublabel="Imagen con la marca Quéjate"
              onPress={handleSharePost}
              disabled={busy}
              trailing={busy ? <ActivityIndicator size="small" color="#2563EB" /> : undefined}
            />
            <SheetRow
              icon="link-outline"
              label="Compartir enlace"
              sublabel="Texto + link de la PQRSD"
              onPress={handleShareLink}
              disabled={busy}
            />

            {isOwner && (
              <SheetRow
                icon={pqr.private ? 'eye-outline' : 'eye-off-outline'}
                label={
                  privacy.isPending
                    ? 'Actualizando…'
                    : pqr.private
                    ? 'Hacer pública'
                    : 'Hacer privada'
                }
                sublabel={pqr.private ? 'Visible en el muro público' : 'Solo tú la verás'}
                onPress={privacy.toggle}
                disabled={privacy.isPending || busy}
              />
            )}

            <Pressable
              style={styles.cancelBtn}
              onPress={busy ? undefined : onClose}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tarjeta branded fuera de pantalla, lista para capturar */}
      <View style={styles.offscreen} pointerEvents="none">
        <PQRShareCard
          ref={cardRef}
          pqr={pqr}
          imageUri={srcImage}
          onImageLoad={() => {
            bannerReadyRef.current = true;
          }}
        />
      </View>
    </>
  );
}

function SheetRow({
  icon,
  label,
  sublabel,
  onPress,
  disabled,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.rowPressed, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color="#374151" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowSublabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
