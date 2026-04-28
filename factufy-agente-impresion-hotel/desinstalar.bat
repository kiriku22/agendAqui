@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: Factufy - Agente de Impresión
:: Script de Desinstalación v1.0
:: ============================================

title Factufy - Desinstalador del Agente

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
echo %CYAN%║       %RED%FACTUFY - AGENTE DE IMPRESIÓN%CYAN%                  ║%RESET%
echo %CYAN%║       %YELLOW%Desinstalador v1.0%CYAN%                            ║%RESET%
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

echo %YELLOW%¡ADVERTENCIA!%RESET%
echo.
echo Este script desinstalará el Agente de Impresión de Factufy.
echo.
echo %CYAN%¿Qué desea hacer?%RESET%
echo.
echo    1. Desinstalar solo el servicio (mantener configuración)
echo    2. Desinstalación completa (eliminar todo)
echo    0. Cancelar
echo.

set /p OPCION="Seleccione una opción: "

if "%OPCION%"=="1" goto DESINSTALAR_SERVICIO
if "%OPCION%"=="2" goto DESINSTALAR_COMPLETO
if "%OPCION%"=="0" goto CANCELAR

echo %RED%Opción no válida%RESET%
pause
exit /b 1

:DESINSTALAR_SERVICIO
echo.
echo %CYAN%[1/2] Deteniendo servicio...%RESET%

net stop "Factufy Agente Impresion" >nul 2>&1
timeout /t 2 /nobreak >nul

echo %GREEN%    [OK] Servicio detenido%RESET%

echo.
echo %CYAN%[2/2] Desinstalando servicio...%RESET%

cd /d "%~dp0"
call node uninstall-service.js >nul 2>&1

:: Verificar que se desinstaló
sc query "Factufy Agente Impresion" >nul 2>&1
if %errorLevel% neq 0 (
    echo %GREEN%    [OK] Servicio desinstalado correctamente%RESET%
) else (
    echo %YELLOW%    El servicio aún existe. Intentando eliminación forzada...%RESET%
    sc delete "Factufy Agente Impresion" >nul 2>&1
)

echo.
echo %GREEN%╔═══════════════════════════════════════════════════════╗%RESET%
echo %GREEN%║   Servicio desinstalado correctamente                 ║%RESET%
echo %GREEN%║   La configuración se ha mantenido                    ║%RESET%
echo %GREEN%╚═══════════════════════════════════════════════════════╝%RESET%
echo.
echo %CYAN%Para reinstalar, ejecute "instalar.bat"%RESET%
echo.
pause
exit /b 0

:DESINSTALAR_COMPLETO
echo.
echo %RED%¡ATENCIÓN! Esto eliminará:%RESET%
echo    - El servicio de Windows
echo    - Archivos de configuración
echo    - Archivos de log
echo.

set /p CONFIRMAR="¿Está seguro? (escriba SI para confirmar): "

if /i not "%CONFIRMAR%"=="SI" (
    echo %YELLOW%Operación cancelada%RESET%
    pause
    exit /b 0
)

echo.
echo %CYAN%[1/4] Deteniendo servicio...%RESET%

net stop "Factufy Agente Impresion" >nul 2>&1
timeout /t 2 /nobreak >nul

echo %GREEN%    [OK] Servicio detenido%RESET%

echo.
echo %CYAN%[2/4] Desinstalando servicio...%RESET%

cd /d "%~dp0"
call node uninstall-service.js >nul 2>&1
sc delete "Factufy Agente Impresion" >nul 2>&1

echo %GREEN%    [OK] Servicio desinstalado%RESET%

echo.
echo %CYAN%[3/4] Eliminando archivos de configuración...%RESET%

set "CONFIG_DIR=%APPDATA%\Factufy"
if exist "%CONFIG_DIR%" (
    rmdir /s /q "%CONFIG_DIR%" >nul 2>&1
    echo %GREEN%    [OK] Configuración eliminada%RESET%
) else (
    echo %YELLOW%    No se encontró directorio de configuración%RESET%
)

echo.
echo %CYAN%[4/4] Eliminando archivos de log...%RESET%

set "LOG_DIR=%~dp0logs"
if exist "%LOG_DIR%" (
    rmdir /s /q "%LOG_DIR%" >nul 2>&1
    echo %GREEN%    [OK] Logs eliminados%RESET%
) else (
    echo %YELLOW%    No se encontró directorio de logs%RESET%
)

echo.
echo %GREEN%╔═══════════════════════════════════════════════════════╗%RESET%
echo %GREEN%║                                                       ║%RESET%
echo %GREEN%║   DESINSTALACIÓN COMPLETA EXITOSA                    ║%RESET%
echo %GREEN%║                                                       ║%RESET%
echo %GREEN%╚═══════════════════════════════════════════════════════╝%RESET%
echo.
echo %CYAN%Nota: Los archivos del programa no fueron eliminados.%RESET%
echo %CYAN%Puede eliminar manualmente la carpeta:%RESET%
echo %YELLOW%    %~dp0%RESET%
echo.
pause
exit /b 0

:CANCELAR
echo.
echo %GREEN%Operación cancelada. No se realizaron cambios.%RESET%
echo.
pause
exit /b 0
