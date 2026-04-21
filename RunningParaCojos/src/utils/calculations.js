/**
 * Haversine formula — distance between two lat/lon points in metres.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Pace in seconds/km. Returns 0 when distance is negligible.
 */
export function calculatePace(distanceMeters, durationSeconds) {
  if (distanceMeters < 10) return 0;
  return durationSeconds / (distanceMeters / 1000);
}

/**
 * Format total seconds as HH:MM:SS or MM:SS.
 */
export function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * Format pace seconds/km as MM:SS /km.
 */
export function formatPace(paceSeconds) {
  if (!paceSeconds || paceSeconds <= 0) return '--:--';
  const m = Math.floor(paceSeconds / 60);
  const s = Math.floor(paceSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format metres as "X.XX km" or "X m".
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Return a region object that fits all coordinates for react-native-maps.
 */
export function regionFromCoordinates(coords) {
  if (!coords || coords.length === 0) {
    return { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  }
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLon = coords[0].longitude;
  let maxLon = coords[0].longitude;
  coords.forEach(({ latitude, longitude }) => {
    if (latitude < minLat) minLat = latitude;
    if (latitude > maxLat) maxLat = latitude;
    if (longitude < minLon) minLon = longitude;
    if (longitude > maxLon) maxLon = longitude;
  });
  const latDelta = Math.max((maxLat - minLat) * 1.4, 0.005);
  const lonDelta = Math.max((maxLon - minLon) * 1.4, 0.005);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
}
