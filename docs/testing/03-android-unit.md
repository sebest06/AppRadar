# Tests Unitarios Android — Kotlin

Tests que corren en la JVM sin necesidad de dispositivo ni emulador. Los tests de `LocationHelperTest` usan Robolectric para simular el entorno Android. Los del ViewModel usan MockK puro para evitar cargar el SDK completo (previene OOM).

**Cómo correrlos:** `./gradlew :app:test`

**Total:** 33 tests en 5 archivos

---

## 3.1 Entidad RaceRunEntity

**Archivo:** `app/src/test/java/com/appradar/data/local/entity/RaceRunEntityTest.kt`

---

**1. Run en progreso tiene flags en false**
Crea una entidad `RaceRunEntity` con valores por defecto y verifica que `isCompleted`, `isAbandoned` y `sos` son todos `false`. Comprueba el estado inicial correcto de una carrera recién creada.

---

**2. Run completado tiene isCompleted en true**
Crea una entidad con `isCompleted = true` y verifica que el flag queda en `true` y que `isAbandoned` permanece en `false`.

---

**3. Run abandonado tiene isAbandoned en true**
Crea una entidad con `isAbandoned = true` y verifica que el flag queda en `true` y que `isCompleted` permanece en `false`.

---

**4. Run con SOS tiene sos en true**
Crea una entidad con `sos = true` y verifica que el flag de emergencia queda correctamente en `true`.

---

**5. Run nuevo no está sincronizado**
Verifica que el valor por defecto de `isSynced` en una nueva entidad es `false`. Los runs nuevos siempre deben intentar sincronizarse con el backend.

---

**6. Método copy actualiza estado de sincronización**
Usa el método `copy()` de la data class para crear una copia con `isSynced = true` y un `sessionUuid` asignado. Verifica que los campos actualizados cambian y que el `runUuid` original permanece igual.

---

**7. Dos runs con el mismo UUID son iguales**
Verifica que dos instancias de `RaceRunEntity` con el mismo `runUuid` son consideradas iguales por el operador de igualdad de la data class.

---

**8. Dos runs con distinto UUID son distintos**
Verifica que dos instancias con `runUuid` diferentes no son iguales.

---

## 3.2 ViewModel de carrera activa

**Archivo:** `app/src/test/java/com/appradar/ui/viewmodel/ActiveTrailViewModelTest.kt`

El ViewModel se instancia directamente con mocks de `Context`, `RadarRepository` y `UserPreferences` usando MockK, sin necesidad de Robolectric.

---

**1. isRaceStarted inicia en false**
Verifica que justo después de crear el ViewModel, el flag `isRaceStarted` en el StateFlow es `false`. La carrera no debe estar iniciada hasta que el usuario la arranque.

---

**2. isPaused inicia en false**
Verifica que el flag de pausa `isPaused` es `false` al iniciar el ViewModel.

---

**3. isSos inicia en false**
Verifica que el flag de emergencia `isSos` es `false` al iniciar el ViewModel.

---

**4. elapsedTimeMillis inicia en cero**
Verifica que el tiempo transcurrido comienza en 0 milisegundos.

---

**5. reachedWaypoints inicia vacío**
Verifica que el conjunto de waypoints alcanzados es un Set vacío al inicio.

---

**6. teammatePositions inicia vacío**
Verifica que la lista de posiciones de compañeros de equipo está vacía al inicio.

---

**7. togglePause sin carrera no cambia el estado**
Llama a `togglePause()` antes de iniciar ninguna carrera. Verifica que `isPaused` sigue en `false` — el botón de pausa no debe tener efecto si no hay carrera activa.

---

**8. loadTrail carga los datos de la ruta**
Configura el mock del repositorio para que devuelva una ruta específica con UUID y nombre. Llama a `loadTrail()` y verifica que el StateFlow `trail` se actualiza con los datos correctos.

---

**9. onLocationUpdate ignorado si la carrera no está iniciada**
Envía una actualización de ubicación con un `Location` mockeado antes de iniciar la carrera. Verifica que el conjunto de waypoints alcanzados permanece vacío — las actualizaciones de GPS no deben procesarse hasta que la carrera esté en curso.

---

## 3.3 Helper de detección de ubicación

**Archivo:** `app/src/test/java/com/appradar/util/LocationHelperTest.kt`

Usa Robolectric para poder usar `android.location.Location` con su implementación real de `distanceTo()`.

---

**1. Mismas coordenadas siempre dentro del radio**
Crea una ubicación en las mismas coordenadas exactas que el waypoint. Verifica que `isWithinWaypointRadius()` devuelve `true` — distancia 0 siempre está dentro de cualquier radio.

