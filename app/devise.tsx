import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function DeviseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ip: string }>();
  const [currentIp, setCurrentIp] = useState<string>(params.ip || 'Sin IP');

  const handleClear = async () => {
    try {
      // 1. Obtener los dispositivos guardados en el JSON
      const storedDevices = await AsyncStorage.getItem('@devices_json');
      if (storedDevices) {
        const devices = JSON.parse(storedDevices);
        
        // 2. Filtrar y eliminar el dispositivo que tenga la IP actual
        const updatedDevices = devices.filter((device: any) => device.ip !== currentIp);
        
        // 3. Guardar la nueva lista en el JSON
        await AsyncStorage.setItem('@devices_json', JSON.stringify(updatedDevices));
      }
    } catch (error) {
      console.error('Error eliminando el dispositivo del JSON:', error);
    }

    // 4. Se mantiene la funcionalidad original
    setCurrentIp('Sin IP');
    Alert.alert('Accion', 'Dispositivo eliminado del JSON y IP borrada de la pantalla actual');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0a7ea4" />
        </TouchableOpacity>
        
        <ThemedText type="subtitle">Panel de Dispositivo</ThemedText>
        
        <TouchableOpacity style={styles.headerButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Direccion IP Recibida:</ThemedText>
          <ThemedText style={[styles.ipText, { color: currentIp.includes('.') ? 'green' : 'gray' }]}>
            {currentIp}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  ipText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});