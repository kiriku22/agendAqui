-- ============================================================================
-- SISTEMA DE PERMISOS - FACTUFY HOTEL
-- Migración: 030_sistema_permisos.sql
-- Fecha: 2025
-- Descripción: Sistema de permisos por rol y por usuario
-- ============================================================================

SET timezone = 'America/Bogota';

-- ============================================================================
-- TABLA 1: PERMISOS (Catálogo de permisos disponibles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    modulo VARCHAR(50) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo, activo);
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos(codigo);

COMMENT ON TABLE permisos IS 'Catálogo maestro de permisos del sistema';
COMMENT ON COLUMN permisos.codigo IS 'Código único del permiso (ej: habitaciones.ver)';
COMMENT ON COLUMN permisos.modulo IS 'Módulo al que pertenece (habitaciones, reservas, etc)';
COMMENT ON COLUMN permisos.categoria IS 'Categoría de acción (ver, crear, editar, eliminar, especial)';

-- ============================================================================
-- TABLA 2: ROL_PERMISOS (Permisos base asignados a cada rol)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rol_permisos (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(20) NOT NULL,
    permiso_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rol_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
    CONSTRAINT chk_rol_valido CHECK (rol IN ('admin', 'recepcionista', 'limpieza', 'mantenimiento', 'gerente')),
    CONSTRAINT uk_rol_permiso UNIQUE (rol, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol ON rol_permisos(rol);
CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso ON rol_permisos(permiso_id);

COMMENT ON TABLE rol_permisos IS 'Permisos base asignados a cada rol';

-- ============================================================================
-- TABLA 3: USUARIO_PERMISOS (Permisos específicos de usuario)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuario_permisos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    permiso_id INT NOT NULL,
    tipo_asignacion VARCHAR(20) NOT NULL,
    motivo TEXT,
    asignado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_permiso_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_permiso_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_asignado_por FOREIGN KEY (asignado_por) REFERENCES usuarios(id),
    CONSTRAINT chk_tipo_asignacion CHECK (tipo_asignacion IN ('agregar', 'quitar')),
    CONSTRAINT uk_usuario_permiso UNIQUE (usuario_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_permisos_usuario ON usuario_permisos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_tipo ON usuario_permisos(tipo_asignacion);

COMMENT ON TABLE usuario_permisos IS 'Permisos específicos de usuario (agregar o quitar del rol base)';
COMMENT ON COLUMN usuario_permisos.tipo_asignacion IS 'agregar = permiso adicional, quitar = negar permiso del rol';

-- ============================================================================
-- VISTA: Permisos efectivos por usuario
-- Calcula: (Permisos del rol) + (Agregados) - (Quitados)
-- ============================================================================
CREATE OR REPLACE VIEW v_permisos_efectivos AS
SELECT
    u.id AS usuario_id,
    u.usuario,
    u.rol,
    p.id AS permiso_id,
    p.codigo,
    p.nombre,
    p.modulo,
    p.categoria,
    CASE
        WHEN up.tipo_asignacion = 'quitar' THEN false
        WHEN up.tipo_asignacion = 'agregar' THEN true
        WHEN rp.id IS NOT NULL THEN true
        ELSE false
    END AS tiene_permiso,
    CASE
        WHEN up.tipo_asignacion = 'agregar' THEN 'usuario_agregado'
        WHEN up.tipo_asignacion = 'quitar' THEN 'usuario_quitado'
        WHEN rp.id IS NOT NULL THEN 'rol'
        ELSE 'sin_permiso'
    END AS origen
FROM usuarios u
CROSS JOIN permisos p
LEFT JOIN rol_permisos rp ON rp.rol = u.rol AND rp.permiso_id = p.id
LEFT JOIN usuario_permisos up ON up.usuario_id = u.id AND up.permiso_id = p.id
WHERE u.activo = true AND p.activo = true;

COMMENT ON VIEW v_permisos_efectivos IS 'Vista que calcula permisos efectivos por usuario considerando rol y excepciones';

-- ============================================================================
-- FUNCIÓN: Verificar si usuario tiene permiso
-- ============================================================================
CREATE OR REPLACE FUNCTION tiene_permiso(p_usuario_id INT, p_codigo_permiso VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_tiene BOOLEAN;
BEGIN
    SELECT tiene_permiso INTO v_tiene
    FROM v_permisos_efectivos
    WHERE usuario_id = p_usuario_id AND codigo = p_codigo_permiso;

    RETURN COALESCE(v_tiene, false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION tiene_permiso IS 'Verifica si un usuario tiene un permiso específico';

-- ============================================================================
-- FUNCIÓN: Obtener todos los permisos efectivos de un usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION obtener_permisos_usuario(p_usuario_id INT)
RETURNS TABLE(
    codigo VARCHAR,
    nombre VARCHAR,
    modulo VARCHAR,
    categoria VARCHAR,
    origen VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vpe.codigo::VARCHAR,
        vpe.nombre::VARCHAR,
        vpe.modulo::VARCHAR,
        vpe.categoria::VARCHAR,
        vpe.origen::VARCHAR
    FROM v_permisos_efectivos vpe
    WHERE vpe.usuario_id = p_usuario_id AND vpe.tiene_permiso = true
    ORDER BY vpe.modulo, vpe.categoria, vpe.nombre;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obtener_permisos_usuario IS 'Obtiene todos los permisos efectivos de un usuario';

-- ============================================================================
-- DATOS INICIALES: CATÁLOGO DE PERMISOS (~45 permisos)
-- ============================================================================

-- MÓDULO: DASHBOARD
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('dashboard.ver', 'Ver Dashboard', 'Acceso al panel principal con estadísticas', 'dashboard', 'ver', 1),
('dashboard.estadisticas', 'Ver Estadísticas Avanzadas', 'Acceso a métricas detalladas de ocupación e ingresos', 'dashboard', 'especial', 2)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: HABITACIONES
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('habitaciones.ver', 'Ver Habitaciones', 'Visualizar listado y estado de habitaciones', 'habitaciones', 'ver', 10),
('habitaciones.crear', 'Crear Habitaciones', 'Agregar nuevas habitaciones al sistema', 'habitaciones', 'crear', 11),
('habitaciones.editar', 'Editar Habitaciones', 'Modificar datos de habitaciones existentes', 'habitaciones', 'editar', 12),
('habitaciones.eliminar', 'Eliminar Habitaciones', 'Desactivar habitaciones del sistema', 'habitaciones', 'eliminar', 13),
('habitaciones.cambiar_estado', 'Cambiar Estado', 'Modificar estado (limpieza, mantenimiento, etc)', 'habitaciones', 'especial', 14)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: RESERVAS
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('reservas.ver', 'Ver Reservas', 'Visualizar listado de reservas', 'reservas', 'ver', 20),
('reservas.crear', 'Crear Reservas', 'Crear nuevas reservas', 'reservas', 'crear', 21),
('reservas.editar', 'Editar Reservas', 'Modificar reservas existentes', 'reservas', 'editar', 22),
('reservas.cancelar', 'Cancelar Reservas', 'Cancelar reservas confirmadas', 'reservas', 'especial', 23),
('reservas.confirmar', 'Confirmar Reservas', 'Confirmar reservas pendientes', 'reservas', 'especial', 24)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: HOSPEDAJES (Check-in/Check-out)
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('hospedajes.ver', 'Ver Hospedajes', 'Visualizar hospedajes activos y finalizados', 'hospedajes', 'ver', 30),
('hospedajes.checkin', 'Realizar Check-in', 'Registrar entrada de huéspedes', 'hospedajes', 'crear', 31),
('hospedajes.checkout', 'Realizar Check-out', 'Procesar salida y facturación', 'hospedajes', 'especial', 32),
('hospedajes.editar', 'Editar Hospedaje', 'Modificar datos del hospedaje activo', 'hospedajes', 'editar', 33),
('hospedajes.cancelar', 'Cancelar Hospedaje', 'Cancelar hospedaje activo', 'hospedajes', 'especial', 34)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: CONSUMOS
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('consumos.ver', 'Ver Consumos', 'Visualizar consumos por habitación', 'consumos', 'ver', 40),
('consumos.crear', 'Agregar Consumos', 'Cargar consumos a habitación', 'consumos', 'crear', 41),
('consumos.editar', 'Editar Consumos', 'Modificar consumos no facturados', 'consumos', 'editar', 42),
('consumos.eliminar', 'Eliminar Consumos', 'Eliminar consumos no facturados', 'consumos', 'eliminar', 43)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: CLIENTES/HUÉSPEDES
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('clientes.ver', 'Ver Clientes', 'Visualizar base de clientes', 'clientes', 'ver', 50),
('clientes.crear', 'Crear Clientes', 'Registrar nuevos clientes', 'clientes', 'crear', 51),
('clientes.editar', 'Editar Clientes', 'Modificar datos de clientes', 'clientes', 'editar', 52),
('clientes.eliminar', 'Eliminar Clientes', 'Desactivar clientes del sistema', 'clientes', 'eliminar', 53)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: INVENTARIO
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('inventario.ver', 'Ver Inventario', 'Visualizar productos y servicios', 'inventario', 'ver', 60),
('inventario.crear', 'Crear Items', 'Agregar productos/servicios', 'inventario', 'crear', 61),
('inventario.editar', 'Editar Items', 'Modificar productos/servicios', 'inventario', 'editar', 62),
('inventario.eliminar', 'Eliminar Items', 'Desactivar productos/servicios', 'inventario', 'eliminar', 63),
('inventario.ajustar_stock', 'Ajustar Stock', 'Realizar ajustes de inventario', 'inventario', 'especial', 64)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: POS (Punto de Venta)
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('pos.ver', 'Ver POS', 'Acceso al módulo punto de venta', 'pos', 'ver', 70),
('pos.vender', 'Realizar Ventas', 'Procesar ventas en POS', 'pos', 'crear', 71),
('pos.anular', 'Anular Ventas', 'Anular ventas realizadas', 'pos', 'especial', 72),
('pos.descuentos', 'Aplicar Descuentos', 'Aplicar descuentos sin autorización', 'pos', 'especial', 73)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: CAJA
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('caja.ver', 'Ver Caja', 'Visualizar estado de caja', 'caja', 'ver', 80),
('caja.abrir', 'Abrir Caja', 'Apertura de turno de caja', 'caja', 'especial', 81),
('caja.cerrar', 'Cerrar Caja', 'Cierre de turno de caja', 'caja', 'especial', 82),
('caja.retiros', 'Registrar Retiros', 'Realizar retiros de caja', 'caja', 'especial', 83),
('caja.ingresos', 'Registrar Ingresos', 'Registrar ingresos adicionales', 'caja', 'especial', 84)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: FACTURACIÓN ELECTRÓNICA
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('factubox.ver', 'Ver FactuBox', 'Acceso al módulo de facturación electrónica', 'factubox', 'ver', 90),
('factubox.transmitir', 'Transmitir Facturas', 'Transmitir facturas a DIAN', 'factubox', 'especial', 91),
('factubox.notas_credito', 'Crear Notas Crédito', 'Generar notas crédito electrónicas', 'factubox', 'especial', 92),
('factubox.descargar', 'Descargar Documentos', 'Descargar PDF/XML de facturas', 'factubox', 'especial', 93)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: REPORTES
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('reportes.ver', 'Ver Reportes', 'Acceso al módulo de reportes', 'reportes', 'ver', 100),
('reportes.ocupacion', 'Reporte Ocupación', 'Ver reporte de ocupación hotelera', 'reportes', 'especial', 101),
('reportes.ingresos', 'Reporte Ingresos', 'Ver reporte de ingresos', 'reportes', 'especial', 102),
('reportes.fiscales', 'Reportes Fiscales', 'Ver libro de ventas e IVA', 'reportes', 'especial', 103),
('reportes.exportar', 'Exportar Reportes', 'Exportar reportes a Excel/PDF', 'reportes', 'especial', 104)
ON CONFLICT (codigo) DO NOTHING;

-- MÓDULO: CONFIGURACIÓN
INSERT INTO permisos (codigo, nombre, descripcion, modulo, categoria, orden) VALUES
('configuracion.ver', 'Ver Configuración', 'Acceso al módulo de configuración', 'configuracion', 'ver', 110),
('configuracion.datos_hotel', 'Configurar Datos Hotel', 'Modificar datos legales del hotel', 'configuracion', 'especial', 111),
('configuracion.parametros', 'Configurar Parámetros', 'Modificar parámetros operativos', 'configuracion', 'especial', 112),
('configuracion.usuarios', 'Gestionar Usuarios', 'Crear/editar usuarios del sistema', 'configuracion', 'especial', 113),
('configuracion.permisos', 'Gestionar Permisos', 'Asignar permisos a roles y usuarios', 'configuracion', 'especial', 114),
('configuracion.facturacion', 'Configurar Facturación', 'Configurar Factus y DIAN', 'configuracion', 'especial', 115),
('configuracion.metodos_pago', 'Gestionar Métodos Pago', 'Configurar métodos de pago', 'configuracion', 'especial', 116),
('configuracion.habitaciones', 'Gestionar Tipos Habitación', 'Configurar tipos y categorías', 'configuracion', 'especial', 117)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- DATOS INICIALES: PERMISOS POR ROL
-- ============================================================================

-- Limpiar permisos existentes (para re-ejecución limpia)
DELETE FROM rol_permisos;

-- ADMIN: Tiene todos los permisos
INSERT INTO rol_permisos (rol, permiso_id)
SELECT 'admin', id FROM permisos WHERE activo = true;

-- GERENTE: Acceso completo excepto configuración crítica y crear/eliminar habitaciones
INSERT INTO rol_permisos (rol, permiso_id)
SELECT 'gerente', id FROM permisos
WHERE activo = true
AND codigo NOT IN (
    'configuracion.usuarios',
    'configuracion.permisos',
    'configuracion.facturacion',
    'habitaciones.crear',
    'habitaciones.eliminar'
);

-- RECEPCIONISTA: Operaciones diarias del hotel
INSERT INTO rol_permisos (rol, permiso_id)
SELECT 'recepcionista', id FROM permisos
WHERE activo = true
AND codigo IN (
    'dashboard.ver',
    'habitaciones.ver',
    'habitaciones.cambiar_estado',
    'reservas.ver',
    'reservas.crear',
    'reservas.editar',
    'reservas.confirmar',
    'hospedajes.ver',
    'hospedajes.checkin',
    'hospedajes.checkout',
    'hospedajes.editar',
    'consumos.ver',
    'consumos.crear',
    'consumos.editar',
    'clientes.ver',
    'clientes.crear',
    'clientes.editar',
    'inventario.ver',
    'pos.ver',
    'pos.vender',
    'caja.ver',
    'caja.abrir',
    'caja.cerrar',
    'factubox.ver',
    'factubox.descargar'
);

-- LIMPIEZA: Solo cambiar estado de habitaciones a limpieza
INSERT INTO rol_permisos (rol, permiso_id)
SELECT 'limpieza', id FROM permisos
WHERE activo = true
AND codigo IN (
    'dashboard.ver',
    'habitaciones.ver',
    'habitaciones.cambiar_estado'
);

-- MANTENIMIENTO: Solo ver habitaciones y cambiar estado a mantenimiento
INSERT INTO rol_permisos (rol, permiso_id)
SELECT 'mantenimiento', id FROM permisos
WHERE activo = true
AND codigo IN (
    'dashboard.ver',
    'habitaciones.ver',
    'habitaciones.cambiar_estado'
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
DECLARE
    v_count_permisos INT;
    v_count_rol_permisos INT;
BEGIN
    SELECT COUNT(*) INTO v_count_permisos FROM permisos;
    SELECT COUNT(*) INTO v_count_rol_permisos FROM rol_permisos;

    RAISE NOTICE 'Sistema de permisos creado exitosamente:';
    RAISE NOTICE '  - Permisos en catálogo: %', v_count_permisos;
    RAISE NOTICE '  - Asignaciones rol-permiso: %', v_count_rol_permisos;
END $$;
