import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { FaTimes, FaSave, FaArrowUp, FaArrowDown, FaEdit, FaUndo } from 'react-icons/fa';
import './AjustarStockModal.css';
import { AJUSTAR_STOCK } from '../../graphql/inventario';

const AjustarStockModal = ({ isOpen, onClose, item }) => {
  const [tipoMovimiento, setTipoMovimiento] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [ajustarStock, { loading }] = useMutation(AJUSTAR_STOCK);

  if (!isOpen || !item) return null;

  const calcularNuevoStock = () => {
    const cant = parseInt(cantidad) || 0;
    const stockActual = item.stock_actual || 0;

    switch (tipoMovimiento) {
      case 'entrada':
        return stockActual + cant;
      case 'salida':
        return stockActual - cant;
      case 'ajuste':
        return cant; // En ajuste, la cantidad es el nuevo stock total
      case 'devolucion':
        return stockActual + cant;
      default:
        return stockActual;
    }
  };

  const nuevoStock = calcularNuevoStock();
  const diferencia = nuevoStock - item.stock_actual;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!motivo.trim()) {
      setError('Debe proporcionar un motivo para el ajuste');
      return;
    }

    const cant = parseInt(cantidad) || 0;
    if (cant <= 0 && tipoMovimiento !== 'ajuste') {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (tipoMovimiento === 'salida' && cant > item.stock_actual) {
      setError(`No hay suficiente stock. Stock actual: ${item.stock_actual}`);
      return;
    }

    try {
      const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;

      await ajustarStock({
        variables: {
          input: {
            item_inventario_id: itemId,
            tipo_movimiento: tipoMovimiento,
            cantidad: cant,
            motivo: motivo.trim()
          }
        },
        refetchQueries: ['GetItemsInventario'],
        awaitRefetchQueries: true
      });

      setMensaje('Stock ajustado correctamente');
      onClose();
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      setError(error.message || 'Error al ajustar el stock');
    }
  };

  const motivosSugeridos = {
    entrada: [
      'Compra de mercancía',
      'Reposición de inventario',
      'Devolución de proveedor',
      'Inventario inicial'
    ],
    salida: [
      'Venta a cliente',
      'Producto vencido',
      'Producto dañado',
      'Muestra gratis'
    ],
    ajuste: [
      'Corrección de inventario',
      'Inventario físico',
      'Ajuste por diferencia'
    ],
    devolucion: [
      'Devolución de cliente',
      'Producto en buen estado',
      'Cancelación de consumo'
    ]
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ajustar-stock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ajustar-stock-header">
          <h2>Ajustar Stock</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {mensaje && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span>{mensaje}</span>
          </div>
        )}

        <div className="item-info-card">
          <h3>{item.nombre}</h3>
          <p className="item-codigo">{item.codigo}</p>
          <div className="stock-actual-display">
            <span className="label">Stock Actual:</span>
            <span className="valor">
              {item.stock_actual} {item.unidad_medida}
            </span>
          </div>
          <div className="stock-minimo-display">
            <span className="label">Stock Mínimo:</span>
            <span className="valor">
              {item.stock_minimo} {item.unidad_medida}
            </span>
          </div>
        </div>

        <form className="ajustar-stock-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Movimiento *</label>
            <div className="tipo-movimiento-buttons">
              <button
                type="button"
                className={`tipo-btn ${tipoMovimiento === 'entrada' ? 'active entrada' : ''}`}
                onClick={() => setTipoMovimiento('entrada')}
              >
                <FaArrowUp /> Entrada
              </button>
              <button
                type="button"
                className={`tipo-btn ${tipoMovimiento === 'salida' ? 'active salida' : ''}`}
                onClick={() => setTipoMovimiento('salida')}
              >
                <FaArrowDown /> Salida
              </button>
              <button
                type="button"
                className={`tipo-btn ${tipoMovimiento === 'ajuste' ? 'active ajuste' : ''}`}
                onClick={() => setTipoMovimiento('ajuste')}
              >
                <FaEdit /> Ajuste
              </button>
              <button
                type="button"
                className={`tipo-btn ${tipoMovimiento === 'devolucion' ? 'active devolucion' : ''}`}
                onClick={() => setTipoMovimiento('devolucion')}
              >
                <FaUndo /> Devolución
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>
              {tipoMovimiento === 'ajuste' ? 'Nuevo Stock Total *' : 'Cantidad *'}
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="0"
              required
              placeholder={
                tipoMovimiento === 'ajuste'
                  ? 'Ingrese el stock total correcto'
                  : 'Cantidad a ' + tipoMovimiento
              }
              autoFocus
            />
          </div>

          <div className="preview-card">
            <div className="preview-row">
              <span>Stock Actual:</span>
              <strong>{item.stock_actual} {item.unidad_medida}</strong>
            </div>
            <div className={`preview-row diferencia ${diferencia >= 0 ? 'positiva' : 'negativa'}`}>
              <span>Cambio:</span>
              <strong>
                {diferencia > 0 ? '+' : ''}
                {diferencia} {item.unidad_medida}
              </strong>
            </div>
            <div className="preview-row nuevo-stock">
              <span>Nuevo Stock:</span>
              <strong className={nuevoStock < item.stock_minimo ? 'stock-bajo' : ''}>
                {nuevoStock} {item.unidad_medida}
              </strong>
            </div>
            {nuevoStock < item.stock_minimo && (
              <div className="alerta-stock-bajo">
                ⚠️ El nuevo stock estará por debajo del mínimo
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Motivo *</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              rows="3"
              placeholder="Describa el motivo del ajuste de stock..."
            />
            <div className="motivos-sugeridos">
              {motivosSugeridos[tipoMovimiento]?.map((sugerencia, index) => (
                <button
                  key={index}
                  type="button"
                  className="motivo-sugerido"
                  onClick={() => setMotivo(sugerencia)}
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-guardar" disabled={loading}>
              <FaSave />
              {loading ? 'Guardando...' : 'Guardar Ajuste'}
            </button>
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjustarStockModal;
