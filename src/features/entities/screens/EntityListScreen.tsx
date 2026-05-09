import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEntities } from '@features/entities/hooks/useEntities';
import { useCategories } from '@features/entities/hooks/useCategories';
import { ErrorState } from '@shared/components/ui/ErrorState';
import type { AppStackParamList } from '@navigation/navigationRef';
import type { Entity } from '@core/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

// ---------------------------------------------------------------------------
// Category → icon + color mapping (case-insensitive substring match)
// ---------------------------------------------------------------------------
type IconConfig = { icon: keyof typeof Ionicons.glyphMap; color: string };

function getCategoryConfig(categoryName: string | undefined): IconConfig | null {
  if (!categoryName) return null;
  const n = categoryName.toLowerCase();
  if (n.includes('colegio') || n.includes('educaci'))        return { icon: 'school-outline',          color: '#7C3AED' };
  if (n.includes('alcaldí') || n.includes('alcaldi'))        return { icon: 'business-outline',        color: '#1E40AF' };
  if (n.includes('turismo') || n.includes('deporte'))        return { icon: 'football-outline',        color: '#0891B2' };
  if (n.includes('secretar'))                                return { icon: 'document-text-outline',   color: '#374151' };
  if (n.includes('movilidad') || n.includes('transporte'))   return { icon: 'car-outline',             color: '#B45309' };
  if (n.includes('salud') || n.includes('hospital'))         return { icon: 'medkit-outline',          color: '#DC2626' };
  if (n.includes('ambiente') || n.includes('ecolog'))        return { icon: 'leaf-outline',            color: '#16A34A' };
  if (n.includes('agua') || n.includes('acueducto'))         return { icon: 'water-outline',           color: '#0EA5E9' };
  if (n.includes('energ') || n.includes('eléctr'))           return { icon: 'flash-outline',           color: '#D97706' };
  if (n.includes('servicio') || n.includes('público'))       return { icon: 'construct-outline',       color: '#2563EB' };
  if (n.includes('seguridad') || n.includes('policí'))       return { icon: 'shield-outline',          color: '#374151' };
  if (n.includes('hacienda') || n.includes('finanza'))       return { icon: 'cash-outline',            color: '#16A34A' };
  if (n.includes('cultura') || n.includes('arte'))           return { icon: 'color-palette-outline',   color: '#7C3AED' };
  if (n.includes('vivienda') || n.includes('hábitat'))       return { icon: 'home-outline',            color: '#0891B2' };
  if (n.includes('planeac') || n.includes('urbanis'))        return { icon: 'map-outline',             color: '#374151' };
  if (n.includes('infraestructura') || n.includes('obras'))  return { icon: 'hammer-outline',          color: '#B45309' };
  if (n.includes('justicia') || n.includes('juridic'))       return { icon: 'scale-outline',           color: '#1E40AF' };
  if (n.includes('comunicaci') || n.includes('prensa'))      return { icon: 'megaphone-outline',       color: '#0891B2' };
  if (n.includes('social') || n.includes('bienestar'))       return { icon: 'people-outline',          color: '#D97706' };
  return null;
}

function getCategoryFallbackColor(name: string): string {
  const palette = ['#2563EB', '#0891B2', '#16A34A', '#D97706', '#7C3AED', '#1E40AF'];
  return palette[name.charCodeAt(0) % palette.length];
}

// ---------------------------------------------------------------------------
// Entity avatar — icon if category known, else colored initial
// ---------------------------------------------------------------------------
function EntityAvatar({ name, categoryName }: { name: string; categoryName?: string }) {
  const cfg = getCategoryConfig(categoryName);
  const color = cfg?.color ?? getCategoryFallbackColor(name);
  return (
    <View style={[styles.entityInitial, { backgroundColor: color + '18' }]}>
      {cfg ? (
        <Ionicons name={cfg.icon} size={22} color={color} />
      ) : (
        <Text style={[styles.entityInitialText, { color }]}>
          {name.trim()[0]?.toUpperCase() ?? '?'}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Entity card
// ---------------------------------------------------------------------------
const EntityCard = React.memo(function EntityCard({
  entity,
  onPress,
}: {
  entity: Entity;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  return (
    <TouchableOpacity style={styles.entityCard} onPress={onPress} activeOpacity={0.75}>
      {entity.imageUrl && !imageError ? (
        <Image
          source={{ uri: entity.imageUrl }}
          style={styles.entityImage}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <EntityAvatar name={entity.name} categoryName={entity.category?.name} />
      )}
      <View style={styles.entityInfo}>
        <Text style={styles.entityName} numberOfLines={2}>{entity.name}</Text>
        {entity.description ? (
          <Text style={styles.entityDesc} numberOfLines={2}>{entity.description}</Text>
        ) : null}
        <View style={styles.entityMeta}>
          {entity.category?.name ? (
            <CategoryChipSmall name={entity.category.name} />
          ) : null}
          {(entity._count?.pqrs ?? 0) > 0 && (
            <Text style={styles.entityPqrCount}>{entity._count!.pqrs} PQRSD</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );
});

// Small inline category chip inside entity card
function CategoryChipSmall({ name }: { name: string }) {
  const cfg = getCategoryConfig(name);
  const color = cfg?.color ?? '#2563EB';
  return (
    <View style={[styles.entityCategory, { backgroundColor: color + '15' }]}>
      {cfg && <Ionicons name={cfg.icon} size={10} color={color} style={{ marginRight: 3 }} />}
      <Text style={[styles.entityCategoryText, { color }]}>{name}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function EntityListScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);

  // Fetch — pass categoryId to API (works once backend deploys the fix)
  const { data: entities, isLoading, isError, refetch, isRefetching } = useEntities(
    activeCategoryId ? { categoryId: activeCategoryId } : {},
  );
  const { data: categories } = useCategories();

  // Client-side filter as safety net (covers both search and category)
  const filtered = useMemo(() => {
    if (!entities) return [];
    let result = entities;
    if (activeCategoryId) {
      result = result.filter((e) => e.category?.id === activeCategoryId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [entities, search, activeCategoryId]);

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState message="No se pudieron cargar las entidades." onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Entidades</Text>
        <Text style={styles.subtitle}>Toca una entidad para radicar una PQRSD</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar entidad..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {categories && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
          style={styles.categoriesScroll}
        >
          <TouchableOpacity
            style={[styles.categoryChip, activeCategoryId == null && styles.categoryChipActive]}
            onPress={() => setActiveCategoryId(undefined)}
          >
            <Text style={[styles.categoryChipText, activeCategoryId == null && styles.categoryChipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            const cfg = getCategoryConfig(cat.name);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategoryId(isActive ? undefined : cat.id)}
              >
                {cfg && (
                  <Ionicons
                    name={cfg.icon}
                    size={12}
                    color={isActive ? '#fff' : '#6B7280'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList<Entity>
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntityCard
              entity={item}
              onPress={() => navigation.navigate('CreatePQR', { entityId: item.id })}
            />
          )}
          removeClippedSubviews
          maxToRenderPerBatch={15}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {search || activeCategoryId
                  ? 'Sin resultados para tu búsqueda'
                  : 'No hay entidades disponibles'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 76 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  categoriesScroll: {
    flexShrink: 0,
    flexGrow: 0,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  categoryChipTextActive: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entityImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  entityInitial: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityInitialText: { fontSize: 20, fontWeight: '700' },
  entityInfo: { flex: 1 },
  entityName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3, lineHeight: 19 },
  entityDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 6 },
  entityMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entityCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  entityCategoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entityPqrCount: { fontSize: 11, color: '#9CA3AF' },
});
