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
    <ThemedView style={styles.stepContainer}>
      <ThemedText type="subtitle">Enviar configuración WiFi</ThemedText>

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
          style={styles.input}
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

      <Button title="Enviar Credenciales" onPress={onSend} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    color: '#666',
    fontWeight: 'bold',
  }
});