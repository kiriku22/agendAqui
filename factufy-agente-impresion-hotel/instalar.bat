@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: Factufy - Agente de Impresión
:: Script de Instalación v1.0
:: ============================================

title Factufy - Instalador del Agente de Impresión

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
echo %CYAN%║       %YELLOW%Instalador Automático v1.0%CYAN%                    ║%RESET%
echo %CYAN%║                                                       ║%RESET%
echo %CYAN%╚═══════════════════════════════════════════════════════╝%RESET%
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[ERROR] Este script requiere permisos de Administrador.%RESET%
    echo.
    echo %YELLOW%Por favor, haga clic derecho en este archivo y seleccione%RESET%
    echo %YELLOW%"Ejecutar como administrador"%RESET%
    echo.
    pause
    exit /b 1
)

echo %GREEN%[OK] Ejecutando con permisos de Administrador%RESET%
echo.

:: Guardar directorio actual
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: ============================================
:: PASO 1: Verificar Node.js
:: ============================================
echo %CYAN%[1/7] Verificando Node.js...%RESET%

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%    Node.js no encontrado. Descargando e instalando...%RESET%

    :: Descargar Node.js LTS
    set "NODE_INSTALLER=node-setup.msi"
    set "NODE_URL=https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"

    echo %YELLOW%    Descargando desde nodejs.org...%RESET%
    powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%'" 2>nul

    if not exist "%NODE_INSTALLER%" (
        echo %RED%[ERROR] No se pudo descargar Node.js%RESET%
        echo %YELLOW%Por favor, descargue e instale Node.js manualmente desde:%RESET%
        echo %CYAN%https://nodejs.org%RESET%
        pause
        exit /b 1
    )

    echo %YELLOW%    Instalando Node.js (esto puede tardar unos minutos)...%RESET%
    msiexec /i "%NODE_INSTALLER%" /qn /norestart

    :: Esperar a que termine la instalación
    timeout /t 30 /nobreak >nul

    :: Limpiar instalador
    del "%NODE_INSTALLER%" 2>nul

    :: Refrescar PATH
    call refreshenv 2>nul
    set "PATH=%PATH%;C:\Program Files\nodejs"

    where node >nul 2>&1
    if %errorLevel% neq 0 (
        echo %RED%[ERROR] La instalación de Node.js falló%RESET%
        echo %YELLOW%Por favor, reinicie el equipo e intente de nuevo%RESET%
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN%    [OK] Node.js %NODE_VERSION% instalado%RESET%

:: ============================================
:: PASO 2: Instalar/Verificar pnpm
:: ============================================
echo.
echo %CYAN%[2/7] Verificando pnpm...%RESET%

where pnpm >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%    Instalando pnpm...%RESET%
    call npm install -g pnpm >nul 2>&1

    where pnpm >nul 2>&1
    if %errorLevel% neq 0 (
        echo %RED%[ERROR] No se pudo instalar pnpm%RESET%
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VERSION=%%i
echo %GREEN%    [OK] pnpm v%PNPM_VERSION% instalado%RESET%

:: ============================================
:: PASO 3: Instalar dependencias del proyecto
:: ============================================
echo.
echo %CYAN%[3/7] Instalando dependencias del proyecto...%RESET%
echo %YELLOW%    Esto puede tardar unos minutos...%RESET%

call pnpm install >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[ERROR] Error instalando dependencias%RESET%
    call pnpm install
    pause
    exit /b 1
)

echo %GREEN%    [OK] Dependencias instaladas correctamente%RESET%

:: ============================================
:: PASO 4: Solicitar URL del servidor
:: ============================================
echo.
echo %CYAN%[4/7] Configuración del servidor backend%RESET%
echo.
echo %YELLOW%    Ingrese la URL del servidor backend de Factufy.%RESET%
echo %YELLOW%    Ejemplo: https://api.midominio.com%RESET%
echo.

set /p SERVER_URL="    URL del servidor: "

if "%SERVER_URL%"=="" (
    echo %RED%[ERROR] Debe ingresar una URL%RESET%
    pause
    exit /b 1
)

:: Validar que la URL tenga formato correcto
echo %SERVER_URL% | findstr /i "^http" >nul
if %errorLevel% neq 0 (
    echo %YELLOW%    Agregando https:// a la URL...%RESET%
    set "SERVER_URL=https://%SERVER_URL%"
)

echo %GREEN%    [OK] URL configurada: %SERVER_URL%%RESET%

:: ============================================
:: PASO 5: Crear archivo de configuración
:: ============================================
echo.
echo %CYAN%[5/7] Creando archivo de configuración...%RESET%

:: Crear directorio de configuración
set "CONFIG_DIR=%APPDATA%\Factufy"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

:: Generar ID único del agente
for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i
for /f "tokens=2 delims==" %%i in ('wmic os get localdatetime /value') do set DATETIME=%%i
set "AGENTE_ID=agente-%HOSTNAME%-%DATETIME:~0,14%"

:: Crear config.json
set "CONFIG_FILE=%CONFIG_DIR%\config.json"
(
echo {
echo   "serverUrl": "%SERVER_URL%",
echo   "panelPort": 3050,
echo   "pollingInterval": 3000,
echo   "agenteId": "%AGENTE_ID%"
echo }
) > "%CONFIG_FILE%"

echo %GREEN%    [OK] Configuración guardada en: %CONFIG_FILE%%RESET%

:: ============================================
:: PASO 6: Instalar como servicio Windows
:: ============================================
echo.
echo %CYAN%[6/7] Instalando servicio de Windows...%RESET%

:: Primero intentar desinstalar si existe
call node uninstall-service.js >nul 2>&1
timeout /t 3 /nobreak >nul

:: Instalar servicio
call node install-service.js >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%    Reintentando instalación del servicio...%RESET%
    timeout /t 5 /nobreak >nul
    call node install-service.js
)