---

**2. Ubicación a ~30m detectada en radio de 50m**
Desplaza la ubicación aproximadamente 0.0003 grados al norte (≈33m). Verifica que está dentro del radio por defecto de 50 metros.

---

**3. Ubicación a ~120m no detectada en radio de 50m**
Desplaza la ubicación 0.001 grados al norte (≈111m). Verifica que supera el radio de 50 metros y no es detectada.

---

**4. Radio personalizado de 10m detecta ubicación cercana**
Usa un radio pequeño de 10 metros. Verifica que una ubicación a aproximadamente 5 metros es detectada como dentro del radio.

---

**5. Radio personalizado de 10m rechaza ubicación lejana**
Con radio de 10 metros, verifica que una ubicación a aproximadamente 30 metros no es detectada.

---

**6. Radio grande de 200m acepta ubicaciones distantes**
Con radio de 200 metros, verifica que una ubicación a aproximadamente 111 metros (0.001 grados) sí es detectada.

---

**7. Desplazamiento en longitud también es detectado**
Desplaza la ubicación hacia el este (longitud) en lugar del norte. Verifica que el cálculo de distancia funciona correctamente en la dirección este-oeste.

---

**8. Distancia diagonal lejana queda fuera del radio**
Desplaza la ubicación en diagonal (norte-este simultáneamente). Verifica que la distancia resultante supera el radio de 50 metros y no es detectada.

---

## 3.4 Utilidades de notificación de ranking

**Archivo:** `app/src/test/java/com/appradar/util/RankingNotificationUtilsTest.kt`

Tests de la función `formatGapLine()` que genera el texto de diferencia entre corredores para las notificaciones del sistema. Es lógica pura sin dependencias de Android.

---

**1. Usuario adelante muestra "X WP adelante de"**
Llama a `formatGapLine` con el usuario adelante por 2 waypoints. Verifica que el texto resultante dice "↓ 2 WP adelante de Juan (#2)".

---

**2. Usuario atrás muestra "X WP detrás de"**
Llama a `formatGapLine` con el usuario atrás por 2 waypoints. Verifica que el texto dice "↑ 2 WP detrás de María (#1)".

---

**3. Un waypoint de diferencia formateado correctamente**
Verifica que una diferencia de exactamente 1 waypoint se muestra como "1 WP" (no "1 WPs" u otro formato).

---

**4. Mismo número de waypoints — diferencia en segundos**
Cuando ambos corredores tienen el mismo número de waypoints pero diferentes timestamps de llegada, verifica que se muestra la diferencia en tiempo. Para 45 segundos: "45s sobre Ana (#2)".

---

**5. Gap mayor a un minuto muestra minutos y segundos**
Para una diferencia de 2 minutos y 5 segundos, verifica que el formato es "2m 5s detrás de Luis (#1)".

---

**6. Exactamente un minuto formateado como "1m 0s"**
Verifica que una diferencia de exactamente 60 segundos se muestra como "1m 0s" y no como "60s".

---

**7. Timestamps cero fuerzan comparación por waypoints**
Cuando los timestamps de ambos corredores son 0 (dato no disponible), aunque tengan el mismo número de waypoints, verifica que el mensaje muestra "0 WP" en lugar de un tiempo. Edge case importante para datos incompletos.

---

## 3.5 Utilidades de tiempo

**Archivo:** `app/src/test/java/com/appradar/util/TimeUtilsTest.kt`

Tests de la función `formatElapsedTime()` que convierte milisegundos al formato `HH:MM:SS` para mostrar en la pantalla de carrera activa.

---

**1. Cero milisegundos produce "00:00:00"**
Verifica que 0 ms formatea correctamente como todos ceros.

---

**2. Un segundo produce "00:00:01"**
Verifica que 1000 ms formatea como 1 segundo.

---

**3. Un minuto produce "00:01:00"**
Verifica que 60,000 ms formatea como 1 minuto exacto.

---

**4. Una hora produce "01:00:00"**
Verifica que 3,600,000 ms formatea como 1 hora exacta.

---

**5. Hora, minuto y segundo combinados**
Verifica que 3,661,000 ms (1h 1m 1s) formatea como "01:01:01".

---

**6. Cinco horas y media**
Verifica que 19,800,000 ms (5h 30m) formatea como "05:30:00".

---

**7. 59 segundos no muestra "01:00" incorrecto**
Verifica que 59,000 ms formatea como "00:00:59" y no como "00:01:00", confirmando que el cálculo de minutos es correcto.
