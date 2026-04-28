import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Users, Loader, AlertCircle, CheckCircle, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { GET_CLIENTES, CREAR_CLIENTE, ACTUALIZAR_CLIENTE, ELIMINAR_CLIENTE } from '../../graphql/huespedes';
import { GET_MUNICIPIOS_DANE } from '../../graphql/municipios';
import { useTiposDocumentoDian } from '../../hooks/useTiposDocumentoDian';
import { useConfirmation } from '../../hooks/useConfirmation';
import ConfirmModal from '../shared/ConfirmModal';
import ClienteDetalleModal from '../clientes/ClienteDetalleModal';
import './ModalConfig.css';

function ModalClientes({ onClose }) {
  const [mensaje, setMensaje] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(null);
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('');
  const [mostrarMunicipios, setMostrarMunicipios] = useState(false);

  // Estado del formulario (solo campos esenciales)
  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    tipo_documento_dian: null,
    numero_documento: '',
    digito_verificacion: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    codigo_municipio: null,
    pais: 'Colombia',
    regimen_tributario: null,
    responsable_iva: false,
    activo: true
  });

  // Hooks
  const {
    legacyToDianCode,
    getTipoDocumentoDianInfo
  } = useTiposDocumentoDian();

  const { state: confirmState, confirm, execute, close: closeConfirm } = useConfirmation();

  // Query para obtener clientes
  const { data, loading, error, refetch } = useQuery(GET_CLIENTES);

  // Query para municipios
  const { data: municipiosData, loading: loadingMunicipios } = useQuery(GET_MUNICIPIOS_DANE);
  const municipios = municipiosData?.municipiosDane || [];

  // Mutations
  const [crearCliente, { loading: creando }] = useMutation(CREAR_CLIENTE, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Cliente creado exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [actualizarCliente, { loading: actualizando }] = useMutation(ACTUALIZAR_CLIENTE, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Cliente actualizado exitosamente' });
      refetch();
      resetForm();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  const [eliminarCliente, { loading: eliminando }] = useMutation(ELIMINAR_CLIENTE, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Cliente desactivado exitosamente' });
      refetch();
      setTimeout(() => setMensaje(null), 3000);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
      setTimeout(() => setMensaje(null), 5000);
    },
  });

  // Calcular dígito de verificación NIT
  const calcularDigitoNIT = (nit) => {
    const vpri = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let suma = 0;
    const nitArray = nit.toString().split('').reverse();

    for (let i = 0; i < nitArray.length && i < vpri.length; i++) {
      suma += parseInt(nitArray[i]) * vpri[i];
    }

    const residuo = suma % 11;
    return (residuo === 0 || residuo === 1) ? residuo.toString() : (11 - residuo).toString();
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'CC',
      tipo_documento_dian: 13, // Código DIAN para CC (Cédula de Ciudadanía)
      numero_documento: '',
      digito_verificacion: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      codigo_municipio: null,
      pais: 'Colombia',
      regimen_tributario: null,
      responsable_iva: false,
      activo: true
    });
    setClienteEnEdicion(null);
    setMostrarFormulario(false);
    setBusquedaMunicipio('');
    setMostrarMunicipios(false);
  };

  const handleNuevo = () => {
    resetForm();
    setMostrarFormulario(true);
  };

  const handleEditar = (cliente) => {
    setFormData({
      tipo_documento: cliente.tipo_documento || 'CC',
      tipo_documento_dian: cliente.tipo_documento_dian || null,
      numero_documento: cliente.numero_documento || '',
      digito_verificacion: cliente.digito_verificacion || '',
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      codigo_municipio: cliente.codigo_municipio || null,
      pais: cliente.pais || 'Colombia',
      regimen_tributario: cliente.regimen_tributario || null,
      responsable_iva: cliente.responsable_iva || false,
      activo: cliente.activo !== undefined ? cliente.activo : true
    });
    setClienteEnEdicion(cliente);
    setMostrarFormulario(true);
  };

  const handleEliminar = (cliente) => {
    confirm(
      async () => {
        await eliminarCliente({
          variables: { id: parseInt(cliente.id) }
        });
      },
      {
        title: '¿Desactivar cliente?',
        message: `¿Está seguro de que desea desactivar al cliente ${cliente.nombre}?`,
        confirmText: 'Desactivar',
        variant: 'danger'
      }
    );
  };

  const handleVerDetalle = (cliente) => {
    setMostrarDetalle(cliente);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar municipio DANE obligatorio
    if (!formData.codigo_municipio) {
      setMensaje({ tipo: 'error', texto: 'El municipio DANE es obligatorio para crear o actualizar un cliente' });
      setTimeout(() => setMensaje(null), 5000);
      return;
    }

    // Asegurar que tipo_documento_dian esté correctamente mapeado
    const codigoDian = formData.tipo_documento_dian || legacyToDianCode(formData.tipo_documento);

    console.log('DEBUG - Datos del formulario:', {
      tipo_documento: formData.tipo_documento,
      tipo_documento_dian_original: formData.tipo_documento_dian,
      tipo_documento_dian_calculado: codigoDian,
      nombre: formData.nombre
    });

    const input = {
      tipo_documento: formData.tipo_documento,
      tipo_documento_dian: codigoDian,
      numero_documento: formData.numero_documento.trim(),
      digito_verificacion: formData.digito_verificacion || null,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido ? formData.apellido.trim() : null,
      email: formData.email ? formData.email.trim() : null,
      telefono: formData.telefono ? formData.telefono.trim() : null,
      codigo_municipio: formData.codigo_municipio || null,
      pais: formData.pais || 'Colombia',
      regimen_tributario: formData.regimen_tributario || null,
      responsable_iva: formData.responsable_iva
    };

    console.log('DEBUG - Input que se enviará:', input);

    if (clienteEnEdicion) {
      // Cuando editamos, incluimos el campo activo
      input.activo = formData.activo;

      await actualizarCliente({
        variables: { id: parseInt(clienteEnEdicion.id), input }
      });
    } else {
      // Cuando creamos, NO incluimos activo (se establece por defecto en true en la BD)
      await crearCliente({
        variables: { input }
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Auto-calcular código DIAN
  const handleTipoDocumentoChange = (e) => {
    const tipo = e.target.value;
    const codigoDian = legacyToDianCode(tipo);

    setFormData(prev => ({
      ...prev,
      tipo_documento: tipo,
      tipo_documento_dian: codigoDian
    }));
  };

  // Auto-calcular dígito verificación para NIT
  const handleNumeroDocumentoChange = (e) => {
    const numero = e.target.value;
    setFormData(prev => ({
      ...prev,
      numero_documento: numero
    }));

    if (formData.tipo_documento === 'NIT' && numero) {
      const nit = numero.replace(/\D/g, '');
      if (nit.length > 0) {
        const digito = calcularDigitoNIT(nit);
        setFormData(prev => ({
          ...prev,
          digito_verificacion: digito
        }));
      }
    }
  };

  // Filtrar municipios
  const municipiosFiltrados = municipios.filter((mun) => {
    if (!busquedaMunicipio) return false;
    const searchLower = busquedaMunicipio.toLowerCase();
    return (
      mun.nombre.toLowerCase().includes(searchLower) ||
      mun.departamento.toLowerCase().includes(searchLower) ||
      mun.codigo.includes(searchLower)
    );
  }).slice(0, 50);

  const municipioSeleccionado = municipios.find(
    m => m.codigo === formData.codigo_municipio
  );

  const handleSeleccionarMunicipio = (municipio) => {
    setFormData(prev => ({
      ...prev,
      codigo_municipio: municipio.codigo
    }));
    setMostrarMunicipios(false);
    setBusquedaMunicipio('');
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} color="#ef4444" />
            <p style={{ marginTop: '1rem', color: '#ef4444' }}>Error: {error.message}</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const clientes = data?.clientes || [];

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-config modal-config--xlarge">
          {/* Header */}
          <div className="modal-config__header">
            <div className="modal-config__header-icon">
              <Users size={24} />
            </div>
            <div>
              <h2 className="modal-config__title">Gestión de Clientes</h2>
              <p className="modal-config__subtitle">Registro maestro de clientes con datos DIAN</p>
            </div>
            <button onClick={onClose} className="modal-config__close">
              <X size={20} />
            </button>
          </div>

          {/* Mensaje de estado */}
          {mensaje && (
            <div className={`alert alert--${mensaje.tipo}`}>
              {mensaje.tipo === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{mensaje.texto}</span>
            </div>
          )}

          {/* Contenido */}
          <div className="modal-config__form">
            {/* Botón Nuevo */}
            {!mostrarFormulario && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleNuevo}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={20} />
                  Nuevo Cliente
                </button>
              </div>
            )}

            {/* Formulario Embebido */}
            {mostrarFormulario && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '2px solid #8b5cf6'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1f2937' }}>
                  {clienteEnEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>

                <form onSubmit={handleSubmit}>
                  {/* Datos de Identificación */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.75rem' }}>
                      Datos de Identificación
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Tipo de Documento *
                        </label>
                        <select
                          name="tipo_documento"
                          className="form-input"
                          value={formData.tipo_documento}
                          onChange={handleTipoDocumentoChange}
                          required
                        >
                          <option value="CC">Cédula de Ciudadanía</option>
                          <option value="CE">Cédula de Extranjería</option>
                          <option value="PA">Pasaporte</option>
                          <option value="NIT">NIT</option>
                          <option value="TI">Tarjeta de Identidad</option>
                          <option value="RC">Registro Civil</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Número de Documento *
                          {clienteEnEdicion && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>(No editable)</span>}
                        </label>
                        <input
                          type="text"
                          name="numero_documento"
                          className="form-input"
                          value={formData.numero_documento}
                          onChange={handleNumeroDocumentoChange}
                          disabled={!!clienteEnEdicion}
                          required
                          title={clienteEnEdicion ? "El número de documento no puede modificarse una vez creado el cliente" : ""}
                          style={clienteEnEdicion ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                        />
                      </div>

                      {formData.tipo_documento === 'NIT' && (
                        <div>
                          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                            Dígito Verificación
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.digito_verificacion}
                            disabled
                            style={{ backgroundColor: '#f3f4f6', maxWidth: '80px' }}
                            title="Calculado automáticamente"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos Personales */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.75rem' }}>
                      Datos Personales
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          {formData.tipo_documento === 'NIT' ? 'Razón Social' : 'Nombres'} *
                        </label>
                        <input
                          type="text"
                          name="nombre"
                          className="form-input"
                          value={formData.nombre}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Apellidos {formData.tipo_documento !== 'NIT' && '*'}
                        </label>
                        <input
                          type="text"
                          name="apellido"
                          className="form-input"
                          value={formData.apellido}
                          onChange={handleChange}
                          required={formData.tipo_documento !== 'NIT'}
                          disabled={formData.tipo_documento === 'NIT'}
                          style={formData.tipo_documento === 'NIT' ? { backgroundColor: '#f3f4f6' } : {}}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos de Contacto */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.75rem' }}>
                      Datos de Contacto
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="form-input"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="ejemplo@correo.com"
                        />
                      </div>

                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          name="telefono"
                          className="form-input"
                          value={formData.telefono}
                          onChange={handleChange}
                          placeholder="3001234567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ubicación */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.75rem' }}>
                      Ubicación
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ position: 'relative' }}>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          Municipio (Código DANE)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={
                            busquedaMunicipio ||
                            (municipioSeleccionado
                              ? `${municipioSeleccionado.nombre} - ${municipioSeleccionado.departamento}`
                              : ''
                            )
                          }
                          onChange={(e) => {
                            setBusquedaMunicipio(e.target.value);
                            setMostrarMunicipios(true);
                          }}
                          onFocus={() => setMostrarMunicipios(true)}
                          placeholder="Buscar municipio..."
                        />

                        {/* Dropdown de municipios */}
                        {mostrarMunicipios && busquedaMunicipio && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            marginTop: '4px'
                          }}>
                            {loadingMunicipios ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                Cargando...
                              </div>
                            ) : municipiosFiltrados.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                No se encontraron municipios
                              </div>
                            ) : (
                              municipiosFiltrados.map((mun) => (
                                <button
                                  key={mun.codigo}
                                  type="button"
                                  onClick={() => handleSeleccionarMunicipio(mun)}
                                  style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'white',
                                    border: 'none',
                                    borderBottom: '1px solid #f3f4f6',
                                    textAlign: 'left',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                                  onMouseLeave={(e) => e.target.style.background = 'white'}
                                >
                                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                    {mun.nombre} - {mun.departamento}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Código: {mun.codigo}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                          País
                        </label>
                        <input
                          type="text"
                          name="pais"
                          className="form-input"
                          value={formData.pais}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campos NIT */}
                  {formData.tipo_documento === 'NIT' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.75rem' }}>
                        Información Tributaria
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                            Régimen Tributario
                          </label>
                          <select
                            name="regimen_tributario"
                            className="form-input"
                            value={formData.regimen_tributario || ''}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione...</option>
                            <option value="Común">Régimen Común</option>
                            <option value="Simplificado">Régimen Simplificado</option>
                            <option value="Grande Contribuyente">Grande Contribuyente</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              name="responsable_iva"
                              checked={formData.responsable_iva}
                              onChange={handleChange}
                            />
                            <span style={{ fontSize: '0.875rem' }}>Responsable de IVA</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estado */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleChange}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Cliente Activo</span>
                    </label>
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary"
                      disabled={creando || actualizando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={creando || actualizando}
                    >
                      {creando || actualizando ? 'Guardando...' : (clienteEnEdicion ? 'Actualizar' : 'Crear')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tabla de Clientes */}
            {clientes.length === 0 ? (
              <div className="empty-state">
                <Users size={48} color="#d1d5db" />
                <p>No hay clientes registrados</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="config-table">
                  <thead>
                    <tr>
                      <th>Nombre Completo</th>
                      <th>Tipo Doc.</th>
                      <th>Documento</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Municipio</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente) => (
                      <tr key={cliente.id}>
                        <td style={{ fontWeight: 500 }}>
                          {cliente.nombre} {cliente.apellido || ''}
                        </td>
                        <td>
                          <span className="badge badge--info" style={{ fontSize: '0.75rem' }}>
                            {cliente.tipo_documento}
                          </span>
                        </td>
                        <td>{cliente.numero_documento}</td>
                        <td>{cliente.email || '-'}</td>
                        <td>{cliente.telefono || '-'}</td>
                        <td>{cliente.codigo_municipio || '-'}</td>
                        <td>
                          <span className={`badge ${cliente.activo ? 'badge--success' : 'badge--danger'}`}>
                            {cliente.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="config-table__actions">
                            <button
                              className="config-table__btn config-table__btn--view"
                              onClick={() => handleVerDetalle(cliente)}
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="config-table__btn config-table__btn--edit"
                              onClick={() => handleEditar(cliente)}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="config-table__btn config-table__btn--delete"
                              onClick={() => handleEliminar(cliente)}
                              title="Desactivar"
                              disabled={eliminando}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          {!mostrarFormulario && (
            <div className="modal-config__footer">
              <button onClick={onClose} className="btn-secondary">
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles del Cliente (se renderiza encima) */}
      {mostrarDetalle && (
        <ClienteDetalleModal
          cliente={mostrarDetalle}
          onClose={() => setMostrarDetalle(null)}
        />
      )}

      {/* Modal de Confirmación */}
      {confirmState.isOpen && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          variant={confirmState.variant}
          loading={confirmState.loading}
          onConfirm={execute}
          onCancel={closeConfirm}
        />
      )}
    </>
  );
}

export default ModalClientes;
