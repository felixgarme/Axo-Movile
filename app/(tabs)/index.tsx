import React, { useState, useEffect, useRef } from 'react';
import { Platform, StyleSheet, PermissionsAndroid, Alert, TouchableOpacity, View } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { encode, decode } from 'base-64';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Network from 'expo-network';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import DeviceCard from '@/components/DeviceCard';
import WifiConfigForm from '@/components/WifiConfigForm';

const bleManager = new BleManager();
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

interface ESPDevice {
  id: string;
  name: string | null;
  device?: Device;
  ip: string;
  status?: string; // <--- Nuevo campo para manejar el estado de conexión
}

const fetchWithTimeout = async (url: string, timeout = 2000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [devices, setDevices] = useState<ESPDevice[]>([]);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  
  // Referencia para saber si estamos en medio de un escaneo de red
  const isScanningNetworkRef = useRef(false);

  const updateDev = (id: string, data: Partial<ESPDevice>) => 
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@devices_json');
        if (stored) setDevices(JSON.parse(stored));
      } catch (e) { console.error(e); }
    })();

    const intervalId = setInterval(() => {
      syncDevicesFromJson();
      updateDeviceNamesFromNetwork();
      checkDeviceConnections(); // <--- Nueva comprobación añadida
    }, 3000);

    return () => { clearInterval(intervalId); bleManager.destroy(); };
  }, []);

  useEffect(() => {
    // Actualizado para guardar también el status
    AsyncStorage.setItem('@devices_json', JSON.stringify(devices.map(({ id, name, ip, status }) => ({ id, name, ip, status }))))
      .catch(console.error);
  }, [devices]);

  const syncDevicesFromJson = async () => {
    try {
      const storedStr = await AsyncStorage.getItem('@devices_json');
      if (!storedStr) return;
      const stored: ESPDevice[] = JSON.parse(storedStr);
      
      setDevices(prev => {
        const isDiff = prev.length !== stored.length || prev.some(p => {
          const s = stored.find(sd => sd.id === p.id);
          return !s || s.ip !== p.ip || s.name !== p.name || s.status !== p.status;
        });
        return isDiff ? stored.map(s => ({ ...s, device: prev.find(d => d.id === s.id)?.device })) : prev;
      });
    } catch (e) { console.error(e); }
  };

  const updateDeviceNamesFromNetwork = () => {
    setDevices(prev => {
      prev.forEach(async (d) => {
        if (!d.ip || d.ip.includes(' Esperando') || d.ip.includes('Error')) return;
        try {
          const res = await fetchWithTimeout(`http://${d.ip}/data`, 1500);
          const dataJson = await res.json();
          if (dataJson && dataJson.name && dataJson.name !== d.name) {
            updateDev(d.id, { name: dataJson.name });
          }
        } catch {}
      });
      return prev;
    });
  };

  // NUEVA FUNCIÓN: Comprueba cada dispositivo para ver si responde con "AXO"
  const checkDeviceConnections = () => {
    if (isScanningNetworkRef.current) return;

    setDevices(prev => {
      prev.forEach(async (d) => {
        if (!d.ip || d.ip.includes('Esperando') || d.ip.includes('Error')) return;
        
        try {
          const res = await fetchWithTimeout(`http://${d.ip}/`, 1500);
          const text = await res.text();
          
          if (text.includes('AXO')) {
            if (d.status !== 'Conectado') updateDev(d.id, { status: 'Conectado' });
          } else {
            if (d.status !== 'Desconectado') updateDev(d.id, { status: 'Desconectado' });
          }
        } catch {
          if (d.status !== 'Desconectado') updateDev(d.id, { status: 'Desconectado' });
        }
      });
      return prev;
    });
  };

  const requestAndroidPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    if ((Platform.Version as number) < 31) {
      return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)) === 'granted';
    }
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return res['android.permission.BLUETOOTH_CONNECT'] === 'granted' && res['android.permission.BLUETOOTH_SCAN'] === 'granted';
  };

  const connectToDevice = async (device: Device): Promise<boolean> => {
    try {
      const isConnected = await device.isConnected();
      let readyDevice = device;

      if (!isConnected) {
        readyDevice = await device.connect();
      }
      
      readyDevice = await readyDevice.discoverAllServicesAndCharacteristics();
      
      setDevices(prev => {
        const exists = prev.find(d => d.id === readyDevice.id);
        const newDev = { id: readyDevice.id, name: readyDevice.name || 'Desconocido', device: readyDevice, ip: 'Esperando IP...' };
        return exists ? prev.map(d => d.id === readyDevice.id ? { ...d, device: readyDevice } : d) : [...prev, newDev];
      });

      readyDevice.monitorCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID, async (err, char) => {
        if (err || !char?.value) return;
        const msg = decode(char.value);

        if (msg.startsWith('IP:')) {
          const ipOnly = msg.substring(3);
          updateDev(readyDevice.id, { ip: ipOnly, status: 'Conectado' }); // Actualizamos el estado al conectar
          Alert.alert('Conexión exitosa', `IP: ${ipOnly}`);
          
          try {
            const res = await fetch(`http://${ipOnly}/data`);
            const data = await res.json();
            if (data && data.name) updateDev(readyDevice.id, { name: data.name });
          } catch {}
        } else if (msg === 'No se pudo conectar' || msg === 'ERROR:WIFI') {
          updateDev(readyDevice.id, { ip: 'Error de red', status: 'Desconectado' });
          Alert.alert('Error de conexión', 'Verifica red y contraseña.');
        } else {
          updateDev(readyDevice.id, { name: msg });
        }
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const checkDeviceOnIp = async (ip: string): Promise<ESPDevice | null> => {
    try {
      const response = await fetchWithTimeout(`http://${ip}/`, 600);
      const text = await response.text();

      if (text.includes('AXO')) {
        const dataResponse = await fetchWithTimeout(`http://${ip}/data`, 2000);
        const dataJson = await dataResponse.json();

        const deviceName = dataJson.name || dataJson.device || 'Desconocido';
        const deviceId = dataJson.device || ip;

        return { id: deviceId, name: deviceName, ip: ip, status: 'Conectado' };
      }
    } catch (error) {
    }
    return null;
  };

  const scanWifiForDevices = async () => {
    isScanningNetworkRef.current = true; // Iniciamos bandera de escaneo

    try {
      const currentIp = await Network.getIpAddressAsync();
      const subnet = currentIp.match(/^(\d+\.\d+\.\d+)\./)?.[1] || '192.168.1';
      
      let foundAny = false;
      const BATCH_SIZE = 50;

      for (let i = 1; i < 255; i += BATCH_SIZE) {
        const promises = [];
        
        for (let j = 0; j < BATCH_SIZE && (i + j) < 255; j++) {
          const targetIp = `${subnet}.${i + j}`;
          if (targetIp !== currentIp) {
            promises.push(checkDeviceOnIp(targetIp));
          }
        }

        const results = await Promise.allSettled(promises);
        
        const batchFound = results
          .filter((r): r is PromiseFulfilledResult<ESPDevice> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value);
        
        if (batchFound.length > 0) {
          foundAny = true;
          setDevices(prev => {
            const newDevs = [...prev];
            batchFound.forEach(fd => {
              const existsIndex = newDevs.findIndex(d => d.id === fd.id || d.ip === fd.ip);
              if (existsIndex >= 0) {
                newDevs[existsIndex] = { ...newDevs[existsIndex], ip: fd.ip, name: fd.name, status: 'Conectado' };
              } else {
                newDevs.push(fd);
              }
            });
            return newDevs;
          });
        }
      }
      
      setConnectionStatus(prev => prev.includes('Bluetooth') ? prev : (foundAny ? 'Búsqueda WiFi completada.' : 'No se encontraron dispositivos WiFi'));
    } catch (error) {
    } finally {
      isScanningNetworkRef.current = false; // Finalizamos bandera de escaneo
    }
  };

  const startSimultaneousScan = async () => {
    if (!(await requestAndroidPermissions())) return setConnectionStatus('Faltan permisos');
    
    setConnectionStatus('Buscando dispositivos (Bluetooth y WiFi)...');

    bleManager.stopDeviceScan();

    try {
      const connectedPeripherals = await bleManager.connectedDevices([SERVICE_UUID]);
      if (connectedPeripherals.length > 0) {
        for (const device of connectedPeripherals) {
          await connectToDevice(device);
        }
      }
    } catch (e) {
      console.error("Error al buscar dispositivos conectados:", e);
    }

    scanWifiForDevices();

    const timeoutScan = setTimeout(() => {
      bleManager.stopDeviceScan();
      setConnectionStatus(prev => prev === 'Buscando dispositivos (Bluetooth y WiFi)...' ? 'Búsqueda finalizada' : prev);
    }, 7000);

    bleManager.startDeviceScan([SERVICE_UUID], null, async (error, device) => {
      if (error) { console.error(error); return; }

      if (device) {
        clearTimeout(timeoutScan);
        bleManager.stopDeviceScan();
        await connectToDevice(device);
        setConnectionStatus(`Conectado a ${device.name || device.id} (Sondeo WiFi en segundo plano)`);
      }
    });
  };

  const sendWiFiCredentials = async () => {
    const connectedDevices = devices.filter(d => d.device);
    if (connectedDevices.length === 0) return Alert.alert('Error', 'Debes conectarte a por lo menos un dispositivo.');
    if (!ssid || !password) return Alert.alert('Datos incompletos', 'Ingresa la red y contraseña.');

    const base64Payload = encode(`${ssid},${password}`);
    let successCount = 0;

    for (const esp of connectedDevices) {
      try {
        if (esp.device) {
          await esp.device.writeCharacteristicWithResponseForService(SERVICE_UUID, CHARACTERISTIC_UUID, base64Payload);
          successCount++;
        }
      } catch (error) { console.error(error); }
    }

    Alert.alert(
      successCount > 0 ? 'Éxito' : 'Error', 
      successCount > 0 ? `Credenciales enviadas a ${successCount} dispositivo(s).` : 'No se pudieron enviar los datos.'
    );
  };

  return (
    <ThemedView style={styles.mainContainer}>
      {devices.some(d => d.device) && (
        <WifiConfigForm ssid={ssid} setSsid={setSsid} password={password} setPassword={setPassword} onSend={sendWiFiCredentials} />
      )}

      <ThemedView style={styles.stepContainer}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Tus Dispositivos</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={startSimultaneousScan}>
            <ThemedText style={styles.addButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText>Estado actual: <ThemedText type="defaultSemiBold">{connectionStatus}</ThemedText></ThemedText>

        {devices.map((esp) => (
          <DeviceCard key={esp.id} esp={esp} onPressSettings={(ipAddress) => router.push({ pathname: '/device', params: { ip: ipAddress, name: esp.name || 'Desconocido' } })} />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 40 },
  stepContainer: { gap: 8, marginBottom: 8, paddingVertical: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addButton: { backgroundColor: '#0a7ea4', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
});