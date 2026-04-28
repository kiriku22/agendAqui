import { useQuery } from '@apollo/client';
import { Plane, BedDouble, DoorOpen, AlertTriangle, Clock } from 'lucide-react';
import { GET_ALERTAS_RESERVAS } from '../../graphql/reservas';
import './AlertasReservas.css';

function AlertasReservas({ onFilterClick, filtroActivo }) {
  const { data, loading } = useQuery(GET_ALERTAS_RESERVAS, {
    pollInterval: 60000, // Actualizar cada minuto
    fetchPolicy: 'network-only'
  });

  const alertas = data?.alertasReservas;

  const tarjetas = [
    {
      key: 'llegadas',
      label: 'Llegadas Hoy',
      valor: alertas?.llegadasHoy ?? '—',
      icon: Plane,
      color: 'blue',
      filtro: 'llegadas'
    },
    {
      key: 'enCurso',
      label: 'En Curso',
      valor: alertas?.enCurso ?? '—',
      icon: BedDouble,
      color: 'green',
      filtro: 'en_curso'
    },
    {
      key: 'salidas',
      label: 'Salidas Hoy',
      valor: alertas?.salidasHoy ?? '—',
      icon: DoorOpen,
      color: 'red',
      filtro: 'salidas'
    },
    {
      key: 'late',
      label: 'Late Check-out',
      valor: alertas?.lateCheckouts ?? '—',
      icon: AlertTriangle,
      color: 'orange',
      filtro: 'late',
      pulse: alertas?.lateCheckouts > 0
    },
    {
      key: 'pendientes',
      label: 'Pendientes',
      valor: alertas?.pendientesSinConfirmar ?? '—',
      icon: Clock,
      color: 'yellow',
      filtro: 'pendientes'
    }
  ];

  return (
    <div className={`alertas-reservas ${loading ? 'alertas-reservas--loading' : ''}`}>
      {tarjetas.map((tarjeta) => {
        const Icon = tarjeta.icon;
        const isActive = filtroActivo === tarjeta.filtro;
        const hasValue = typeof tarjeta.valor === 'number' && tarjeta.valor > 0;

        return (
          <button
            key={tarjeta.key}
            className={`alerta-card alerta-card--${tarjeta.color}${isActive ? ' alerta-card--active' : ''}${tarjeta.pulse ? ' alerta-card--pulse' : ''}`}
            onClick={() => onFilterClick?.(isActive ? null : tarjeta.filtro)}
            title={isActive ? 'Quitar filtro' : `Filtrar por: ${tarjeta.label}`}
          >
            <div className="alerta-card__icon">
              <Icon size={18} />
            </div>
            <div className="alerta-card__info">
              <span className="alerta-card__valor">
                {loading ? '...' : tarjeta.valor}
              </span>
              <span className="alerta-card__label">{tarjeta.label}</span>
            </div>
            {hasValue && <span className="alerta-card__dot" />}
          </button>
        );
      })}
    </div>
  );
}

export default AlertasReservas;
