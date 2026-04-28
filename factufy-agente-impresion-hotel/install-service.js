const Service = require('node-windows').Service;
const path = require('path');

// Crear objeto de servicio
const svc = new Service({
  name: 'Factufy Agente Impresion',
  description: 'Agente local de impresión para Factufy Restaurante - Procesa cola de impresión',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Escuchar eventos de instalación
svc.on('install', () => {
  console.log('✅ Servicio instalado correctamente');
  console.log('');
  console.log('Para iniciar el servicio, ejecute:');
  console.log('  net start "Factufy Agente Impresion"');
  console.log('');
  console.log('O use el Administrador de Servicios de Windows (services.msc)');
  console.log('');
  console.log('El panel web estará disponible en: http://localhost:3050');
  console.log('');

  // Iniciar el servicio automáticamente
  svc.start();
});

svc.on('start', () => {
  console.log('✅ Servicio iniciado');
  console.log('');
  console.log('Puede acceder al panel web en: http://localhost:3050');
});

svc.on('alreadyinstalled', () => {
  console.log('⚠️  El servicio ya está instalado');
  console.log('');
  console.log('Para desinstalarlo primero, ejecute:');
  console.log('  pnpm run uninstall-service');
});

svc.on('error', (err) => {
  console.error('❌ Error instalando servicio:', err);
});

// Instalar el servicio
console.log('='.repeat(60));
console.log('Instalando Factufy Agente de Impresión como servicio...');
console.log('='.repeat(60));
console.log('');
console.log('NOTA: Este proceso requiere permisos de administrador');
console.log('');

svc.install();
