# Running Para Cojos 🏃

App de running para Android construida con **React Native + Expo**.

## Características

- 🗺️ **Mapa con ruta en tiempo real** — traza con GPS la ruta mientras corres
- ⏱ **Temporizador** — duración exacta de la carrera
- ⚡ **Ritmo (pace)** — segundos/km calculados en tiempo real
- 📍 **Distancia** — cálculo mediante fórmula Haversine
- 🔇 **Segundo plano** — continúa grabando la ruta aunque cambies de app (servicio en primer plano de Android)
- 💾 **Almacenamiento local** — carreras guardadas en SQLite en el dispositivo
- 📋 **Historial** — lista de todas las carreras con detalle y mapa de ruta

## Stack tecnológico

| Librería | Uso |
|---|---|
| `expo-location` | GPS foreground + background |
| `expo-task-manager` | Tarea de segundo plano |
| `expo-sqlite` | Base de datos local |
| `react-native-maps` | Mapa y polyline de ruta |
| `@react-navigation/native-stack` | Navegación entre pantallas |

## Estructura del proyecto

```
RunningParaCojos/
├── App.js                          # Navegación + registro de tarea de fondo
├── app.json                        # Config Expo (permisos, plugins)
└── src/
    ├── database/
    │   └── db.js                   # CRUD SQLite
    ├── services/
    │   └── locationTask.js         # Tarea background TaskManager + store GPS
    ├── utils/
    │   └── calculations.js         # Haversine, ritmo, formatos
    └── screens/
        ├── HomeScreen.js           # Listado de carreras
        ├── RunScreen.js            # Carrera activa (mapa + stats + controles)
        └── RunDetailScreen.js      # Detalle y mapa de una carrera guardada
```

## Instalación y uso

### Prerrequisitos
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio o dispositivo Android físico

### 1. Instalar dependencias

```bash
cd RunningParaCojos
npm install
```

### 2. Configurar Google Maps (Android)

Edita `app.json` y sustituye `YOUR_GOOGLE_MAPS_API_KEY` por tu clave de [Google Maps Platform](https://console.cloud.google.com/):

```json
"config": {
  "googleMaps": {
    "apiKey": "TU_CLAVE_AQUÍ"
  }
}
```

### 3. Crear build de desarrollo

```bash
npx expo prebuild --platform android
npx expo run:android
```

> **Nota**: `react-native-maps` y `expo-location` (background) requieren un **development build** — no funcionan completamente en Expo Go.

### 4. Para distribución (APK/AAB)

```bash
npx eas build --platform android --profile preview
```

## Permisos Android requeridos

| Permiso | Motivo |
|---|---|
| `ACCESS_FINE_LOCATION` | GPS preciso |
| `ACCESS_BACKGROUND_LOCATION` | Seguimiento al cambiar de app |
| `FOREGROUND_SERVICE` | Servicio activo en segundo plano |
| `FOREGROUND_SERVICE_LOCATION` | Tipo de servicio de ubicación |

## Notas de diseño

- La tarea de segundo plano (`background-location-task`) se registra con `TaskManager.defineTask` **antes** de renderizar cualquier componente, como exige la API de Expo.
- Se usa un **store a nivel de módulo** (`locationTask.js`) para compartir los puntos GPS entre la tarea de fondo y la pantalla `RunScreen`, ya que ambas corren en el mismo contexto JS en Android.
- El filtro `MIN_POINT_DISTANCE = 3 m` elimina ruido GPS sin afectar la precisión de la ruta.
- Al pausar, se ignoran los puntos recibidos (`isPaused`) pero el servicio de fondo sigue activo para reanudar sin reinicios.
