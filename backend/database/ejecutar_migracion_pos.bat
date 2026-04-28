@echo off
echo ===================================================
echo EJECUTAR MIGRACION SISTEMA POS - FACTUFY HOTEL
echo ===================================================
echo.

set PSQL="C:\Program Files\pgAdmin 4\runtime\psql.exe"
set DB_HOST=remoto.pronetsys.com.co
set DB_PORT=5432
set DB_NAME=factufy-hotel
set DB_USER=postgres
set MIGRATION_FILE=migrations\020_create_pos_system.sql
set SEEDS_FILE=seeds_pos.sql

echo 📊 Ejecutando migracion del esquema POS...
%PSQL% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f %MIGRATION_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Error en la migracion
    pause
    exit /b 1
)

echo.
echo ✅ Migracion completada exitosamente!
echo.
echo 📝 Ejecutando seeds (datos iniciales)...
%PSQL% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f %SEEDS_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Error en seeds
    pause
    exit /b 1
)

echo.
echo ===================================================
echo ✅ SISTEMA POS INSTALADO CORRECTAMENTE
echo ===================================================
echo.
echo 8 tablas creadas
echo 7 triggers configurados
echo 2 vistas creadas
echo 1 caja registradora configurada
echo 8 descuentos predefinidos
echo.
echo 🚀 Sistema listo para usar!
echo.
pause
