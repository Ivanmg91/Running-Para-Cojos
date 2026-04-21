import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK_NAME = 'background-location-task';

/**
 * Module-level store shared between the background task handler and the
 * RunScreen component. Both run in the same JS context on Android (foreground
 * service / Expo managed workflow), so direct mutation is safe.
 */
const store = {
  points: [],
  isPaused: false,
};

export function getLocationStore() {
  return store;
}

export function clearLocationStore() {
  store.points = [];
  store.isPaused = false;
}

export function setLocationPaused(paused) {
  store.isPaused = paused;
}

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('[LocationTask] Error:', error.message);
    return;
  }
  if (data && !store.isPaused) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      locations.forEach((loc) => {
        store.points.push({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        });
      });
    }
  }
});

export async function startLocationTracking() {
  clearLocationStore();
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 3000,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Running Para Cojos',
      notificationBody: 'Registrando tu ruta de carrera…',
      notificationColor: '#FF6B35',
    },
  });
}

export async function stopLocationTracking() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  store.isPaused = false;
}
