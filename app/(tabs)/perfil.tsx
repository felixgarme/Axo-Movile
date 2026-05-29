import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

// CAMBIO 1: El nombre de la función ahora es PerfilScreen (o ProfileScreen)
export default function PerfilScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#882222' }}
      headerImage={
        // CAMBIO 2: Cambiamos el ícono gigante del banner por uno de usuario ("person.fill")
        <IconSymbol
          size={310}
          color="#fff"
          name="person.fill"
          style={styles.headerImage}
        />
      }>
      
      {/* Título Principal */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Mi Perfil
        </ThemedText>
      </ThemedView>
      
      <ThemedText>¡Bienvenido a tu nueva pestaña personalizada!</ThemedText>

      {/* Sección Desplegable 1 */}
      <Collapsible title="Información del Usuario">
        <ThemedText>
          Aquí puedes empezar a maquetar los datos del usuario, configuraciones o detalles de la cuenta.
        </ThemedText>
      </Collapsible>

      {/* Sección Desplegable 2 */}
      <Collapsible title="Configuración de la cuenta">
        <ThemedText>
          Esta pantalla utiliza los mismos componentes nativos del template (`ThemedText`, `ThemedView`) para que herede automáticamente el Modo Oscuro y Claro.
        </ThemedText>
        <ExternalLink href="https://reactnative.dev">
          <ThemedText type="link">Visitar documentación de React Native</ThemedText>
        </ExternalLink>
      </Collapsible>

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#ffffff',
    opacity: 0.4, // Un poco de transparencia para el ícono de fondo
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});