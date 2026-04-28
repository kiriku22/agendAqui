# Fase 1: Preparación - Facturación Electrónica

Esta carpeta contiene todos los scripts necesarios para completar la **Fase 1: Preparación** del plan de integración de facturación electrónica con Factus.

## 📋 Archivos Incluidos

### Scripts de Base de Datos
- `001_facturacion_electronica.sql` - Script principal de migración
- `verificar_migracion.sql` - Script de verificación post-migración
- `ejecutar_migracion.bat` - Script batch para Windows (ejecuta la migración)

### Scripts de Prueba
- `test-factus-connection.js` - Test de conexión con Factus API (Node.js)

---

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar la Migración de Base de Datos

#### Opción A: Usando el script batch (Windows)

```batch
# Ejecutar desde la carpeta migrations
cd backend\database\migrations
ejecutar_migracion.bat
```

El script te pedirá la contraseña de PostgreSQL.

#### Opción B: Manualmente con psql

```bash
# Desde la carpeta migrations
psql -h remoto.pronetsys.com.co -p 5432 -U postgres -d factufy-hotel -f 001_facturacion_electronica.sql
```

**Contraseña:** `root87`

---

### Paso 2: Verificar la Migración

Ejecutar el script de verificación:

```bash
psql -h remoto.pronetsys.com.co -p 5432 -U postgres -d factufy-hotel -f verificar_migracion.sql
```

**Verificaciones que realiza:**

✅ **Tablas creadas:**
- `tipos_documento_dian` (7 registros)
- `configuracion_factus` (1 registro)
- `facturas_electronicas` (vacía)
- `notas_credito` (vacía)
- `documentos_soporte` (vacía)

✅ **Tablas modificadas:**
- `clientes` → `+ tipo_documento_dian, codigo_municipio_dane, digito_verificacion`
- `huespedes` → `+ tipo_documento_dian`
- `facturas` → `+ tiene_factura_electronica, factura_electronica_id`

✅ **Vistas creadas:**
- `v_facturas_electronicas_completas`
- `v_configuracion_factus_publica`

✅ **Datos iniciales:**
- 7 tipos de documento DIAN
- 1 configuración Factus (sandbox)

---

### Paso 3: Probar Conexión con Factus

Ejecutar el test de conexión:

```bash
# Desde la carpeta raíz del backend
cd backend
node database/test-factus-connection.js
```

**Resultado esperado:**

```
✅ CONEXIÓN EXITOSA

Token obtenido:
  Access Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
  Token Type: Bearer
  Expires In: 3600 segundos (60 minutos)
  Refresh Token: def50200a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7...
```

Si ves este mensaje, ¡Factus está funcionando correctamente! ✅

---

## 📊 Qué se Instaló

### 1. Catálogo de Tipos de Documento DIAN

| Código DIAN | Código Interno | Descripción | DV |
|-------------|----------------|-------------|-----|
| 3 | CC | Cédula de Ciudadanía | No |
| 6 | NIT | Número de Identificación Tributaria | Sí |
| 4 | CE | Cédula de Extranjería | No |
| 7 | Pasaporte | Pasaporte | No |
| 2 | TI | Tarjeta de Identidad | No |

### 2. Configuración de Factus (Sandbox)

```sql
SELECT * FROM configuracion_factus;
```

| Campo | Valor |
|-------|-------|
| endpoint | https://api-sandbox.factus.com.co |
| email | sandbox@factus.com.co |
| ambiente | sandbox |
| activo | false (desactivado por defecto) |

### 3. Estructura de Tablas

#### `tipos_documento_dian`
- Catálogo oficial DIAN
- Validaciones de formato
- Dígito de verificación

#### `configuracion_factus`
- Credenciales OAuth2
- Datos del hotel (NIT, resolución DIAN)
- Configuración tributaria
- Configuración de IVA

#### `facturas_electronicas`
- Relación con facturas locales
- CUFE (Código Único de Facturación Electrónica)
- URLs de PDF y XML
- Respuesta completa de Factus
- Snapshot de datos del cliente

#### `notas_credito`
- Anulación de facturas electrónicas
- Total o parcial
- Referencia a factura original

