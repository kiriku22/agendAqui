const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

// Función para calcular dígito de verificación NIT
function calcularDV(nit) {
  const nitStr = nit.toString().replace(/\D/g, '');
  const primos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let suma = 0;
  const nitArray = nitStr.split('').reverse();
  for (let i = 0; i < nitArray.length; i++) {
    suma += parseInt(nitArray[i]) * primos[i];
  }
  const residuo = suma % 11;
  return residuo > 1 ? (11 - residuo).toString() : residuo.toString();
}

async function probarTransmision(facturaElectronicaId) {
  try {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🔍 PROBANDO TRANSMISIÓN - FACTURA ELECTRÓNICA ID: ${facturaElectronicaId}`);
    console.log(`${'═'.repeat(80)}\n`);

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

    // 2. Obtener token
    console.log('\n🔐 Obteniendo token...');
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('client_id', config.client_id);
    formData.append('client_secret', config.client_secret);
    formData.append('username', config.email);
    formData.append('password', config.password);

    const tokenResponse = await axios.post(
      `${config.endpoint}/oauth/token`,
      formData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const token = tokenResponse.data.access_token;
    console.log(`  ✅ Token obtenido: ${token.substring(0, 30)}...`);

    // 3. Obtener datos de la factura electrónica
    const feResult = await pool.query(`
      SELECT fe.*, f.tipo_factura, f.numero_factura as numero_factura_original
      FROM facturas_electronicas fe
      LEFT JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = $1
    `, [facturaElectronicaId]);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura electrónica no encontrada');
      return;
    }

    const fe = feResult.rows[0];

    console.log('\n📄 Datos de la factura:');
    console.log(`  Tipo: ${fe.tipo_factura}`);
    console.log(`  Total: $${fe.total}`);
    console.log(`  IVA: $${fe.total_impuestos}`);
    console.log(`  Cliente: ${fe.cliente_nombre} (${fe.cliente_tipo_documento} ${fe.cliente_numero_documento})`);
    console.log(`  Email: ${fe.cliente_email}`);
    console.log(`  Teléfono: ${fe.cliente_telefono}`);
    console.log(`  Dirección: ${fe.cliente_direccion}`);
    console.log(`  Municipio DANE: ${fe.cliente_codigo_municipio_dane}`);

    // 4. Construir payload EXACTAMENTE como lo hace FactusService
    const esNIT = fe.cliente_tipo_documento === 'NIT';
    const clienteDocumento = fe.cliente_numero_documento || '222222222222';

    // Mapeo de tipo documento a ID de Factus
    const tipoDocMapping = {
      'CC': 3, 'NIT': 6, 'CE': 4, 'PA': 5, 'TI': 2, 'RC': 1
    };
    const tipoDocId = tipoDocMapping[fe.cliente_tipo_documento] || 3;

    // Construir items
    const items = (fe.items_consumos || []).map((item, index) => {
      const ivaPorcentaje = parseFloat(item.iva_porcentaje ?? 19);
      const esExcluido = ivaPorcentaje === 0;

      return {
        code_reference: item.codigo || `POS-ITEM-${index + 1}`,
        name: item.descripcion || 'Producto POS',
        quantity: parseInt(item.cantidad) || 1,
        discount_rate: 0,
        price: parseFloat(item.precio_unitario) || 0,
        tax_rate: ivaPorcentaje.toFixed(2),
        unit_measure_id: 70,
        standard_code_id: 1,
        is_excluded: esExcluido ? 1 : 0,
        tribute_id: 1 // SIEMPRE 1 (IVA) - incluso para items excluidos
      };
    });

    console.log(`\n📦 Items (${items.length}):`);
    items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name}`);
      console.log(`     precio: $${item.price}, cantidad: ${item.quantity}`);
      console.log(`     tax_rate: ${item.tax_rate}%, is_excluded: ${item.is_excluded}, tribute_id: ${item.tribute_id}`);
    });

    // Mapear municipio a ID de Factus (simplificado - usar 149 para Bogotá)
    const municipioId = fe.cliente_codigo_municipio_dane === '11001' ? 149 : 149;

    const facturaData = {
      document: "01",
      reference_code: fe.numero_factura_electronica || `POS-${Date.now()}`,
      observation: 'Factura de venta POS',
      payment_method_code: "10", // Efectivo

      customer: {
        identification_document_id: tipoDocId,
        identification: clienteDocumento,
        ...(esNIT && { dv: calcularDV(clienteDocumento) }),
        ...(esNIT ? { company: fe.cliente_nombre } : { names: fe.cliente_nombre }),
        address: fe.cliente_direccion || 'No especificada',
        email: fe.cliente_email || config.email_facturacion,
        phone: fe.cliente_telefono || '0000000000',
        legal_organization_id: esNIT ? 1 : 2,
        tribute_id: 21,
        municipality_id: municipioId
      },

      items: items
    };

    console.log('\n📤 PAYLOAD A ENVIAR:');
    console.log(JSON.stringify(facturaData, null, 2));

    // 5. Enviar a Factus
    console.log('\n🚀 Enviando a Factus...');

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
          validateStatus: () => true // No lanzar error por status HTTP
        }
      );

      console.log(`\n📥 RESPUESTA DE FACTUS:`);
      console.log(`  Status HTTP: ${response.status}`);
      console.log(`  Data:`);
      console.log(JSON.stringify(response.data, null, 2));

      if (response.status >= 400) {
        console.log('\n❌ ERROR DE FACTUS:');
        if (response.data.errors) {
          Object.entries(response.data.errors).forEach(([field, errors]) => {
            console.log(`  Campo "${field}": ${Array.isArray(errors) ? errors.join(', ') : errors}`);
          });
        }
        if (response.data.message) {
          console.log(`  Mensaje: ${response.data.message}`);
        }
      } else {
        console.log('\n✅ FACTURA ENVIADA EXITOSAMENTE');
        if (response.data.data) {
          console.log(`  CUFE: ${response.data.data.cufe || response.data.data.bill?.cufe}`);
          console.log(`  Número DIAN: ${response.data.data.number || response.data.data.bill?.number}`);
        }
      }

    } catch (axiosError) {
      console.log('\n❌ ERROR DE AXIOS:');
      console.log(`  Message: ${axiosError.message}`);
      if (axiosError.response) {
        console.log(`  Status: ${axiosError.response.status}`);
        console.log(`  Data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function main() {
  // Probar solo factura 19 (la que tenía error con propina)
  await probarTransmision(19);

  await pool.end();
}

main();
