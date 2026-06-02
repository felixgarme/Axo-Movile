import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View, Image } from "react-native"; // Añadido Image

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

interface DeviceData {
  id: string;
  name: string | null;
  ip: string;
  status?: string;
}

interface DeviceCardProps {
  esp: DeviceData;
  onPressSettings: (ip: string) => void;
}

export default function DeviceCard({ esp, onPressSettings }: DeviceCardProps) {
  const isConnected = esp.status === "Conectado";

  return (
    // Ahora todo el componente es presionable
    <TouchableOpacity
      style={styles.deviceCardPressable}
      onPress={() => onPressSettings(esp.ip)}
      activeOpacity={0.7}
    >
      <ThemedView style={styles.deviceCard}>
        <View style={styles.deviceInfo}>
          
          {/* SECCIÓN IZQUIERDA: Imagen o Icono sin señal */}
          <View style={styles.leftSection}>
            {isConnected ? (
              // Imagen del dispositivo cuando está conectado.
              // Reemplaza 'uri' con la fuente real de tu imagen si la tienes.
              // Usaremos un icono de hardware como marcador de posición.
              <Ionicons name="hardware-chip-outline" size={40} color="#0a7ea4" />
              // Si tuvieras una imagen real: <Image source={{ uri: 'url_de_tu_imagen' }} style={styles.deviceImage} />
            ) : (
              // Icono de "sin señal" cuando está desconectado
              <Ionicons name="cellular-outline" size={40} color="red" />
            )}
          </View>

          {/* Contenedor de detalles del dispositivo (Sección Derecha) */}
          <View style={styles.deviceDetails}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
              {esp.name || "Dispositivo Desconocido"}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: "gray" }}>
              ID: {esp.id}
            </ThemedText>
            <ThemedText>
              IP:{" "}
              <ThemedText
                style={{
                  color: esp.ip.includes(".")
                    ? "green"
                    : esp.ip === "Error de red"
                      ? "red"
                      : "gray",
                }}
              >
                {esp.ip}
              </ThemedText>
            </ThemedText>
            
            {esp.status && (
              <ThemedText style={{ fontSize: 14 }}>
                Estado:{" "}
                <ThemedText
                  style={{
                    color: isConnected ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {esp.status}
                </ThemedText>
              </ThemedText>
            )}
          </View>

          {/* El contenedor del ícono de la tuerca ha sido eliminado */}
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  deviceCardPressable: {
    marginVertical: 4,
  },
  deviceCard: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftSection: {
    width: 60, // Ancho fijo para la sección de la imagen/icono
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12, // Separación con los textos
  },
  deviceDetails: {
    flex: 1,
    gap: 2,
  },
  // Estilo opcional si usas una imagen real
  deviceImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
});