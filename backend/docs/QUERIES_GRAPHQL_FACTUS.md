# 📋 Queries y Mutations GraphQL - Facturación Electrónica

Este archivo contiene queries y mutations de prueba para la funcionalidad de facturación electrónica con Factus.

---

## 🔐 Autenticación Previa

Antes de ejecutar cualquier query/mutation, debes autenticarte:

```graphql
mutation Login {
  login(usuario: "admin", password: "admin123") {
    token
    user {
      id
      nombre
      apellido
      rol
    }
  }
}
```

**Copiar el token retornado y agregarlo en HTTP Headers:**
```json
{
  "Authorization": "Bearer TU_TOKEN_AQUI"
}
```

---

## 📊 QUERIES

### 1. Obtener Configuración de Factus

```graphql
query GetConfiguracionFactus {
  configuracionFactus {
    id
    endpoint
    email
    client_id
    ambiente
    email_facturacion
    activo
    iva_hospedaje
    iva_consumos
    iva_servicios
    access_token
    token_expiry
    ultima_sincronizacion
    created_at
    updated_at
  }
}
```

**Respuesta esperada:**
```json
{
  "data": {
    "configuracionFactus": {
      "id": 1,
      "endpoint": "https://api-sandbox.factus.com.co",
      "email": "sandbox@factus.com.co",
      "ambiente": "sandbox",
      "activo": true,
      "iva_hospedaje": 0,
      "iva_consumos": 19,
      "iva_servicios": 19
    }
  }
}
```

---

### 2. Listar Facturas Electrónicas

```graphql
query GetFacturasElectronicas {
  facturasElectronicas(limite: 10) {
    id
    factura_id
    factus_id
    cufe
    numero_factura_dian
    prefijo
    url_pdf
    url_xml
    estado_dian
    fecha_envio
    fecha_respuesta_dian
    created_at
    factura {
      numero
      total
      fecha
    }
  }
}
```

---

### 3. Obtener Factura Electrónica por ID

```graphql
query GetFacturaElectronica($id: Int!) {
  facturaElectronica(id: $id) {
    id
    factura_id
    cufe
    numero_factura_dian
    url_pdf
    url_xml
    estado_dian
    datos_cliente_snapshot
    datos_factura_snapshot
    respuesta_factus
    factura {
      numero
      total
      fecha
      observaciones
    }
  }
}
```

**Variables:**
```json
{
  "id": 1
}
```

---

### 4. Obtener Factura Electrónica por Factura ID

```graphql
query GetFacturaElectronicaPorFacturaId($facturaId: Int!) {
  facturaElectronicaPorFacturaId(factura_id: $facturaId) {
    id
    cufe
    numero_factura_dian
    url_pdf
    url_xml
    estado_dian
    fecha_envio
  }
}
```

**Variables:**
```json
{
  "facturaId": 1
}
```

---

### 5. Listar Notas de Crédito

```graphql
query GetNotasCredito {
  notasCredito {
    id
    factura_electronica_id
    factus_id
    cufe
    numero_nota_credito
    motivo
    url_pdf
    url_xml
    estado_dian
    valor_total
    items
    fecha_envio
    factura_electronica {
      numero_factura_dian
      cufe
    }
  }
}
```

---

### 6. Listar Tipos de Documento DIAN

```graphql
query GetTiposDocumentoDian {
  tiposDocumentoDian(activo: true) {
    codigo_dian
    codigo_interno
    descripcion
    requiere_digito_verificacion
    longitud_minima
    longitud_maxima
    activo
  }
}
```

---

## 🔄 MUTATIONS

### 1. Probar Conexión con Factus

```graphql
mutation ProbarConexionFactus {
  probarConexionFactus {
    success
    message
    endpoint
    ambiente
    token_obtenido
    expires_in
    error
  }
}
```

**Respuesta esperada (éxito):**
```json
{
  "data": {
    "probarConexionFactus": {
      "success": true,
      "message": "Conexión exitosa con Factus",
      "endpoint": "https://api-sandbox.factus.com.co",
      "ambiente": "sandbox",
      "token_obtenido": true,
      "expires_in": 3600,
      "error": null
    }
  }
}
```

---

### 2. Actualizar Configuración de Factus

```graphql
mutation ActualizarConfiguracionFactus($input: ConfiguracionFactusInput!) {
  actualizarConfiguracionFactus(input: $input) {
    id
    endpoint
    email
    ambiente
    activo
    iva_hospedaje
    iva_consumos
    iva_servicios
    updated_at
  }
}
```

**Variables (ejemplo - activar FE):**
```json
{
  "input": {
    "activo": true
  }
}
```

**Variables (ejemplo - desactivar FE):**
```json
{
  "input": {
    "activo": false
  }
}
```

**Variables (ejemplo - cambiar tasas de IVA):**
```json
{
  "input": {
    "iva_hospedaje": 0,
    "iva_consumos": 19,
    "iva_servicios": 19
  }
}
```

**Variables (ejemplo - actualizar credenciales - SOLO ADMIN):**
```json
{
  "input": {
    "email": "nuevo@email.com",
    "password": "nueva_password",
    "client_id": "nuevo_client_id",
    "client_secret": "nuevo_client_secret"
  }
}
```

---

### 3. Crear Nota de Crédito (Anulación)

