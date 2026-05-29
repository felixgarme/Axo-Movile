import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  Platform, 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  TextInput,
  ActivityIndicator
} from 'react-native';

export default function DeviseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ip: string; name: string }>();
  const [currentIp, setCurrentIp] = useState<string>(params.ip || 'Sin IP');
  
  // Estados para manejar los datos del ESP
  const [deviceData, setDeviceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estados para un nuevo itinerario
  const [nuevaHora, setNuevaHora] = useState<string>('');
  const [nuevaDuracion, setNuevaDuracion] = useState<string>('');

  useEffect(() => {
    if (currentIp !== 'Sin IP') {
      fetchDeviceData();
    }
  }, [currentIp]);

  // FUNCIÓN PARA RESTRINGIR LA HORA A FORMATO HH:MM
  const formatearHora = (texto: string) => {
    const numeros = texto.replace(/\D/g, ''); // Elimina todo lo que no sea número
    if (numeros.length >= 3) {
      let horas = numeros.slice(0, 2);
      let mins = numeros.slice(2, 4);
      if (parseInt(horas) > 23) horas = '23'; // Límite de hora
      if (parseInt(mins) > 59) mins = '59';   // Límite de minutos
      return `${horas}:${mins}`;
    } else if (numeros.length > 0) {
      let horas = numeros;
      if (parseInt(horas) > 23) horas = '23';
      return horas;
    }
    return '';
  };

  // FUNCIÓN PARA RESTRINGIR LA DURACIÓN (MÁXIMO 5 MINUTOS)
  const formatearDuracion = (texto: string) => {
    const numeros = texto.replace(/\D/g, ''); 
    if (numeros === '') return '';
    const num = parseInt(numeros, 10);
    if (num > 5) return '5'; // Si pone más de 5, lo fuerza a 5
    return numeros;
  };

  const fetchDeviceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${currentIp}/data`);
      if (!response.ok) throw new Error('Error al obtener los datos');
      
      const json = await response.json();
      
      // Como el ESP manda la duración en segundos, la convertimos a minutos para la UI
      if (json.itinerario) {
        json.itinerario = json.itinerario.map((item: any) => ({
          ...item,
          duracion: formatearDuracion(Math.floor(item.duracion / 60).toString())
        }));
      }

      setDeviceData(json);
    } catch (error) {
      console.error('Error de conexión:', error);
      Alert.alert('Error', 'No se pudo conectar con el dispositivo ESP para obtener los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDeviceData = async () => {
    if (!deviceData) return;
    setIsSaving(true);
    try {
      let formBody = [];
      
      if (deviceData.divice) {
        formBody.push(encodeURIComponent("divice") + "=" + encodeURIComponent(deviceData.divice));
      }
      formBody.push(encodeURIComponent("activador") + "=" + encodeURIComponent(deviceData.activador ? "true" : "false"));
      
      if (nuevaHora.trim() !== '' && nuevaDuracion.trim() !== '') {
        formBody.push(encodeURIComponent("hora") + "=" + encodeURIComponent(nuevaHora));
        
        // CONVERSIÓN A SEGUNDOS: Multiplicamos los minutos por 60 para mandarlos al ESP
        const duracionEnSegundos = (parseInt(nuevaDuracion, 10) * 60).toString();
        formBody.push(encodeURIComponent("duracion") + "=" + encodeURIComponent(duracionEnSegundos));
      }

      const bodyString = formBody.join("&");

      const response = await fetch(`http://${currentIp}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyString,
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Datos actualizados correctamente en el dispositivo.');
        setNuevaHora('');
        setNuevaDuracion('');
        fetchDeviceData();
      } else {
        throw new Error('Respuesta no OK del servidor');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', 'No se pudieron enviar los datos al dispositivo.');
    } finally {
      setIsSaving(false);
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
      console.error('Error eliminando el dispositivo del JSON:', error);
    }

    setCurrentIp('Sin IP');
    
    Alert.alert(
      'Acción', 
      'Dispositivo eliminado y IP borrada',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const updateItinerario = (index: number, field: string, value: string) => {
    const newData = { ...deviceData };
    if (field === 'hora') {
      newData.itinerario[index].hora = formatearHora(value);
    } else if (field === 'duracion') {
      newData.itinerario[index].duracion = formatearDuracion(value);
    }
    setDeviceData(newData);
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
          <ThemedView style={styles.dataCard}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Control del Dispositivo</ThemedText>
            
            <ThemedView style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold">Nombre del Dispositivo:</ThemedText>
              <TextInput 
                style={styles.input}
                value={deviceData.divice}
                onChangeText={(text) => setDeviceData({...deviceData, divice: text})}
                placeholder="Nombre ESP"
              />
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText type="defaultSemiBold">Activador:</ThemedText>
              <Switch 
                value={deviceData.activador} 
                onValueChange={(val) => setDeviceData({...deviceData, activador: val})}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={deviceData.activador ? '#0a7ea4' : '#f4f3f4'}
              />
            </ThemedView>

            {/* SE ELIMINÓ EL INPUT DEL RELOJ DEL SISTEMA AQUÍ */}

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 15 }]}>Itinerarios Existentes</ThemedText>
            
            {deviceData.itinerario && deviceData.itinerario.map((item: any, index: number) => (
              <ThemedView key={index} style={styles.itinerarioBox}>
                <ThemedView style={styles.inputContainer}>
                  <ThemedText type="default">Hora (HH:MM):</ThemedText>
                  <TextInput 
                    style={styles.input}
                    value={item.hora}
                    keyboardType="numeric"
                    onChangeText={(text) => updateItinerario(index, 'hora', text)}
                    placeholder="16:35"
                  />
                </ThemedView>
                <ThemedView style={styles.inputContainer}>
                  <ThemedText type="default">Duración (minutos, max 5):</ThemedText>
                  <TextInput 
                    style={styles.input}
                    value={item.duracion}
                    keyboardType="numeric"
                    onChangeText={(text) => updateItinerario(index, 'duracion', text)}
                    placeholder="1"
                  />
                </ThemedView>
              </ThemedView>
            ))}

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 15, color: '#0a7ea4' }]}>+ Añadir Nuevo Itinerario</ThemedText>
            <ThemedView style={[styles.itinerarioBox, { borderColor: '#0a7ea4', borderWidth: 1 }]}>
              <ThemedView style={styles.inputContainer}>
                <ThemedText type="default">Hora (HH:MM):</ThemedText>
                <TextInput 
                  style={styles.input}
                  value={nuevaHora}
                  keyboardType="numeric"
                  onChangeText={(text) => setNuevaHora(formatearHora(text))}
                  placeholder="Ej. 18:00"
                />
              </ThemedView>
              <ThemedView style={styles.inputContainer}>
                <ThemedText type="default">Duración (minutos, max 5):</ThemedText>
                <TextInput 
                  style={styles.input}
                  value={nuevaDuracion}
                  keyboardType="numeric"
                  onChangeText={(text) => setNuevaDuracion(formatearDuracion(text))}
                  placeholder="Ej. 5"
                />
              </ThemedView>
            </ThemedView>

            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={saveDeviceData}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Guardar Cambios en ESP</ThemedText>
              )}
            </TouchableOpacity>

          </ThemedView>
        ) : (
          <ThemedText style={styles.noDataText}>No hay datos cargados. Revisa la conexión.</ThemedText>
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