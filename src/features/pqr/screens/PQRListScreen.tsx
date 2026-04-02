import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PQRListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>PQRListScreen - placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#374151',
  },
});
