# Seguridad

## Reglas base

- Nunca escribir claves hardcodeadas en el código.
- Nunca loguear valores sensibles (passwords, tokens, API keys).
- Nunca commitear archivos `.env` o similares.

## Si se detecta una clave expuesta

1. Avisar inmediatamente con el archivo y línea.
2. Sugerir reemplazo con variable de entorno.
3. Verificar si el archivo ya fue commiteado — si lo fue, indicar que la clave debe rotarse.

## .gitignore mínimo recomendado

```
.env
.env.*
*.key
*.pem
*.p12
*.pfx
secrets/
config/local.*
```

## Variables de entorno

Preferir siempre:
```python
import os
API_KEY = os.getenv("API_KEY")  # ✓
API_KEY = "sk-1234..."           # ✗
```

## Secret managers recomendados

- **Local/dev**: `.env` + `python-dotenv` / `dotenv` (Node)
- **CI/CD**: variables de entorno del pipeline (GitLab CI secrets)
- **Producción**: HashiCorp Vault, AWS Secrets Manager, GitLab Secret Management
