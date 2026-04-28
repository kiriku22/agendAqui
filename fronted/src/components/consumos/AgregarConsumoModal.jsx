import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Search, Package, DollarSign, Hash, FileText, AlertTriangle } from 'lucide-react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { AGREGAR_CONSUMO } from '../../graphql/consumos';
import { GET_ITEMS_INVENTARIO } from '../../graphql/inventario';
import './AgregarConsumoModal.css';

function AgregarConsumoModal({ isOpen, onClose, hospedajeId, habitacionId, onSuccess }) {
  const [tipoConsumo, setTipoConsumo] = useState('servicio'); // 'servicio', 'producto', 'otro'
  const [busqueda, setBusqueda] = useState('');
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [formData, setFormData] = useState({
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    notas: ''
  });
  const [errors, setErrors] = useState({});

  // Query unificado de inventario
  const { data: dataItems, loading: loadingItems } = useQuery(GET_ITEMS_INVENTARIO, {
    variables: {
      tipo: tipoConsumo === 'otro' ? null : tipoConsumo,
      activo: true
    },
    skip: tipoConsumo === 'otro'
  });

  // Mutation
  const [agregarConsumo, { loading: agregando }] = useMutation(AGREGAR_CONSUMO, {
    onCompleted: () => {
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (error) => {
      console.error('Error al agregar consumo:', error);
      setErrors({ general: error.message || 'Error al agregar el consumo' });
    }
  });

  // Reset form cuando cambia el tipo
  useEffect(() => {
    setItemSeleccionado(null);
    setBusqueda('');
    setFormData({
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      notas: ''
    });
    setErrors({});
  }, [tipoConsumo]);

  // Filtrar items según búsqueda
  const itemsFiltrados = () => {
    if (tipoConsumo === 'otro' || !dataItems) {
      return [];
    }

    const items = dataItems.itemsInventario || [];

    if (busqueda.length === 0) {
      return items;
    }

    return items.filter(item => {
      const searchLower = busqueda.toLowerCase();
      const nombreMatch = item.nombre.toLowerCase().includes(searchLower);
      const categoriaMatch = item.categoria?.nombre?.toLowerCase().includes(searchLower);
      const codigoMatch = item.codigo?.toLowerCase().includes(searchLower);

      return nombreMatch || categoriaMatch || codigoMatch;
    });
  };

  const handleSeleccionarItem = (item) => {
    setItemSeleccionado(item);
    setFormData({
      ...formData,
      descripcion: item.nombre,
      precio_unitario: item.precio_con_iva
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    }
    if (formData.cantidad < 1) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    }
    if (formData.precio_unitario < 0) {
      newErrors.precio_unitario = 'El precio no puede ser negativo';
    }

    // Validar stock para productos
    if (tipoConsumo === 'producto' && itemSeleccionado) {
      const stockDisponible = itemSeleccionado.stock_actual || 0;
      const cantidadSolicitada = parseInt(formData.cantidad, 10);

      if (cantidadSolicitada > stockDisponible) {
        newErrors.cantidad = `Stock insuficiente. Disponible: ${stockDisponible}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const input = {
      hospedaje_id: parseInt(hospedajeId, 10),
      habitacion_id: parseInt(habitacionId, 10),
      descripcion: formData.descripcion.trim(),
      cantidad: parseInt(formData.cantidad, 10),
      precio_unitario: parseFloat(formData.precio_unitario),
      notas: formData.notas.trim() || undefined
    };

    // Agregar item_inventario_id si se seleccionó uno del inventario unificado
    if (itemSeleccionado) {
      // Asegurar que el ID se convierta correctamente a Int
      const itemId = typeof itemSeleccionado.id === 'string'
        ? parseInt(itemSeleccionado.id, 10)
        : itemSeleccionado.id;
      input.item_inventario_id = itemId;
    }

    try {
      await agregarConsumo({ variables: { input } });
    } catch (error) {
      // El error ya se maneja en onError
    }
  };

  const handleClose = () => {
    setTipoConsumo('servicio');
    setItemSeleccionado(null);
    setBusqueda('');
    setFormData({
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      notas: ''
    });
    setErrors({});
    onClose();
  };

  const precioTotal = formData.cantidad * formData.precio_unitario;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Agregar Consumo"
      size="medium"
    >
      <div className="agregar-consumo-modal">
        {/* Selector de tipo de consumo */}
        <div className="tipo-consumo-selector">
          <button
            type="button"
            className={`tipo-btn ${tipoConsumo === 'servicio' ? 'tipo-btn--active' : ''}`}
            onClick={() => setTipoConsumo('servicio')}
          >
            <Package size={20} />
            <span>Servicio del Hotel</span>
          </button>
          <button
            type="button"
            className={`tipo-btn ${tipoConsumo === 'producto' ? 'tipo-btn--active' : ''}`}
            onClick={() => setTipoConsumo('producto')}
          >
            <DollarSign size={20} />
            <span>Producto</span>
          </button>
          <button
            type="button"
            className={`tipo-btn ${tipoConsumo === 'otro' ? 'tipo-btn--active' : ''}`}
            onClick={() => setTipoConsumo('otro')}
          >
            <FileText size={20} />
            <span>Otro</span>
          </button>
        </div>

        {/* Buscador de servicios/productos */}
        {tipoConsumo !== 'otro' && (
          <div className="busqueda-section">
            <div className="busqueda-input-group">
              <Search size={20} className="busqueda-icon" />
              <input
                type="text"
                placeholder={`Buscar ${tipoConsumo === 'servicio' ? 'servicio' : 'producto'}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="busqueda-input"
              />
            </div>

            <div className="items-list">
              {loadingItems ? (
                <div className="no-results">Cargando...</div>
              ) : itemsFiltrados().length === 0 ? (
                <div className="no-results">
                  No se encontraron {tipoConsumo === 'servicio' ? 'servicios' : 'productos'}
                </div>
              ) : (
                itemsFiltrados().map((item) => {
                  const stockBajo = item.tipo === 'producto' && item.stock_actual <= item.stock_minimo;
                  const sinStock = item.tipo === 'producto' && item.stock_actual === 0;

                  return (
                    <div
                      key={item.id}
                      className={`item-card ${itemSeleccionado?.id === item.id ? 'item-card--selected' : ''} ${sinStock ? 'item-card--sin-stock' : ''}`}
                      onClick={() => !sinStock && handleSeleccionarItem(item)}
                    >
                      <div className="item-info">
                        <div className="item-nombre">
                          {item.nombre}
                          {item.codigo && <span className="item-codigo"> ({item.codigo})</span>}
                        </div>
                        {item.categoria && (
                          <div className="item-categoria">{item.categoria.nombre}</div>
                        )}
                        {item.tipo === 'producto' && (
                          <div className={`item-stock ${stockBajo ? 'item-stock--bajo' : ''} ${sinStock ? 'item-stock--agotado' : ''}`}>
                            {sinStock ? (
                              <>
                                <AlertTriangle size={14} />
                                <span>Sin stock</span>
                              </>
                            ) : (
                              <>
                                Stock: {item.stock_actual} {item.unidad_medida}
                                {stockBajo && ' (bajo)'}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="item-precio">
                        ${item.precio_con_iva.toLocaleString('es-CO')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Formulario de detalles */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="descripcion" className="form-label">
              Descripción *
            </label>
            <input
              type="text"
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              placeholder="Descripción del consumo"
              className={`form-input ${errors.descripcion ? 'form-input--error' : ''}`}
              disabled={tipoConsumo !== 'otro' && !itemSeleccionado}
            />
            {errors.descripcion && (
              <span className="form-error">{errors.descripcion}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cantidad" className="form-label">
                <Hash size={16} />
                Cantidad *
              </label>
              <input
                type="number"
                id="cantidad"
                name="cantidad"
                min="1"
                value={formData.cantidad}
                onChange={handleInputChange}
                className={`form-input ${errors.cantidad ? 'form-input--error' : ''}`}
              />
              {errors.cantidad && (
                <span className="form-error">{errors.cantidad}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="precio_unitario" className="form-label">
                <DollarSign size={16} />
                Precio Unitario *
              </label>
              <input
                type="number"
                id="precio_unitario"
                name="precio_unitario"
                min="0"
                step="0.01"
                value={formData.precio_unitario}
                onChange={handleInputChange}
                className={`form-input ${errors.precio_unitario ? 'form-input--error' : ''}`}
              />
              {errors.precio_unitario && (
                <span className="form-error">{errors.precio_unitario}</span>
              )}
            </div>
          </div>

          <div className="precio-total-display">
            <span>Precio Total:</span>
            <strong>${precioTotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>

          <div className="form-group">
            <label htmlFor="notas" className="form-label">
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleInputChange}
              placeholder="Notas adicionales sobre el consumo"
              className="form-textarea"
              rows={3}
            />
          </div>

          {errors.general && (
            <div className="form-error form-error--general">
              {errors.general}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="modal-actions">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={agregando}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            loading={agregando}
            disabled={agregando || (tipoConsumo !== 'otro' && !itemSeleccionado)}
          >
            Agregar Consumo
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AgregarConsumoModal;
