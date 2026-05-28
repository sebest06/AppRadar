# Guía de Deploy — AppRadar

## Opciones disponibles

| Modo | Archivo | Para qué |
|------|---------|----------|
| **Producción** | `docker-compose.prod.yml` | Servidor público con IP/dominio |
| **Local** | `docker-compose.local.yml` | Uso personal en tu propia máquina |
| **Tests** | `docker-compose.tests.yml` | Correr todos los tests automatizados |
| **Integración** | `docker-compose.integration.yml` | Backend para tests Maestro (Android) |

---

## Deploy en producción

Para un servidor con IP pública o dominio (VPS, DigitalOcean, Railway, etc.)

### Prerequisitos

- Docker y Docker Compose instalados en el servidor
- Puerto 3000 abierto en el firewall (o 80/443 si usás un reverse proxy)
- Un `JWT_SECRET` seguro (generalo con `openssl rand -hex 32`)

### Pasos

```bash
# 1. Clonar el repo en el servidor
git clone https://github.com/sebest06/AppRadar.git
cd AppRadar

# 2. Crear el archivo de variables de entorno
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=https://tudominio.com
RACE_COOLDOWN_MINUTES=60
PORT=3000
EOF

# 3. Levantar
docker compose -f docker-compose.prod.yml up -d

# 4. Verificar que está corriendo
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/health
```

### Actualizar a una nueva versión

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Ver logs

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Detener

```bash
docker compose -f docker-compose.prod.yml down
# La base de datos persiste en el volumen appradar_prod_data
```

### Backup de la base de datos

```bash
# Copiar la DB del volumen a tu máquina local
docker run --rm \
  -v appradar_prod_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/appradar_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### HTTPS con NGINX (recomendado para producción)

Si querés HTTPS, poné NGINX (o Caddy) delante del contenedor:

**Ejemplo de config NGINX** (`/etc/nginx/sites-available/appradar`):
```nginx
server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name tudominio.com;

    ssl_certificate     /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Obtené el certificado con Certbot:
```bash
certbot --nginx -d tudominio.com
```

---

## Deploy local (uso personal)

Para correrlo en tu propia máquina y acceder desde la app Android.

### Inicio rápido

```bash
# Clonar el repo
git clone https://github.com/sebest06/AppRadar.git
cd AppRadar

# Levantar (no requiere configurar nada)
docker compose -f docker-compose.local.yml up -d

# Verificar
curl http://localhost:3000/health
```

La app está disponible en `http://localhost:3000`.

### Acceso desde la app Android

La app Android necesita saber la IP de tu máquina en la red WiFi:

```bash
# En Linux/Mac
hostname -I | awk '{print $1}'

# En Windows (PowerShell)
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress
```

En la app Android, en la pantalla de login, ingresá:
```
http://192.168.x.x:3000/   ← reemplazá con tu IP real
```

> **Nota**: el dispositivo Android y tu PC deben estar en la **misma red WiFi**.

### La base de datos

En modo local, la DB se guarda en `./backend/data/appradar.db` (directorio visible en tu máquina). Podés hacer backup simplemente copiando ese archivo.

### Detener y reiniciar

```bash
# Detener
docker compose -f docker-compose.local.yml down

# Reiniciar (sin perder datos)
docker compose -f docker-compose.local.yml up -d

# Rebuild después de actualizar el código
docker compose -f docker-compose.local.yml up -d --build
```

---

## Variables de entorno

| Variable | Descripción | Producción | Local |
|----------|-------------|------------|-------|
| `JWT_SECRET` | Clave para firmar tokens JWT | **Requerida** (mín. 32 chars) | Valor por defecto incluido |
| `CORS_ORIGINS` | Dominios permitidos para CORS | **Requerida** | `http://localhost:3000` |
| `PORT` | Puerto del servidor | `3000` | `3000` |
| `RACE_COOLDOWN_MINUTES` | Cooldown entre carreras | `60` | `0` |

---

## Comandos útiles

```bash
# Ver estado de los contenedores
docker compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f app

# Acceder a la shell del contenedor
docker compose -f docker-compose.prod.yml exec app sh

# Listar los volúmenes
docker volume ls | grep appradar

# Eliminar todo (incluyendo datos — CUIDADO)
docker compose -f docker-compose.prod.yml down -v
```
