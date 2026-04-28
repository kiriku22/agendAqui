@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: Factufy - Agente de Impresión
:: Script de Configuración v1.0
:: ============================================

title Factufy - Configuración del Agente

:: Colores
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

:: Banner
echo.
echo %CYAN%╔═══════════════════════════════════════════════════════╗%RESET%
echo %CYAN%║                                                       ║%RESET%
echo %CYAN%║       %GREEN%FACTUFY - AGENTE DE IMPRESIÓN%CYAN%                 ║%RESET%
echo %CYAN%║       %YELLOW%Configuración v1.0%CYAN%                            ║%RESET%
echo %CYAN%║                                                       ║%RESET%
echo %CYAN%╚═══════════════════════════════════════════════════════╝%RESET%
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[ERROR] Este script requiere permisos de Administrador.%RESET%
    echo.
    echo %YELLOW%Por favor, haga clic derecho y seleccione "Ejecutar como administrador"%RESET%
    echo.
    pause
    exit /b 1
)

:: Variables
set "CONFIG_DIR=%APPDATA%\Factufy"
set "CONFIG_FILE=%CONFIG_DIR%\config.json"

:: Verificar si existe configuración
if not exist "%CONFIG_FILE%" (
    echo %RED%[ERROR] No se encontró archivo de configuración.%RESET%
    echo %YELLOW%Ejecute primero "instalar.bat" para realizar la instalación inicial.%RESET%
    pause
    exit /b 1
)

:: Mostrar configuración actual
echo %CYAN%Configuración actual:%RESET%
echo.
type "%CONFIG_FILE%"
echo.
echo.

:: Menú de opciones
echo %CYAN%¿Qué desea configurar?%RESET%
echo.
echo    1. Cambiar URL del servidor
echo    2. Cambiar puerto del panel web
echo    3. Cambiar intervalo de polling
echo    4. Reiniciar servicio
echo    5. Ver logs
echo    6. Abrir panel web
echo    0. Salir
echo.

set /p OPCION="Seleccione una opción: "

if "%OPCION%"=="1" goto CAMBIAR_URL
if "%OPCION%"=="2" goto CAMBIAR_PUERTO
if "%OPCION%"=="3" goto CAMBIAR_POLLING
if "%OPCION%"=="4" goto REINICIAR_SERVICIO
if "%OPCION%"=="5" goto VER_LOGS
if "%OPCION%"=="6" goto ABRIR_PANEL
if "%OPCION%"=="0" goto SALIR

echo %RED%Opción no válida%RESET%
pause
goto :eof

:CAMBIAR_URL
echo.
echo %CYAN%Cambiar URL del servidor%RESET%
echo.
echo %YELLOW%Ingrese la nueva URL del servidor backend:%RESET%
echo %YELLOW%Ejemplo: https://api.midominio.com%RESET%
echo.

set /p NEW_URL="Nueva URL: "

if "%NEW_URL%"=="" (
    echo %RED%[ERROR] Debe ingresar una URL%RESET%
    pause
    goto :eof
)

:: Actualizar config.json usando PowerShell
powershell -Command "(Get-Content '%CONFIG_FILE%' | ConvertFrom-Json | ForEach-Object { $_.serverUrl = '%NEW_URL%'; $_ } | ConvertTo-Json) | Set-Content '%CONFIG_FILE%'"

echo %GREEN%[OK] URL actualizada a: %NEW_URL%%RESET%
echo.
goto REINICIAR_SERVICIO

:CAMBIAR_PUERTO
echo.
echo %CYAN%Cambiar puerto del panel web%RESET%
echo %YELLOW%Puerto actual: 3050%RESET%
echo.

set /p NEW_PORT="Nuevo puerto: "

if "%NEW_PORT%"=="" (
    echo %RED%[ERROR] Debe ingresar un puerto%RESET%
    pause
    goto :eof
)

powershell -Command "(Get-Content '%CONFIG_FILE%' | ConvertFrom-Json | ForEach-Object { $_.panelPort = %NEW_PORT%; $_ } | ConvertTo-Json) | Set-Content '%CONFIG_FILE%'"

echo %GREEN%[OK] Puerto actualizado a: %NEW_PORT%%RESET%
echo.
goto REINICIAR_SERVICIO

:CAMBIAR_POLLING
echo.
echo %CYAN%Cambiar intervalo de polling%RESET%
echo %YELLOW%Intervalo actual: 3000ms (3 segundos)%RESET%
echo %YELLOW%Valor mínimo: 1000ms | Valor máximo: 60000ms%RESET%
echo.

set /p NEW_INTERVAL="Nuevo intervalo (en milisegundos): "

if "%NEW_INTERVAL%"=="" (
    echo %RED%[ERROR] Debe ingresar un valor%RESET%
    pause
    goto :eof
)

powershell -Command "(Get-Content '%CONFIG_FILE%' | ConvertFrom-Json | ForEach-Object { $_.pollingInterval = %NEW_INTERVAL%; $_ } | ConvertTo-Json) | Set-Content '%CONFIG_FILE%'"

echo %GREEN%[OK] Intervalo actualizado a: %NEW_INTERVAL%ms%RESET%
echo.
goto REINICIAR_SERVICIO

:REINICIAR_SERVICIO
echo.
echo %CYAN%Reiniciando servicio...%RESET%

net stop "Factufy Agente Impresion" >nul 2>&1
timeout /t 2 /nobreak >nul
net start "Factufy Agente Impresion" >nul 2>&1

sc query "Factufy Agente Impresion" | findstr "RUNNING" >nul
if %errorLevel% equ 0 (
    echo %GREEN%[OK] Servicio reiniciado correctamente%RESET%
) else (
    echo %YELLOW%El servicio no pudo reiniciarse automáticamente.%RESET%
    echo %YELLOW%Puede iniciarlo manualmente desde services.msc%RESET%
)
echo.
pause
goto :eof

:VER_LOGS
echo.
echo %CYAN%Últimas líneas del log:%RESET%
echo.
set "LOG_FILE=%~dp0logs\combined.log"
if exist "%LOG_FILE%" (
    powershell -Command "Get-Content '%LOG_FILE%' -Tail 30"
) else (
    echo %YELLOW%No se encontró archivo de log%RESET%
)
echo.
pause
goto :eof

:ABRIR_PANEL
echo.
echo %CYAN%Abriendo panel de administración...%RESET%
start http://localhost:3050
goto :eof

:SALIR
echo.
echo %GREEN%¡Hasta luego!%RESET%
exit /b 0
