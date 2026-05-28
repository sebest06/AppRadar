# Tests de integración Android — Maestro

Tests end-to-end para la app Android usando [Maestro](https://maestro.mobile.dev/).
Maestro interactúa con la UI real de la app instalada en un dispositivo o emulador.

## Requisitos

1. **Maestro CLI instalado**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   # Agregar al PATH: export PATH="$PATH:$HOME/.maestro/bin"
   maestro --version
   ```

2. **Dispositivo o emulador Android conectado**
   ```bash
   adb devices   # debe listar al menos un dispositivo
   ```

3. **App instalada** (build debug)
   ```bash
   # Desde la raíz del repo
   ./gradlew :app:installDebug
   ```

4. **Backend corriendo** y accesible desde el dispositivo
   ```bash
   cd backend && node server.js
   # En el emulador: http://10.0.2.2:3000/
   # En dispositivo físico: http://192.168.x.x:3000/ (misma red WiFi)
   ```

---

## Estructura

```
tests/android/
├── subflows/
│   └── login.yaml              # Subflow reutilizable: login como admin
├── flows/
│   ├── 01_login.yaml           # Login exitoso
│   ├── 02_login_fallido.yaml   # Login con error (campos vacíos, creds incorrectas)
│   ├── 03_home.yaml            # Pantalla home y navegación
│   ├── 04_settings.yaml        # Configuración e ícono, logout
│   └── 05_race_start_stop.yaml # Iniciar, pausar, reanudar y terminar carrera
└── suites/
    └── smoke.yaml              # Ejecuta todos los flujos
```

---

## Cómo correr

### Un solo flujo

```bash
# Desde la raíz del repo
maestro test tests/android/flows/01_login.yaml \
  -e API_URL=http://10.0.2.2:3000/
```

### Suite completa

```bash
maestro test tests/android/suites/smoke.yaml \
  -e API_URL=http://10.0.2.2:3000/
```

### Con reporte HTML

```bash
maestro test tests/android/suites/smoke.yaml \
  -e API_URL=http://10.0.2.2:3000/ \
  --format html \
  --output report.html
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo emulador | Ejemplo físico |
|----------|-------------|------------------|----------------|
| `API_URL` | URL del backend **con barra al final** | `http://10.0.2.2:3000/` | `http://192.168.1.50:3000/` |

---

## Prerequisitos de datos

El flujo `05_race_start_stop.yaml` requiere que exista al menos una carrera
en el backend. Podés crear una vía el frontend web o con la API:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","passw":"1234"}' | jq -r .token)

curl -s -X POST http://localhost:3000/trails \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Carrera Test Maestro",
    "description":"Para tests E2E",
    "distanceKm":5,
    "elevationM":200,
    "maxSkip":1,
    "waypoints":[
      {"order":0,"name":"Inicio","lat":-34.6037,"lon":-58.3816,"radius":50},
      {"order":1,"name":"Meta","lat":-34.6100,"lon":-58.3900,"radius":50}
    ]
  }'
```

---

## Por qué Maestro y no Robot Framework

- **Maestro** está diseñado para mobile: sintaxis YAML simple, sin servidor externo, detecta elementos Compose automáticamente
- **Robot Framework + Appium** requiere servidor Appium corriendo, Python + librerías, y configuración de capabilities por dispositivo — mucho más setup para el mismo resultado
- El `Dockerfile` del proyecto ya incluye Maestro CLI
