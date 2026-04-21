import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  startLocationTracking,
  stopLocationTracking,
  getLocationStore,
  setLocationPaused,
  clearLocationStore,
} from '../services/locationTask';
import { saveRun } from '../database/db';
import {
  haversineDistance,
  calculatePace,
  formatDistance,
  formatDuration,
  formatPace,
  regionFromCoordinates,
} from '../utils/calculations';

const MIN_POINT_DISTANCE = 3; // meters — filter GPS noise

export default function RunScreen({ navigation }) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [coordinates, setCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const elapsedRef = useRef(0);
  const coordinatesRef = useRef([]);
  const distanceRef = useRef(0);
  const lastProcessedIndexRef = useRef(0);

  const mapRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Request permissions and get initial location
  useEffect(() => {
    (async () => {
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu ubicación para trazar la ruta.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') {
        Alert.alert(
          'Permiso de segundo plano',
          'Para un seguimiento continuo te recomendamos conceder el permiso "Siempre". Puedes seguir usando la app pero la ruta puede perderse si cambias de app.',
          [{ text: 'Entendido' }]
        );
      }
      setPermissionGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        // Location not available yet — map shows default region
        console.warn('[RunScreen] Could not get initial location:', err.message);
      }
    })();
  }, [navigation]);

  // Handle app going background / foreground during an active run
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        appStateRef.current === 'background' ||
        appStateRef.current === 'inactive';
      const nowForeground = nextState === 'active';

      if (wasBackground && nowForeground && isRunning) {
        // Sync any points collected by the background task
        processNewPoints();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimerAndPoll();
      stopLocationTracking().catch((err) =>
        console.warn('[RunScreen] Error stopping location tracking on unmount:', err.message)
      );
    };
  }, []);

  function startTimerAndPoll() {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
      processNewPoints();
    }, 1000);
  }

  function stopTimerAndPoll() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  const processNewPoints = useCallback(() => {
    const store = getLocationStore();
    const points = store.points;
    const startIdx = lastProcessedIndexRef.current;

    if (points.length <= startIdx) return;

    const newPoints = points.slice(startIdx);
    const allCoords = [...coordinatesRef.current];

    newPoints.forEach((point) => {
      const coord = { latitude: point.latitude, longitude: point.longitude };
      if (allCoords.length > 0) {
        const prev = allCoords[allCoords.length - 1];
        const d = haversineDistance(
          prev.latitude, prev.longitude,
          coord.latitude, coord.longitude
        );
        if (d >= MIN_POINT_DISTANCE) {
          distanceRef.current += d;
          allCoords.push(coord);
        }
      } else {
        allCoords.push(coord);
      }
    });

    coordinatesRef.current = allCoords;
    lastProcessedIndexRef.current = points.length;

    const pace = calculatePace(distanceRef.current, elapsedRef.current);

    setCoordinates([...allCoords]);
    setDistance(distanceRef.current);
    setPace(pace);

    // Follow the last point on the map
    if (allCoords.length > 0 && mapRef.current) {
      const last = allCoords[allCoords.length - 1];
      mapRef.current.animateToRegion(
        { ...last, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        500
      );
    }
  }, []);

  async function handleStart() {
    if (!permissionGranted) return;
    try {
      await startLocationTracking();
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar el seguimiento de ubicación: ' + e.message);
      return;
    }
    setHasStarted(true);
    setIsRunning(true);
    startTimerAndPoll();
  }

  function handlePause() {
    setLocationPaused(true);
    setIsRunning(false);
    stopTimerAndPoll();
  }

  async function handleResume() {
    setLocationPaused(false);
    setIsRunning(true);
    startTimerAndPoll();
  }

  async function handleStop() {
    Alert.alert(
      'Finalizar carrera',
      '¿Quieres guardar y finalizar la carrera?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar y guardar',
          onPress: async () => {
            stopTimerAndPoll();
            await stopLocationTracking();
            setIsRunning(false);
            processNewPoints();
            await saveCurrentRun();
          },
        },
      ]
    );
  }

  async function saveCurrentRun() {
    if (distanceRef.current < 10) {
      Alert.alert(
        'Carrera muy corta',
        'La distancia registrada es menor de 10 m. No se guardará.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
      clearLocationStore();
      return;
    }
    setIsSaving(true);
    const finalPace = calculatePace(distanceRef.current, elapsedRef.current);
    try {
      await saveRun({
        date: new Date().toISOString(),
        duration: elapsedRef.current,
        distance: distanceRef.current,
        pace: finalPace,
        route: coordinatesRef.current,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la carrera: ' + e.message);
    } finally {
      setIsSaving(false);
      clearLocationStore();
      navigation.navigate('Home');
    }
  }

  const initialRegion = currentLocation
    ? { ...currentLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 }
    : { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={false}
      >
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#FF6B35"
            strokeWidth={4}
          />
        )}
        {coordinates.length > 0 && (
          <Marker
            coordinate={coordinates[0]}
            title="Inicio"
            pinColor="#27AE60"
          />
        )}
      </MapView>

      {/* Stats overlay */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatBox
            label="Distancia"
            value={formatDistance(distance)}
            accent={false}
          />
          <StatBox
            label="Tiempo"
            value={formatDuration(elapsedSeconds)}
            accent
          />
          <StatBox
            label="Ritmo"
            value={`${formatPace(pace)}`}
            sub="/km"
            accent={false}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!hasStarted && (
          <TouchableOpacity
            style={[styles.btn, styles.btnStart]}
            onPress={handleStart}
            disabled={!permissionGranted}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>▶  Iniciar</Text>
          </TouchableOpacity>
        )}

        {hasStarted && !isSaving && (
          <View style={styles.activeControls}>
            {isRunning ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnPause]}
                onPress={handlePause}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>⏸  Pausa</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.btnStart]}
                onPress={handleResume}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>▶  Continuar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnStop]}
              onPress={handleStop}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>⏹  Finalizar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isSaving && (
          <View style={[styles.btn, styles.btnDisabled]}>
            <Text style={styles.btnText}>Guardando…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function StatBox({ label, value, sub, accent }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  map: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    minWidth: 90,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
  },
  statValueAccent: {
    color: '#FF6B35',
    fontSize: 26,
  },
  statSub: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  btnStart: {
    backgroundColor: '#FF6B35',
  },
  btnPause: {
    backgroundColor: '#F39C12',
  },
  btnStop: {
    backgroundColor: '#E74C3C',
  },
  btnDisabled: {
    backgroundColor: '#CCC',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
