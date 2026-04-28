import { useState, useEffect } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { GET_CLIENTES, GET_CLIENTE, CREAR_CLIENTE } from '../../graphql/huespedes';
import { GET_HUESPED_POR_DOCUMENTO, CREAR_HUESPED } from '../../graphql/huespedes';
import { GET_MUNICIPIOS_DANE } from '../../graphql/municipios';
import { useTiposDocumentoDian } from '../../hooks/useTiposDocumentoDian';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Button from '../shared/Button';
import SuccessModal from '../shared/SuccessModal';
import { Search, User, UserPlus, Check, X } from 'lucide-react';
import './BuscadorClienteHuesped.css';

/**
 * Componente para buscar o crear Cliente y Huésped en un flujo unificado
 *
 * Flujo:
 * 1. Buscar cliente por documento
 * 2. Si existe → Seleccionar
 * 3. Si no existe → Crear cliente nuevo
 * 4. Checkbox: "El cliente es el huésped principal"
 * 5. Si checkbox = true → Auto-crear huésped desde cliente
 * 6. Si checkbox = false → Formulario de huésped diferente
 */
function BuscadorClienteHuesped({
  onClienteSeleccionado,
  onHuespedConfirmado,
  disabled = false
}) {
  // Estados
  const [paso, setPaso] = useState(1); // 1: Buscar Cliente, 2: Confirmar Huésped
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteEsHuesped, setClienteEsHuesped] = useState(true);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);
  const [mostrarFormularioHuesped, setMostrarFormularioHuesped] = useState(false);
  const [huespedConfirmadoExitoso, setHuespedConfirmadoExitoso] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('');
  const [mostrarMunicipios, setMostrarMunicipios] = useState(false);

  // Datos del nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo_documento: 'CC',
    tipo_documento_dian: 13,
    numero_documento: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    codigo_municipio: null,
    pais: 'Colombia',
    digito_verificacion: '',
    regimen_tributario: null,
    responsable_iva: false
  });

  // Datos del nuevo huésped (cuando cliente NO es el huésped)
  const [nuevoHuesped, setNuevoHuesped] = useState({
    nombre: '',
    apellido: '',
    tipo_documento: 'CC',
    numero_documento: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    pais: 'Colombia',
    contacto_emergencia: '',
    telefono_emergencia: ''
  });

  const { legacyToDianCode } = useTiposDocumentoDian();

  // Queries y Mutations
  const [buscarClientes, { data: clientesData, loading: buscandoClientes }] = useLazyQuery(GET_CLIENTES);
  const [buscarHuesped, { loading: buscandoHuesped }] = useLazyQuery(GET_HUESPED_POR_DOCUMENTO);
  const [crearClienteMutation, { loading: creandoCliente }] = useMutation(CREAR_CLIENTE);
  const [crearHuespedMutation, { loading: creandoHuesped }] = useMutation(CREAR_HUESPED);

  const { data: municipiosData, loading: loadingMunicipios } = useQuery(GET_MUNICIPIOS_DANE);
  const municipios = municipiosData?.municipiosDane || [];

  const clientes = clientesData?.clientes || [];

  // Auto-calcular tipo_documento_dian cuando cambia tipo_documento
  useEffect(() => {
    const codigoDian = legacyToDianCode(nuevoCliente.tipo_documento);
    if (codigoDian && codigoDian !== nuevoCliente.tipo_documento_dian) {
      setNuevoCliente(prev => ({
        ...prev,
        tipo_documento_dian: codigoDian
      }));
    }
  }, [nuevoCliente.tipo_documento, legacyToDianCode]);

  // Handlers
  const handleBuscarClientes = () => {
    if (!busquedaCliente.trim()) {
      setErrorModal({ isOpen: true, message: 'Ingresa un documento o nombre para buscar' });
      return;
    }

    buscarClientes({
      variables: { busqueda: busquedaCliente, activo: true }
    });
  };

  const handleSeleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarFormularioCliente(false);
    setPaso(2);

    if (onClienteSeleccionado) {
      onClienteSeleccionado(cliente);
    }
  };

  const handleCrearNuevoCliente = () => {
    setMostrarFormularioCliente(true);
    setClienteSeleccionado(null);
  };

  const handleInputClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoCliente(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleInputHuespedChange = (e) => {
    const { name, value } = e.target;
    setNuevoHuesped(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filtrar municipios según búsqueda
  const municipiosFiltrados = municipios.filter((mun) => {
    if (!busquedaMunicipio) return false;
    const searchLower = busquedaMunicipio.toLowerCase();
    return (
      mun.nombre.toLowerCase().includes(searchLower) ||
      mun.departamento.toLowerCase().includes(searchLower) ||
      mun.codigo.includes(searchLower)
    );
  });

  // Obtener municipio seleccionado
  const municipioSeleccionado = municipios.find(
    m => m.codigo === nuevoCliente.codigo_municipio
  );

  // Handler de selección de municipio
  const handleSeleccionarMunicipio = (municipio) => {
    setNuevoCliente(prev => ({
      ...prev,
      codigo_municipio: municipio.codigo
    }));
    setMostrarMunicipios(false);
    setBusquedaMunicipio('');
  };

  const handleGuardarCliente = async () => {
    // Validaciones
    if (!nuevoCliente.nombre || !nuevoCliente.numero_documento) {
      setErrorModal({ isOpen: true, message: 'El nombre y documento son obligatorios' });
      return;
    }

    // Validar municipio DANE obligatorio
    if (!nuevoCliente.codigo_municipio) {
      setErrorModal({ isOpen: true, message: 'El municipio DANE es obligatorio para crear un cliente' });
      return;
    }

    try {
      const { data, errors } = await crearClienteMutation({
        variables: {
          input: {
            nombre: nuevoCliente.nombre,
            apellido: nuevoCliente.apellido || null,
            tipo_documento: nuevoCliente.tipo_documento,
            tipo_documento_dian: nuevoCliente.tipo_documento_dian,
            numero_documento: nuevoCliente.numero_documento,
            digito_verificacion: nuevoCliente.digito_verificacion || null,
            email: nuevoCliente.email || null,
            telefono: nuevoCliente.telefono || null,
            direccion: nuevoCliente.direccion || null,
            codigo_municipio: nuevoCliente.codigo_municipio || null,
            pais: nuevoCliente.pais || 'Colombia',
            regimen_tributario: nuevoCliente.regimen_tributario || null,
            responsable_iva: nuevoCliente.responsable_iva
          }
        }
      });

      // Verificar errores de GraphQL
      if (errors && errors.length > 0) {
        setErrorModal({ isOpen: true, message: errors[0].message });
        return;
      }

      if (data?.crearCliente) {
        handleSeleccionarCliente(data.crearCliente);
      }
    } catch (error) {
      console.error('Error creando cliente:', error);
      setErrorModal({ isOpen: true, message: `Error al crear cliente: ${error.message}` });
    }
  };

  const handleConfirmarHuesped = async () => {
    if (!clienteSeleccionado) {
      setErrorModal({ isOpen: true, message: 'Primero debes seleccionar o crear un cliente' });
      return;
    }

    let huespedId;
    let huespedData;

    try {
      if (clienteEsHuesped) {
        // Caso 1: El cliente ES el huésped → Crear huésped desde datos del cliente
        const { data, errors } = await crearHuespedMutation({
          variables: {
            input: {
              cliente_id: parseInt(clienteSeleccionado.id),
              nombre: clienteSeleccionado.nombre,
              apellido: clienteSeleccionado.apellido || null,
              tipo_documento: clienteSeleccionado.tipo_documento,
              numero_documento: clienteSeleccionado.numero_documento,
              telefono: clienteSeleccionado.telefono?.trim() || null,
              email: clienteSeleccionado.email || null,
              direccion: clienteSeleccionado.direccion || null,
              ciudad: clienteSeleccionado.ciudad || null,
              pais: clienteSeleccionado.pais || 'Colombia',
              contacto_emergencia: null,
              telefono_emergencia: null
            }
          }
        });

        // Verificar errores de GraphQL
        if (errors && errors.length > 0) {
          setErrorModal({ isOpen: true, message: errors[0].message });
          return;
        }

        huespedData = data?.crearHuesped;
        huespedId = parseInt(data?.crearHuesped?.id);
      } else {
        // Caso 2: El cliente NO es el huésped
        // El cliente seleccionado en Paso 1 es quien PAGA (factura)
        // Se crea un huésped diferente vinculado a ese cliente
        if (!nuevoHuesped.nombre || !nuevoHuesped.numero_documento) {
          setErrorModal({ isOpen: true, message: 'Debes ingresar el nombre y documento del huésped' });
          return;
        }

        // Verificar si ya existe un huésped con ese documento
        const { data: huespedExistente } = await buscarHuesped({
          variables: { numero_documento: nuevoHuesped.numero_documento }
        });

        if (huespedExistente?.huespedPorDocumento) {
          // Huésped ya existe, usar ese
          huespedData = huespedExistente.huespedPorDocumento;
          huespedId = parseInt(huespedExistente.huespedPorDocumento.id);
        } else {
          // Crear huésped vinculado al CLIENTE SELECCIONADO EN PASO 1 (quien paga)
          const { data, errors } = await crearHuespedMutation({
            variables: {
              input: {
                cliente_id: parseInt(clienteSeleccionado.id), // ← CLAVE: Cliente que paga
                nombre: nuevoHuesped.nombre,
                apellido: nuevoHuesped.apellido || null,
                tipo_documento: nuevoHuesped.tipo_documento,
                numero_documento: nuevoHuesped.numero_documento,
                telefono: nuevoHuesped.telefono?.trim() || null,
                email: nuevoHuesped.email || null,
                direccion: nuevoHuesped.direccion || null,
                ciudad: nuevoHuesped.ciudad || null,
                pais: nuevoHuesped.pais || 'Colombia',
                contacto_emergencia: nuevoHuesped.contacto_emergencia || null,
                telefono_emergencia: nuevoHuesped.telefono_emergencia?.trim() || null
              }
            }
          });

          // Verificar errores de GraphQL
          if (errors && errors.length > 0) {
            setErrorModal({ isOpen: true, message: errors[0].message });
            return;
          }

          huespedData = data?.crearHuesped;
          huespedId = parseInt(data?.crearHuesped?.id);
        }
      }

      if (onHuespedConfirmado && huespedId) {
        onHuespedConfirmado({
          id: huespedId,
          cliente_id: parseInt(clienteSeleccionado.id),
          ...huespedData
        });

        // Mostrar confirmación exitosa
        setHuespedConfirmadoExitoso(true);
      }
    } catch (error) {
      console.error('Error creando huésped:', error);
      setErrorModal({ isOpen: true, message: `Error al crear huésped: ${error.message}` });
    }
  };

  const handleVolver = () => {
    setPaso(1);
    setClienteSeleccionado(null);
    setClienteEsHuesped(true);
    setHuespedConfirmadoExitoso(false);
  };

  return (
    <div className="BuscadorClienteHuesped">
      {/* PASO 1: Buscar/Crear Cliente */}
      {paso === 1 && (
        <div className="paso paso-cliente">
          <div className="paso-header">
            <div className="paso-numero">1</div>
            <div>
              <h3>Datos del Cliente</h3>
              <p className="paso-descripcion">Buscar cliente existente o crear uno nuevo</p>
            </div>
          </div>

          {/* Búsqueda de Cliente */}
          {!mostrarFormularioCliente && (
            <>
              <div className="busqueda-container">
                <Input
                  placeholder="Buscar por documento o nombre..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  disabled={disabled}
                />
                <Button
                  type="button"
                  onClick={handleBuscarClientes}
                  disabled={disabled || buscandoClientes}
                  icon={<Search size={18} />}
                >
                  {buscandoClientes ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>

              {/* Resultados de búsqueda */}
              {clientes.length > 0 && (
                <div className="resultados-clientes">
                  <p className="resultados-titulo">Clientes encontrados ({clientes.length}):</p>
                  {clientes.map(cliente => (
                    <div
                      key={cliente.id}
                      className="cliente-card"
                      onClick={() => handleSeleccionarCliente(cliente)}
                    >
                      <div className="cliente-info">
                        <User size={20} />
                        <div>
                          <div className="cliente-nombre">
                            {cliente.nombre} {cliente.apellido}
                          </div>
                          <div className="cliente-documento">
                            {cliente.tipo_documento}: {cliente.numero_documento}
                          </div>
                        </div>
                      </div>
                      <Check size={20} className="check-icon" />
                    </div>
                  ))}
                </div>
              )}

              {/* Botón crear nuevo */}
              <div className="crear-nuevo-container">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCrearNuevoCliente}
                  icon={<UserPlus size={18} />}
                  disabled={disabled}
                >
                  Crear Nuevo Cliente
                </Button>
              </div>
            </>
          )}

          {/* Formulario de Nuevo Cliente */}
          {mostrarFormularioCliente && (
            <div className="formulario-nuevo-cliente">
              <h4>Nuevo Cliente</h4>

              <div className="form-row">
                <Select
                  label="Tipo Documento *"
                  name="tipo_documento"
                  value={nuevoCliente.tipo_documento}
                  onChange={handleInputClienteChange}
                  options={[
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'CE', label: 'Cédula de Extranjería' },
                    { value: 'TI', label: 'Tarjeta de Identidad' },
                    { value: 'PA', label: 'Pasaporte' },
                    { value: 'NIT', label: 'NIT' }
                  ]}
                  disabled={disabled}
                />
                <Input
                  label="Número Documento *"
                  name="numero_documento"
                  value={nuevoCliente.numero_documento}
                  onChange={handleInputClienteChange}
                  required
                  disabled={disabled}
                />
              </div>

              <div className="form-row">
                <Input
                  label={nuevoCliente.tipo_documento === 'NIT' ? 'Razón Social *' : 'Nombres *'}
                  name="nombre"
                  value={nuevoCliente.nombre}
                  onChange={handleInputClienteChange}
                  required
                  disabled={disabled}
                />
                <Input
                  label="Apellidos"
                  name="apellido"
                  value={nuevoCliente.apellido}
                  onChange={handleInputClienteChange}
                  disabled={disabled || nuevoCliente.tipo_documento === 'NIT'}
                />
              </div>

              <div className="form-row">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={nuevoCliente.email}
                  onChange={handleInputClienteChange}
                  disabled={disabled}
                />
                <Input
                  label="Teléfono"
                  name="telefono"
                  value={nuevoCliente.telefono}
                  onChange={handleInputClienteChange}
                  disabled={disabled}
                />
              </div>

              {/* Selector de Municipio DANE */}
              <div className="form-group municipio-selector" style={{marginBottom: '1rem'}}>
                <label htmlFor="municipio">
                  Municipio (Código DANE) <span style={{color: 'red'}}>*</span>
                </label>

                <div className="municipio-input-wrapper" style={{position: 'relative'}}>
                  <input
                    type="text"
                    id="municipio"
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
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />

                  {/* Botón para limpiar selección */}
                  {municipioSeleccionado && !busquedaMunicipio && (
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoCliente({ ...nuevoCliente, codigo_municipio: null });
                        setBusquedaMunicipio('');
                      }}
                      disabled={disabled}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown con resultados */}
                {mostrarMunicipios && busquedaMunicipio && (
                  <div style={{
                    position: 'absolute',
                    zIndex: 1000,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    width: '100%',
                    marginTop: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {loadingMunicipios ? (
                      <div style={{padding: '8px', textAlign: 'center'}}>Cargando municipios...</div>
                    ) : municipiosFiltrados.length === 0 ? (
                      <div style={{padding: '8px', textAlign: 'center', color: '#666'}}>No se encontraron municipios</div>
                    ) : (
                      municipiosFiltrados.map((mun) => (
                        <button
                          key={mun.codigo}
                          type="button"
                          onClick={() => handleSeleccionarMunicipio(mun)}
                          disabled={disabled}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{fontWeight: '500'}}>
                            {mun.nombre} - {mun.departamento}
                          </div>
                          <div style={{fontSize: '12px', color: '#666'}}>
                            Código: {mun.codigo}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {nuevoCliente.codigo_municipio && (
                  <small style={{display: 'block', marginTop: '4px', color: '#666', fontSize: '12px'}}>
                    Código DANE: {nuevoCliente.codigo_municipio}
                  </small>
                )}
              </div>

              <div className="form-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMostrarFormularioCliente(false)}
                  disabled={disabled}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGuardarCliente}
                  disabled={disabled || creandoCliente}
                  loading={creandoCliente}
                >
                  {creandoCliente ? 'Guardando...' : 'Guardar Cliente'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PASO 2: Confirmar Huésped */}
      {paso === 2 && clienteSeleccionado && (
        <div className="paso paso-huesped">
          <div className="paso-header">
            <div className="paso-numero">2</div>
            <div>
              <h3>Datos del Huésped</h3>
              <p className="paso-descripcion">¿Quién se hospedará en la habitación?</p>
            </div>
          </div>

          {/* Cliente Seleccionado */}
          <div className="cliente-seleccionado">
            <div className="label-small">Cliente que factura:</div>
            <div className="cliente-nombre-grande">
              {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
            </div>
            <div className="cliente-documento-small">
              {clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVolver}
              icon={<X size={16} />}
            >
              Cambiar Cliente
            </Button>
          </div>

          {/* Checkbox: El cliente es el huésped */}
          <div className="checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={clienteEsHuesped}
                onChange={(e) => {
                  setClienteEsHuesped(e.target.checked);
                  setMostrarFormularioHuesped(!e.target.checked);
                }}
                disabled={disabled}
              />
              <span>El cliente es el huésped principal</span>
            </label>
            <p className="checkbox-help">
              {clienteEsHuesped
                ? 'Se usarán los datos del cliente para el huésped'
                : 'Ingresa los datos de la persona que se hospedará'
              }
            </p>
          </div>

          {/* Formulario de Huésped (si no es el mismo que el cliente) */}
          {!clienteEsHuesped && (
            <div className="formulario-huesped-diferente">
              <h4>Datos del Huésped Principal</h4>

              <div className="form-row">
                <Input
                  label="Nombres *"
                  name="nombre"
                  value={nuevoHuesped.nombre}
                  onChange={handleInputHuespedChange}
                  required
                  disabled={disabled}
                  placeholder="Nombres del huésped"
                />
                <Input
                  label="Apellidos *"
                  name="apellido"
                  value={nuevoHuesped.apellido}
                  onChange={handleInputHuespedChange}
                  required
                  disabled={disabled}
                  placeholder="Apellidos del huésped"
                />
              </div>

              <div className="form-row">
                <Select
                  label="Tipo Documento *"
                  name="tipo_documento"
                  value={nuevoHuesped.tipo_documento}
                  onChange={handleInputHuespedChange}
                  options={[
                    { value: 'CC', label: 'Cédula de Ciudadanía' },
                    { value: 'CE', label: 'Cédula de Extranjería' },
                    { value: 'TI', label: 'Tarjeta de Identidad' },
                    { value: 'PA', label: 'Pasaporte' }
                  ]}
                  disabled={disabled}
                />
                <Input
                  label="Número Documento *"
                  name="numero_documento"
                  value={nuevoHuesped.numero_documento}
                  onChange={handleInputHuespedChange}
                  required
                  disabled={disabled}
                />
              </div>

              <div className="form-row">
                <Input
                  label="Teléfono"
                  name="telefono"
                  value={nuevoHuesped.telefono}
                  onChange={handleInputHuespedChange}
                  disabled={disabled}
                />
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={nuevoHuesped.email}
                  onChange={handleInputHuespedChange}
                  disabled={disabled}
                />
              </div>

              <div className="form-row">
                <Input
                  label="Contacto de Emergencia"
                  name="contacto_emergencia"
                  value={nuevoHuesped.contacto_emergencia}
                  onChange={handleInputHuespedChange}
                  disabled={disabled}
                />
                <Input
                  label="Teléfono de Emergencia"
                  name="telefono_emergencia"
                  value={nuevoHuesped.telefono_emergencia}
                  onChange={handleInputHuespedChange}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* Botón Confirmar */}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleVolver}
              disabled={disabled}
            >
              Volver
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarHuesped}
              disabled={disabled || creandoHuesped || buscandoHuesped || huespedConfirmadoExitoso}
              loading={creandoHuesped || buscandoHuesped}
            >
              {creandoHuesped || buscandoHuesped ? 'Procesando...' : 'Confirmar Huésped'}
            </Button>
          </div>

          {/* Mensaje de confirmación exitosa */}
          {huespedConfirmadoExitoso && (
            <div className="confirmacion-exitosa">
              <Check size={20} />
              <span>Huésped confirmado exitosamente. Puedes continuar con el check-in.</span>
            </div>
          )}
        </div>
      )}

      {/* Modal de Error */}
      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        type="error"
        message={errorModal.message}
      />
    </div>
  );
}

export default BuscadorClienteHuesped;