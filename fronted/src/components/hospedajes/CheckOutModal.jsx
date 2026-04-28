import { useState, useEffect } from 'react';
import { useMutation, useApolloClient } from '@apollo/client';
import { CHECK_OUT, VERIFY_HOSPEDAJE_ESTADO } from '../../graphql/hospedajes';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import SuccessModal from '../shared/SuccessModal';
import CuentaCorriente from './CuentaCorriente';
import SeleccionMetodosPago from './SeleccionMetodosPago';
import { Calendar, CreditCard, FileText, AlertCircle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import './CheckOutModal.css';

function CheckOutModal({ isOpen, onClose, hospedaje, onSuccess }) {
  const client = useApolloClient();

  const [formData, setFormData] = useState({
    fecha_salida_real: new Date().toISOString().slice(0, 16), // formato datetime-local
    observaciones: '',
    impuestos: 0,
    descuento: 0
  });

  const [metodosSeleccionados, setMetodosSeleccionados] = useState([]);
  const [totalCuenta, setTotalCuenta] = useState(0);
  const [factura, setFactura] = useState(null);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checkOut, { loading: procesando }] = useMutation(CHECK_OUT);

  // Resetear formulario cuando cambia el hospedaje
  useEffect(() => {
    if (hospedaje) {
      setFormData({
        fecha_salida_real: new Date().toISOString().slice(0, 16),
        observaciones: '',
        impuestos: 0,
        descuento: 0
      });
      setMetodosSeleccionados([]);
      setFactura(null);
      setMostrarFactura(false);
    }
  }, [hospedaje?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleMetodosChange = (metodos) => {
    setMetodosSeleccionados(metodos);
  };

  const handleTotalChange = (total) => {
    setTotalCuenta(total);
  };

  // Validaciones
  const validarCheckout = () => {
    // Validar fecha de salida
    if (!formData.fecha_salida_real) {
      setErrorModal({ isOpen: true, message: 'Por favor ingresa la fecha y hora de salida' });
      return false;
    }

    // Validar que hay al menos un método de pago
    if (metodosSeleccionados.length === 0) {
      setErrorModal({ isOpen: true, message: 'Debes agregar al menos un método de pago' });
      return false;
    }

    // Validar que todos los métodos tienen un método seleccionado
    const metodosSinSeleccionar = metodosSeleccionados.filter(m => !m.metodo_pago_id);
    if (metodosSinSeleccionar.length > 0) {
      setErrorModal({ isOpen: true, message: 'Todos los métodos de pago deben tener un método seleccionado' });
      return false;
    }

    // Validar que todos los métodos tienen un monto mayor a 0
    const metodosSinMonto = metodosSeleccionados.filter(m => !m.monto || m.monto <= 0);
    if (metodosSinMonto.length > 0) {
      setErrorModal({ isOpen: true, message: 'Todos los métodos de pago deben tener un monto mayor a 0' });
      return false;
    }

    // Calcular total pagado
    const totalPagado = metodosSeleccionados.reduce((sum, m) => sum + parseFloat(m.monto || 0), 0);

    // Validar que el total pagado cubre el total de la cuenta (con tolerancia de 1 peso)
    if (Math.abs(totalPagado - totalCuenta) > 1) {
      if (totalPagado < totalCuenta) {
        setErrorModal({ isOpen: true, message: `Falta por cubrir ${formatPrice(totalCuenta - totalPagado)}` });
      } else {
        setErrorModal({ isOpen: true, message: `Hay un exceso de ${formatPrice(totalPagado - totalCuenta)}` });
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevenir múltiples submissions

    if (!validarCheckout()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // PASO 1: Verificar que el hospedaje sigue activo antes de intentar checkout
      const { data: verifyData } = await client.query({
        query: VERIFY_HOSPEDAJE_ESTADO,
        variables: { id: parseInt(hospedaje.id) },
        fetchPolicy: 'network-only' // Obtener datos frescos, no del cache
      });

      const estadoActual = verifyData?.hospedaje?.estado;

      // Si el estado no es 'activo', mostrar error apropiado y detener
      if (estadoActual !== 'activo') {
        let mensaje = 'El hospedaje ya no está activo.';

        if (estadoActual === 'finalizado') {
          mensaje = 'Este hospedaje ya fue finalizado. El checkout ya se realizó anteriormente.';
        } else if (estadoActual === 'cancelado') {
          mensaje = 'Este hospedaje fue cancelado y no se puede realizar checkout.';
        }

        setErrorModal({
          isOpen: true,
          message: mensaje
        });

        // Forzar actualización de la lista
        if (onSuccess) {
          onSuccess();
        }

        // Cerrar modal después de mostrar error
        setTimeout(() => {
          onClose();
        }, 2000);

        return;
      }

      // PASO 2: Estado verificado como 'activo', continuar con checkout
      // Preparar los métodos de pago
      const metodosPago = metodosSeleccionados.map(m => ({
        metodo_pago_id: parseInt(m.metodo_pago_id),
        monto: parseFloat(m.monto),
        referencia: m.referencia || null
      }));

      // Ejecutar mutation de checkout
      const { data } = await checkOut({
        variables: {
          input: {
            hospedaje_id: parseInt(hospedaje.id),
            fecha_salida_real: formData.fecha_salida_real,
            metodos_pago: metodosPago,
            impuestos: parseFloat(formData.impuestos) || 0,
            descuento: parseFloat(formData.descuento) || 0,
            observaciones: formData.observaciones || null
          }
        }
      });

      // Validar que data existe y tiene checkOut
      if (data && data.checkOut) {
        // Guardar la factura generada
        setFactura(data.checkOut);
        setMostrarFactura(true);

        // Notificar éxito
        setSuccessModal({ isOpen: true, message: `Check-out realizado exitosamente. Factura: ${data.checkOut.numero}` });

        // Llamar callback de éxito (esto ya hace refetch en el componente padre)
        if (onSuccess) {
          onSuccess(data.checkOut);
        }
      } else {
        throw new Error('No se recibió respuesta válida del servidor');
      }

    } catch (error) {
      console.error('Error al realizar checkout:', error);
      // Obtener mensaje de error más específico
      const errorMessage = error.graphQLErrors?.[0]?.message || error.message || 'Error desconocido al procesar el checkout';
      setErrorModal({ isOpen: true, message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!hospedaje) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mostrarFactura ? 'Factura Generada' : `Check-Out - ${hospedaje.codigo}`}
      size="large"
    >
      {mostrarFactura && factura ? (
        // Vista de Factura Generada
        <div className="checkout-factura">
          <div className="factura-header">
            <FileText size={48} />
            <h2>¡Check-Out Exitoso!</h2>
            <p className="factura-numero">Factura N° {factura.numero_factura_display || ((factura.prefijo || '') + factura.numero)}</p>
          </div>

          <div className="factura-detalles">
            <div className="factura-item">
              <span className="label">Fecha:</span>
              <span className="valor">{formatDate(factura.fecha)}</span>
            </div>
            <div className="factura-item">
              <span className="label">Subtotal:</span>
              <span className="valor">{formatPrice(factura.subtotal)}</span>
            </div>
            {factura.impuestos > 0 && (
              <div className="factura-item">
                <span className="label">Impuestos:</span>
                <span className="valor">{formatPrice(factura.impuestos)}</span>
              </div>
            )}
            {factura.descuento > 0 && (
              <div className="factura-item">
                <span className="label">Descuento:</span>
                <span className="valor">-{formatPrice(factura.descuento)}</span>
              </div>
            )}
            <div className="factura-item factura-total">
              <span className="label">Total:</span>
              <span className="valor">{formatPrice(factura.total)}</span>
            </div>
          </div>

          {factura.metodos_pago && factura.metodos_pago.length > 0 && (
            <div className="factura-metodos">
              <h4>Métodos de Pago:</h4>
              <ul>
                {factura.metodos_pago.map((mp, index) => (
                  <li key={index}>
                    {mp.nombre}: {formatPrice(mp.monto)}
                    {mp.referencia && ` (Ref: ${mp.referencia})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Facturación Electrónica */}
          {factura.tiene_factura_electronica && factura.factura_electronica && (
            <div className="factura-electronica-box">
              <div className="fe-box-header">
                <CheckCircle size={24} color="#10b981" />
                <h4>Factura Electrónica DIAN</h4>
              </div>

              <div className="fe-box-content">
                <div className="fe-box-item">
                  <span className="fe-label">Número DIAN:</span>
                  <span className="fe-value">{factura.factura_electronica.numero_factura_dian || 'Procesando...'}</span>
                </div>

                {factura.factura_electronica.cufe && (
                  <div className="fe-box-item fe-box-item--cufe">
                    <span className="fe-label">CUFE:</span>
                    <code className="fe-cufe">{factura.factura_electronica.cufe.substring(0, 40)}...</code>
                  </div>
                )}

                <div className="fe-box-item">
                  <span className="fe-label">Estado DIAN:</span>
                  <span className={`fe-badge fe-badge--${factura.factura_electronica.estado_dian === 'aceptada' ? 'success' : 'pending'}`}>
                    {factura.factura_electronica.estado_dian || 'Pendiente'}
                  </span>
                </div>

                {(factura.factura_electronica.url_pdf || factura.factura_electronica.url_xml) && (
                  <div className="fe-box-downloads">
                    {factura.factura_electronica.url_pdf && (
                      <button
                        type="button"
                        className="btn-fe-download btn-fe-download--pdf"
                        onClick={() => window.open(factura.factura_electronica.url_pdf, '_blank')}
                      >
                        <ExternalLink size={16} />
                        <span>Ver PDF</span>
                      </button>
                    )}
                    {factura.factura_electronica.url_xml && (
                      <button
                        type="button"
                        className="btn-fe-download btn-fe-download--xml"
                        onClick={() => window.open(factura.factura_electronica.url_xml, '_blank')}
                      >
                        <Download size={16} />
                        <span>Descargar XML</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="factura-acciones">
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        // Vista de Formulario de Check-Out
        <form onSubmit={handleSubmit} className="checkout-form">
          {/* Información del Hospedaje */}
          <div className="checkout-info">
            <div className="info-badge">
              <span className="badge-label">Hospedaje:</span>
              <span className="badge-valor">{hospedaje.codigo}</span>
            </div>
            {hospedaje.habitacion && (
              <div className="info-badge">
                <span className="badge-label">Habitación:</span>
                <span className="badge-valor">
                  {hospedaje.habitacion.numero} - {hospedaje.habitacion.tipo}
                </span>
              </div>
            )}
            {hospedaje.huesped && (
              <div className="info-badge">
                <span className="badge-label">Huésped:</span>
                <span className="badge-valor">{hospedaje.huesped.nombre_completo}</span>
              </div>
            )}
          </div>

          {/* Cuenta Corriente */}
          <div className="checkout-seccion">
            <CuentaCorriente
              hospedajeId={hospedaje.id}
              fechaSalida={formData.fecha_salida_real}
              onTotalChange={handleTotalChange}
            />
          </div>

          {/* Fecha de Salida */}
          <div className="checkout-seccion">
            <div className="seccion-titulo">
              <Calendar size={20} />
              <h3>Fecha y Hora de Salida</h3>
            </div>
            <Input
              type="datetime-local"
              name="fecha_salida_real"
              value={formData.fecha_salida_real}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Métodos de Pago */}
          <div className="checkout-seccion">
            <SeleccionMetodosPago
              totalAPagar={totalCuenta}
              metodosSeleccionados={metodosSeleccionados}
              onMetodosChange={handleMetodosChange}
            />
          </div>

          {/* Observaciones */}
          <div className="checkout-seccion">
            <label htmlFor="observaciones">Observaciones (opcional)</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleInputChange}
              rows={3}
              className="checkout-textarea"
              placeholder="Notas adicionales sobre el checkout..."
            />
          </div>

          {/* Advertencia */}
          <div className="checkout-advertencia">
            <AlertCircle size={20} />
            <p>
              Al realizar el check-out se generará la factura y la habitación quedará en estado de limpieza.
              Esta acción no se puede deshacer.
            </p>
          </div>

          {/* Acciones */}
          <div className="checkout-acciones">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || procesando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<CreditCard size={18} />}
              disabled={isSubmitting || procesando}
              loading={isSubmitting || procesando}
            >
              {isSubmitting || procesando ? 'Procesando...' : 'Realizar Check-Out'}
            </Button>
          </div>
        </form>
      )}

      {/* Modales de éxito y error */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        type="success"
        message={successModal.message}
      />

      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </Modal>
  );
}

export default CheckOutModal;
