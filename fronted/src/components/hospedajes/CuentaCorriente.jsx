import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUENTA_HOSPEDAJE } from '../../graphql/hospedajes';
import { Receipt, Bed, ShoppingCart, DollarSign } from 'lucide-react';
import Loading from '../shared/Loading';
import './CuentaCorriente.css';

function CuentaCorriente({ hospedajeId, fechaSalida, onTotalChange }) {
  const { data, loading, error, refetch } = useQuery(GET_CUENTA_HOSPEDAJE, {
    variables: {
      hospedajeId: parseInt(hospedajeId),
      fechaSalida: fechaSalida || null
    },
    skip: !hospedajeId
  });

  const cuenta = data?.cuentaHospedaje;

  // Refetch cuando cambia la fecha de salida
  useEffect(() => {
    if (fechaSalida && hospedajeId) {
      refetch({
        hospedajeId: parseInt(hospedajeId),
        fechaSalida: fechaSalida
      });
    }
  }, [fechaSalida, hospedajeId, refetch]);

  // Notificar cambios de total al padre
  useEffect(() => {
    if (cuenta && onTotalChange) {
      onTotalChange(cuenta.total);
    }
  }, [cuenta?.total, onTotalChange]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) return <Loading />;
  if (error) return <div className="cuenta-error">Error al cargar cuenta: {error.message}</div>;
  if (!cuenta) return <div className="cuenta-empty">No se encontró información de la cuenta</div>;

  return (
    <div className="cuenta-corriente">
      {/* Header */}
      <div className="cuenta-header">
        <div className="cuenta-titulo">
          <Receipt size={20} />
          <h3>Cuenta Corriente</h3>
        </div>
        <div className="cuenta-codigo">{cuenta.codigo}</div>
      </div>

      {/* Sección Hospedaje */}
      <div className="cuenta-seccion">
        <div className="seccion-titulo">
          <Bed size={18} />
          <h4>Hospedaje</h4>
        </div>
        <div className="seccion-contenido">
          <div className="cuenta-item">
            <span className="item-descripcion">
              {cuenta.noches} {cuenta.noches === 1 ? 'noche' : 'noches'} × {formatPrice(cuenta.precio_noche)}
            </span>
            <span className="item-valor">{formatPrice(cuenta.subtotal_hospedaje)}</span>
          </div>
        </div>
        <div className="seccion-subtotal">
          <span>Subtotal Hospedaje:</span>
          <span className="subtotal-valor">{formatPrice(cuenta.subtotal_hospedaje)}</span>
        </div>
      </div>

      {/* Sección Consumos */}
      <div className="cuenta-seccion">
        <div className="seccion-titulo">
          <ShoppingCart size={18} />
          <h4>Consumos y Servicios</h4>
        </div>
        <div className="seccion-contenido">
          {!cuenta.consumos || cuenta.consumos.length === 0 ? (
            <div className="consumos-empty">
              <p>No hay consumos registrados</p>
            </div>
          ) : (
            cuenta.consumos.map((consumo, index) => (
              <div key={index} className="cuenta-item">
                <div className="item-info">
                  <span className="item-nombre">{consumo.descripcion}</span>
                  <span className="item-detalle">
                    {consumo.cantidad} × {formatPrice(consumo.precio_unitario)}
                    {consumo.fecha && (
                      <span className="item-fecha"> • {formatDate(consumo.fecha)}</span>
                    )}
                  </span>
                </div>
                <span className="item-valor">{formatPrice(consumo.precio_total)}</span>
              </div>
            ))
          )}
        </div>
        <div className="seccion-subtotal">
          <span>Subtotal Consumos:</span>
          <span className="subtotal-valor">{formatPrice(cuenta.subtotal_consumos)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="cuenta-total">
        <div className="total-row">
          <DollarSign size={20} />
          <span className="total-label">Total a Pagar:</span>
          <span className="total-valor">{formatPrice(cuenta.total)}</span>
        </div>
        {cuenta.pagado > 0 && (
          <>
            <div className="total-detalle">
              <span>Pagado:</span>
              <span>{formatPrice(cuenta.pagado)}</span>
            </div>
            <div className={`total-detalle ${cuenta.saldo > 0 ? 'saldo-pendiente' : 'saldo-completo'}`}>
              <span>Saldo:</span>
              <span className="saldo-valor">{formatPrice(cuenta.saldo)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CuentaCorriente;