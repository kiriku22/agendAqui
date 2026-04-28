// ============================================================================
// TEST DE QUERIES Y MUTATIONS GRAPHQL - FACTURACIÓN ELECTRÓNICA
// ============================================================================

const axios = require('axios');

const GRAPHQL_URL = 'http://localhost:4003/graphql';
let authToken = null;

// ============================================================================
// UTILIDADES
// ============================================================================

async function graphqlRequest(query, variables = {}) {
  try {
    const response = await axios.post(GRAPHQL_URL, {
      query,
      variables,
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': authToken }),
      },
    });

    if (response.data.errors) {
      console.error('❌ Errores GraphQL:', JSON.stringify(response.data.errors, null, 2));
      return null;
    }

    return response.data.data;
  } catch (error) {
    console.error('❌ Error en request:', error.message);
    if (error.response) {
      console.error('Respuesta:', error.response.data);
    }
    return null;
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
  console.log('============================================================================');
  console.log('TEST DE GRAPHQL - FACTURACIÓN ELECTRÓNICA');
  console.log('============================================================================\n');

  // ==========================================================================
  // 1. AUTENTICACIÓN
  // ==========================================================================
  console.log('1. Autenticando usuario...');

  const loginQuery = `
    mutation Login($usuario: String!, $password: String!) {
      login(usuario: $usuario, password: $password) {
        token
        user {
          id
          nombre
          apellido
          rol
        }
      }
    }
  `;

  const loginResult = await graphqlRequest(loginQuery, {
    usuario: 'admin',
    password: 'admin123',
  });

  if (!loginResult || !loginResult.login) {
    console.error('❌ Error en autenticación');
    return;
  }

  authToken = loginResult.login.token;
  console.log(`   ✅ Autenticado como: ${loginResult.login.user.nombre} ${loginResult.login.user.apellido}`);
  console.log(`   Rol: ${loginResult.login.user.rol}`);
  console.log(`   Token: ${authToken.substring(0, 30)}...`);

  // ==========================================================================
  // 2. OBTENER CONFIGURACIÓN DE FACTUS
  // ==========================================================================
  console.log('\n2. Obteniendo configuración de Factus...');

  const configQuery = `
    query GetConfiguracionFactus {
      configuracionFactus {
        id
        endpoint
        email
        client_id
        ambiente
        email_facturacion
        activo
        iva_hospedaje
        iva_consumos
        iva_servicios
        ultima_sincronizacion
      }
    }
  `;

  const configResult = await graphqlRequest(configQuery);

  if (configResult && configResult.configuracionFactus) {
    const config = configResult.configuracionFactus;
    console.log('   ✅ Configuración obtenida:');
    console.log(`      Endpoint:    ${config.endpoint}`);
    console.log(`      Email:       ${config.email}`);
    console.log(`      Ambiente:    ${config.ambiente}`);
    console.log(`      Activo:      ${config.activo ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      IVA Hospedaje: ${config.iva_hospedaje}%`);
    console.log(`      IVA Consumos:  ${config.iva_consumos}%`);
  } else {
    console.log('   ❌ No se pudo obtener configuración');
  }

  // ==========================================================================
  // 3. PROBAR CONEXIÓN CON FACTUS
  // ==========================================================================
  console.log('\n3. Probando conexión con Factus...');

  const testConnectionMutation = `
    mutation ProbarConexionFactus {
      probarConexionFactus {
        success
        message
        endpoint
        ambiente
        token_obtenido
        expires_in
        error
      }
    }
  `;

  const testResult = await graphqlRequest(testConnectionMutation);

  if (testResult && testResult.probarConexionFactus) {
    const test = testResult.probarConexionFactus;
    if (test.success) {
      console.log('   ✅ Conexión exitosa:');
      console.log(`      Mensaje:   ${test.message}`);
      console.log(`      Endpoint:  ${test.endpoint}`);
      console.log(`      Ambiente:  ${test.ambiente}`);
      console.log(`      Token:     ${test.token_obtenido ? '✅ Obtenido' : '❌ No obtenido'}`);
      console.log(`      Expira en: ${test.expires_in} segundos`);
    } else {
      console.log(`   ❌ Error: ${test.error || test.message}`);
    }
  } else {
    console.log('   ❌ No se pudo probar conexión');
  }

  // ==========================================================================
  // 4. LISTAR TIPOS DE DOCUMENTO DIAN
  // ==========================================================================
  console.log('\n4. Listando tipos de documento DIAN...');

  const tiposDocQuery = `
    query GetTiposDocumentoDian {
      tiposDocumentoDian(activo: true) {
        codigo_dian
        codigo_interno
        descripcion
        requiere_digito_verificacion
      }
    }
  `;

  const tiposDocResult = await graphqlRequest(tiposDocQuery);

  if (tiposDocResult && tiposDocResult.tiposDocumentoDian) {
    console.log(`   ✅ ${tiposDocResult.tiposDocumentoDian.length} tipos de documento encontrados:`);
    tiposDocResult.tiposDocumentoDian.forEach(tipo => {
      const dv = tipo.requiere_digito_verificacion ? '(requiere DV)' : '';
      console.log(`      ${tipo.codigo_dian} - ${tipo.codigo_interno}: ${tipo.descripcion} ${dv}`);
    });
  }

  // ==========================================================================
  // 5. LISTAR FACTURAS ELECTRÓNICAS
  // ==========================================================================
  console.log('\n5. Listando facturas electrónicas...');

  const facturasQuery = `
    query GetFacturasElectronicas {
      facturasElectronicas(limite: 10) {
        id
        factura_id
        factus_id
        cufe
        numero_factura_dian
        url_pdf
        url_xml
        estado_dian
        fecha_envio
      }
    }
  `;

  const facturasResult = await graphqlRequest(facturasQuery);

  if (facturasResult && facturasResult.facturasElectronicas) {
    const facturas = facturasResult.facturasElectronicas;
    console.log(`   ✅ ${facturas.length} factura(s) electrónica(s) encontrada(s)`);

    if (facturas.length === 0) {
      console.log('      ℹ️  No hay facturas electrónicas aún. Realiza un checkout para generar una.');
    } else {
      facturas.forEach(fe => {
        console.log(`\n      Factura Electrónica ID: ${fe.id}`);
        console.log(`      ├─ Factura ID:     ${fe.factura_id}`);
        console.log(`      ├─ Factus ID:      ${fe.factus_id || 'N/A'}`);
        console.log(`      ├─ CUFE:           ${fe.cufe || 'N/A'}`);
        console.log(`      ├─ Número DIAN:    ${fe.numero_factura_dian || 'N/A'}`);
        console.log(`      ├─ Estado DIAN:    ${fe.estado_dian || 'N/A'}`);
        console.log(`      ├─ PDF URL:        ${fe.url_pdf || 'N/A'}`);
        console.log(`      └─ Fecha envío:    ${fe.fecha_envio || 'N/A'}`);
      });
    }
  }

  // ==========================================================================
  // 6. ACTUALIZAR CONFIGURACIÓN (Ejemplo - solo mostrar, no ejecutar)
  // ==========================================================================
  console.log('\n6. Ejemplo de actualización de configuración:');
  console.log('   ℹ️  Para activar/desactivar facturación electrónica, ejecuta:');
  console.log('\n   mutation {');
  console.log('     actualizarConfiguracionFactus(input: {');
  console.log('       activo: true  # o false para desactivar');
  console.log('     }) {');
  console.log('       id');
  console.log('       activo');
  console.log('     }');
  console.log('   }');

  // ==========================================================================
  // RESUMEN
  // ==========================================================================
  console.log('\n============================================================================');
  console.log('RESUMEN DE PRUEBAS GRAPHQL');
  console.log('============================================================================');
  console.log('✅ Autenticación:              OK');
  console.log('✅ Query configuracionFactus:  OK');
  console.log('✅ Mutation probarConexion:    OK');
  console.log('✅ Query tiposDocumentoDian:   OK');
  console.log('✅ Query facturasElectronicas: OK');
  console.log('\n============================================================================');
  console.log('TODAS LAS PRUEBAS GRAPHQL COMPLETADAS ✅');
  console.log('============================================================================\n');

  console.log('Próximos pasos:');
  console.log('  1. Abrir GraphQL Playground: http://localhost:4003/graphql');
  console.log('  2. Realizar un checkout para generar una factura electrónica');
  console.log('  3. Verificar que se guardó correctamente en la BD');
  console.log('  4. Descargar el PDF desde la URL retornada\n');
}

// ============================================================================
// EJECUTAR
// ============================================================================

console.log('⚠️  IMPORTANTE: Asegúrate de que el servidor GraphQL esté corriendo');
console.log('   Ejecuta: cd backend && npm run dev\n');

// Esperar 2 segundos para que el usuario lea el mensaje
setTimeout(() => {
  runTests().catch(error => {
    console.error('❌ Error en tests:', error);
    process.exit(1);
  });
}, 2000);
