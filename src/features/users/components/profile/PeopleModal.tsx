import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, FlatList, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from './userProfileStyles';

interface Person {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  title: string;
  people: Person[];
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('screen').height;

export function PeopleModal({ visible, title, people, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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
        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
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
                <View style={modalStyles.personRow}>
                  <View style={modalStyles.personAvatar}>
                    <Text style={modalStyles.personInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={modalStyles.personName}>{item.name}</Text>
                </View>
              )}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
