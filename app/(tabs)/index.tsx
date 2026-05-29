import { Image } from 'expo-image';
import { Platform, StyleSheet, Button, PermissionsAndroid, TextInput, Alert, TouchableOpacity, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { encode, decode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const bleManager = new BleManager();

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

interface ESPDevice {
  id: string;
  name: string | null;
  device?: Device;
  ip: string;
}

export default function HomeScreen() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Desconectado');
  const [devices, setDevices] = useState<ESPDevice[]>([]);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadDevices();
    return () => {
      bleManager.destroy();
    };
  }, []);

  useEffect(() => {
    saveDevices(devices);
  }, [devices]);

  const loadDevices = async () => {
    try {
      const storedDevices = await AsyncStorage.getItem('@devices_json');
      if (storedDevices) {
        setDevices(JSON.parse(storedDevices));
      }
    } catch (error) {
    }
  };

  const saveDevices = async (currentDevices: ESPDevice[]) => {
    try {
      const dataToSave = currentDevices.map(({ id, name, ip }) => ({ id, name, ip }));
      await AsyncStorage.setItem('@devices_json', JSON.stringify(dataToSave));
    } catch (error) {
    }
  };

  const requestAndroidPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  };

  const connectToDevice = (device: Device) => {
    setConnectionStatus(`Conectando a ${device.name || device.id}...`);
    device
      .connect()
      .then((connectedDevice) => connectedDevice.discoverAllServicesAndCharacteristics())
      .then((readyDevice) => {
        setDevices((prev) => {
          const exists = prev.find(d => d.id === readyDevice.id);
          if (exists) {
            return prev.map(d => d.id === readyDevice.id ? { ...d, device: readyDevice } : d);
          }
          return [...prev, { id: readyDevice.id, name: readyDevice.name, device: readyDevice, ip: 'Esperando IP...' }];
        });
        setConnectionStatus(`Conectado a ${readyDevice.name || readyDevice.id}`);

        readyDevice.monitorCharacteristicForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          (error, characteristic) => {
            if (error) return;

            if (characteristic?.value) {
              const decodedMessage = decode(characteristic.value);
              if (decodedMessage.startsWith('IP:')) {
                const ipOnly = decodedMessage.substring(3);
                setDevices((prev) =>
                  prev.map((d) =>
                    d.id === readyDevice.id ? { ...d, ip: ipOnly } : d
                  )
                );
                Alert.alert('Conexion exitosa', `Un ESP32 se conecto al WiFi.\nIP: ${ipOnly}`);
              }
            }
          }
        );
      })
      .catch((error) => {
        setConnectionStatus('Error al conectar');
      });
  };

  const scanForNewDevice = async () => {
    const hasPermissions = await requestAndroidPermissions();
    if (!hasPermissions) {
      setConnectionStatus('Faltan permisos');
      return;
    }

    setConnectionStatus('Escaneando nuevo dispositivo...');

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        setConnectionStatus('Error al escanear');
        return;
      }

      if (device?.name === 'ESP32') {
        bleManager.stopDeviceScan();
        connectToDevice(device);
      }
    });
  };

  const sendWiFiCredentials = async () => {
    const connectedDevices = devices.filter(d => d.device);
    if (connectedDevices.length === 0) {
      Alert.alert('Error', 'Primero debes conectarte a por lo menos un ESP32.');
      return;
    }
    if (!ssid || !password) {
      Alert.alert('Datos incompletos', 'Por favor ingresa el nombre de la red y la contrasena.');
      return;
    }

    const payload = `${ssid},${password}`;
    const base64Payload = encode(payload);

    let successCount = 0;

    for (const esp of connectedDevices) {
      try {
        if (esp.device) {
          await esp.device.writeCharacteristicWithResponseForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            base64Payload
          );
          successCount++;
        }
      } catch (error) {
      }
    }

    if (successCount > 0) {
      Alert.alert('Exito', `Credenciales enviadas a ${successCount} dispositivo(s). Esperando IPs...`);
    } else {
      Alert.alert('Error', 'No se pudieron enviar los datos a ningun dispositivo.');
    }
  };

  const deleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Enviar configuracion WiFi</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Nombre de la red (SSID)"
          placeholderTextColor="#666"
          value={ssid}
          onChangeText={setSsid}
        />

        <TextInput
          style={styles.input}
          placeholder="Contrasena"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Enviar Credenciales"
          onPress={sendWiFiCredentials}
          disabled={devices.filter(d => d.device).length === 0}
        />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Dispositivos ESP32</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={scanForNewDevice}>
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText>
          Estado actual: <ThemedText type="defaultSemiBold">{connectionStatus}</ThemedText>
        </ThemedText>

        {devices.map((esp) => (
          <ThemedView key={esp.id} style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
              <View>
                <ThemedText type="defaultSemiBold">ID: {esp.id}</ThemedText>
                <ThemedText>
                  IP: <ThemedText style={{ color: esp.ip.includes('.') ? 'green' : 'gray' }}>{esp.ip}</ThemedText>
                </ThemedText>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteDevice(esp.id)}>
                <ThemedText style={styles.deleteButtonText}>Eliminar</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        ))}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  deviceCard: {
    padding: 12,
    backgroundColor: '#rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#rgba(0,0,0,0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
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
});