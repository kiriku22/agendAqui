-- ============================================================================
-- Migración: Agregar campo codigo_dian a metodos_pago
-- Fecha: 2025-12-09
-- Descripción: Agrega código DIAN para facturación electrónica
-- Resolución 000042 de 2020 - DIAN Colombia
-- ============================================================================

-- Agregar columna codigo_dian
ALTER TABLE metodos_pago
ADD COLUMN codigo_dian VARCHAR(2);

-- Agregar constraint unique
ALTER TABLE metodos_pago
ADD CONSTRAINT uq_codigo_dian UNIQUE (codigo_dian);

-- Agregar comentario
COMMENT ON COLUMN metodos_pago.codigo_dian IS 'Código oficial DIAN según Resolución 000042 de 2020';

-- Actualizar métodos existentes con códigos DIAN
UPDATE metodos_pago SET codigo_dian = '10' WHERE nombre = 'Efectivo';
UPDATE metodos_pago SET codigo_dian = '43' WHERE nombre = 'Tarjeta Débito';
UPDATE metodos_pago SET codigo_dian = '42' WHERE nombre = 'Tarjeta Crédito';
UPDATE metodos_pago SET codigo_dian = '47' WHERE nombre = 'Transferencia';
UPDATE metodos_pago SET codigo_dian = '49' WHERE nombre = 'Nequi';
UPDATE metodos_pago SET codigo_dian = '49' WHERE nombre = 'Daviplata';

-- Hacer el campo NOT NULL después de actualizar
ALTER TABLE metodos_pago
ALTER COLUMN codigo_dian SET NOT NULL;

-- Verificar actualización
SELECT id, nombre, codigo_dian, tipo, activo, requiere_referencia, orden
FROM metodos_pago
ORDER BY orden;
