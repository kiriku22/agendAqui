import { useState } from 'react';
import {
  Building,
  Bed,
  CreditCard,
  Users,
  ChevronRight,
} from 'lucide-react';
import ModalDatosHotel from '../components/configuracion/ModalDatosHotel';
import ModalMetodosPago from '../components/configuracion/ModalMetodosPago';
import ModalTiposHabitacion from '../components/configuracion/ModalTiposHabitacion';
import ModalUsuarios from '../components/configuracion/ModalUsuarios';
import ModalClientes from '../components/configuracion/ModalClientes';
import PasswordModal from '../components/configuracion/PasswordModal';
import './Configuracion.css';

// Modulos ocultos - proyecto universitario
// import { useNavigate } from 'react-router-dom';
// import { Clock, Share2, Bell, Package, FileText, Hash, Shield, Key } from 'lucide-react';
// import ModalParametrosGenerales from '../components/configuracion/ModalParametrosGenerales';
// import ModalCanalesReserva from '../components/configuracion/ModalCanalesReserva';
// import ModalNotificaciones from '../components/configuracion/ModalNotificaciones';
// import ConfiguracionFacturacion from '../components/facturacion/ConfiguracionFacturacion';
// import ModalConsecutivos from '../components/configuracion/ModalConsecutivos';
// import ModalPermisos from '../components/configuracion/ModalPermisos';
// import ModalTRA from '../components/configuracion/ModalTRA';

function Configuracion() {
  const [modalActivo, setModalActivo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const configCards = [
    {
      id: 'datos-hotel',
      titulo: 'Datos del Hotel',
      descripcion: 'Información legal y datos del establecimiento',
      icon: <Building size={28} />,
      color: 'primary',
      permiso: 'admin',
      onClick: () => setModalActivo('datos-hotel')
    },
    {
      id: 'tipos-habitacion',
      titulo: 'Tipos de Habitación',
      descripcion: 'Gestionar catálogo de tipos, capacidades y precios base',
      icon: <Bed size={28} />,
      color: 'info',
      permiso: 'admin',
      onClick: () => setModalActivo('tipos-habitacion')
    },
    {
      id: 'metodos-pago',
      titulo: 'Métodos de Pago',
      descripcion: 'Activar o desactivar métodos de pago disponibles',
      icon: <CreditCard size={28} />,
      color: 'warning',
      permiso: 'admin',
      onClick: () => setModalActivo('metodos-pago')
    },
    {
      id: 'usuarios',
      titulo: 'Usuarios y Roles',
      descripcion: 'Gestionar usuarios, permisos y contraseñas',
      icon: <Users size={28} />,
      color: 'danger',
      permiso: 'admin',
      onClick: () => setModalActivo('usuarios')
    },
    {
      id: 'clientes',
      titulo: 'Gestión de Clientes',
      descripcion: 'Registro maestro de clientes',
      icon: <Users size={28} />,
      color: 'info',
      permiso: 'all',
      onClick: () => setModalActivo('clientes')
    },
  ];

  if (!isAuthenticated) {
    return <PasswordModal onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="configuracion-page">
      <div className="configuracion-header">
        <h1 className="configuracion-title">Configuración del Sistema</h1>
        <p className="configuracion-subtitle">
          Administra todos los aspectos de la configuración del hotel desde un solo lugar
        </p>
      </div>

      <div className="config-grid">
        {configCards.map(card => (
          <div
            key={card.id}
            className={`config-card ${card.wide ? 'config-card--wide' : ''}`}
            onClick={card.onClick}
          >
            <div className="config-card__header">
              <div className={`config-card__icon config-card__icon--${card.color}`}>
                {card.icon}
              </div>
              <div className="config-card__content">
                <h3 className="config-card__title">{card.titulo}</h3>
                <p className="config-card__description">{card.descripcion}</p>
              </div>
            </div>

            <div className="config-card__footer">
              <div className="config-card__action">
                <span>Configurar</span>
                <ChevronRight size={16} />
              </div>
              <span className={`config-card__badge config-card__badge--${card.permiso === 'admin' ? 'admin' : 'all'}`}>
                {card.permiso === 'admin' ? 'Admin' : 'Todos'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modales de Configuración */}
      {modalActivo === 'datos-hotel' && (
        <ModalDatosHotel onClose={() => setModalActivo(null)} />
      )}

      {modalActivo === 'tipos-habitacion' && (
        <ModalTiposHabitacion onClose={() => setModalActivo(null)} />
      )}

      {modalActivo === 'metodos-pago' && (
        <ModalMetodosPago onClose={() => setModalActivo(null)} />
      )}

      {modalActivo === 'usuarios' && (
        <ModalUsuarios onClose={() => setModalActivo(null)} />
      )}

      {modalActivo === 'clientes' && (
        <ModalClientes onClose={() => setModalActivo(null)} />
      )}
    </div>
  );
}

export default Configuracion;
