import React from 'react';
import { FlatList, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
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

export function PeopleModal({ visible, title, people, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={() => {}}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.close}>✕</Text>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