```graphql
mutation CrearNotaCredito($input: CrearNotaCreditoInput!) {
  crearNotaCredito(input: $input) {
    id
    factura_electronica_id
    factus_id
    cufe
    numero_nota_credito
    motivo
    url_pdf
    url_xml
    estado_dian
    valor_total
    items
    fecha_envio
  }
}
```

**Variables:**
```json
{
  "input": {
    "factura_electronica_id": 1,
    "motivo": "Anulación por error en facturación",
    "valor_total": 250000,
    "items": [
      {
        "descripcion": "Hospedaje Habitación 101 - 2 noche(s)",
        "cantidad": 2,
        "precio_unitario": 100000
      },
      {
        "descripcion": "Room Service - Desayuno",
        "cantidad": 2,
        "precio_unitario": 25000
      }
    ]
  }
}
```

---

## 🏨 QUERIES COMPLETAS CON JOINS

### Obtener Factura Completa con Factura Electrónica

```graphql
query GetFacturaCompleta($facturaId: Int!) {
  # Obtener datos de la factura
  hospedajes {
    id
    codigo
    habitacion {
      numero
      tipo
    }
    huesped {
      nombre_completo
      email
      telefono
      tipo_documento_dian_info {
        codigo_dian
        descripcion
      }
    }
  }

  # Obtener factura electrónica
  facturaElectronicaPorFacturaId(factura_id: $facturaId) {
    id
    cufe
    numero_factura_dian
    url_pdf
    url_xml
    estado_dian
    fecha_envio
    datos_cliente_snapshot
    datos_factura_snapshot
  }
}
```

---

## 🧪 FLUJO COMPLETO DE PRUEBA

### Paso 1: Verificar Configuración

```graphql
query VerificarConfiguracion {
  configuracionFactus {
    activo
    ambiente
    endpoint
    iva_hospedaje
    iva_consumos
  }
}
```

### Paso 2: Probar Conexión

```graphql
mutation TestConexion {
  probarConexionFactus {
    success
    message
    token_obtenido
    expires_in
  }
}
```

### Paso 3: Realizar Checkout (genera FE automáticamente)

```graphql
mutation RealizarCheckout($input: CheckOutInput!) {
  checkOut(input: $input) {
    id
    numero
    total
    fecha
    tiene_factura_electronica
  }
}
```

**Variables:**
```json
{
  "input": {
    "hospedaje_id": 1,
    "fecha_salida_real": "2024-12-03T12:00:00.000Z",
    "metodos_pago": [
      {
        "metodo_pago_id": 1,
        "monto": 250000,
        "referencia": "EFECTIVO"
      }
    ],
    "impuestos": 0,
    "descuento": 0
  }
}
```

### Paso 4: Verificar Factura Electrónica Generada

```graphql
query VerificarFacturaElectronica($facturaId: Int!) {
  facturaElectronicaPorFacturaId(factura_id: $facturaId) {
    id
    cufe
    numero_factura_dian
    url_pdf
    url_xml
    estado_dian
    fecha_envio
  }
}
```

**Variables:**
```json
{
  "facturaId": 1
}
```

### Paso 5: Listar Todas las Facturas Electrónicas

```graphql
query ListarFacturasElectronicas {
  facturasElectronicas(limite: 20) {
    id
    cufe
    numero_factura_dian
    url_pdf
    estado_dian
    fecha_envio
    factura {
      numero
      total
    }
  }
}
```

---

## 🔍 QUERIES DE AUDITORÍA

### Ver Errores en Facturación Electrónica

```graphql
query VerErroresFacturacion {
  facturasElectronicas(limite: 50) {
    id
    factura_id
    estado_dian
    errores_validacion
    fecha_envio
    factura {
      numero
      total
    }
  }
}
```

### Ver Configuración Histórica

```graphql
query VerHistorialConfiguracion {
  configuracionFactus {
    id
    activo
    ambiente
    ultima_sincronizacion
    created_at
    updated_at
  }
}
```

---

## 📝 Notas Importantes

### Headers HTTP Requeridos

Todas las requests deben incluir:

```json
{
  "Authorization": "Bearer TU_TOKEN_JWT",
  "Content-Type": "application/json"
}
```

### Permisos

- **Queries:** Cualquier usuario autenticado
- **Mutations (actualizar config):** Solo `admin` y `gerente`
- **Mutations (probar conexión):** Cualquier usuario autenticado
- **Mutations (crear NC):** Cualquier usuario autenticado

### Errores Comunes

**Error: "No autenticado"**
- Solución: Incluir header `Authorization` con token válido

**Error: "No tienes permisos"**
- Solución: Usar usuario con rol `admin` o `gerente`

**Error: "Factus no está activo"**
- Solución: Activar Factus con mutation `actualizarConfiguracionFactus`

**Error: "Factura electrónica no encontrada"**
- Solución: Realizar un checkout primero para generar FE

---

## 🚀 Endpoints GraphQL

**Desarrollo:**
- URL: http://localhost:4003/graphql
- GraphQL Playground: http://localhost:4003/graphql

**Producción:**
- URL: https://tu-servidor.com/graphql

---

## 📚 Recursos

- **Factus API Docs:** https://developers.factus.com.co
- **GraphQL Playground:** Incluido en Apollo Server
- **Apollo Studio:** https://studio.apollographql.com

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0
