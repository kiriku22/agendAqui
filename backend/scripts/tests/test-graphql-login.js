const fetch = require('node-fetch');

async function testGraphQLLogin() {
  try {
    console.log('\n🧪 Probando login vía GraphQL endpoint...\n');

    const query = `
      mutation {
        login(usuario: "admin", password: "admin123") {
          token
          user {
            id
            nombre
            usuario
            rol
          }
        }
      }
    `;

    console.log('Endpoint:', 'http://localhost:4003/graphql');
    console.log('Query:', query);
    console.log('\nEnviando request...\n');

    const response = await fetch('http://localhost:4003/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.data && result.data.login) {
      console.log('\n✅ ¡LOGIN EXITOSO VÍA GRAPHQL!');
      console.log('Token recibido:', result.data.login.token.substring(0, 20) + '...');
      console.log('Usuario:', result.data.login.user);
    } else if (result.errors) {
      console.log('\n❌ Error en GraphQL:');
      result.errors.forEach(err => {
        console.log('  -', err.message);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testGraphQLLogin();