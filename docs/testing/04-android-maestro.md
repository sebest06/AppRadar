# Tests de Integración Android — Maestro

Tests end-to-end que interactúan con la UI real de la app Android instalada en un dispositivo o emulador. Maestro automatiza gestos táctiles y verifica elementos visuales en pantalla. Requieren el backend corriendo y la app instalada.

**Total:** 5 flujos + 1 suite (integración) + 2 flujos legacy

---

## Instalación de Maestro

### Linux / macOS

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Luego reiniciar el terminal o ejecutar:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
```

### Windows

```powershell
iwr get.maestro.mobile.dev/install.ps1 | iex
```

### Verificar instalación

```bash
maestro --version
```

### Requisitos previos

- **Java 11+** instalado (necesario para Maestro). Verificar con `java -version`.
- **ADB** disponible en el PATH (viene con Android Studio o `android-platform-tools`).
- Un emulador corriendo **o** un dispositivo físico con depuración USB activada.
- La app AppRadar instalada en el dispositivo/emulador.
- El backend corriendo (local o en Docker).

### Verificar que el dispositivo está conectado

```bash
adb devices
# Debe mostrar al menos un device/emulator en estado "device"
```

---

## Cómo correr los tests

```bash
# Suite completa (todos los flujos en secuencia)
maestro test tests/android/suites/smoke.yaml -e API_URL=http://10.0.2.2:3000/

# Un flujo individual
maestro test tests/android/flows/01_login.yaml -e API_URL=http://10.0.2.2:3000/

# Con dispositivo físico en red local (reemplazar IP)
maestro test tests/android/suites/smoke.yaml -e API_URL=http://192.168.1.100:3000/
```

> `10.0.2.2` es la IP del host desde el emulador Android. Para dispositivos físicos usar la IP de la máquina en la red local.

---

---

## 4.1 Subflow reutilizable: Login

**Archivo:** `tests/android/subflows/login.yaml`

No es un test independiente sino un bloque reutilizable que los demás flujos invocan. Escribe la URL del backend en el campo de API, el usuario `admin`, la contraseña `1234`, toca el botón de login y espera a que aparezca la pantalla de "Tus Carreras" para confirmar que el login fue exitoso. La URL del backend se parametriza con la variable de entorno `API_URL`.

---

## 4.2 Login exitoso

**Archivo:** `tests/android/flows/01_login.yaml`

Lanza la app y verifica que se muestra la pantalla de "AppRadar Trail". Ejecuta el subflow de login como admin. Verifica que el saludo con "¡Hola" y la lista "Tus Carreras" son visibles, confirmando que el usuario llegó correctamente al home.

---

## 4.3 Login con credenciales incorrectas

**Archivo:** `tests/android/flows/02_login_fallido.yaml`

Verifica dos escenarios de error en el login. Primero toca el botón de login sin rellenar ningún campo y comprueba que aparece "Complete todos los campos". Luego rellena correctamente la URL y el usuario pero ingresa una contraseña incorrecta, toca login y verifica que aparece "Credenciales incorrectas" y que la pantalla de "Tus Carreras" no es visible.

---

## 4.4 Navegación básica desde el home

**Archivo:** `tests/android/flows/03_home.yaml`

Hace login y desde la pantalla principal verifica: que el botón de sincronización está disponible, que navegar a "Historial" muestra la pantalla correspondiente, que navegar a "Configuración" muestra esa pantalla, y que el botón flotante de crear carrera es visible. Prueba el flujo básico de navegación sin iniciar ninguna carrera.

---

## 4.5 Pantalla de configuración y logout

**Archivo:** `tests/android/flows/04_settings.yaml`

Hace login y navega a la pantalla de Configuración. Verifica que aparecen las opciones de ícono de actividad (corredor, bicicleta, auto), selecciona el ícono de bicicleta y verifica que el botón de sincronización con el reloj WearOS está presente. Finalmente hace clic en "Cerrar Sesión" y verifica que la app vuelve a la pantalla de login.

---

## 4.6 Ciclo completo de una carrera

**Archivo:** `tests/android/flows/05_race_start_stop.yaml`

Flujo completo del ciclo de vida de una carrera en la app. Hace login, sincroniza para obtener rutas del servidor, verifica que hay al menos una ruta disponible, abre la primera ruta, inicia la carrera, verifica que aparecen los controles de carrera (pausar, SOS, terminar). Prueba el flujo de pausa y reanudación. Navega al ranking durante la carrera y vuelve. Finalmente termina la carrera y verifica el regreso a la pantalla principal.

---

## 4.7 Suite de smoke: todos los flujos

**Archivo:** `tests/android/suites/smoke.yaml`

Ejecuta todos los flujos de integración en secuencia: login exitoso, login fallido, home, configuración y carrera completa. Un único comando para validar el funcionamiento end-to-end de la app.

---

---

# Tests E2E Legacy — Maestro

Flujos Maestro anteriores a la reestructuración de tests. Aún válidos para verificar flujos básicos.

---

## 5.1 Flujo móvil básico

**Archivo:** `tests/e2e/mobile_flow.yaml`

Lanza la app, hace login como admin y verifica que aparece el saludo. Navega a la vista en vivo de una carrera y verifica que el mapa y el ranking son visibles. Regresa al home, abre configuración y hace logout. Verifica el retorno a la pantalla de login.

---

## 5.2 Flujo de la app WearOS

**Archivo:** `tests/e2e/wear_flow.yaml`

Tests para la app de reloj inteligente (`com.appradar.wear`). Lanza la app del reloj y verifica la pantalla de selección de carrera. Selecciona una carrera de prueba, inicia el cronómetro y verifica que comienza a contar. Prueba el gesto de deslizamiento y el flujo de abandonar carrera con su diálogo de confirmación.
