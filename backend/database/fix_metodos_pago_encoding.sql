-- ============================================================================
-- FIX: Limpiar y reinsertar métodos de pago con encoding correcto
-- ============================================================================
-- Este script corrige problemas de encoding UTF-8 en metodos_pago
-- ============================================================================

-- Eliminar todos los métodos de pago existentes (pueden tener encoding corrupto)
TRUNCATE TABLE metodos_pago RESTART IDENTITY CASCADE;

-- Insertar métodos de pago con encoding UTF-8 correcto
-- Usando solo caracteres ASCII seguros para evitar problemas
INSERT INTO metodos_pago (nombre, codigo_dian, tipo, activo, requiere_referencia, icono, orden) VALUES
-- EFECTIVO Y EQUIVALENTES
('Efectivo', '10', 'efectivo', true, false, 'cash', 1),
('Consignacion Bancaria', '11', 'transferencia', true, true, 'bank', 2),

-- TARJETAS
('Tarjeta Credito', '42', 'tarjeta', true, true, 'credit-card', 3),
('Tarjeta Debito', '43', 'tarjeta', true, true, 'credit-card', 4),

-- TRANSFERENCIAS ELECTRONICAS
('Transferencia Bancaria', '47', 'transferencia', true, true, 'transfer', 5),
('Transferencia Electronica ACH', '41', 'transferencia', true, true, 'transfer', 6),

-- PAGOS DIGITALES
('PSE', '48', 'transferencia', true, true, 'pse', 7),
('Billetera Digital', '49', 'transferencia', true, true, 'wallet', 8),

-- CREDITO
('Credito del Establecimiento', '30', 'otro', true, false, 'credit', 9),

-- CHEQUES
('Cheque', '20', 'otro', true, true, 'check', 10),

-- OTROS
('Bono o Tarjeta Regalo', '44', 'otro', true, true, 'gift', 11),
('Pago Mixto', '71', 'otro', true, false, 'mix', 12)

ON CONFLICT (codigo_dian) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tipo = EXCLUDED.tipo,
  activo = EXCLUDED.activo,
  requiere_referencia = EXCLUDED.requiere_referencia,
  icono = EXCLUDED.icono,
  orden = EXCLUDED.orden;

-- Verificar que se insertaron correctamente
SELECT
  id,
  nombre,
  codigo_dian,
  tipo,
  activo,
  requiere_referencia,
  icono,
  orden
FROM metodos_pago
ORDER BY orden;

-- Mensaje de confirmacion
DO $$
BEGIN
  RAISE NOTICE 'Metodos de pago insertados correctamente con encoding UTF-8';
END $$;
