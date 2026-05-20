import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, FlatList, Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from './userProfileStyles';

interface Person {
  id: string;
  name: string;
  image?: string | null;
}

interface Props {
  visible: boolean;
  title: string;
  people: Person[];
  onClose: () => void;
  onPressPerson?: (id: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('screen').height;

export function PeopleModal({ visible, title, people, onClose, onPressPerson }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View
          style={[
            modalStyles.sheet,
            { transform: [{ translateY: slideAnim }], paddingBottom: 24 + insets.bottom },
          ]}
        >
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {people.length === 0 ? (
            <Text style={modalStyles.empty}>Sin resultados</Text>
          ) : (
            <FlatList
              data={people}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.personRow}
                  onPress={() => onPressPerson?.(item.id)}
                  disabled={!onPressPerson}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver perfil de ${item.name}`}
                >
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={modalStyles.personAvatar}
                    />
                  ) : (
                    <View style={modalStyles.personAvatar}>
                      <Text style={modalStyles.personInitial}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[modalStyles.personName, { flex: 1 }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {onPressPerson && (
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
