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

Crea un fichero `.env` en `RunningParaCojos/` con tu clave de [Google Maps Platform](https://console.cloud.google.com/):

```bash
cp RunningParaCojos/.env.example RunningParaCojos/.env
# edita RunningParaCojos/.env y pon tu clave real
```

### 3. Crear build de desarrollo

```bash
cd RunningParaCojos
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleDebug
```

> **Nota**: `react-native-maps` y `expo-location` (background) requieren un **development build** — no funcionan completamente en Expo Go.

### 4. Build con Docker (local, sin instalar Android SDK)

```bash
# desde la raíz del repo
docker build -t running-para-cojos-builder .

# genera el APK en ./output/debug/app-debug.apk
docker run --rm \
  -e GOOGLE_MAPS_API_KEY=AIza... \
  -v "$(pwd)/output:/app/RunningParaCojos/android/app/build/outputs/apk" \
  running-para-cojos-builder
```

### 5. Build automático con GitHub Actions

El workflow `.github/workflows/build-apk.yml` se ejecuta automáticamente en cada push. También puedes lanzarlo manualmente desde la pestaña **Actions** de GitHub.

**Secrets requeridos** (añade en `Settings → Secrets and variables → Actions`):

| Secret | Descripción |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Clave de Google Maps Platform |

El APK generado se descarga como **artefacto** del workflow (pestaña Actions → run → Artifacts).

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
