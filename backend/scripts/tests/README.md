# Scripts de Testing y Utilidades

Esta carpeta contiene scripts de prueba y utilidades de desarrollo que **NO son necesarios** para el funcionamiento de la aplicación en producción.

## 📋 Contenido

### Scripts de Testing de Conexiones
- **test-db-connection.js** - Prueba la conexión a la base de datos PostgreSQL
- **test-graphql.js** - Prueba queries y mutations de GraphQL
- **test-graphql-login.js** - Prueba específica del login por GraphQL
- **test-login.js** - Prueba del proceso de autenticación

### Scripts de Mantenimiento de Usuarios
- **fix-admin-password.js** - Corrige la contraseña del usuario admin
- **reset-admin-completely.js** - Resetea completamente el usuario admin
- **generate-hash.js** - Genera hash bcrypt para contraseñas
- **verify-hash.js** - Verifica hashes bcrypt
- **update-passwords.js** - Actualiza contraseñas de múltiples usuarios

### Scripts de Datos
- **check-data.js** - Verifica integridad de datos en la BD
- **fix-all-data.js** - Corrige problemas de datos (encoding, etc.)
- **fix-encoding.js** - Corrige problemas de encoding en la BD

## 🚀 Uso

Estos scripts se ejecutan directamente con Node.js desde la carpeta `backend`:

```bash
cd backend
node scripts-testing/test-db-connection.js
node scripts-testing/test-graphql.js
# etc...
```

## ⚠️ Importante

- Estos scripts **NO son requeridos** para la aplicación en producción
- Solo se usan durante desarrollo y debugging
- **NO están incluidos** en `package.json` scripts
- **NO son importados** por el código de la aplicación
- Pueden ser eliminados sin afectar el funcionamiento

## 📝 Notas

Si necesitas usar alguno de estos scripts, asegúrate de tener configuradas las variables de entorno correctas en el archivo `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=factufy_hotel
DB_USER=postgres
DB_PASSWORD=tu_password
```

---

**Fecha de organización:** 28 de Enero de 2025