#### `documentos_soporte`
- Compras a proveedores
- Información del proveedor
- Items y totales

---

## 🔍 Consultas Útiles

### Ver configuración actual de Factus

```sql
SELECT * FROM v_configuracion_factus_publica;
```

### Ver tipos de documento DIAN

```sql
SELECT
  codigo_dian,
  codigo_interno,
  descripcion,
  requiere_digito_verificacion
FROM tipos_documento_dian
ORDER BY codigo_dian;
```

### Ver clientes con tipo de documento DIAN asignado

```sql
SELECT
  nombre,
  apellido,
  tipo_documento,
  tipo_documento_dian,
  numero_documento
FROM clientes
WHERE tipo_documento_dian IS NOT NULL;
```

### Verificar facturas electrónicas (aún vacía)

```sql
SELECT COUNT(*) FROM facturas_electronicas;
-- Resultado: 0 (normal, aún no se han generado facturas electrónicas)
```

---

## 🐛 Troubleshooting

### Error: "psql: command not found"

**Solución:** Agregar PostgreSQL al PATH de Windows

1. Buscar la carpeta de instalación de PostgreSQL (ej: `C:\Program Files\PostgreSQL\14\bin`)
2. Agregar al PATH del sistema
3. Reiniciar la terminal

**Alternativa:** Usar la consola de PostgreSQL (pgAdmin o SQL Shell)

---

### Error: "FATAL: password authentication failed"

**Solución:** Verificar las credenciales en `.env`

```bash
DB_HOST=remoto.pronetsys.com.co
DB_PORT=5432
DB_NAME=factufy-hotel
DB_USER=postgres
DB_PASSWORD=root87
```

---

### Error: "relation already exists"

**Causa:** La migración ya se ejecutó anteriormente

**Solución:** El script usa `IF NOT EXISTS` para evitar errores. Es seguro ejecutarlo múltiples veces.

---

### Error de conexión con Factus (test-factus-connection.js)

**Posibles causas:**
- No hay conexión a Internet
- Firewall bloqueando la conexión
- Factus está temporalmente no disponible

**Verificar:**
```bash
ping api-sandbox.factus.com.co
```

---

## ✅ Checklist de Fase 1

- [ ] ✅ Script de migración ejecutado sin errores
- [ ] ✅ Script de verificación muestra 7 tipos de documento DIAN
- [ ] ✅ Script de verificación muestra 1 configuración Factus
- [ ] ✅ Tablas `clientes` y `huespedes` tienen nuevas columnas
- [ ] ✅ Tabla `facturas` tiene nuevas columnas
- [ ] ✅ Test de conexión con Factus retorna token exitosamente
- [ ] ✅ Vista `v_configuracion_factus_publica` funciona correctamente

---

## 📚 Credenciales de Sandbox Factus

**IMPORTANTE:** Estas credenciales son públicas de sandbox (solo para pruebas)

```javascript
{
  endpoint: "https://api-sandbox.factus.com.co",
  email: "sandbox@factus.com.co",
  password: "sandbox2024%",
  client_id: "a02b4bd9-8b3a-4f24-9c93-70a950a89246",
  client_secret: "k2J2ZfPbjTuyvEboLw0XatIdYKbBhPZT0neT6oIW"
}
```

**Documentación oficial:** https://developers.factus.com.co

---

## 🎯 Próximos Pasos (Fase 2)

Una vez completada la Fase 1, continuar con:

1. **Crear `FactusService.js`** - Servicio de integración con Factus
2. **Implementar autenticación OAuth2** - Gestión automática de tokens
3. **Crear método `enviarFacturaHospedaje()`** - Envío de facturas a Factus
4. **Implementar mapeos DIAN** - Tipos de documento, municipios, etc.
5. **Testing del servicio** - Probar envío de factura de prueba

---

## 📝 Notas

- La configuración inicial está en modo **sandbox** (pruebas)
- El sistema está **desactivado** por defecto (`activo = false`)
- Para activar la facturación electrónica, se debe configurar desde el frontend
- Los datos de prueba de Factus sandbox **NO** generan documentos tributarios reales

---

**Versión:** 1.0
**Fecha:** Diciembre 2024
**Autor:** Equipo Factufy
