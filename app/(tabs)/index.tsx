import { Image } from 'expo-image';
import { Platform, StyleSheet, Button, PermissionsAndroid, TextInput, Alert, TouchableOpacity, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { encode, decode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<string>('Desconectado');
  const [devices, setDevices] = useState<ESPDevice[]>([]);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadDevices();

    // Actualizar desde el JSON cada 2 segundos
    const intervalId = setInterval(() => {
      syncDevicesFromJson();
    }, 2000);

    return () => {
      clearInterval(intervalId); // Limpiar el intervalo al desmontar
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
      console.error('Error al cargar dispositivos', error);
    }
  };

  // Función para sincronizar sin perder las conexiones Bluetooth activas
  const syncDevicesFromJson = async () => {
    try {
      const storedDevicesStr = await AsyncStorage.getItem('@devices_json');
      if (storedDevicesStr) {
        const storedDevices: ESPDevice[] = JSON.parse(storedDevicesStr);
        
        setDevices(prevDevices => {
          // Comprobar si hay alguna diferencia real (como una eliminación desde otra pantalla)
          const isDifferent = 
            prevDevices.length !== storedDevices.length ||
            prevDevices.some(p => {
              const s = storedDevices.find(sd => sd.id === p.id);
              return !s || s.ip !== p.ip || s.name !== p.name;
            });

          // Si no hay cambios, devolvemos el mismo estado para evitar renderizados infinitos
          if (!isDifferent) {
            return prevDevices;
          }

          // Si hay cambios (ej. se borró un dispositivo), cruzamos los datos nuevos con los anteriores
          // para NO perder la propiedad 'device' que contiene la conexión Bluetooth
          return storedDevices.map(stored => {
            const existing = prevDevices.find(d => d.id === stored.id);
            return existing ? { ...stored, device: existing.device } : stored;
          });
        });
      }
    } catch (error) {
      console.error('Error sincronizando dispositivos', error);
    }
  };

  const saveDevices = async (currentDevices: ESPDevice[]) => {
    try {
      const dataToSave = currentDevices.map(({ id, name, ip }) => ({ id, name, ip }));
      await AsyncStorage.setItem('@devices_json', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error al guardar dispositivos', error);
    }
  };

  const requestAndroidPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      if (typeof apiLevel === 'number' && apiLevel < 31) {
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
          return [...prev, { id: readyDevice.id, name: readyDevice.name || 'Desconocido', device: readyDevice, ip: 'Esperando IP...' }];
        });
        setConnectionStatus(`Conectado a ${readyDevice.name || readyDevice.id}`);

        readyDevice.monitorCharacteristicForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          (error, characteristic) => {
            if (error) {
              console.error('Error al monitorear:', error);
              return;
            }

            if (characteristic?.value) {
              const decodedMessage = decode(characteristic.value);
              
              if (decodedMessage.startsWith('IP:')) {
                // Si el mensaje es la IP
                const ipOnly = decodedMessage.substring(3);
                setDevices((prev) =>
                  prev.map((d) =>
                    d.id === readyDevice.id ? { ...d, ip: ipOnly } : d
                  )
                );
                Alert.alert('Conexión exitosa', `El dispositivo se conectó al WiFi.\nIP: ${ipOnly}`);
              } else if (decodedMessage === 'ERROR:WIFI') {
                // Nueva funcionalidad: Manejo de error de contraseña o conexión WiFi
                setDevices((prev) =>
                  prev.map((d) =>
                    d.id === readyDevice.id ? { ...d, ip: 'Error de red' } : d
                  )
                );
                Alert.alert('Error de conexión', 'No se pudo conectar al WiFi. Verifica que el nombre de la red y la contraseña sean correctos.');
              } else {
                // Si no empieza con IP ni es error, asumimos que es el modelo del dispositivo enviado al conectarse
                setDevices((prev) =>
                  prev.map((d) =>
                    d.id === readyDevice.id ? { ...d, name: decodedMessage } : d
                  )
                );
              }
            }
          }
        );
      })
      .catch((error) => {
        setConnectionStatus('Error al conectar');
        console.error('Error de conexión:', error);
      });
  };

  const scanForNewDevice = async () => {
      const hasPermissions = await requestAndroidPermissions();
      if (!hasPermissions) {
        setConnectionStatus('Faltan permisos');
        return;
      }

      setConnectionStatus('Escaneando nuevo dispositivo...');

      // Filtramos por el SERVICE_UUID en lugar del nombre del dispositivo
      bleManager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.error("Error detallado:", error);
          setConnectionStatus(`Error: ${error.message}`);
          return;
        }

        // Si detecta un dispositivo con nuestro UUID de servicio
        if (device) {
          bleManager.stopDeviceScan();
          connectToDevice(device);
        }
      });
    };

  const sendWiFiCredentials = async () => {
    const connectedDevices = devices.filter(d => d.device);
    if (connectedDevices.length === 0) {
      Alert.alert('Error', 'Primero debes conectarte a por lo menos un dispositivo.');
      return;
    }
    if (!ssid || !password) {
      Alert.alert('Datos incompletos', 'Por favor ingresa el nombre de la red y la contraseña.');
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
        console.error('Error al enviar credenciales', error);
      }
    }

    if (successCount > 0) {
      Alert.alert('Éxito', `Credenciales enviadas a ${successCount} dispositivo(s). Esperando IPs...`);
    } else {
      Alert.alert('Error', 'No se pudieron enviar los datos a ningún dispositivo.');
    }
  };

  const deleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const navigateToDevise = (ipAddress: string) => {
    router.push({
      pathname: '/devise',
      params: { ip: ipAddress }
    });
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
      
      {devices.some(d => d.device) && (
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Enviar configuración WiFi</ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Nombre de la red (SSID)"
            placeholderTextColor="#666"
            value={ssid}
            onChangeText={setSsid}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Enviar Credenciales"
            onPress={sendWiFiCredentials}
          />
        </ThemedView>
      )}

      <ThemedView style={styles.stepContainer}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Tus Dispositivos</ThemedText>
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
              
              {/* Contenedor de detalles del dispositivo (Movido a la izquierda) */}
              <View style={styles.deviceDetails}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                  {esp.name || 'Dispositivo Desconocido'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: 'gray' }}>ID: {esp.id}</ThemedText>
                <ThemedText>
                  IP: <ThemedText style={{ color: esp.ip.includes('.') ? 'green' : (esp.ip === 'Error de red' ? 'red' : 'gray') }}>{esp.ip}</ThemedText>
                </ThemedText>
              </View>

              {/* Contenedor del ícono (Movido a la derecha y cambiado a "settings") */}
              <TouchableOpacity style={styles.iconContainer} onPress={() => navigateToDevise(esp.ip)}>
                <Ionicons name="settings" size={28} color="#0a7ea4" />
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    paddingLeft: 10, // Cambiado de paddingRight a paddingLeft para dar espacio a la izquierda
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceDetails: {
    flex: 1,
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