import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Platform, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ExampleDevice } from '@/components/devices/ExampleDevice';

const DeviceComponentsRegistry: Record<string, React.FC<any>> = {
  "example": ExampleDevice,
};

export default function DeviceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ip: string; name: string }>();
  const [currentIp, setCurrentIp] = useState<string>(params.ip || 'Sin IP');
  const [deviceData, setDeviceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentIp !== 'Sin IP') {
      fetchDeviceData();
    }
  }, [currentIp]);

  const fetchDeviceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${currentIp}/data`);
      if (!response.ok) throw new Error('Error al obtener los datos');
      const json = await response.json();
      
      if (json.itinerario) {
        json.itinerario = json.itinerario.map((item: any) => ({
          ...item,
          duracion: item.duracion.toString().replace(/\D/g, '')
        }));
      }
      setDeviceData(json);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo conectar con el dispositivo ESP para obtener los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      const storedDevices = await AsyncStorage.getItem('@devices_json');
      if (storedDevices) {
        const devices = JSON.parse(storedDevices);
        const updatedDevices = devices.filter((device: any) => device.ip !== currentIp);
        await AsyncStorage.setItem('@devices_json', JSON.stringify(updatedDevices));
      }
    } catch (error) {
      console.error(error);
    }
    setCurrentIp('Sin IP');
    Alert.alert('Acción', 'Dispositivo eliminado y IP borrada', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const renderSpecificDeviceComponent = () => {
    if (!deviceData || !deviceData.device) return null;
    
    const deviceKey = deviceData.device.toLowerCase();
    const SpecificComponent = DeviceComponentsRegistry[deviceKey];

    if (SpecificComponent) {
      return (
        <SpecificComponent 
          ip={currentIp} 
          initialData={deviceData} 
          onRefresh={fetchDeviceData} 
        />
      );
    }

    return (
      <ThemedView style={styles.card}>
        <ThemedText style={{color: 'red'}}>
          No existe una interfaz registrada para el dispositivo: "{deviceData.device}"
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0a7ea4" />
        </TouchableOpacity>
        <ThemedText type="subtitle">{params.name || 'Dispositivo Desconocido'}</ThemedText>
        <TouchableOpacity style={styles.headerButton} onPress={handleClear}>
          <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.card}>
          <ThemedText type="defaultSemiBold">Dirección IP Recibida:</ThemedText>
          <ThemedText style={[styles.ipText, { color: currentIp.includes('.') ? 'green' : 'gray' }]}>
            {currentIp}
          </ThemedText>
        </ThemedView>

        {isLoading ? (
          <ActivityIndicator size="large" color="#0a7ea4" style={{ marginTop: 20 }} />
        ) : deviceData ? (
          renderSpecificDeviceComponent()
        ) : (
          <ThemedText style={styles.noDataText}>No hay datos cargados. Conecta el dispositivo a una red wifi.</ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
    marginBottom: 20,
  },
  ipText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dataCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    marginBottom: 15,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  itinerarioBox: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#90c4d5',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noDataText: {
    marginTop: 20,
    color: 'gray',
    textAlign: 'center',
  }
});