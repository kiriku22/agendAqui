@echo off
echo ============================================================================
echo REINSTALACION COMPLETA: FACTURACION ELECTRONICA
echo ============================================================================
echo.
echo Este script ejecutara:
echo   1. Rollback (eliminar tablas existentes)
echo   2. Migracion completa (crear tablas nuevas)
echo   3. Verificacion
echo.
echo ADVERTENCIA: Este proceso eliminara los datos existentes de facturacion electronica
echo.
pause

REM Configuracion
set DB_HOST=remoto.pronetsys.com.co
set DB_PORT=5432
set DB_NAME=factufy-hotel
set DB_USER=postgres

echo.
echo ============================================================================
echo PASO 1: ROLLBACK (Eliminar tablas existentes)
echo ============================================================================
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f 000_rollback_facturacion_electronica.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR en el rollback. Abortando...
    pause
    exit /b 1
)

echo.
echo Rollback completado exitosamente.
echo.
echo Presione cualquier tecla para continuar con la migracion...
pause > nul

echo.
echo ============================================================================
echo PASO 2: MIGRACION (Crear tablas nuevas)
echo ============================================================================
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f 001_facturacion_electronica.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR en la migracion. Revise los mensajes anteriores.
    pause
    exit /b 1
)

echo.
echo Migracion completada exitosamente.
echo.
echo Presione cualquier tecla para continuar con la verificacion...
pause > nul

echo.
echo ============================================================================
echo PASO 3: VERIFICACION
echo ============================================================================
echo.

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f verificar_migracion.sql

echo.
echo ============================================================================
echo REINSTALACION COMPLETADA EXITOSAMENTE
echo ============================================================================
echo.
echo Resumen:
echo   - Tablas eliminadas y recreadas
echo   - Datos iniciales insertados
echo   - 7 tipos de documento DIAN
echo   - 1 configuracion Factus (sandbox)
echo.
echo Proximo paso:
echo   Ejecutar: node ..\test-factus-connection.js
echo.
pause
