/**
 * Script para configurar/actualizar datos de Factus
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87',
});

async function configurarFactus() {
  try {
    console.log('🔧 Configurando Factus...\n');

    // Verificar si existe configuración activa
    const existente = await pool.query('SELECT * FROM configuracion_factus WHERE activo = true LIMIT 1');

    if (existente.rows.length > 0) {
      console.log('✅ Ya existe configuración activa:');
      console.log('   NIT:', existente.rows[0].nit || 'NO CONFIGURADO');
      console.log('   Razón Social:', existente.rows[0].razon_social || 'NO CONFIGURADO');
      console.log('   Ambiente:', existente.rows[0].ambiente);
      console.log('\n📝 Actualizando datos faltantes...\n');

      // Actualizar campos faltantes
      await pool.query(`
        UPDATE configuracion_factus
        SET
          nit = COALESCE(nit, '900123456'),
          digito_verificacion = COALESCE(digito_verificacion, '7'),
          razon_social = COALESCE(razon_social, 'HOTEL EJEMPLO SAS'),
          nombre_comercial = COALESCE(nombre_comercial, 'Hotel Ejemplo'),
          direccion = COALESCE(direccion, 'Calle 123 # 45-67'),
          telefono = COALESCE(telefono, '601234567'),
          email_facturacion = COALESCE(email_facturacion, 'facturacion@hotelexample.com'),
          codigo_municipio_dane = COALESCE(codigo_municipio_dane, '11001'),
          regimen_tributario = COALESCE(regimen_tributario, 'comun'),
          tipo_persona = COALESCE(tipo_persona, 'juridica'),
          responsabilidades_fiscales = COALESCE(
            responsabilidades_fiscales,
            '[{"code": "O-13", "name": "Gran contribuyente"}]'::jsonb
          ),
          resolucion_dian = COALESCE(resolucion_dian, '18760000001'),
          prefijo_factura = COALESCE(prefijo_factura, 'SETP'),
          numero_inicial_factura = COALESCE(numero_inicial_factura, 990000001),
          numero_final_factura = COALESCE(numero_final_factura, 995000000),
          numero_actual_factura = COALESCE(numero_actual_factura, 990000001),
          fecha_inicio_resolucion = COALESCE(fecha_inicio_resolucion, '2024-01-01'),
          fecha_fin_resolucion = COALESCE(fecha_fin_resolucion, '2026-12-31'),
          iva_hospedaje = COALESCE(iva_hospedaje, 0),
          iva_consumos = COALESCE(iva_consumos, 19),
          iva_servicios = COALESCE(iva_servicios, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE activo = true
      `);

      console.log('✅ Configuración actualizada correctamente\n');

    } else {
      console.log('⚠️  No existe configuración activa. Creando una nueva...\n');

      await pool.query(`
        INSERT INTO configuracion_factus (
          endpoint,
          email,
          password,
          client_id,
          client_secret,
          ambiente,
          activo,
          nit,
          digito_verificacion,
          razon_social,
          nombre_comercial,
          direccion,
          telefono,
          email_facturacion,
          codigo_municipio_dane,
          regimen_tributario,
          tipo_persona,
          responsabilidades_fiscales,
          resolucion_dian,
          prefijo_factura,
          numero_inicial_factura,
          numero_final_factura,
          numero_actual_factura,
          fecha_inicio_resolucion,
          fecha_fin_resolucion,
          iva_hospedaje,
          iva_consumos,
          iva_servicios
        ) VALUES (
          'https://api-sandbox.factus.com.co',
          'sandbox@factus.com.co',
          'sandbox2024%',
          'a02b4bd9-8b3a-4f24-9c93-70a950a89246',
          'e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
          'sandbox',
          true,
          '900123456',
          '7',
          'HOTEL EJEMPLO SAS',
          'Hotel Ejemplo',
          'Calle 123 # 45-67',
          '601234567',
          'facturacion@hotelexample.com',
          '11001',
          'comun',
          'juridica',
          '[{"code": "O-13", "name": "Gran contribuyente"}]'::jsonb,
          '18760000001',
          'SETP',
          990000001,
          995000000,
          990000001,
          '2024-01-01',
          '2026-12-31',
          0,
          19,
          0
        )
      `);

      console.log('✅ Configuración creada correctamente\n');
    }

    // Mostrar configuración final
    const final = await pool.query('SELECT * FROM configuracion_factus WHERE activo = true LIMIT 1');
    const config = final.rows[0];

    console.log('📋 CONFIGURACIÓN FINAL:');
    console.log('========================');
    console.log('NIT:', config.nit, '-', config.digito_verificacion);
    console.log('Razón Social:', config.razon_social);
    console.log('Nombre Comercial:', config.nombre_comercial);
    console.log('Dirección:', config.direccion);
    console.log('Teléfono:', config.telefono);
    console.log('Email:', config.email_facturacion);
    console.log('Municipio DANE:', config.codigo_municipio_dane);
    console.log('Régimen:', config.regimen_tributario);
    console.log('\nResolución DIAN:', config.resolucion_dian);
    console.log('Prefijo:', config.prefijo_factura);
    console.log('Rango:', config.numero_inicial_factura, '-', config.numero_final_factura);
    console.log('Vigencia:', config.fecha_inicio_resolucion, 'hasta', config.fecha_fin_resolucion);
    console.log('\n✅ Configuración completada!\n');

    console.log('⚠️  IMPORTANTE: Estos son datos de EJEMPLO.');
    console.log('   Debes actualizarlos con los datos reales de tu hotel.');
    console.log('   Puedes hacerlo editando directamente en la base de datos o creando');
    console.log('   una interfaz de configuración en el frontend.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

configurarFactus();
