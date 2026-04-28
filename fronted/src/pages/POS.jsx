import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ShoppingCart,
  Lock,
  User,
  Hotel,
  Package,
  Trash2,
  Phone,
  CreditCard
} from 'lucide-react';
import { GET_TURNO_ACTUAL } from '../graphql/caja';
import { CREAR_VENTA_POS, GET_DESCUENTOS_APLICABLES } from '../graphql/pos';
import { GET_ITEMS_INVENTARIO } from '../graphql/inventario';
import { GET_SERVICIOS_HOTEL } from '../graphql/servicios';
import { GET_CATEGORIAS_INVENTARIO } from '../graphql/categorias';
import { GET_CLIENTES, GET_HUESPEDES, CREAR_CLIENTE, CREAR_HUESPED } from '../graphql/huespedes';
import { GET_HOSPEDAJES_ACTIVOS } from '../graphql/hospedajes';
import { GET_METODOS_PAGO } from '../graphql/metodosPago';
import { useNotification } from '../contexts/NotificationContext';
import './POS.css';

const POS = () => {
  // Estado del carrito
  const [cartItems, setCartItems] = useState([]);
  const [tipoCliente, setTipoCliente] = useState('consumidor_final');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [huespedSeleccionado, setHuespedSeleccionado] = useState(null);
  const [hospedajeId, setHospedajeId] = useState(null);
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState(null);
  const [descuentoManual, setDescuentoManual] = useState({ tipo: null, valor: 0 });
  const [propina, setPropina] = useState(0);
  const [notas, setNotas] = useState('');
  const [metodoPagoModal, setMetodoPagoModal] = useState(false);

  // Estados para UI de productos
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // Estados para selector de clientes
  const [mostrarSelectorCliente, setMostrarSelectorCliente] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    tipo_documento: 'CC',
    numero_documento: '',
    telefono: '',
    email: '',
  });

  // Estados para selector de huéspedes
  const [mostrarSelectorHuesped, setMostrarSelectorHuesped] = useState(false);
  const [busquedaHuesped, setBusquedaHuesped] = useState('');
  const [hospedajesDisponibles, setHospedajesDisponibles] = useState([]);

  // Estados para modal de pago
  const [pagos, setPagos] = useState([]);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');

  // Hook de notificaciones
  const { success, error: showError } = useNotification();

  // Queries
  const { data: turnoData, loading: turnoLoading, error: turnoError } = useQuery(GET_TURNO_ACTUAL, {
    variables: { cajaId: 1 }, // ID de la caja principal
    pollInterval: 30000, // Actualizar cada 30 segundos
  });

  // Query para items de inventario
  const { data: itemsData, loading: itemsLoading } = useQuery(GET_ITEMS_INVENTARIO, {
    variables: {
      activo: true,
      tipo: 'producto',
      categoria_id: categoriaSeleccionada ? parseInt(categoriaSeleccionada) : undefined
    },
    fetchPolicy: 'cache-and-network',
  });

  // Query para categorías
  const { data: categoriasData } = useQuery(GET_CATEGORIAS_INVENTARIO, {
    variables: { tipo: 'producto', activa: true },
  });

  // Query para clientes
  const { data: clientesData, refetch: refetchClientes } = useQuery(GET_CLIENTES, {
    variables: { activo: true },
    skip: tipoCliente !== 'cliente_registrado',
  });

  // Query para huéspedes
  const { data: huespedesData, refetch: refetchHuespedes } = useQuery(GET_HUESPEDES, {
    skip: tipoCliente !== 'huesped',
  });

  // Query para hospedajes activos
  const { data: hospedajesData } = useQuery(GET_HOSPEDAJES_ACTIVOS, {
    skip: tipoCliente !== 'huesped',
  });

  // Query para métodos de pago
  const { data: metodosPagoData } = useQuery(GET_METODOS_PAGO, {
    variables: { activo: true },
  });

  // Mutations
  const [crearVenta, { loading: creandoVenta }] = useMutation(CREAR_VENTA_POS, {
    onCompleted: (data) => {
      success(`Venta ${data.crearVentaPOS.codigo} creada exitosamente`);
      limpiarCarrito();
      setMetodoPagoModal(false);
    },
    onError: (err) => {
      showError(`Error al crear venta: ${err.message}`);
    },
  });

  const [crearCliente] = useMutation(CREAR_CLIENTE, {
    onCompleted: (data) => {
      setClienteSeleccionado(data.crearCliente);
      success('Cliente creado exitosamente');
      refetchClientes();
    },
    onError: (err) => showError(`Error al crear cliente: ${err.message}`),
  });

  const [crearHuesped] = useMutation(CREAR_HUESPED, {
    onCompleted: (data) => {
      setHuespedSeleccionado(data.crearHuesped);
      success('Huésped creado exitosamente');
      refetchHuespedes();
    },
    onError: (err) => showError(`Error al crear huésped: ${err.message}`),
  });

  // Calcular totales
  const calcularTotales = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

    let descuentoMonto = 0;
    if (descuentoSeleccionado) {
      if (descuentoSeleccionado.tipo === 'porcentaje') {
        descuentoMonto = subtotal * (descuentoSeleccionado.valor / 100);
      } else {
        descuentoMonto = descuentoSeleccionado.valor;
      }
    } else if (descuentoManual.tipo === 'porcentaje' && descuentoManual.valor > 0) {
      descuentoMonto = subtotal * (descuentoManual.valor / 100);
    } else if (descuentoManual.tipo === 'monto' && descuentoManual.valor > 0) {
      descuentoMonto = descuentoManual.valor;
    }

    const baseIva = subtotal - descuentoMonto;
    const iva = baseIva * 0.19;
    const total = baseIva + iva + propina;

    return {
      subtotal,
      descuentoMonto,
      iva,
      total,
    };
  };

  const totales = calcularTotales();

  // Agregar item desde la grilla de productos al carrito
  const agregarAlCarrito = (item) => {
    // Validar stock para productos
    if (item.tipo === 'producto' && item.stock_actual <= 0) {
      showError('Producto sin stock disponible');
      return;
    }

    const existente = cartItems.find(ci =>
      ci.item_inventario_id === item.id
    );

    if (existente) {
      // Incrementar cantidad
      setCartItems(cartItems.map(ci =>
        ci.item_inventario_id === item.id
          ? { ...ci, cantidad: ci.cantidad + 1 }
          : ci
      ));
    } else {
      // Agregar nuevo item al carrito
      setCartItems([
        ...cartItems,
        {
          item_inventario_id: parseInt(item.id),
          nombre: item.nombre,
          cantidad: 1,
          precio_unitario: item.precio_con_iva || item.precio_base || 0,
        },
      ]);
    }
  };

  // Agregar item al carrito (genérico - mantener para compatibilidad)
  const agregarItem = (item) => {
    const existente = cartItems.find(ci =>
      (item.item_inventario_id && ci.item_inventario_id === item.item_inventario_id) ||
      (item.servicio_hotel_id && ci.servicio_hotel_id === item.servicio_hotel_id)
    );

    if (existente) {
      setCartItems(cartItems.map(ci =>
        ci === existente ? { ...ci, cantidad: ci.cantidad + 1 } : ci
      ));
    } else {
      setCartItems([...cartItems, { ...item, cantidad: 1 }]);
    }
  };

  // Actualizar cantidad
  const actualizarCantidad = (index, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarItem(index);
    } else {
      setCartItems(cartItems.map((item, i) =>
        i === index ? { ...item, cantidad: nuevaCantidad } : item
      ));
    }
  };

  // Eliminar item
  const eliminarItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Limpiar carrito
  const limpiarCarrito = () => {
    setCartItems([]);
    setDescuentoSeleccionado(null);
    setDescuentoManual({ tipo: null, valor: 0 });
    setPropina(0);
    setNotas('');
    setClienteSeleccionado(null);
    setHuespedSeleccionado(null);
    setHospedajeId(null);
  };

  // Handlers para selección de clientes
  const abrirSelectorCliente = () => {
    if (tipoCliente === 'cliente_registrado') {
      setMostrarSelectorCliente(true);
      setBusquedaCliente('');
      setMostrarFormCliente(false);
    } else if (tipoCliente === 'huesped') {
      setMostrarSelectorHuesped(true);
      setBusquedaHuesped('');
    }
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarSelectorCliente(false);
    success(`Cliente seleccionado: ${cliente.nombre} ${cliente.apellido || ''}`);
  };

  const seleccionarHuesped = (huesped, hospedaje) => {
    setHuespedSeleccionado(huesped);
    setHospedajeId(hospedaje.id);
    setMostrarSelectorHuesped(false);
    success(`Huésped seleccionado: ${huesped.nombre_completo} - Hab. ${hospedaje.habitacion.numero}`);
  };

  const crearNuevoCliente = (e) => {
    e.preventDefault();
    crearCliente({
      variables: {
        input: nuevoCliente,
      },
    });
    setMostrarFormCliente(false);
    setMostrarSelectorCliente(false);
  };

  // Handlers para modal de pago
  const agregarPago = () => {
    if (!metodoPagoSeleccionado) {
      showError('Debe seleccionar un método de pago');
      return;
    }

    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      showError('El monto debe ser mayor a 0');
      return;
    }

    const metodoId = Number(metodoPagoSeleccionado);
    const metodoPago = metodosPagoData.metodosPago.find(m => Number(m.id) === metodoId);
    if (!metodoPago) {
      showError('Método de pago no válido');
      return;
    }

    if (metodoPago.requiere_referencia && !referenciaPago) {
      showError('Este método de pago requiere una referencia');
      return;
    }

    const nuevoPago = {
      metodo_pago_id: Number(metodoPagoSeleccionado),
      metodo_nombre: metodoPago.nombre,
      monto: monto,
      referencia: referenciaPago || null,
    };

    setPagos([...pagos, nuevoPago]);
    setMetodoPagoSeleccionado(null);
    setMontoPago('');
    setReferenciaPago('');
    success(`Pago de $${monto.toLocaleString('es-CO')} agregado`);
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const calcularTotalPagos = () => {
    return pagos.reduce((sum, p) => sum + p.monto, 0);
  };

  const calcularCambio = () => {
    if (!montoRecibido || montoRecibido === '' || parseFloat(montoRecibido) === 0) return 0;
    const cambio = parseFloat(montoRecibido) - totales.total;
    return cambio;
  };

  const confirmarPago = () => {
    const totalPagado = calcularTotalPagos();
    const totalVenta = totales.total;

    if (Math.abs(totalPagado - totalVenta) > 0.01) {
      showError(`El total pagado ($${totalPagado.toFixed(2)}) no coincide con el total de la venta ($${totalVenta.toFixed(2)})`);
      return;
    }

    procesarVenta(pagos);
  };

  const abrirModalPago = () => {
    // Pre-cargar efectivo como método por defecto
    const efectivo = metodosPagoData?.metodosPago.find(m => m.tipo === 'efectivo');
    if (efectivo) {
      setMetodoPagoSeleccionado(Number(efectivo.id));
      setMontoPago(totales.total.toString());
    }
    setMetodoPagoModal(true);
  };

  const cerrarModalPago = () => {
    setMetodoPagoModal(false);
    setPagos([]);
    setMetodoPagoSeleccionado(null);
    setMontoPago('');
    setReferenciaPago('');
    setMontoRecibido('');
  };

  // Validar y procesar venta
  const procesarVenta = (metodosPago) => {
    if (cartItems.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!turnoData?.turnoActual) {
      alert('No hay un turno de caja abierto');
      return;
    }

    // Validar totales de pago
    const totalPagos = metodosPago.reduce((sum, p) => sum + p.monto, 0);
    if (Math.abs(totalPagos - totales.total) > 0.01) {
      alert(`El total de pagos ($${totalPagos.toFixed(2)}) no coincide con el total ($${totales.total.toFixed(2)})`);
      return;
    }

    // Validar tipo de cliente
    if (tipoCliente === 'cliente_registrado' && !clienteSeleccionado) {
      alert('Debe seleccionar un cliente');
      return;
    }

    if (tipoCliente === 'huesped' && (!huespedSeleccionado || !hospedajeId)) {
      alert('Debe seleccionar un huésped y hospedaje activo');
      return;
    }

    // Construir input
    const input = {
      turno_caja_id: parseInt(turnoData.turnoActual.id),
      tipo_cliente: tipoCliente,
      cliente_id: clienteSeleccionado ? parseInt(clienteSeleccionado.id) : null,
      huesped_id: huespedSeleccionado ? parseInt(huespedSeleccionado.id) : null,
      hospedaje_id: hospedajeId ? parseInt(hospedajeId) : null,
      items: cartItems.map(item => ({
        item_inventario_id: parseInt(item.item_inventario_id),
        servicio_hotel_id: item.servicio_hotel_id ? parseInt(item.servicio_hotel_id) : null,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        notas: item.notas || null,
      })),
      descuento_id: descuentoSeleccionado ? parseInt(descuentoSeleccionado.id) : null,
      descuento_porcentaje_manual: descuentoManual.tipo === 'porcentaje' ? descuentoManual.valor : null,
      descuento_monto_manual: descuentoManual.tipo === 'monto' ? descuentoManual.valor : null,
      propina,
      notas,
      metodos_pago: metodosPago.map(p => ({
        metodo_pago_id: parseInt(p.metodo_pago_id),
        monto: p.monto,
        referencia: p.referencia || null,
      })),
      requiere_autorizacion_descuento: false, // TODO: Implementar lógica de autorización
      autorizado_por: null,
    };

    crearVenta({ variables: { input } });
    setMetodoPagoModal(false);
  };

  // UI Loading/Error
  if (turnoLoading) return <div className="pos-loading">Cargando...</div>;
  if (turnoError) return <div className="pos-error">Error al cargar turno: {turnoError.message}</div>;

  if (!turnoData?.turnoActual) {
    return (
      <div className="pos-sin-turno">
        <h2><Lock size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />No hay turno de caja abierto</h2>
        <p>Para realizar ventas, primero debe abrir un turno de caja.</p>
        <button onClick={() => window.location.href = '/caja'}>
          Ir a Gestión de Caja
        </button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      {/* Header */}
      <header className="pos-header">
        <div className="pos-header-left">
          <h1><ShoppingCart size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />Punto de Venta</h1>
          <span className="turno-info">
            Turno: {turnoData.turnoActual.codigo} | {turnoData.turnoActual.usuario.nombre_completo}
          </span>
        </div>
        <div className="pos-header-right">
          <select
            value={tipoCliente}
            onChange={(e) => {
              setTipoCliente(e.target.value);
              setClienteSeleccionado(null);
              setHuespedSeleccionado(null);
              setHospedajeId(null);
            }}
            className="tipo-cliente-select"
          >
            <option value="consumidor_final">Consumidor Final</option>
            <option value="cliente_registrado">Cliente Registrado</option>
            <option value="huesped">Huésped (Cargar a Cuenta)</option>
          </select>

          {tipoCliente !== 'consumidor_final' && (
            <div className="cliente-info">
              {clienteSeleccionado ? (
                <div className="cliente-seleccionado">
                  <span><User size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</span>
                  <button onClick={() => setClienteSeleccionado(null)} className="btn-clear">✕</button>
                </div>
              ) : huespedSeleccionado ? (
                <div className="cliente-seleccionado">
                  <span><Hotel size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{huespedSeleccionado.nombre_completo}</span>
                  <button onClick={() => {
                    setHuespedSeleccionado(null);
                    setHospedajeId(null);
                  }} className="btn-clear">✕</button>
                </div>
              ) : (
                <button onClick={abrirSelectorCliente} className="btn-seleccionar-cliente">
                  {tipoCliente === 'cliente_registrado' ? 'Seleccionar Cliente' : 'Seleccionar Huésped'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="pos-content">
        {/* Left Side - Product Selector */}
        <div className="pos-left">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar producto o escanear código de barras..."
              className="search-input"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              autoFocus
            />
          </div>

          <div className="category-tabs">
            <button
              className={`tab ${!categoriaSeleccionada ? 'active' : ''}`}
              onClick={() => setCategoriaSeleccionada(null)}
            >
              Todos
            </button>
            {categoriasData?.categoriasInventario.map((cat) => (
              <button
                key={cat.id}
                className={`tab ${categoriaSeleccionada === cat.id ? 'active' : ''}`}
                onClick={() => setCategoriaSeleccionada(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {itemsLoading ? (
              <div className="loading-products">
                <p>Cargando productos...</p>
              </div>
            ) : (
              itemsData?.itemsInventario
                .filter(item =>
                  !busquedaProducto ||
                  item.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
                  item.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="product-card"
                    onClick={() => agregarAlCarrito(item)}
                  >
                    <div className="product-image">
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt={item.nombre} />
                      ) : (
                        <div className="product-placeholder"><Package size={40} /></div>
                      )}
                    </div>
                    <div className="product-info">
                      <h4>{item.nombre}</h4>
                      <p className="product-price">${item.precio_con_iva?.toLocaleString('es-CO') || 0}</p>
                      {item.tipo === 'producto' && (
                        <p className="product-stock">
                          Stock: {item.stock_actual || 0}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right Side - Cart */}
        <div className="pos-right">
          <div className="cart-header">
            <h3>Carrito ({cartItems.length})</h3>
            {cartItems.length > 0 && (
              <button onClick={limpiarCarrito} className="btn-limpiar">Limpiar</button>
            )}
          </div>

          <div className="cart-items">
            {cartItems.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={48} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p>Carrito vacío</p>
                <small>Agregue productos para comenzar</small>
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div key={index} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.nombre}</span>
                    <span className="cart-item-precio">${item.precio_unitario.toFixed(2)}</span>
                  </div>
                  <div className="cart-item-controls">
                    <button onClick={() => actualizarCantidad(index, item.cantidad - 1)}>-</button>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(index, parseInt(e.target.value) || 0)}
                      min="0"
                    />
                    <button onClick={() => actualizarCantidad(index, item.cantidad + 1)}>+</button>
                    <button onClick={() => eliminarItem(index)} className="btn-eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="cart-item-total">
                    ${(item.cantidad * item.precio_unitario).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-descuentos">
            <h4>Descuentos</h4>
            {/* TODO: Implementar selector de descuentos */}
            <p className="text-muted">Sin descuentos aplicados</p>
          </div>

          <div className="cart-propina">
            <label>Propina:</label>
            <input
              type="number"
              value={propina}
              onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
              min="0"
              step="100"
            />
          </div>

          <div className="cart-totales">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${totales.subtotal.toFixed(2)}</span>
            </div>
            {totales.descuentoMonto > 0 && (
              <div className="total-row descuento">
                <span>Descuento:</span>
                <span>-${totales.descuentoMonto.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row">
              <span>IVA (19%):</span>
              <span>${totales.iva.toFixed(2)}</span>
            </div>
            {propina > 0 && (
              <div className="total-row">
                <span>Propina:</span>
                <span>${propina.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row total-final">
              <span>TOTAL:</span>
              <span>${totales.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="cart-actions">
            <button
              className="btn-pagar"
              onClick={abrirModalPago}
              disabled={cartItems.length === 0 || creandoVenta}
            >
              {creandoVenta ? 'Procesando...' : 'Pagar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Selector de Clientes */}
      {mostrarSelectorCliente && (
        <div className="modal-overlay" onClick={() => setMostrarSelectorCliente(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Seleccionar Cliente</h2>
              <button className="btn-close" onClick={() => setMostrarSelectorCliente(false)}>×</button>
            </div>

            <div className="modal-body">
              {!mostrarFormCliente ? (
                <>
                  <div className="search-bar-modal">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o documento..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="search-input"
                    />
                    <button
                      className="btn-primary"
                      onClick={() => setMostrarFormCliente(true)}
                    >
                      + Crear Cliente
                    </button>
                  </div>

                  <div className="clientes-list">
                    {clientesData?.clientes
                      .filter(c =>
                        !busquedaCliente ||
                        c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                        c.apellido?.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                        c.numero_documento.includes(busquedaCliente)
                      )
                      .map((cliente) => (
                        <div
                          key={cliente.id}
                          className="cliente-item"
                          onClick={() => seleccionarCliente(cliente)}
                        >
                          <div className="cliente-info-main">
                            <strong>{cliente.nombre} {cliente.apellido || ''}</strong>
                            <span className="cliente-documento">{cliente.tipo_documento}: {cliente.numero_documento}</span>
                          </div>
                          {cliente.telefono && (
                            <div className="cliente-info-secondary">
                              <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{cliente.telefono}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <form onSubmit={crearNuevoCliente} className="form-cliente">
                  <h3>Crear Nuevo Cliente</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={nuevoCliente.nombre}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                        required
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Apellido</label>
                      <input
                        type="text"
                        value={nuevoCliente.apellido}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, apellido: e.target.value})}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo Documento *</label>
                      <select
                        value={nuevoCliente.tipo_documento}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, tipo_documento: e.target.value})}
                        required
                        className="form-control"
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="NIT">NIT</option>
                        <option value="PAS">Pasaporte</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Número Documento *</label>
                      <input
                        type="text"
                        value={nuevoCliente.numero_documento}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, numero_documento: e.target.value})}
                        required
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        type="tel"
                        value={nuevoCliente.telefono}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMostrarFormCliente(false)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary">
                      Crear Cliente
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Huéspedes */}
      {mostrarSelectorHuesped && (
        <div className="modal-overlay" onClick={() => setMostrarSelectorHuesped(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Seleccionar Huésped</h2>
              <button className="btn-close" onClick={() => setMostrarSelectorHuesped(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="search-bar-modal">
                <input
                  type="text"
                  placeholder="Buscar por nombre o documento..."
                  value={busquedaHuesped}
                  onChange={(e) => setBusquedaHuesped(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="huespedes-list">
                {hospedajesData?.hospedajesActivos
                  .filter(hospedaje => {
                    const huesped = hospedaje.huesped;
                    return !busquedaHuesped ||
                      huesped.nombre_completo.toLowerCase().includes(busquedaHuesped.toLowerCase()) ||
                      huesped.numero_documento.includes(busquedaHuesped);
                  })
                  .map((hospedaje) => (
                    <div
                      key={hospedaje.id}
                      className="huesped-item"
                      onClick={() => seleccionarHuesped(hospedaje.huesped, hospedaje)}
                    >
                      <div className="huesped-info-main">
                        <strong><Hotel size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{hospedaje.huesped.nombre_completo}</strong>
                        <span className="habitacion-badge">Hab. {hospedaje.habitacion.numero}</span>
                      </div>
                      <div className="huesped-info-secondary">
                        <span>{hospedaje.huesped.tipo_documento}: {hospedaje.huesped.numero_documento}</span>
                        <span className="hospedaje-codigo">{hospedaje.codigo}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Métodos de Pago */}
      {metodoPagoModal && (
        <div className="modal-overlay" onClick={cerrarModalPago}>
          <div className="modal-content modal-large payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><CreditCard size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Métodos de Pago</h2>
              <button className="btn-close" onClick={cerrarModalPago}>×</button>
            </div>

            <div className="modal-body">
              {/* Resumen del total */}
              <div className="payment-summary">
                <div className="summary-row">
                  <span>Total a pagar:</span>
                  <span className="total-amount">${totales.total.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="summary-row">
                  <span>Total pagado:</span>
                  <span className={calcularTotalPagos() >= totales.total ? 'paid-amount success' : 'paid-amount'}>
                    ${calcularTotalPagos().toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <div className="summary-row">
                  <span>Pendiente:</span>
                  <span className={Math.max(0, totales.total - calcularTotalPagos()) === 0 ? 'pending-amount success' : 'pending-amount'}>
                    ${Math.max(0, totales.total - calcularTotalPagos()).toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>

              {/* Agregar método de pago */}
              <div className="add-payment-section">
                <h3>Agregar Método de Pago</h3>

                <div className="payment-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Método de Pago</label>
                      <select
                        value={metodoPagoSeleccionado || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setMetodoPagoSeleccionado(value ? Number(value) : null);
                        }}
                        className="form-control"
                      >
                        <option value="">Seleccione...</option>
                        {metodosPagoData?.metodosPago.map((metodo) => (
                          <option key={metodo.id} value={metodo.id}>
                            {metodo.icono} {metodo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Monto</label>
                      <input
                        type="number"
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="form-control"
                      />
                    </div>
                  </div>

                  {metodoPagoSeleccionado &&
                   metodosPagoData?.metodosPago.find(m => m.id === metodoPagoSeleccionado)?.requiere_referencia && (
                    <div className="form-group">
                      <label>Referencia / Número de Transacción</label>
                      <input
                        type="text"
                        value={referenciaPago}
                        onChange={(e) => setReferenciaPago(e.target.value)}
                        placeholder="Ej: 123456789"
                        className="form-control"
                      />
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={agregarPago}
                      disabled={!metodoPagoSeleccionado || !montoPago}
                    >
                      + Agregar Pago
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        const pendiente = totales.total - calcularTotalPagos();
                        if (pendiente > 0) {
                          setMontoPago(pendiente.toFixed(2));
                        }
                      }}
                      disabled={calcularTotalPagos() >= totales.total}
                    >
                      Completar Pendiente
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de pagos agregados */}
              {pagos.length > 0 && (
                <div className="payments-list">
                  <h3>Pagos Agregados</h3>
                  <div className="payments-items">
                    {pagos.map((pago, index) => (
                      <div key={index} className="payment-item">
                        <div className="payment-info">
                          <strong>{pago.metodo_nombre}</strong>
                          {pago.referencia && (
                            <span className="payment-reference">Ref: {pago.referencia}</span>
                          )}
                        </div>
                        <div className="payment-amount">
                          ${pago.monto.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                        <button
                          className="btn-remove"
                          onClick={() => eliminarPago(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculadora de cambio para efectivo */}
              {metodoPagoSeleccionado &&
               metodosPagoData?.metodosPago.find(m => Number(m.id) === Number(metodoPagoSeleccionado))?.tipo === 'efectivo' && (
                <div className="change-calculator">
                  <h3>Calculadora de Cambio</h3>
                  <div className="form-group">
                    <label>Monto Recibido (Efectivo)</label>
                    <input
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="form-control"
                    />
                  </div>
                  {montoRecibido && parseFloat(montoRecibido) > 0 && (
                    <div className="change-display">
                      <span>Cambio a devolver:</span>
                      <span className="change-amount">
                        ${calcularCambio().toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Acciones finales */}
              <div className="payment-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cerrarModalPago}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-success"
                  onClick={confirmarPago}
                  disabled={Math.abs(calcularTotalPagos() - totales.total) > 0.01 || pagos.length === 0 || creandoVenta}
                >
                  {creandoVenta ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
