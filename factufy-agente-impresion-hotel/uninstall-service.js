const Service = require('node-windows').Service;
const path = require('path');

// Crear objeto de servicio (debe coincidir con install-service.js)
const svc = new Service({
  name: 'Factufy Agente Impresion',
  script: path.join(__dirname, 'index.js')
});

// Escuchar eventos de desinstalación
svc.on('uninstall', () => {
  console.log('✅ Servicio desinstalado correctamente');
  console.log('');
  console.log('El servicio ha sido removido del sistema');
});

svc.on('alreadyuninstalled', () => {
  console.log('⚠️  El servicio no está instalado');
});

svc.on('error', (err) => {
  console.error('❌ Error desinstalando servicio:', err);
});

// Desinstalar el servicio
console.log('='.repeat(60));
console.log('Desinstalando Factufy Agente de Impresión...');
console.log('='.repeat(60));
console.log('');
console.log('NOTA: Este proceso requiere permisos de administrador');
console.log('');

svc.uninstall();
