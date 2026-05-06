# AppRadar

**AppRadar** es un proyecto enfocado en crear una aplicación de seguimiento GPS para carreras de trail, permitiendo a los corredores registrar su paso por waypoints de manera offline y sincronizar sus datos con un backend cuando tengan conexión.

## Estructura del Proyecto
- **Android App:** Kotlin + Jetpack Compose + Room (Offline-First).
- **Backend (Próximamente):** REST API para gestionar carreras, waypoints y tracks (posiciones).

## Características Principales
- **Offline-First:** Guarda el progreso en una base de datos local SQLite (usando Room) en zonas sin cobertura.
- **Sincronización Inteligente:** Envía los datos acumulados al backend en segundo plano una vez que la conexión a internet es restaurada.
- **Seguimiento GPS Continuo:** Obtiene la ubicación en tiempo real y la compara con los waypoints pre-descargados de la carrera.
- **Tabla de Posiciones (Leaderboard):** Compara el progreso del corredor con otros participantes de la misma carrera de forma asíncrona.

## Dependencias Clave
- Jetpack Compose (UI)
- Jetpack Navigation (Ruteo)
- Room (Base de Datos Local)
- Retrofit (Cliente HTTP)
- WorkManager (Sincronización en segundo plano)
- Play Services Location (GPS y Geofencing)
