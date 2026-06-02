import React, { useState } from 'react';
import { View, TextInput, Switch, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform, StatusBar } from 'react-native';
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
    const newData = { ...deviceData };
    if (field === 'hora') {
      newData.itinerario[index].hora = formatearHora(value);
    } else if (field === 'duracion') {
      newData.itinerario[index].duracion = formatearDuracion(value);
    }
    setDeviceData(newData);
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
            const newData = { ...deviceData };
            newData.itinerario.splice(index, 1);
            setDeviceData(newData);
            try {
              const formBody = encodeURIComponent("eliminar") + "=" + encodeURIComponent(index.toString());
              await fetch(`http://${ip}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody,
              });
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const saveDeviceData = async () => {
    setIsSaving(true);
    try {
      let formBody = [];
      // Se envía 'name' en lugar de 'divice'
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
        <ThemedText type="defaultSemiBold">Activador:</ThemedText>
        <Switch 
          value={deviceData.activador} 
          onValueChange={(val) => setDeviceData({...deviceData, activador: val})}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={deviceData.activador ? '#0a7ea4' : '#f4f3f4'}
        />
      </ThemedView>

      <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 15 }]}>Itinerarios</ThemedText>
      {deviceData.itinerario && deviceData.itinerario.map((item: any, index: number) => (
        <ThemedView key={index} style={styles.itinerarioBox}>
          <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarItinerario(index)}>
            <Ionicons name="trash-outline" size={22} color="#ff4444" />
          </TouchableOpacity>
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