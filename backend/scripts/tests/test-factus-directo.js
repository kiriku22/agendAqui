const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

// Función para calcular DV del NIT
function calcularDV(nit) {
  const nitLimpio = nit.toString().replace(/[^0-9]/g, '');
  const primos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

  let suma = 0;
  const digitos = nitLimpio.split('').reverse();

  for (let i = 0; i < digitos.length && i < primos.length; i++) {
    suma += parseInt(digitos[i]) * primos[i];
  }

  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

// Mapeo de municipio DANE a ID de Factus
function mapearMunicipio(codigoDane) {
  const mapping = {
    '11001': 149,   // Bogotá D.C. - ID correcto de Factus
    '05001': 17,
    '76001': 1050,
  };
  return mapping[codigoDane] || 149;
}

// Mapeo tipo documento
function mapearTipoDoc(tipo) {
  const mapping = {
    'CC': 1,    // Cédula de ciudadanía - ID Factus
    'NIT': 6,   // NIT - ID Factus
    'CE': 4,    // Cédula extranjería
    'PA': 2,    // Pasaporte
    'TI': 3,    // Tarjeta identidad
  };
  return mapping[tipo] || 1;
}

async function testFactusDirecto(facturaElectronicaId) {
  try {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🧪 TEST DIRECTO FACTUS - Factura Electrónica ID ${facturaElectronicaId}`);
    console.log(`${'═'.repeat(70)}\n`);

    // 1. Obtener configuración de Factus
    const configResult = await pool.query(`
      SELECT * FROM configuracion_factus WHERE activo = true LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      console.log('❌ No hay configuración de Factus activa');
      return;
    }

    const config = configResult.rows[0];
    console.log('📋 Configuración Factus:');
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  Ambiente: ${config.ambiente}`);
    console.log(`  Client ID: ${config.client_id ? '***' + config.client_id.slice(-4) : 'N/A'}`);

    // 2. Obtener token
    console.log('\n🔐 Obteniendo token de autenticación...');

    let token;
    try {
      const tokenResponse = await axios.post(
        `${config.endpoint}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: config.client_id,
          client_secret: config.client_secret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      token = tokenResponse.data.access_token;
      console.log('  ✅ Token obtenido correctamente');
    } catch (authError) {
      console.log('  ❌ Error de autenticación:', authError.response?.data || authError.message);
      return;
    }

    // 3. Obtener datos de factura electrónica
    const feResult = await pool.query(`
      SELECT fe.*, f.tipo_factura
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = $1
    `, [facturaElectronicaId]);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura electrónica no encontrada');
      return;
    }

    const fe = feResult.rows[0];
    console.log('\n📄 Datos de la factura:');
    console.log(`  Cliente: ${fe.cliente_nombre}`);
    console.log(`  Documento: ${fe.cliente_tipo_documento} ${fe.cliente_numero_documento}`);

    // 4. Construir payload para Factus
    const esNIT = fe.cliente_tipo_documento === 'NIT';
    const dv = esNIT ? calcularDV(fe.cliente_numero_documento) : undefined;

    const items = (fe.items_consumos || []).map((item, idx) => ({
      code_reference: item.codigo || `ITEM-${idx + 1}`,
      name: item.descripcion || 'Producto',
      quantity: parseInt(item.cantidad) || 1,
      discount_rate: 0,
      price: parseFloat(item.precio_unitario) || 0,
      tax_rate: parseFloat(item.iva_porcentaje || 0).toFixed(2),
      unit_measure_id: 70,
      standard_code_id: 1,
      is_excluded: parseFloat(item.iva_porcentaje || 0) === 0 ? 1 : 0,
      tribute_id: parseFloat(item.iva_porcentaje || 0) > 0 ? 1 : 0
    }));

    const facturaData = {
      document: "01",
      numbering_range_id: config.numbering_range_id || 8, // ID del rango de numeración en Factus
      reference_code: fe.numero_factura_electronica || `FE-${facturaElectronicaId}`,
      observation: 'Factura de venta POS',
      payment_method_code: "10", // Contado

      customer: {
        identification_document_id: mapearTipoDoc(fe.cliente_tipo_documento),
        identification: fe.cliente_numero_documento,
        dv: dv,
        company: esNIT ? fe.cliente_nombre : undefined,
        names: !esNIT ? fe.cliente_nombre : undefined,
        address: fe.cliente_direccion || 'No especificada',
        email: fe.cliente_email || config.email_facturacion,
        phone: fe.cliente_telefono || '0000000',
        legal_organization_id: esNIT ? 1 : 2,
        tribute_id: 21,
        municipality_id: mapearMunicipio(fe.cliente_codigo_municipio_dane)
      },

      items: items
    };

    // Limpiar campos undefined
    if (!esNIT) {
      delete facturaData.customer.dv;
      delete facturaData.customer.company;
    } else {
      delete facturaData.customer.names;
    }

    console.log('\n📤 Payload a enviar a Factus:');
    console.log(JSON.stringify(facturaData, null, 2));

    // 5. Enviar a Factus
    console.log('\n📡 Enviando a Factus...');

    try {
      const response = await axios.post(
        `${config.endpoint}/v1/bills/validate`,
        facturaData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 60000,
          validateStatus: () => true // No lanzar error para ningún status
        }
      );

      console.log('\n📥 Respuesta de Factus:');
      console.log(`  Status HTTP: ${response.status}`);
      console.log(`  Data:`);
      console.log(JSON.stringify(response.data, null, 2));

      if (response.status >= 400) {
        console.log('\n❌ ERROR DE FACTUS:');
        if (response.data.errors) {
          Object.entries(response.data.errors).forEach(([field, errors]) => {
            console.log(`  Campo "${field}":`);
            if (Array.isArray(errors)) {
              errors.forEach(err => console.log(`    - ${err}`));
            } else {
              console.log(`    - ${errors}`);
            }
          });
        }
        if (response.data.message) {
          console.log(`  Mensaje: ${response.data.message}`);
        }
      } else {
        console.log('\n✅ FACTURA ENVIADA EXITOSAMENTE');
        if (response.data.data) {
          console.log(`  CUFE: ${response.data.data.cufe || response.data.data.bill?.cufe}`);
          console.log(`  Número: ${response.data.data.number || response.data.data.bill?.number}`);
        }
      }

    } catch (apiError) {
      console.log('\n❌ Error de conexión:', apiError.message);
      if (apiError.response) {
        console.log('Respuesta:', JSON.stringify(apiError.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function main() {
  await testFactusDirecto(18);
  await testFactusDirecto(19);
  await pool.end();
}

main();
