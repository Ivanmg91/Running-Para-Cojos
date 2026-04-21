import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { getRunById, deleteRun } from '../database/db';
import {
  formatDistance,
  formatDuration,
  formatPace,
  regionFromCoordinates,
} from '../utils/calculations';

export default function RunDetailScreen({ route, navigation }) {
  const { runId } = route.params;
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRunById(runId)
      .then(setRun)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [runId]);

  function handleDelete() {
    Alert.alert(
      'Eliminar carrera',
      '¿Seguro que quieres eliminar esta carrera?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteRun(runId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Carrera no encontrada</Text>
      </View>
    );
  }

  const mapRegion = regionFromCoordinates(run.route);
  const formattedDate = new Date(run.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {run.route.length > 1 ? (
        <MapView
          style={styles.map}
          region={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Polyline
            coordinates={run.route}
            strokeColor="#FF6B35"
            strokeWidth={4}
          />
          <Marker
            coordinate={run.route[0]}
            title="Inicio"
            pinColor="#27AE60"
          />
          <Marker
            coordinate={run.route[run.route.length - 1]}
            title="Fin"
            pinColor="#E74C3C"
          />
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Text style={styles.mapPlaceholderText}>Sin datos de ruta</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.dateText}>{formattedDate}</Text>

        <View style={styles.statsGrid}>
          <StatCard label="Distancia" value={formatDistance(run.distance)} icon="📍" />
          <StatCard label="Tiempo" value={formatDuration(run.duration)} icon="⏱" />
          <StatCard label="Ritmo" value={`${formatPace(run.pace)} /km`} icon="⚡" />
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteBtnText}>🗑  Eliminar carrera</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FA',
  },
  errorText: {
    fontSize: 16,
    color: '#888',
  },
  map: {
    width: '100%',
    height: 280,
  },
  mapPlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#888',
  },
  content: {
    padding: 20,
  },
  dateText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E74C3C',
  },
});
