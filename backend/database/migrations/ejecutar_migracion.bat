@echo off
echo ============================================================================
echo EJECUTANDO MIGRACION: FACTURACION ELECTRONICA DIAN - FACTUS
echo ============================================================================
echo.

REM Configuracion de base de datos desde .env
set DB_HOST=remoto.pronetsys.com.co
set DB_PORT=5432
set DB_NAME=factufy-hotel
set DB_USER=postgres

echo Host: %DB_HOST%
echo Puerto: %DB_PORT%
echo Base de datos: %DB_NAME%
echo Usuario: %DB_USER%
echo.

REM Ejecutar script de migracion
echo Ejecutando script 001_facturacion_electronica.sql...
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f 001_facturacion_electronica.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================================
    echo MIGRACION COMPLETADA EXITOSAMENTE
    echo ============================================================================
    echo.
    echo Tablas creadas:
    echo   - tipos_documento_dian
    echo   - configuracion_factus
    echo   - facturas_electronicas
    echo   - notas_credito
    echo   - documentos_soporte
    echo.
    echo Tablas modificadas:
    echo   - clientes
    echo   - huespedes
    echo   - facturas
    echo.
    echo Proximos pasos:
    echo   1. Verificar las tablas con: SELECT * FROM configuracion_factus;
    echo   2. Probar conexion con Factus
    echo   3. Continuar con Fase 2 - Backend
    echo.
) else (
    echo.
    echo ============================================================================
    echo ERROR EN LA MIGRACION
    echo ============================================================================
    echo.
    echo Verifique:
    echo   1. PostgreSQL esta instalado y psql esta en el PATH
    echo   2. Las credenciales de conexion son correctas
    echo   3. La base de datos 'factufy-hotel' existe
    echo.
)

pause