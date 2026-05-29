import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

interface DeviceData {
  id: string;
  name: string | null;
  ip: string;
}

interface DeviceCardProps {
  esp: DeviceData;
  onPressSettings: (ip: string) => void;
}

export default function DeviceCard({ esp, onPressSettings }: DeviceCardProps) {
  return (
    <ThemedView style={styles.deviceCard}>
      <View style={styles.deviceInfo}>
        {/* Contenedor de detalles del dispositivo */}
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
        </View>

        {/* Contenedor del ícono para ajustes */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => onPressSettings(esp.ip)}
        >
          <Ionicons name="settings" size={28} color="#0a7ea4" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  deviceCard: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  deviceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: {
    paddingLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceDetails: {
    flex: 1,
  },
});
