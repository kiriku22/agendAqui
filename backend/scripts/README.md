# Scripts del Backend

Esta carpeta contiene scripts utilitarios organizados por categoría.

## Estructura

```
scripts/
├── diagnostico/     # Scripts para diagnóstico y análisis
├── factus/          # Scripts de integración con Factus (DIAN)
├── fixes/           # Scripts para corrección de datos
├── migrations/      # Scripts para ejecutar migraciones
├── tests/           # Scripts de pruebas y testing
└── utils/           # Utilidades generales
```

## Categorías

### `/diagnostico`
Scripts para analizar y diagnosticar problemas en la base de datos o el sistema.
- `check-*.js` - Verificaciones de estado
- `debug-*.js` - Debugging de problemas específicos
- `validar-*.js` - Validaciones de datos
- `verificar-*.js` - Verificaciones de configuración

### `/factus`
Scripts relacionados con la integración de Factus (facturación electrónica DIAN).
- `activar-factus.js` - Activar configuración de Factus
- `configurar-factus.js` - Configurar credenciales
- `renovar-token-factus.js` - Renovar token OAuth2

### `/fixes`
Scripts para corregir datos o problemas en la base de datos.
- `fix-*.js` - Correcciones específicas
- `corregir-*.js` - Correcciones de datos

### `/migrations`
Scripts para ejecutar migraciones de base de datos.
- `run-migration.js` - Ejecutor genérico de migraciones
- `run-migration-XXX.js` - Migraciones específicas

### `/tests`
Scripts de pruebas manuales y validaciones.
- `test-*.js` - Pruebas de funcionalidad
- `probar-*.js` - Pruebas manuales

### `/utils`
Utilidades generales.
- `kill-port.js` - Liberar puertos ocupados
- `generate-password-hash.js` - Generar hashes de contraseñas

## Uso

Todos los scripts se ejecutan desde la carpeta `backend`:

```bash
cd backend
node scripts/diagnostico/check-facturas.js
node scripts/factus/renovar-token-factus.js
node scripts/fixes/fix-encoding.js
```

## Notas

- Algunos scripts requieren conexión a la base de datos
- Verifica el archivo `.env` antes de ejecutar scripts de fixes
- Los scripts de migraciones deben ejecutarse en orden numérico
