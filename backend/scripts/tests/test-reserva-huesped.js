// Script para probar el resolver Reserva.huesped
require('dotenv').config();
const { ApolloClient, InMemoryCache, HttpLink, gql } = require('@apollo/client');
const fetch = require('cross-fetch');

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:4003/graphql',
    fetch,
    headers: {
      // Token de administrador (reemplaza con un token válido)
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbCI6ImFkbWluIiwiaWF0IjoxNzM0MzI3NzI4LCJleHAiOjE3MzQ0MTQxMjh9.7F5gWvQXxGLg6zQqXCqXzQyXJ5fJLqYZkW3pXs7vE9o'
    }
  }),
  cache: new InMemoryCache()
});

const QUERY_RESERVAS = gql`
  query {
    reservas(estado: pendiente) {
      id
      codigo
      huesped_id
      habitacion_id
      fecha_entrada
      huesped {
        id
        nombre_completo
        tipo_documento
        numero_documento
        telefono
        email
      }
      habitacion {
        id
        numero
        tipo
      }
    }
  }
`;

async function testReservaHuesped() {
  console.log('\n=== TEST: QUERY RESERVAS CON HUESPED ===\n');

  try {
    const result = await client.query({
      query: QUERY_RESERVAS,
      fetchPolicy: 'network-only'
    });

    console.log('✅ Query ejecutada exitosamente\n');
    console.log(`📊 Total reservas: ${result.data.reservas.length}\n`);

    if (result.data.reservas.length > 0) {
      console.log('=== PRIMERA RESERVA ===');
      const primera = result.data.reservas[0];
      console.log('Reserva ID:', primera.id);
      console.log('Código:', primera.codigo);
      console.log('Huesped ID:', primera.huesped_id);
      console.log('\n--- Datos del Huésped ---');
      console.log('Huésped objeto:', JSON.stringify(primera.huesped, null, 2));

      if (primera.huesped) {
        console.log('\n✅ Huésped retornado correctamente:');
        console.log('  - ID:', primera.huesped.id);
        console.log('  - Nombre completo:', primera.huesped.nombre_completo);
        console.log('  - Tipo documento:', primera.huesped.tipo_documento);
        console.log('  - Número documento:', primera.huesped.numero_documento);
        console.log('  - Teléfono:', primera.huesped.telefono || 'N/A');
        console.log('  - Email:', primera.huesped.email || 'N/A');
      } else {
        console.log('\n❌ Huésped es NULL - Field resolver retornó NULL');
      }

      console.log('\n=== TODAS LAS RESERVAS (RESUMEN) ===');
      result.data.reservas.forEach((r, i) => {
        console.log(`\n${i + 1}. Reserva ${r.codigo}:`);
        console.log(`   Huésped ID: ${r.huesped_id}`);
        console.log(`   Huésped nombre: ${r.huesped?.nombre_completo || 'NULL'}`);
        console.log(`   Documento: ${r.huesped?.numero_documento || 'NULL'}`);
      });
    } else {
      console.log('⚠️  No se encontraron reservas pendientes');
    }

  } catch (error) {
    console.error('❌ Error en query:', error.message);
    if (error.graphQLErrors) {
      error.graphQLErrors.forEach(err => {
        console.error('  GraphQL Error:', err.message);
      });
    }
    if (error.networkError) {
      console.error('  Network Error:', error.networkError);
    }
  }
}

testReservaHuesped();
