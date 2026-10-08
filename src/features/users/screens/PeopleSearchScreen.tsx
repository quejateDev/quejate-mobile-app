import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { UserSearchResult } from '@core/types';
import type { AppStackParamList } from '@navigation/navigationRef';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { getErrorStatus } from '@shared/utils/httpError';
import { useUserSearch } from '@features/users/hooks/useUserSearch';
import { getInitials, ROLE_LABEL } from '@features/users/components/profile/userProfileUtils';

function countsLabel(count: NonNullable<UserSearchResult['_count']>): string {
  const pqrs = count.PQRS === 1 ? '1 PQRSD pública' : `${count.PQRS} PQRSD públicas`;
  const followers = count.followers === 1 ? '1 seguidor' : `${count.followers} seguidores`;
  return `${pqrs} · ${followers}`;
}

function PersonRow({ person, onPress }: { person: UserSearchResult; onPress: () => void }) {
  const name = person.name?.trim() || 'Sin nombre';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${name}`}
    >
      {person.image ? (
        <Image source={{ uri: person.image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{getInitials(person.name)}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{ROLE_LABEL[person.role] ?? person.role}</Text>
        {/* `_count` es aditivo en el servidor: sin él la fila se queda en nombre y rol. */}
        {person._count ? (
          <Text style={styles.meta} numberOfLines={1}>{countsLabel(person._count)}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function StateMessage({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={36} color="#9CA3AF" />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

export default function PeopleSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState('');
  const { status, results, limitReached, error, retry } = useUserSearch(text);

  let stateView: React.ReactElement | null = null;
  if (status === 'idle') {
    stateView = (
      <StateMessage
        icon="people-outline"
        title="Escribe un nombre"
        text="Se busca por nombre, a partir de dos letras."
      />
    );
  } else if (status === 'searching') {
    stateView = (
      <View style={styles.state}>
        <ActivityIndicator color="#2563EB" />
        <Text style={styles.stateText}>Buscando…</Text>
      </View>
    );
  } else if (status === 'empty') {
    stateView = (
      <StateMessage
        icon="search-outline"
        title="Nadie con ese nombre"
        text="Revisa cómo está escrito, tildes incluidas."
      />
    );
  } else if (status === 'error') {
    // Sin respuesta es la red; con respuesta el fallo es del servidor, y mandar
    // a revisar la conexión sería culpar a quien no toca.
    const hint =
      getErrorStatus(error) === undefined
        ? 'Verifica tu conexión.'
        : 'Inténtalo de nuevo en un momento.';
    stateView = <ErrorState message={`No se pudo buscar. ${hint}`} onRetry={retry} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nombre de la persona"
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          accessibilityLabel="Nombre de la persona que buscas"
        />
      </View>

      {/* Todos los estados van dentro de la lista, y no a su lado: la app usa
       *  el teclado en modo `pan`, que tapa el contenido en vez de encogerlo, y
       *  esta pantalla entra con el teclado abierto. Con el margen inferior del
       *  alto del teclado, lo que quede debajo se alcanza arrastrando. */}
      <FlatList<UserSearchResult>
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PersonRow
            person={item}
            onPress={() => {
              // Al volver del perfil la lista queda a la vista, sin teclado encima.
              Keyboard.dismiss();
              navigation.navigate('PublicProfile', { userId: item.id });
            }}
          />
        )}
        ListEmptyComponent={stateView}
        ListFooterComponent={
          limitReached ? (
            <Text style={styles.limitNotice}>
              Mostrando los {results.length} primeros. Escribe más para afinar.
            </Text>
          ) : null
        }
        // Sin esto, el primer toque sobre una fila solo cierra el teclado.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Math.max(keyboardHeight, insets.bottom) + 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    minHeight: 44,
    paddingVertical: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 6,
    textAlignVertical: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarFallback: { backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  rowBody: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  state: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40, gap: 8 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 4 },
  stateText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
  limitNotice: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 32,
    marginTop: 16,
  },
});