echo %GREEN%    [OK] Servicio instalado correctamente%RESET%

:: ============================================
:: PASO 7: Iniciar servicio y abrir panel
:: ============================================
echo.
echo %CYAN%[7/7] Iniciando servicio...%RESET%

net start "Factufy Agente Impresion" >nul 2>&1
timeout /t 3 /nobreak >nul

:: Verificar que el servicio está corriendo
sc query "Factufy Agente Impresion" | findstr "RUNNING" >nul
if %errorLevel% equ 0 (
    echo %GREEN%    [OK] Servicio iniciado correctamente%RESET%
) else (
    echo %YELLOW%    El servicio se instaló pero no se pudo iniciar automáticamente.%RESET%
    echo %YELLOW%    Iniciando en modo desarrollo...%RESET%
    start "Factufy Agente" cmd /c "node index.js"
    timeout /t 3 /nobreak >nul
)

:: ============================================
:: FINALIZADO
:: ============================================
echo.
echo %GREEN%╔═══════════════════════════════════════════════════════╗%RESET%
echo %GREEN%║                                                       ║%RESET%
echo %GREEN%║       ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!          ║%RESET%
echo %GREEN%║                                                       ║%RESET%
echo %GREEN%╚═══════════════════════════════════════════════════════╝%RESET%
echo.
echo %CYAN%Resumen de la instalación:%RESET%
echo    - Node.js: %NODE_VERSION%
echo    - pnpm: v%PNPM_VERSION%
echo    - Servidor: %SERVER_URL%
echo    - ID Agente: %AGENTE_ID%
echo    - Panel web: http://localhost:3050
echo.
echo %YELLOW%Abriendo panel de administración...%RESET%
echo.

:: Abrir panel en navegador
timeout /t 2 /nobreak >nul
start http://localhost:3050

echo %CYAN%Próximos pasos:%RESET%
echo    1. En el panel web, seleccione la impresora a usar
echo    2. Haga clic en "Probar Conexión" para verificar
echo    3. Haga clic en "Probar Impresión" para confirmar
echo.
echo %GREEN%Presione cualquier tecla para cerrar este instalador...%RESET%
pause >nul
