import React, { useState } from 'react';
import { StyleSheet, TextInput, Button, View, TouchableOpacity, Text } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

interface WifiConfigFormProps {
  ssid: string;
  setSsid: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
  onSend: () => void;
}

export default function WifiConfigForm({ ssid, setSsid, password, setPassword, onSend }: WifiConfigFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    // Nuevo contenedor padre para centrar y oscurecer el fondo
    <View style={styles.modalOverlay}>
      {/* Combinamos tu stepContainer original con el diseño modalContent */}
      <ThemedView style={[styles.stepContainer, styles.modalContent]}>
        
        <ThemedText type="subtitle" style={styles.title}>
          Enviar configuración WiFi
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Nombre de la red (SSID)"
          placeholderTextColor="#666"
          value={ssid}
          onChangeText={setSsid}
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.inputPassword]}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIconText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tu botón original se mantiene intacto, le agregamos el color del tema anterior */}
        <Button title="Enviar Credenciales" onPress={onSend} color="#0a7ea4" />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- NUEVOS ESTILOS (Fondo oscuro y centrado) ---
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, // Ocupa toda la pantalla flotando
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999, // Asegura que esté por encima de otros elementos
    elevation: 10,
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
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  inputPassword: {
    paddingRight: 60, // Añadido para que el texto de la contraseña no quede debajo del botón "Ver"
  },

  // --- TUS ESTILOS ORIGINALES (Intactos) ---
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    paddingVertical: 10,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
    elevation: 1,
  },
  eyeIconText: {
    fontSize: 14,
    color: '#0a7ea4', // Ajustado sutilmente al color principal del diseño anterior
    fontWeight: 'bold',
  }
});