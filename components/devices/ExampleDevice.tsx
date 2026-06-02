import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

const formatearHora = (texto: string) => {
  const numeros = texto.replace(/\D/g, '');
  if (numeros.length >= 3) {
    let horas = numeros.slice(0, 2);
    let mins = numeros.slice(2, 4);
    if (parseInt(horas) > 23) horas = '23';
    if (parseInt(mins) > 59) mins = '59';
    return `${horas}:${mins}`;
  } else if (numeros.length > 0) {
    let horas = numeros;
    if (parseInt(horas) > 23) horas = '23';
    return horas;
  }
  return '';
};

const formatearDuracion = (texto: string) => {
  const numeros = texto.replace(/\D/g, ''); 
  if (numeros === '') return '';
  const num = parseInt(numeros, 10);
  if (num > 180) return '180';
  return numeros;
};

export const ExampleDevice = ({ ip, initialData, onRefresh }: { ip: string, initialData: any, onRefresh: () => void }) => {
  const [deviceData, setDeviceData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [nuevaHora, setNuevaHora] = useState('');
  const [nuevaDuracion, setNuevaDuracion] = useState('');

  const updateItinerario = (index: number, field: string, value: string) => {
    setDeviceData((prevData: any) => {
      const newItinerario = [...(prevData.itinerario || [])];
      newItinerario[index] = { ...newItinerario[index] };
      
      if (field === 'hora') {
        newItinerario[index].hora = formatearHora(value);
      } else if (field === 'duracion') {
        newItinerario[index].duracion = formatearDuracion(value);
      }
      
      return { ...prevData, itinerario: newItinerario };
    });
  };

  const guardarEdicionItinerario = async (index: number, hora: string, duracion: string) => {
    try {
      let formBody = [];
      formBody.push(encodeURIComponent("editar") + "=" + encodeURIComponent(index.toString()));
      formBody.push(encodeURIComponent("hora") + "=" + encodeURIComponent(hora));
      formBody.push(encodeURIComponent("duracion") + "=" + encodeURIComponent(duracion));
      
      const response = await fetch(`http://${ip}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.join("&"),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Itinerario modificado correctamente.');
        onRefresh();
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo modificar el itinerario.');
    }
  };

  const eliminarItinerario = (index: number) => {
    Alert.alert(
      "Eliminar Itinerario",
      "¿Estás seguro de que deseas eliminar este itinerario?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            setDeviceData((prevData: any) => {
              const newItinerario = [...(prevData.itinerario || [])];
              newItinerario.splice(index, 1);
              return { ...prevData, itinerario: newItinerario };
            });

            try {
              const formBody = encodeURIComponent("eliminar") + "=" + encodeURIComponent(index.toString());
              await fetch(`http://${ip}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody,
              });
              onRefresh();
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handlePulsador = async (estado: boolean) => {
    setDeviceData((prev: any) => ({ ...prev, activador: estado }));
    
    try {
      let formBody = [];
      if (deviceData.name) formBody.push(encodeURIComponent("name") + "=" + encodeURIComponent(deviceData.name));
      formBody.push(encodeURIComponent("activador") + "=" + encodeURIComponent(estado ? "true" : "false"));
      
      await fetch(`http://${ip}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.join("&"),
      });
    } catch (error) {
      console.error('Error al guardar activador:', error);
    }
  };

  const saveDeviceData = async () => {
    setIsSaving(true);
    try {
      let formBody = [];
      if (deviceData.name) formBody.push(encodeURIComponent("name") + "=" + encodeURIComponent(deviceData.name));
      formBody.push(encodeURIComponent("activador") + "=" + encodeURIComponent(deviceData.activador ? "true" : "false"));
      
      if (nuevaHora.trim() !== '' && nuevaDuracion.trim() !== '') {
        formBody.push(encodeURIComponent("hora") + "=" + encodeURIComponent(nuevaHora));
        formBody.push(encodeURIComponent("duracion") + "=" + encodeURIComponent(nuevaDuracion));
      }

      const response = await fetch(`http://${ip}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.join("&"),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Datos actualizados correctamente en el dispositivo.');
        setNuevaHora('');
        setNuevaDuracion('');
        onRefresh();
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron enviar los datos al dispositivo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.dataCard}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Control: Detector ESPD</ThemedText>
      
      <ThemedView style={styles.inputContainer}>
        <ThemedText type="defaultSemiBold">Nombre del Dispositivo:</ThemedText>
        <TextInput 
          style={styles.input}
          value={deviceData.name}
          onChangeText={(text) => setDeviceData({...deviceData, name: text})}
        />
      </ThemedView>

      <ThemedView style={styles.row}>
        <ThemedText type="defaultSemiBold">Activador (Pulsador):</ThemedText>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPressIn={() => handlePulsador(true)}
          onPressOut={() => handlePulsador(false)}
          style={[
            styles.pulsadorBtn, 
            { backgroundColor: deviceData.activador ? '#0a7ea4' : '#e0e0e0' }
          ]}
        >
          <ThemedText style={{ color: deviceData.activador ? '#fff' : '#333', fontWeight: 'bold' }}>
            {deviceData.activador ? 'ON' : 'OFF'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 15 }]}>Itinerarios</ThemedText>
      {deviceData.itinerario && deviceData.itinerario.map((item: any, index: number) => (
        <ThemedView key={index} style={styles.itinerarioBox}>
          <ThemedView style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => guardarEdicionItinerario(index, item.hora, item.duracion)}>
              <Ionicons name="save-outline" size={22} color="#0a7ea4" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => eliminarItinerario(index)}>
              <Ionicons name="trash-outline" size={22} color="#ff4444" />
            </TouchableOpacity>
          </ThemedView>
          <ThemedView style={styles.inputContainer}>
            <ThemedText type="default">Hora (HH:MM):</ThemedText>
            <TextInput 
              style={styles.input} value={item.hora} keyboardType="numeric"
              onChangeText={(text) => updateItinerario(index, 'hora', text)}
            />
          </ThemedView>
          <ThemedView style={styles.inputContainer}>
            <ThemedText type="default">Duración (seg max 180):</ThemedText>
            <TextInput 
              style={styles.input} value={item.duracion} keyboardType="numeric"
              onChangeText={(text) => updateItinerario(index, 'duracion', text)}
            />
          </ThemedView>
        </ThemedView>
      ))}

      <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 15, color: '#0a7ea4' }]}>+ Añadir Itinerario</ThemedText>
      <ThemedView style={[styles.itinerarioBox, { borderColor: '#0a7ea4', borderWidth: 1 }]}>
        <ThemedView style={styles.inputContainer}>
          <ThemedText type="default">Hora (HH:MM):</ThemedText>
          <TextInput 
            style={styles.input} value={nuevaHora} keyboardType="numeric"
            onChangeText={(text) => setNuevaHora(formatearHora(text))} placeholder="18:00"
          />
        </ThemedView>
        <ThemedView style={styles.inputContainer}>
          <ThemedText type="default">Duración:</ThemedText>
          <TextInput 
            style={styles.input} value={nuevaDuracion} keyboardType="numeric"
            onChangeText={(text) => setNuevaDuracion(formatearDuracion(text))} placeholder="60"
          />
        </ThemedView>
      </ThemedView>

      <TouchableOpacity 
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
        onPress={saveDeviceData} disabled={isSaving}
      >
        {isSaving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>}
      </TouchableOpacity>

      <ThemedText style={styles.ipSmallText}>IP: {ip}</ThemedText>
    </ThemedView>
  );
};

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
    paddingBottom: 35,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
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
  pulsadorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  itinerarioBox: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    position: 'relative',
  },
  actionsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
  },
  actionButton: {
    padding: 5,
    marginLeft: 5,
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
  },
  ipSmallText: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    fontSize: 10,
    color: 'gray',
  }
});