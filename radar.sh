#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}      AppRadar - Panel de Control      ${NC}"
echo -e "${BLUE}=======================================${NC}"

show_menu() {
    echo -e "\n${YELLOW}Seleccione una opción:${NC}"
    echo "1) 🛠️  Buildear imagen de Docker (Primer paso)"
    echo "2) 🚀 Levantar todo el sistema (Backend + Frontend)"
    echo "3) 🧪 Ejecutar Tests de API (Backend - Cucumber)"
    echo "4) 🌐 Ejecutar Tests E2E Web (Frontend - Playwright)"
    echo "5) 📱 Buildear APK Celular (:app)"
    echo "6) ⌚ Buildear APK Reloj (:wear)"
    echo "7) 💻 Entrar a la terminal del contenedor"
    echo "8) 🛑 Detener y limpiar servicios"
    echo "q) Salir"
    echo -ne "\nOpción: "
}

while true; do
    show_menu
    read -r opt
    case $opt in
        1)
            echo -e "\n${BLUE}Construyendo imagen de AppRadar...${NC}"
            docker compose build
            ;;
        2)
            echo -e "\n${BLUE}Levantando servicios...${NC}"
            echo -e "${YELLOW}Backend: http://localhost:3000${NC}"
            echo -e "${YELLOW}Frontend: http://localhost:5173${NC}"
            docker compose up
            ;;
        3)
            echo -e "\n${BLUE}Ejecutando pruebas de integración del Backend...${NC}"
            docker compose run --rm dev-env bash -c "cd backend && npm run test:api"
            ;;
        4)
            echo -e "\n${BLUE}Ejecutando pruebas E2E de la Web...${NC}"
            docker compose run --rm dev-env bash -c "cd frontend && npx playwright test"
            ;;
        5)
            echo -e "\n${BLUE}Compilando aplicación Android (Celular)...${NC}"
            docker compose run --rm dev-env ./gradlew :app:assembleDebug
            echo -e "${GREEN}APK generado en: app/build/outputs/apk/debug/${NC}"
            ;;
        6)
            echo -e "\n${BLUE}Compilando aplicación Wear OS (Reloj)...${NC}"
            docker compose run --rm dev-env ./gradlew :wear:assembleDebug
            echo -e "${GREEN}APK generado en: wear/build/outputs/apk/debug/${NC}"
            ;;
        7)
            echo -e "\n${BLUE}Entrando al contenedor dev-env...${NC}"
            docker compose run --rm dev-env bash
            ;;
        8)
            echo -e "\n${YELLOW}Deteniendo servicios...${NC}"
            docker compose down
            ;;
        q)
            echo -e "\n${GREEN}¡Adiós!${NC}"
            exit 0
            ;;
        *)
            echo -e "\n${RED}Opción inválida.${NC}"
            ;;
    esac
done
