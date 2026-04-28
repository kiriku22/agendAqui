# Factufy - Agente Local de Impresión

Sistema de impresión local para Factufy Restaurante que procesa una cola de trabajos de impresión desde un servidor remoto.

## 📋 Descripción

Este agente local permite imprimir documentos (facturas, comandas, cierres de caja) en impresoras térmicas locales cuando el frontend y backend de Factufy están alojados en servidores remotos.

### Características

- ✅ Procesamiento de cola de impresión desde backend remoto
- ✅ Soporte para múltiples tipos de documentos (factura, comanda, cierre, precuenta)
- ✅ Panel web local para monitoreo en tiempo real
- ✅ Instalación como servicio de Windows (auto-inicio)
- ✅ Reintentos automáticos en caso de error
- ✅ Logs estructurados con rotación automática
- ✅ Soporte para impresoras térmicas ESC/POS (80mm)
- ✅ Configuración persistente

## 🚀 Instalación

### Requisitos Previos

- Windows 7/8/10/11 o Windows Server
- Node.js 16.x o superior
- pnpm (gestor de paquetes)
- Impresora térmica conectada (USB o red)

### Paso 1: Instalar Dependencias

```bash
cd factufy-agente-impresion
pnpm install
```

### Paso 2: Configuración Inicial

Al ejecutar el agente por primera vez, se creará automáticamente un archivo de configuración en:

```
%APPDATA%\Factufy\config.json
```

Puede configurar el agente a través del panel web o editando este archivo manualmente.

### Paso 3: Ejecutar en Modo Desarrollo

Para probar el agente antes de instalarlo como servicio:

```bash
pnpm run dev
```

Abra su navegador en `http://localhost:3050` para acceder al panel de administración.

### Paso 4: Instalar como Servicio de Windows

**IMPORTANTE**: Debe ejecutar este comando como **Administrador**.

```bash
pnpm run install-service
```

El servicio se instalará con el nombre "Factufy Agente Impresion" y se iniciará automáticamente.

## ⚙️ Configuración

Acceda al panel web en `http://localhost:3050` y vaya a la pestaña **Configuración**.

### Parámetros de Configuración

| Parámetro | Descripción | Valor por Defecto |
|-----------|-------------|-------------------|
| **URL del Servidor** | URL del backend de Factufy Restaurante (ej. `https://tuservidor.com` o `http://localhost:4000`) | _(vacío)_ |
| **Intervalo de Polling** | Cada cuántos milisegundos verificar nuevos trabajos | `3000` (3 segundos) |
| **Puerto del Panel Web** | Puerto donde se ejecuta el panel de administración | `3050` |

### Configuración del Backend

El backend debe tener configurada la tabla `cola_impresion`. Ejecute el script SQL:

```bash
psql -U postgres -d factufy_restaurante -f factufy-restaurante/backend/database/create_cola_impresion.sql
```

## 🖥️ Panel de Administración

El panel web está disponible en `http://localhost:3050` y proporciona:

### 📊 Dashboard
- Estadísticas en tiempo real (pendientes, procesando, impresos, errores)
- Actualización automática cada 5 segundos

### 📋 Historial
- Últimos 50 trabajos de impresión procesados
- Estado de cada trabajo
- Información de impresora destino

### ⚙️ Configuración
- Formulario para configurar URL del servidor
- Ajuste de intervalo de polling
- Información del agente (ID único, archivo de configuración)

### 📄 Logs
- Visualización de logs en tiempo real
- Filtrado por nivel (info, error, warn)
- Auto-refresh cada 5 segundos

## 🔧 Gestión del Servicio

### Iniciar el Servicio

```bash
net start "Factufy Agente Impresion"
```

O use el Administrador de Servicios de Windows (`services.msc`).

### Detener el Servicio

```bash
net stop "Factufy Agente Impresion"
```

### Reiniciar el Servicio

**IMPORTANTE**: Después de cambiar la configuración, debe reiniciar el servicio:

```bash
net stop "Factufy Agente Impresion" && net start "Factufy Agente Impresion"
```

### Desinstalar el Servicio

**IMPORTANTE**: Debe ejecutar como **Administrador**.

