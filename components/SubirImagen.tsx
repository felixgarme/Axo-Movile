import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

export const SubirImagen = ({ ip, onClose, onSuccess }: { ip: string, onClose: () => void, onSuccess: () => void }) => {
  const [archivo, setArchivo] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const seleccionarArchivo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 240, height: 240 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      const fileName = asset.fileName || `diapositiva_${Date.now()}.png`;

      setArchivo({
        uri: manipResult.uri,
        name: fileName.replace(/\.[^/.]+$/, "") + ".png",
        mimeType: 'image/png'
      });
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un problema al procesar la imagen.');
    }
  };

  const confirmarSubida = async () => {
    if (!archivo) return;

    setIsUploading(true);
    const formData = new FormData();
    
    formData.append('diapositiva', {
      uri: archivo.uri,
      name: archivo.name,
      type: archivo.mimeType,
    } as any);

    try {
      const response = await fetch(`http://${ip}/subir`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        Alert.alert('Completado', 'Diapositiva subida correctamente a la memoria.');
        onSuccess();
      } else {
        throw new Error('Error al guardar en SPIFFS');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un problema durante la transmisión del archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.title}>Subir Nueva Diapositiva</Text>
        
        <TouchableOpacity 
          style={styles.selectBtn} 
          onPress={seleccionarArchivo}
          disabled={isUploading}
        >
          <Ionicons name="crop" size={24} color="#0a7ea4" />
          <Text style={styles.selectBtnText}>Recortar y preparar imagen</Text>
        </TouchableOpacity>

        {archivo && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: archivo.uri }} style={styles.imagePreview} />
            <Text style={styles.fileName} numberOfLines={1}>{archivo.name} (240x240)</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.cancelBtn]} 
            onPress={onClose}
            disabled={isUploading}
          >
            <Text style={styles.btnTextDark}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionBtn, 
              styles.uploadBtn, 
              (!archivo || isUploading) && styles.disabledBtn
            ]} 
            onPress={confirmarSubida}
            disabled={!archivo || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnTextLight}>Subir a pantalla</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a7ea4',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(10,126,164,0.05)',
  },
  selectBtnText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  fileName: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e9ecef',
  },
  uploadBtn: {
    backgroundColor: '#0a7ea4',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnTextDark: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnTextLight: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});