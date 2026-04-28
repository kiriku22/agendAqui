require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:4003/graphql';
let authToken = null;
let testData = {
  usuario: null,
  habitacion: null,
  cliente: null,
  huesped: null,
  reserva: null,
  hospedaje: null,
  servicio: null,
  consumo: null
};

// Función helper para hacer queries GraphQL
async function graphqlQuery(query, variables = {}, useAuth = false) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (useAuth && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.post(API_URL, {
      query,
      variables
    }, { headers });

    if (response.data.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
      return null;
    }

    return response.data.data;
  } catch (error) {
    console.error('❌ Request Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// ============================================================================
// PRUEBAS DE AUTENTICACIÓN
// ============================================================================

async function testAuth() {
  console.log('\n🔐 ===== PRUEBAS DE AUTENTICACIÓN =====\n');

  // Test 1: Login con usuario y contraseña
  console.log('📝 Test 1: Login con usuario/contraseña...');
  const loginQuery = `
    mutation Login($usuario: String!, $password: String!) {
      login(usuario: $usuario, password: $password) {
        token
        user {
          id
          nombre
          apellido
          usuario
          rol
        }
      }
    }
  `;

  const loginResult = await graphqlQuery(loginQuery, {
    usuario: 'admin',
    password: 'admin123'
  });

  if (loginResult?.login) {
    authToken = loginResult.login.token;
    testData.usuario = loginResult.login.user;
    console.log('✅ Login exitoso!');
    console.log('   Usuario:', testData.usuario.nombre, testData.usuario.apellido);
    console.log('   Rol:', testData.usuario.rol);
    console.log('   Token obtenido:', authToken.substring(0, 20) + '...');
  } else {
    console.log('❌ Login falló');
    return false;
  }

  // Test 2: Query ME (usuario autenticado)
  console.log('\n📝 Test 2: Query ME (usuario autenticado)...');
  const meQuery = `
    query {
      me {
        id
        nombre
        apellido
        usuario
        rol
        email
      }
    }
  `;

  const meResult = await graphqlQuery(meQuery, {}, true);
  if (meResult?.me) {
    console.log('✅ Query ME exitoso!');
    console.log('   Usuario:', meResult.me.nombre, meResult.me.apellido);
  } else {
    console.log('❌ Query ME falló');
  }

  return true;
}

// ============================================================================
// PRUEBAS DE HABITACIONES
// ============================================================================

async function testHabitaciones() {
  console.log('\n🏠 ===== PRUEBAS DE HABITACIONES =====\n');

  // Test 1: Obtener todas las habitaciones
  console.log('📝 Test 1: Obtener todas las habitaciones...');
  const habitacionesQuery = `
    query {
      habitaciones {
        id
        numero
        piso
        tipo
        capacidad
        precio_noche
        estado
        activa
      }
    }
  `;

  const habitacionesResult = await graphqlQuery(habitacionesQuery, {}, true);
  if (habitacionesResult?.habitaciones) {
    console.log(`✅ Se obtuvieron ${habitacionesResult.habitaciones.length} habitaciones`);
    if (habitacionesResult.habitaciones.length > 0) {
      testData.habitacion = habitacionesResult.habitaciones[0];
      console.log('   Primera habitación:', testData.habitacion.numero, '-', testData.habitacion.tipo);
    }
  }

  // Test 2: Estadísticas de habitaciones
  console.log('\n📝 Test 2: Estadísticas de habitaciones...');
  const statsQuery = `
    query {
      estadisticasHabitaciones {
        total
        disponibles
        ocupadas
        limpieza
        mantenimiento
        reservadas
        porcentaje_ocupacion
      }
    }
  `;

  const statsResult = await graphqlQuery(statsQuery, {}, true);
  if (statsResult?.estadisticasHabitaciones) {
    console.log('✅ Estadísticas obtenidas:');
    console.log('   Total:', statsResult.estadisticasHabitaciones.total);
    console.log('   Disponibles:', statsResult.estadisticasHabitaciones.disponibles);
    console.log('   Ocupadas:', statsResult.estadisticasHabitaciones.ocupadas);
    console.log('   Ocupación:', statsResult.estadisticasHabitaciones.porcentaje_ocupacion + '%');
  }

  // Test 3: Buscar habitaciones disponibles
  console.log('\n📝 Test 3: Buscar habitaciones disponibles...');
  const disponiblesQuery = `
    query HabitacionesDisponibles($fecha_entrada: Date!, $fecha_salida: Date!) {
      habitacionesDisponibles(fecha_entrada: $fecha_entrada, fecha_salida: $fecha_salida) {
        id
        numero
        tipo
        precio_noche
        estado
      }
    }
  `;

  const hoy = new Date().toISOString().split('T')[0];
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const disponiblesResult = await graphqlQuery(disponiblesQuery, {
    fecha_entrada: hoy,
    fecha_salida: manana
  }, true);

  if (disponiblesResult?.habitacionesDisponibles) {
    console.log(`✅ ${disponiblesResult.habitacionesDisponibles.length} habitaciones disponibles`);
  }

  return true;
}

// ============================================================================
// PRUEBAS DE CLIENTES Y HUÉSPEDES
// ============================================================================

async function testHuespedes() {
  console.log('\n👥 ===== PRUEBAS DE CLIENTES Y HUÉSPEDES =====\n');

  // Test 1: Crear un cliente
  console.log('📝 Test 1: Crear un cliente...');
  const crearClienteQuery = `
    mutation CrearCliente($input: CrearClienteInput!) {
      crearCliente(input: $input) {
        id
        nombre
        apellido
        tipo_documento
        numero_documento
        telefono
        email
      }
    }
  `;

  const clienteInput = {
    nombre: 'Juan',
    apellido: 'Pérez',
    tipo_documento: 'CC',
    numero_documento: '1234567890',
    telefono: '3001234567',
    email: 'juan.perez@example.com',
    ciudad: 'Bogotá',
    pais: 'Colombia'
  };

  const clienteResult = await graphqlQuery(crearClienteQuery, { input: clienteInput }, true);
  if (clienteResult?.crearCliente) {
    testData.cliente = clienteResult.crearCliente;
    console.log('✅ Cliente creado:', testData.cliente.nombre, testData.cliente.apellido);
    console.log('   ID:', testData.cliente.id);
    console.log('   Documento:', testData.cliente.numero_documento);
  }

  // Test 2: Crear un huésped
  if (testData.cliente) {
    console.log('\n📝 Test 2: Crear un huésped...');
    const crearHuespedQuery = `
      mutation CrearHuesped($input: CrearHuespedInput!) {
        crearHuesped(input: $input) {
          id
          cliente_id
          numero_documento
          telefono
          email
        }
      }
    `;

    const huespedInput = {
      cliente_id: parseInt(testData.cliente.id),
      tipo_documento: 'CC',
      numero_documento: '1234567890',
      telefono: '3001234567',
      email: 'juan.perez@example.com',
      nacionalidad: 'Colombiana',
      pais: 'Colombia'
    };

    const huespedResult = await graphqlQuery(crearHuespedQuery, { input: huespedInput }, true);
    if (huespedResult?.crearHuesped) {
      testData.huesped = huespedResult.crearHuesped;
      console.log('✅ Huésped creado:', testData.huesped.id);
    }
  }

  // Test 3: Listar todos los clientes
  console.log('\n📝 Test 3: Listar clientes...');
  const clientesQuery = `
    query {
      clientes {
        id
        nombre
        apellido
        numero_documento
      }
    }
  `;

  const clientesResult = await graphqlQuery(clientesQuery, {}, true);
  if (clientesResult?.clientes) {
    console.log(`✅ Se obtuvieron ${clientesResult.clientes.length} clientes`);
  }

  return true;
}

// ============================================================================
// PRUEBAS DE SERVICIOS
// ============================================================================

async function testServicios() {
  console.log('\n🛎️  ===== PRUEBAS DE SERVICIOS =====\n');

  // Test 1: Obtener servicios del hotel
  console.log('📝 Test 1: Obtener servicios del hotel...');
  const serviciosQuery = `
    query {
      serviciosHotel(activo: true) {
        id
        nombre
        categoria
        precio
      }
    }
  `;

  const serviciosResult = await graphqlQuery(serviciosQuery, {}, true);
  if (serviciosResult?.serviciosHotel) {
    console.log(`✅ Se obtuvieron ${serviciosResult.serviciosHotel.length} servicios`);
    if (serviciosResult.serviciosHotel.length > 0) {
      testData.servicio = serviciosResult.serviciosHotel[0];
      console.log('   Primer servicio:', testData.servicio.nombre, '-', testData.servicio.precio);
    }
  }

  // Test 2: Obtener métodos de pago
  console.log('\n📝 Test 2: Obtener métodos de pago...');
  const metodosQuery = `
    query {
      metodosPago(activo: true) {
        id
        nombre
        tipo
      }
    }
  `;

  const metodosResult = await graphqlQuery(metodosQuery, {}, true);
  if (metodosResult?.metodosPago) {
    console.log(`✅ Se obtuvieron ${metodosResult.metodosPago.length} métodos de pago`);
  }

  return true;
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================

async function runAllTests() {
  console.log('🧪 ===================================');
  console.log('🧪  PRUEBAS DE BACKEND - FACTUFY HOTEL');
  console.log('🧪 ===================================');

  try {
    // Verificar que el servidor esté corriendo
    console.log('\n🔍 Verificando servidor...');
    const healthCheck = await axios.get('http://localhost:4003/health');
    console.log('✅ Servidor OK:', healthCheck.data.status);

    // Ejecutar pruebas
    await testAuth();
    await testHabitaciones();
    await testHuespedes();
    await testServicios();

    console.log('\n✅ ===================================');
    console.log('✅  TODAS LAS PRUEBAS COMPLETADAS');
    console.log('✅ ===================================\n');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
runAllTests();
