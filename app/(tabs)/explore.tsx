import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

interface CronogramaItem {
  id: string;
  hora: string;
  duracion: string;
}

export default function TabTwoScreen() {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [duration, setDuration] = useState('');
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);

  // Función para añadir la configuración actual a la lista
  const handleAgregarCronograma = () => {
    const h = hours.padStart(2, '0') || '00';
    const m = minutes.padStart(2, '0') || '00';
    const d = duration || '0';

    const nuevoItem: CronogramaItem = {
      id: Date.now().toString(),
      hora: `${h}:${m}`,
      duracion: d,
    };

    setCronograma([...cronograma, nuevoItem]);
    
    // Limpiar casillas tras agregar
    setHours('');
    setMinutes('');
    setDuration('');
  };

  // Función del botón pulsador principal
  const handleActivarSistema = () => {
    if (cronograma.length === 0) {
      alert('⚠️ El cronograma está vacío. Agrega al menos un horario.');
      return;
    }
    alert(`🚀 ¡Sistema Activado con ${cronograma.length} eventos programados!`);
  };

  // Eliminar un elemento del cronograma
  const eliminarItem = (id: string) => {
    setCronograma(cronograma.filter(item => item.id !== id));
  };

  // Validaciones para las entradas de texto
  const handleHoursChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!text || (num >= 0 && num <= 23)) {
      setHours(text.replace(/[^0-9]/g, '').slice(0, 2));
    }
  };

  const handleMinutesChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!text || (num >= 0 && num <= 59)) {
      setMinutes(text.replace(/[^0-9]/g, '').slice(0, 2));
    }
  };

  const handleDurationChange = (text: string) => {
    setDuration(text.replace(/[^0-9]/g, '').slice(0, 3));
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Cabecera limpia sin Parallax */}
        <View style={styles.header}>
          <IconSymbol size={42} color="#007AFF" name="calendar.badge.clock" />
          <ThemedText type="title" style={[styles.title, { fontFamily: Fonts.rounded }]}>
            Planificador
          </ThemedText>
        </View>

        <ThemedText style={styles.subtitle}>
          Configura las horas de ejecución y arma tu cronograma.
        </ThemedText>

        {/* Contenedor Principal de Inputs */}
        <View style={styles.mainInputsContainer}>
          
          {/* Bloque de Hora de Inicio */}
          <View style={styles.sectionBlock}>
            <ThemedText style={styles.sectionTitle}>Inicio</ThemedText>
            <View style={styles.timePickerContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="00"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={hours}
                  onChangeText={handleHoursChange}
                />
                <ThemedText style={styles.inputLabel}>HH</ThemedText>
              </View>

              <ThemedText style={styles.separator}>:</ThemedText>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.timeInput}
                  placeholder="00"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={minutes}
                  onChangeText={handleMinutesChange}
                />
                <ThemedText style={styles.inputLabel}>MM</ThemedText>
              </View>
            </View>
          </View>

          {/* Divisor Vertical */}
          <View style={styles.verticalDivider} />

          {/* Bloque de Duración */}
          <View style={styles.sectionBlock}>
            <ThemedText style={styles.sectionTitle}>Duración</ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.timeInput, styles.durationInput]}
                placeholder="0"
                placeholderTextColor="#A0A0A0"
                keyboardType="number-pad"
                maxLength={3}
                value={duration}
                onChangeText={handleDurationChange}
              />
              <ThemedText style={styles.inputLabel}>Minutos</ThemedText>
            </View>
          </View>
        </View>

        {/* Botón 1: Agregar al Cronograma */}
        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.8}
          onPress={handleAgregarCronograma}
        >
          <IconSymbol size={18} color="#007AFF" name="plus.circle.fill" />
          <ThemedText style={styles.addButtonText}>Agregar al Cronograma</ThemedText>
        </TouchableOpacity>

        {/* Lista del Cronograma Visual */}
        <View style={styles.cronogramaContainer}>
          <ThemedText style={styles.cronogramaHeaderTitle}>Horarios Agregados</ThemedText>
          {cronograma.length === 0 ? (
            <ThemedText style={styles.emptyText}>No hay horarios programados aún.</ThemedText>
          ) : (
            cronograma.map((item) => (
              <View key={item.id} style={styles.cronogramaCard}>
                <View style={styles.cronogramaInfo}>
                  <IconSymbol size={20} color="#8E8E93" name="clock.fill" />
                  <ThemedText style={styles.cronogramaTime}>{item.item !== undefined ? '' : item.hora}</ThemedText>
                  <ThemedText style={styles.cronogramaDuration}>({item.duracion} min)</ThemedText>
                </View>
                <TouchableOpacity onPress={() => eliminarItem(item.id)} hitSlop={10}>
                  <IconSymbol size={20} color="#FF3B30" name="trash.fill" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Botón Pulsador Principal 2: ACTIVAR */}
        <View style={styles.activateButtonContainer}>
          <TouchableOpacity 
            style={styles.activateButton} 
            activeOpacity={0.7}
            onPress={handleActivarSistema}
          >
            <ThemedText style={styles.activateButtonText}>ACTIVAR</ThemedText>
            <IconSymbol size={22} color="#FFFFFF" name="power" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 25,
  },
  mainInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(128, 128, 128, 0.06)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: 16,
  },
  sectionBlock: {
    flex: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputWrapper: {
    alignItems: 'center',
  },
  timeInput: {
    backgroundColor: '#F2F2F7',
    color: '#1C1C1E',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  durationInput: {
    width: 80,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
  },
  inputLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.5,
  },
  separator: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8E8E93',
    bottom: 8,
  },
  verticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    marginHorizontal: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    marginBottom: 30,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cronogramaContainer: {
    marginBottom: 35,
  },
  cronogramaHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.4,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  cronogramaCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128, 128, 128, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.08)',
  },
  cronogramaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cronogramaTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  cronogramaDuration: {
    fontSize: 14,
    opacity: 0.5,
  },
  activateButtonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  activateButton: {
    backgroundColor: '#34C759', // Verde éxito moderno para activación masiva
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 24, 
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
}); 