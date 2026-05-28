#!/bin/bash
# Crea datos iniciales en el backend de integración para que los tests de Maestro funcionen.
# Requiere que el backend esté corriendo (docker compose -f docker-compose.integration.yml up -d)

set -e

BASE_URL="${1:-http://localhost:3000}"

echo "Conectando a $BASE_URL ..."

# Login y obtención de token
TOKEN=$(curl -sf -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","passw":"1234"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: No se pudo obtener el token. ¿El backend está corriendo?"
  exit 1
fi

echo "Login exitoso. Creando carrera de prueba ..."

curl -sf -X POST "$BASE_URL/trails" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carrera Maestro Test",
    "description": "Carrera para tests de integración Android",
    "distanceKm": 5,
    "elevationM": 200,
    "maxSkip": 1,
    "waypoints": [
      {"order": 0, "name": "Inicio", "lat": -34.6037, "lon": -58.3816, "radius": 50},
      {"order": 1, "name": "Meta",   "lat": -34.6100, "lon": -58.3900, "radius": 50}
    ]
  }' > /dev/null

echo "Datos de prueba creados correctamente."
echo "Ya podés ejecutar los tests de Maestro."