```bash
pnpm run uninstall-service
```

## 📁 Estructura del Proyecto

```
factufy-agente-impresion/
├── index.js                    # Punto de entrada
├── package.json                # Dependencias y scripts
├── install-service.js          # Script de instalación del servicio
├── uninstall-service.js        # Script de desinstalación del servicio
├── src/
│   ├── config/
│   │   └── settings.js         # Gestor de configuración persistente
│   ├── services/
│   │   ├── api-client.js       # Cliente HTTP para backend
│   │   ├── queue-processor.js  # Procesador de cola (núcleo)
│   │   ├── printer.js          # Servicio de impresión térmica
│   │   └── comanda.js          # Formateo de comandas
│   ├── utils/
│   │   └── logger.js           # Logger con Winston
│   └── web/
│       ├── server.js           # Servidor Express del panel
│       └── public/
│           ├── index.html      # Interfaz del panel
│           ├── style.css       # Estilos
│           └── app.js          # JavaScript del frontend
└── logs/                       # Archivos de log (auto-generado)
    ├── combined.log
    └── error.log
```

## 🔄 Flujo de Trabajo

1. **Backend** agrega trabajos a la tabla `cola_impresion` con estado `pendiente`
2. **Agente** realiza polling cada 3 segundos al endpoint `/api/cola/pendientes`
3. **Agente** marca el trabajo como `procesando` con su ID único
4. **Agente** parsea los datos JSON y formatea el documento según el tipo
5. **Agente** envía el documento a la impresora térmica
6. **Agente** marca el trabajo como `impreso` o `error`
7. Si hay error, el backend reintenta automáticamente hasta 3 veces

## 🖨️ Tipos de Documentos Soportados

| Tipo | Descripción | Ancho de Papel |
|------|-------------|----------------|
| `factura` | Factura de venta completa | 80mm |
| `comanda` | Orden de cocina | 80mm o 58mm |
| `cierre` | Cierre de caja | 80mm |
| `precuenta` | Comprobante de consumo (pre-cuenta) | 80mm |

## 🐛 Solución de Problemas

### El agente no se conecta al servidor

1. Verifique que la URL del servidor esté configurada correctamente
2. Asegúrese de que el backend esté en línea y accesible
3. Si usa HTTPS, verifique que el certificado SSL sea válido
4. Revise los logs en el panel web

### El servicio no inicia

1. Verifique que Node.js esté instalado correctamente
2. Asegúrese de tener permisos de administrador
3. Revise el Visor de Eventos de Windows para errores del servicio
4. Intente ejecutar en modo desarrollo (`pnpm run dev`) para ver errores

### La impresora no imprime

1. Verifique que la impresora esté conectada y encendida
2. Asegúrese de que los drivers de la impresora estén instalados
3. Pruebe imprimiendo desde otra aplicación (Bloc de notas)
4. Revise los logs para ver mensajes de error específicos

### Los trabajos quedan en estado "error"

1. Revise los logs en el panel web para ver el mensaje de error
2. Verifique que la impresora destino exista y esté accesible
3. Asegúrese de que el formato JSON de los datos sea válido
4. El sistema reintentará automáticamente hasta 3 veces

## 📝 Logs

Los logs se almacenan en la carpeta `logs/`:

- `combined.log` - Todos los eventos (info, warn, error)
- `error.log` - Solo errores

Rotación automática:
- Tamaño máximo: 5MB por archivo
- Archivos históricos: 5

## 🔐 Seguridad

- El panel web solo es accesible localmente (`localhost`)
- No requiere autenticación (solo acceso local)
- La comunicación con el backend puede usar HTTPS
- El agente solo se comunica con la URL configurada

## 📦 Dependencias Principales

- **express** - Servidor web del panel
- **axios** - Cliente HTTP para comunicación con backend
- **pure-escpos** - Librería de impresión térmica ESC/POS
- **winston** - Sistema de logging estructurado
- **node-windows** - Instalación como servicio de Windows

## 🤝 Soporte

Para reportar problemas o solicitar características, contacte al equipo de desarrollo de Factufy.

## 📄 Licencia

MIT License - Factufy © 2024
