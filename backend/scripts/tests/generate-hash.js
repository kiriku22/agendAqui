const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  console.log('\n🔐 Hash generado para password "admin123":');
  console.log(hash);
  console.log('\n📋 SQL UPDATE:');
  console.log(`UPDATE usuarios SET password = '${hash}' WHERE usuario = 'admin';`);

  // Verificar que el hash funciona
  const isValid = await bcrypt.compare(password, hash);
  console.log(`\n✅ Hash válido: ${isValid}`);
}

generateHash();
