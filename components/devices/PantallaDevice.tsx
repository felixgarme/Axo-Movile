import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { SubirImagen } from '@/components/SubirImagen';

const formatearVelocidad = (texto: string) => {
  const numeros = texto.replace(/\D/g, '');
  if (numeros === '') return '';
  const num = parseInt(numeros, 10);
  if (num > 300) return '300';
  if (num < 1) return '1';
  return numeros;
};

// Subcomponente para manejar de forma segura la carga de cada imagen
const Miniatura = ({ ip, nombreArchivo }: { ip: string, nombreArchivo: string }) => {
  const [errorCarga, setErrorCarga] = useState(false);

  const uriImagen = `http://${ip}/${nombreArchivo}`;

  return (
    <View style={styles.thumbItem}>
      {!errorCarga ? (
        <Image 
          source={{ uri: uriImagen }} 
          style={styles.thumbImage} 
          resizeMode="cover"
          onError={() => setErrorCarga(true)} // Si falla al cargar, evitamos que la app colapse
        />
      ) : (
        <View style={[styles.thumbImage, styles.errorThumb]}>
          <Ionicons name="image-outline" size={24} color="#0a7ea4" opacity={0.5} />
          <ThemedText style={styles.errorThumbText} numberOfLines={1} ellipsizeMode="middle">
            {nombreArchivo}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

export const PantallaDevice = ({ ip, initialData, onRefresh }: { ip: string, initialData: any, onRefresh: () => void }) => {
  const [deviceData, setDeviceData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  useEffect(() => {
    setDeviceData(initialData);
  }, [initialData]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      onRefresh();
    }, 150000);

    return () => clearInterval(intervalo);
  }, [onRefresh]);

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

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
      onRefresh();
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la orden de encendido/apagado.');
      setDeviceData((prev: any) => ({ ...prev, activador: !nuevoEstado }));
    }
  };

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
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeAreaContainer}>
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
          
          <ThemedView style={styles.statusBox}>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Reloj interno:</ThemedText>
              <ThemedText type="defaultSemiBold">
                {deviceData.reloj ? deviceData.reloj.split(':').slice(0, 2).join(':') : "--:--"}
              </ThemedText>
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

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => handleToggleReproductor(!deviceData.activador)}
            style={[
              styles.switchBtn, 
              { backgroundColor: deviceData.activador ? '#28a745' : '#6c757d' }
            ]}
          >
            <ThemedText style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>
              {deviceData.activador ? '▶ EN REPRODUCCIÓN' : '⏸ DETENIDO'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.divider} />

          <ThemedText type="subtitle" style={styles.sectionTitle}>Ajustes del Dispositivo</ThemedText>
          
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Nombre asignado:</ThemedText>
            <TextInput 
              style={styles.input}
              value={deviceData.name}
              onChangeText={(t) => setDeviceData({...deviceData, name: t})}
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Velocidad de transición (1 a 300 seg):</ThemedText>
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

          <View style={styles.divider} />

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Diapositivas en memoria ({deviceData.diapositivas?.length || 0})
          </ThemedText>

          {/* Contenedor del Scroll Horizontal con miniaturas seguras */}
          <View style={styles.slidesListContainer}>
            {deviceData.diapositivas && deviceData.diapositivas.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true} 
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {deviceData.diapositivas.map((png: string, index: number) => (
                  <Miniatura key={index} ip={ip} nombreArchivo={png} />
                ))}
              </ScrollView>
            ) : (
              <ThemedText style={styles.emptyText}>No hay imágenes .png guardadas</ThemedText>
            )}
          </View>

          <View style={styles.fileActionsContainer}>
            <TouchableOpacity 
              style={[styles.uploadButton, isUploading && styles.disabledBtn]} 
              onPress={() => setMostrarModal(true)} disabled={isUploading}
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

            <TouchableOpacity style={styles.dangerButton} onPress={formatearMemoria}>
              <Ionicons name="trash" size={18} color="#fff" style={{marginRight: 6}} />
              <ThemedText style={styles.btnText}>Formatear Memoria</ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.ipSmallText}>IP: {ip}</ThemedText>
        </ThemedView>
      </ScrollView>

      <Modal
        visible={mostrarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarModal(false)}
      >
        <SubirImagen 
          ip={ip} 
          onClose={() => setMostrarModal(false)} 
          onSuccess={() => {
            setMostrarModal(false);
            onRefresh();
          }}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    width: '100%',
  },
  dataCard: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    minHeight: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 20,
    width: '100%',
  },
  sectionTitle: { 
    marginBottom: 12, 
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBox: { 
    backgroundColor: 'rgba(0,0,0,0.04)', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15 
  },
  statusRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  statusLabel: { 
    fontSize: 14, 
    opacity: 0.8 
  },
  progressBg: { 
    width: '100%', 
    height: 8, 
    backgroundColor: 'rgba(0,0,0,0.1)', 
    borderRadius: 4, 
    marginTop: 10, 
    overflow: 'hidden' 
  },
  progressBar: { height: '100%' },
  switchBtn: { 
    paddingVertical: 14, 
    borderRadius: 10, 
    width: '100%', 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  inputContainer: { marginBottom: 12 },
  inputLabel: { fontSize: 13, marginBottom: 4, fontWeight: '600' },
  input: { 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.15)', 
    borderRadius: 8, 
    padding: 12, 
    backgroundColor: '#ffffff',
    fontSize: 15
  },
  saveButton: { 
    backgroundColor: '#0a7ea4', 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 5 
  },
  fileActionsContainer: {
    marginTop: 10,
    gap: 12,
  },
  uploadButton: { 
    backgroundColor: '#17a2b8', 
    flexDirection: 'row', 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  dangerButton: { 
    backgroundColor: '#dc3545', 
    flexDirection: 'row', 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  
  // Estilos de la lista horizontal y miniaturas
  slidesListContainer: { 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.1)', 
    borderRadius: 8, 
    marginBottom: 5, 
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden' 
  },
  horizontalScrollContent: { 
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  thumbItem: { 
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { 
    width: 85, 
    height: 85, 
    borderRadius: 8, 
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff'
  },
  errorThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 5
  },
  errorThumbText: {
    fontSize: 10, 
    color: '#666', 
    marginTop: 6,
    textAlign: 'center',
    width: '100%'
  },
  emptyText: { textAlign: 'center', marginVertical: 20, fontStyle: 'italic', opacity: 0.5 },
  ipSmallText: { position: 'absolute', bottom: 10, left: '50%', transform: [{translateX: -20}], fontSize: 11, color: 'gray', opacity: 0.7 }
});