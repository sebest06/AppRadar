#!/bin/bash

# --- Configuración ---
API_URL="http://localhost:3000"
TRAIL_UUID=$1

# Lista de credenciales de prueba (Usuario:Password)
RUNNERS=("seba:123456" "pepe:123456" "mel:123456")

if [ -z "$TRAIL_UUID" ]; then
    echo "Error: Debes especificar el UUID de la carrera."
    echo "Uso: ./simulate_race.sh <TRAIL_UUID>"
    exit 1
fi

# Verificar dependencias
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' no está instalado. Es necesario para procesar JSON."
    exit 1
fi

# 1. Obtener waypoints de la API
echo "📡 Obteniendo waypoints de la carrera..."
TRAIL_DATA=$(curl -s "$API_URL/trails/$TRAIL_UUID/details")
WAYPOINTS=$(echo "$TRAIL_DATA" | jq -c '.waypoints | sort_by(.order)')

if [ -z "$WAYPOINTS" ] || [ "$WAYPOINTS" == "null" ]; then
    echo "❌ Error: No se pudieron obtener los waypoints para la carrera especificada."
    exit 1
fi

echo "✅ Se han cargado $(echo "$WAYPOINTS" | jq '. | length') waypoints."

# 2. Detectar dispositivos ADB (emuladores)
DEVICES=$(adb devices | grep -v "List" | grep "device$" | cut -f1)
if [ -z "$DEVICES" ]; then
    echo "❌ Error: No hay emuladores conectados por ADB."
    exit 1
fi

echo "📱 Emuladores detectados:"
echo "$DEVICES"
echo "------------------------------------------------"

# Función para simular un corredor
simulate_runner() {
    local device=$1
    local credentials=$2
    local user=$(echo $credentials | cut -d: -f1)
    local pass=$(echo $credentials | cut -d: -f2)
    
    echo "🚀 Iniciando simulación para [$user] en el dispositivo [$device]..."

    # Opcional: Podrías añadir comandos 'adb shell input text' aquí para loguear 
    # automáticamente, pero requiere que la app esté en la pantalla correcta.
    # adb -s $device shell am start -n com.appradar/.MainActivity
    
    # Iterar por los waypoints
    echo "$WAYPOINTS" | jq -c '.[]' | while read -r wp; do
        local lat=$(echo "$wp" | jq .lat)
        local lon=$(echo "$wp" | jq .lon)
        local name=$(echo "$wp" | jq -r .name)
        local order=$(echo "$wp" | jq .order)

        echo "📍 [$user] moviéndose a WP $order: $name ($lat, $lon)"
        
        # Enviar comando de GPS al emulador
        # IMPORTANTE: El emulador usa <longitude> <latitude>
        adb -s "$device" emu geo fix "$lon" "$lat"
        
        # Simular tiempo de trote entre puntos (demora aleatoria entre 3 y 8 segundos)
        local delay=$(( (RANDOM % 5) + 3 ))
        sleep "$delay"
    done

    echo "🏁 [$user] ha completado la carrera en el dispositivo $device!"
}

# 3. Lanzar simulaciones en paralelo
idx=0
for dev in $DEVICES; do
    # Asignar una credencial de la lista a cada dispositivo
    if [ $idx -lt ${#RUNNERS[@]} ]; then
        simulate_runner "$dev" "${RUNNERS[$idx]}" &
    else
        simulate_runner "$dev" "testuser_$idx:123456" &
    fi
    ((idx++))
done

# Esperar a que todos terminen
wait
echo "✨ Simulación finalizada."
