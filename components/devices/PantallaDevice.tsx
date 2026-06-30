import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';
// ✅ Importación correcta que soluciona el warning
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

const formatearVelocidad = (texto: string) => {
  const numeros = texto.replace(/\D/g, '');
  if (numeros === '') return '';
  const num = parseInt(numeros, 10);
  if (num > 300) return '300';
  if (num < 1) return '1';
  return numeros;
};

export const PantallaDevice = ({ ip, initialData, onRefresh }: { ip: string, initialData: any, onRefresh: () => void }) => {
  const [deviceData, setDeviceData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Actualizar los datos locales si cambian desde el componente padre
  useEffect(() => {
    setDeviceData(initialData);
  }, [initialData]);

  // RECARGA AUTOMÁTICA CADA 5 SEGUNDOS
  useEffect(() => {
    const intervalo = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(intervalo);
  }, [onRefresh]);

  // FUNCIÓN PARA EL DESLIZAR HACIA ARRIBA (PULL TO REFRESH)
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  // CAMBIO RÁPIDO DE ESTADO (ON / OFF)
  const handleToggleReproductor = async (nuevoEstado: boolean) => {
    setDeviceData((prev: any) => ({ ...prev, activador: nuevoEstado }));

    try {
      let formBody = [];
      formBody.push(encodeURIComponent("device") + "=" + encodeURIComponent(deviceData.device || ""));
      formBody.push(encodeURIComponent("name") + "=" + encodeURIComponent(deviceData.name || ""));
      formBody.push(encodeURIComponent("activador") + "=" + encodeURIComponent(nuevoEstado ? "true" : "false"));
      formBody.push(encodeURIComponent("velocidad") + "=" + encodeURIComponent(deviceData.velocidad?.toString() || "5"));

      const response = await fetch(`http://${ip}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.join("&"),
      });

      if (!response.ok) throw new Error('Respuesta del servidor fallida');
    } catch (error) {
      console.error('Error al cambiar activador:', error);
      Alert.alert('Error', 'No se pudo enviar la orden de encendido/apagado.');
      setDeviceData((prev: any) => ({ ...prev, activador: !nuevoEstado }));
    }
  };

  // GUARDAR AJUSTES GENERALES
  const saveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      let formBody = [];
      formBody.push(encodeURIComponent("device") + "=" + encodeURIComponent(deviceData.device || ""));
      formBody.push(encodeURIComponent("name") + "=" + encodeURIComponent(deviceData.name || ""));
      formBody.push(encodeURIComponent("activador") + "=" + encodeURIComponent(deviceData.activador ? "true" : "false"));
      formBody.push(encodeURIComponent("velocidad") + "=" + encodeURIComponent(deviceData.velocidad?.toString() || "5"));

      const response = await fetch(`http://${ip}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.join("&"),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Ajustes actualizados en el dispositivo AXO.');
        onRefresh();
      } else {
        throw new Error('Respuesta no OK del servidor');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar los ajustes en el ESP32.');
    } finally {
      setIsSaving(false);
    }
  };

  // SUBIR ARCHIVO PNG AL SPIFFS
  const subirImagenPNG = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/png'],
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const file = res.assets[0];

      if (!file.name.toLowerCase().endsWith('.png')) {
        Alert.alert('Formato incorrecto', 'El dispositivo AXO solo admite imágenes .png');
        return;
      }

      setIsUploading(true);
      const formData = new FormData();
      
      formData.append('diapositiva', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'image/png',
      } as any);

      const response = await fetch(`http://${ip}/subir`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        Alert.alert('Completado', 'Diapositiva subida correctamente a la memoria.');
        onRefresh();
      } else {
        throw new Error('Error al guardar en SPIFFS');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un problema durante la transmisión del archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // BORRAR MEMORIA SPIFFS
  const formatearMemoria = () => {
    Alert.alert(
      "⚠️ Formatear Almacenamiento",
      "¿Estás absolutamente seguro de querer eliminar TODAS las imágenes guardadas en el dispositivo AXO?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "ELIMINAR TODO", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`http://${ip}/borrar`, { method: 'POST' });
              if (res.ok) {
                Alert.alert("Memoria limpia", "Se han borrado las diapositivas del dispositivo.");
                onRefresh();
              }
            } catch(e) {
              Alert.alert("Error", "No se pudo formatear la memoria.");
            }
          }
        }
      ]
    );
  };

  const porcentajeAlmacenamiento = deviceData.almacenamiento_porc || 0;
  const textoAlmacenamiento = deviceData.almacenamiento_texto || '-- KB / -- KB';
  const barraPeligro = porcentajeAlmacenamiento > 85;

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handlePullToRefresh}
            colors={['#0a7ea4']}
            tintColor={'#0a7ea4'}
          />
        }
      >
        <ThemedView style={styles.dataCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Pantalla AXO Slideshow</ThemedText>
          
          {/* MONITOREO DE SISTEMA */}
          <ThemedView style={styles.statusBox}>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Reloj interno:</ThemedText>
              <ThemedText type="defaultSemiBold">{deviceData.reloj || "--:--:--"}</ThemedText>
            </View>

            <View style={[styles.statusRow, { marginTop: 8 }]}>
              <ThemedText style={styles.statusLabel}>Almacenamiento SPIFFS:</ThemedText>
              <ThemedText style={{ fontWeight: 'bold', color: barraPeligro ? '#dc3545' : '#0a7ea4' }}>
                {textoAlmacenamiento} ({porcentajeAlmacenamiento}%)
              </ThemedText>
            </View>

            <View style={styles.progressBg}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${porcentajeAlmacenamiento}%`,
                  backgroundColor: barraPeligro ? '#dc3545' : '#0a7ea4'
                }
              ]} />
            </View>
          </ThemedView>

          {/* FORMULARIO DE PARAMETROS */}
          <ThemedView style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold">Código Device:</ThemedText>
            <TextInput 
              style={styles.input}
              value={deviceData.device}
              onChangeText={(t) => setDeviceData({...deviceData, device: t})}
              placeholder="Ej: AXO-001"
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold">Nombre asignado:</ThemedText>
            <TextInput 
              style={styles.input}
              value={deviceData.name}
              onChangeText={(t) => setDeviceData({...deviceData, name: t})}
            />
          </ThemedView>

          <ThemedView style={styles.row}>
            <ThemedText type="defaultSemiBold">Estado de Reproducción:</ThemedText>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => handleToggleReproductor(!deviceData.activador)}
              style={[
                styles.switchBtn, 
                { backgroundColor: deviceData.activador ? '#28a745' : '#6c757d' }
              ]}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
                {deviceData.activador ? '▶ EN REPRODUCCIÓN' : '⏸ DETENIDO'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold">Velocidad de transición (1 a 300 seg):</ThemedText>
            <TextInput 
              style={styles.input}
              keyboardType="numeric"
              value={deviceData.velocidad?.toString()}
              onChangeText={(t) => setDeviceData({...deviceData, velocidad: formatearVelocidad(t)})}
              placeholder="5"
            />
          </ThemedView>

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.disabledBtn]} 
            onPress={saveGeneralSettings} disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.btnText}>Aplicar Ajustes Generales</ThemedText>}
          </TouchableOpacity>

          {/* LISTADO DE DIAPOSITIVAS */}
          <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 25 }]}>
            Diapositivas en memoria ({deviceData.diapositivas?.length || 0})
          </ThemedText>

          <View style={styles.slidesContainer}>
            {deviceData.diapositivas && deviceData.diapositivas.length > 0 ? (
              deviceData.diapositivas.map((png: string, index: number) => (
                <ThemedView key={index} style={styles.slideItem}>
                  <Ionicons name="image-outline" size={18} color="#0a7ea4" />
                  <ThemedText style={styles.slideName} numberOfLines={1}>{png}</ThemedText>
                </ThemedView>
              ))
            ) : (
              <ThemedText style={styles.emptyText}>No hay imágenes .png guardadas</ThemedText>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.uploadButton, isUploading && styles.disabledBtn]} 
            onPress={subirImagenPNG} disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                <ThemedText style={styles.btnText}>Subir Diapositiva (.png)</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {/* ZONA DE PELIGRO */}
          <TouchableOpacity style={styles.dangerButton} onPress={formatearMemoria}>
            <Ionicons name="trash" size={18} color="#fff" style={{marginRight: 6}} />
            <ThemedText style={styles.btnText}>FORMATEAR TODAS LAS IMÁGENES</ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.ipSmallText}>IP: {ip}</ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1, // Asegura que el SafeAreaView ocupe todo el espacio disponible
  },
  scrollContainer: {
    flexGrow: 1,
    width: '100%',
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
  sectionTitle: { marginBottom: 15, textAlign: 'center' },
  statusBox: { backgroundColor: 'rgba(0,0,0,0.04)', padding: 12, borderRadius: 8, marginBottom: 18 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 13, opacity: 0.7 },
  progressBg: { width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressBar: { height: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  inputContainer: { marginBottom: 15 },
  input: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.8)' },
  switchBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  saveButton: { backgroundColor: '#0a7ea4', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  uploadButton: { backgroundColor: '#17a2b8', flexDirection: 'row', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  dangerButton: { backgroundColor: '#dc3545', flexDirection: 'row', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  slidesContainer: { maxHeight: 160, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 8, padding: 8, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.4)' },
  slideItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  slideName: { marginLeft: 8, fontSize: 13, flex: 1 },
  emptyText: { textAlign: 'center', marginVertical: 15, fontStyle: 'italic', opacity: 0.5 },
  ipSmallText: { position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: 'gray' }
});