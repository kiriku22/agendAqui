-- ============================================================================
-- METODOS DE PAGO - CÓDIGOS OFICIALES DIAN
-- ============================================================================
-- Este script agrega el campo codigo_dian y popula los métodos de pago
-- con los códigos oficiales de la DIAN para facturación electrónica
-- Resolución 000042 de 2020 - DIAN Colombia
-- ============================================================================

-- Agregar campo codigo_dian si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='metodos_pago' AND column_name='codigo_dian'
  ) THEN
    ALTER TABLE metodos_pago ADD COLUMN codigo_dian VARCHAR(2) NOT NULL DEFAULT '01';
    ALTER TABLE metodos_pago ADD CONSTRAINT uq_codigo_dian UNIQUE (codigo_dian);
  END IF;
END $$;

-- Limpiar datos existentes
TRUNCATE TABLE metodos_pago RESTART IDENTITY CASCADE;

-- Insertar métodos de pago con códigos DIAN oficiales
-- Fuente: Resolución 000042 de 05 de mayo de 2020 - DIAN
INSERT INTO metodos_pago (nombre, codigo_dian, tipo, activo, requiere_referencia, icono, orden) VALUES
-- EFECTIVO Y EQUIVALENTES
('Efectivo', '10', 'efectivo', true, false, 'cash', 1),
('Consignación Bancaria', '11', 'transferencia', true, true, 'bank', 2),

-- TARJETAS
('Tarjeta Crédito', '42', 'tarjeta', true, true, 'credit-card', 3),
('Tarjeta Débito', '43', 'tarjeta', true, true, 'credit-card', 4),

-- TRANSFERENCIAS ELECTRÓNICAS
('Transferencia Bancaria', '47', 'transferencia', true, true, 'transfer', 5),
('Transferencia Electrónica (ACH)', '41', 'transferencia', true, true, 'transfer', 6),

-- PAGOS DIGITALES
('PSE', '48', 'transferencia', true, true, 'pse', 7),
('Billetera Digital (Nequi, Daviplata, etc)', '49', 'transferencia', true, true, 'wallet', 8),

-- CRÉDITO
('Crédito del Establecimiento', '30', 'otro', true, false, 'credit', 9),

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

-- Comentarios explicativos
COMMENT ON COLUMN metodos_pago.codigo_dian IS 'Código oficial DIAN según Resolución 000042 de 2020';

-- Verificar inserción
SELECT
  id,
  nombre,
  codigo_dian,
  tipo,
  CASE WHEN requiere_referencia THEN 'Sí' ELSE 'No' END as referencia,
  activo
FROM metodos_pago
ORDER BY orden;

-- ============================================================================
-- CÓDIGOS DIAN MÁS COMUNES (REFERENCIA)
-- ============================================================================
/*
CÓDIGO  DESCRIPCIÓN
------  -----------
10      Efectivo
11      Consignación bancaria
20      Cheque
30      Crédito
41      Transferencia - depósito en cuenta
42      Tarjeta crédito
43      Tarjeta débito
44      Bono o Tarjeta Regalo
47      Transferencia débito bancaria
48      Pago por medios electrónicos (PSE)
49      Billetera digital / Otro medio electrónico
71      Pago sin utilizar el sistema financiero
99      Otro (no especificado)
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
/*
1. Los códigos DIAN son obligatorios para facturación electrónica
2. El código debe coincidir EXACTAMENTE con el anexo técnico de la DIAN
3. Para pagos mixtos (múltiples formas de pago), usar código 71
4. Si usas un proveedor tecnológico (ej: Alegra, Siigo), verifica sus códigos
5. Resolución vigente: 000042 de 05 de mayo de 2020 (y sus modificaciones)
*/

COMMIT;
