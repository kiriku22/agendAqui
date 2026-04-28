import { useState, useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import {
  CREAR_HUESPED,
  ACTUALIZAR_HUESPED,
  GET_HUESPED_POR_DOCUMENTO,
  GET_CLIENTES,
  CREAR_CLIENTE
} from '../../graphql/huespedes';
import useTiposDocumentoDian from '../../hooks/useTiposDocumentoDian';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Select from '../shared/Select';
import SuccessModal from '../shared/SuccessModal';
import { X, Save, User, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
import './HuespedModal.css';

function HuespedModal({ isOpen, onClose, huesped, modoEdicion, onSuccess }) {
  // Estados principales
  const [modoCliente, setModoCliente] = useState('existente'); // 'existente' o 'nuevo'
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesSugeridos, setClientesSugeridos] = useState([]);

  // Formulario de huésped
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo_documento: 13, // DIAN: Cédula de Ciudadanía
    numero_documento: '',
    nombre_completo: '',
    fecha_nacimiento: '',
    nacionalidad: 'Colombiana',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    pais: 'Colombia',
    contacto_emergencia: '',
    telefono_emergencia: '',
    observaciones: '',
    preferencias: {},
    // Campos TRA (Tarjeta de Registro de Alojamiento)
    lugar_residencia: '',
    lugar_procedencia: '',
    motivo_viaje: '',
  });

  // Formulario de nuevo cliente
  const [nuevoClienteData, setNuevoClienteData] = useState({
    tipo_documento: 13, // DIAN: Cédula de Ciudadanía
    numero_documento: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    pais: 'Colombia'
  });

  // Estados de UI
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  // GraphQL
  const [crearHuesped] = useMutation(CREAR_HUESPED);
  const [actualizarHuesped] = useMutation(ACTUALIZAR_HUESPED);
  const [crearCliente] = useMutation(CREAR_CLIENTE);
  const [getHuespedPorDocumento] = useLazyQuery(GET_HUESPED_POR_DOCUMENTO);
  const [buscarClientes, { data: clientesData }] = useLazyQuery(GET_CLIENTES);

  // Hook DIAN para tipos de documento oficiales
  const {
    tiposDocumentoOptions,  // Opciones formateadas para dropdown
    validarDocumento,       // Función de validación DIAN
    legacyToDianCode        // Convertir 'CC' → 13
  } = useTiposDocumentoDian(true);

  // Función para resetear todos los estados del formulario
  const resetForm = () => {
    setFormData({
      cliente_id: '',
      tipo_documento: 13, // DIAN: Cédula de Ciudadanía
      numero_documento: '',
      nombre_completo: '',
      fecha_nacimiento: '',
      nacionalidad: 'Colombiana',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      pais: 'Colombia',
      contacto_emergencia: '',
      telefono_emergencia: '',
      observaciones: '',
      preferencias: {}
    });
    setNuevoClienteData({
      tipo_documento: 13, // DIAN: Cédula de Ciudadanía
      numero_documento: '',
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      direccion: '',
      ciudad: '',
      pais: 'Colombia'
    });
    setModoCliente('existente');
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setErrors({});
    setIsSubmitting(false);
  };

  // Cargar datos del huésped en modo edición
  useEffect(() => {
    if (modoEdicion && huesped) {
      // Convertir tipo_documento legacy a código DIAN si es necesario
      let tipoDian = huesped.tipo_documento_dian || huesped.tipo_documento || 13;
      if (typeof tipoDian === 'string') {
        tipoDian = legacyToDianCode(tipoDian) || 13;
      }

      setFormData({
        cliente_id: huesped.cliente_id || '',
        tipo_documento: tipoDian,
        numero_documento: huesped.numero_documento || '',
        nombre_completo: huesped.nombre_completo || '',
        fecha_nacimiento: huesped.fecha_nacimiento || '',
        nacionalidad: huesped.nacionalidad || 'Colombiana',
        telefono: huesped.telefono || '',
        email: huesped.email || '',
        direccion: huesped.direccion || '',
        ciudad: huesped.ciudad || '',
        pais: huesped.pais || 'Colombia',
        contacto_emergencia: huesped.contacto_emergencia || '',
        telefono_emergencia: huesped.telefono_emergencia || '',
        observaciones: huesped.observaciones || '',
        preferencias: huesped.preferencias || {},
        // Campos TRA
        lugar_residencia: huesped.lugar_residencia || '',
        lugar_procedencia: huesped.lugar_procedencia || '',
        motivo_viaje: huesped.motivo_viaje || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoEdicion, huesped]);

  // Limpiar formulario cuando se cierra el modal o se abre en modo creación
  useEffect(() => {
    if (!isOpen) {
      // Modal cerrado - limpiar todo
      resetForm();
    } else if (!modoEdicion) {
      // Modal abierto en modo creación - limpiar formulario
      resetForm();
    }
  }, [isOpen, modoEdicion]);

  // Buscar clientes cuando cambia la búsqueda
  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      buscarClientes({
        variables: { busqueda: busquedaCliente, activo: true }
      });
    }
  }, [busquedaCliente, buscarClientes]);

  // Actualizar sugerencias de clientes
  useEffect(() => {
    if (clientesData?.clientes) {
      setClientesSugeridos(clientesData.clientes);
    }
  }, [clientesData]);

  // Validaciones
  const validatePhone = (phone) => {
    if (!phone) return true; // Optional
    const clean = phone.replace(/[\s()-]/g, '');
    return /^3\d{9}$/.test(clean) || /^\d{7,10}$/.test(clean);
  };

  const validateEmail = (email) => {
    if (!email) return true; // Optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validarFormulario = () => {
    const newErrors = {};

    // Validar cliente SOLO si NO estamos en modo edición
    if (!modoEdicion) {
      if (modoCliente === 'existente' && !clienteSeleccionado) {
        newErrors.cliente = 'Debes seleccionar un cliente';
      }

      // Validar nuevo cliente
      if (modoCliente === 'nuevo') {
        if (!nuevoClienteData.numero_documento) {
          newErrors.nuevoCliente_documento = 'Número de documento es requerido';
        } else {
          const result = validarDocumento(nuevoClienteData.tipo_documento, nuevoClienteData.numero_documento);
          if (!result.valid) {
            newErrors.nuevoCliente_documento = result.message;
          }
        }
        if (!nuevoClienteData.nombre) {
          newErrors.nuevoCliente_nombre = 'Nombre es requerido';
        }
        if (!nuevoClienteData.apellido) {
          newErrors.nuevoCliente_apellido = 'Apellido es requerido';
        }
      }
    }

    // Validar documento huésped
    if (!formData.numero_documento) {
      newErrors.numero_documento = 'Número de documento es requerido';
    } else {
      const result = validarDocumento(formData.tipo_documento, formData.numero_documento);
      if (!result.valid) {
        newErrors.numero_documento = result.message;
      }
    }

    // Validar nombre completo
    if (!formData.nombre_completo) {
      newErrors.nombre_completo = 'Nombre completo es requerido';
    }

    // Validar nacionalidad
    if (!formData.nacionalidad) {
      newErrors.nacionalidad = 'Nacionalidad es requerida';
    }

    // Validar teléfono
    if (formData.telefono && !validatePhone(formData.telefono)) {
      newErrors.telefono = 'Formato de teléfono inválido (ej: 3001234567)';
    }

    // Validar email
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    // Validar teléfono emergencia
    if (formData.telefono_emergencia && !validatePhone(formData.telefono_emergencia)) {
      newErrors.telefono_emergencia = 'Formato de teléfono inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Limpiar documento si es el campo numero_documento
    let finalValue = value;
    if (name === 'numero_documento') {
      finalValue = value.replace(/[\s.-]/g, ''); // Remover espacios, guiones, puntos
    }

    // Si es tipo_documento y viene como string legacy (retrocompatibilidad)
    if (name === 'tipo_documento' && typeof finalValue === 'string') {
      const codigoDian = legacyToDianCode(finalValue);
      finalValue = codigoDian || parseInt(finalValue);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNuevoClienteChange = (e) => {
    const { name, value } = e.target;

    // Limpiar documento si es el campo numero_documento
    let finalValue = value;
    if (name === 'numero_documento') {
      finalValue = value.replace(/[\s.-]/g, '');
    }

    // Si es tipo_documento y viene como string legacy (retrocompatibilidad)
    if (name === 'tipo_documento' && typeof finalValue === 'string') {
      const codigoDian = legacyToDianCode(finalValue);
      finalValue = codigoDian || parseInt(finalValue);
    }

    setNuevoClienteData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Limpiar error
    if (errors[`nuevoCliente_${name}`]) {
      setErrors(prev => ({ ...prev, [`nuevoCliente_${name}`]: undefined }));
    }
  };

  const handleClienteSelect = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente.nombre + ' ' + (cliente.apellido || ''));
    setClientesSugeridos([]);

    // Auto-llenar datos del huésped desde cliente
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id,
      nombre_completo: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      telefono: cliente.telefono || prev.telefono,
      email: cliente.email || prev.email,
      direccion: cliente.direccion || prev.direccion,
      ciudad: cliente.ciudad || prev.ciudad,
      pais: cliente.pais || prev.pais
    }));

    // Limpiar error
    if (errors.cliente) {
      setErrors(prev => ({ ...prev, cliente: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validarFormulario()) {
      setErrorModal({
        isOpen: true,
        message: 'Por favor corrige los errores en el formulario'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let clienteId = formData.cliente_id;

      // Crear cliente si es necesario
      if (modoCliente === 'nuevo') {
        const { data } = await crearCliente({
          variables: { input: nuevoClienteData }
        });
        clienteId = data.crearCliente.id;
      }

      // Verificar si ya existe huésped con este documento (solo en modo creación)
      if (!modoEdicion) {
        const { data: existente } = await getHuespedPorDocumento({
          variables: { numeroDocumento: formData.numero_documento }
        });

        if (existente?.huespedPorDocumento) {
          setErrorModal({
            isOpen: true,
            message: `Ya existe un huésped registrado con el documento ${formData.numero_documento}`
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Crear o actualizar huésped
      // Excluir campos computados/virtuales que no existen en CrearHuespedInput
      const { nombre_completo, ...huespedData } = formData;

      const input = {
        ...huespedData,
        cliente_id: parseInt(clienteId)
      };

      if (modoEdicion) {
        await actualizarHuesped({
          variables: { id: parseInt(huesped.id), input }
        });
        setSuccessModal({
          isOpen: true,
          message: 'Huésped actualizado exitosamente'
        });
      } else {
        await crearHuesped({
          variables: { input }
        });
        setSuccessModal({
          isOpen: true,
          message: 'Huésped registrado exitosamente'
        });
      }

    } catch (error) {
      console.error('Error al guardar huésped:', error);
      setErrorModal({
        isOpen: true,
        message: error.graphQLErrors?.[0]?.message || error.message || 'Error al guardar huésped'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modoEdicion ? 'Editar Huésped' : 'Nuevo Huésped'}>
        <form onSubmit={handleSubmit} className="huesped-modal-form">

          {/* Sección 1: Asociación de Cliente */}
          {!modoEdicion && (
            <div className="form-section">
              <h3 className="section-title">
                <User size={18} />
                Asociación de Cliente
              </h3>

              <div className="cliente-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${modoCliente === 'existente' ? 'active' : ''}`}
                  onClick={() => setModoCliente('existente')}
                >
                  Cliente Existente
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${modoCliente === 'nuevo' ? 'active' : ''}`}
                  onClick={() => setModoCliente('nuevo')}
                >
                  Nuevo Cliente
                </button>
              </div>

              {modoCliente === 'existente' ? (
                <div className="cliente-search">
                  <Input
                    label="Buscar Cliente"
                    name="busqueda_cliente"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    placeholder="Buscar por nombre o documento..."
                    error={errors.cliente}
                  />
                  {clientesSugeridos.length > 0 && (
                    <div className="clientes-sugerencias">
                      {clientesSugeridos.map((cliente) => (
                        <div
                          key={cliente.id}
                          className="cliente-sugerencia"
                          onClick={() => handleClienteSelect(cliente)}
                        >
                          <div className="cliente-sugerencia-nombre">
                            {cliente.nombre} {cliente.apellido}
                          </div>
                          <div className="cliente-sugerencia-documento">
                            {cliente.tipo_documento}: {cliente.numero_documento}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {clienteSeleccionado && (
                    <div className="cliente-seleccionado">
                      <AlertCircle size={16} />
                      Cliente seleccionado: <strong>{clienteSeleccionado.nombre} {clienteSeleccionado.apellido}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="nuevo-cliente-form">
                  <div className="form-row">
                    <Select
                      label="Tipo Documento"
                      name="tipo_documento"
                      value={nuevoClienteData.tipo_documento}
                      onChange={handleNuevoClienteChange}
                      options={tiposDocumentoOptions}
                    />
                    <Input
                      label="Número Documento *"
                      name="numero_documento"
                      value={nuevoClienteData.numero_documento}
                      onChange={handleNuevoClienteChange}
                      error={errors.nuevoCliente_documento}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <Input
                      label="Nombre *"
                      name="nombre"
                      value={nuevoClienteData.nombre}
                      onChange={handleNuevoClienteChange}
                      error={errors.nuevoCliente_nombre}
                      required
                    />
                    <Input
                      label="Apellido *"
                      name="apellido"
                      value={nuevoClienteData.apellido}
                      onChange={handleNuevoClienteChange}
                      error={errors.nuevoCliente_apellido}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <Input
                      label="Teléfono"
                      name="telefono"
                      value={nuevoClienteData.telefono}
                      onChange={handleNuevoClienteChange}
                      placeholder="3001234567"
                    />
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={nuevoClienteData.email}
                      onChange={handleNuevoClienteChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sección 2: Información Personal del Huésped */}
          <div className="form-section">
            <h3 className="section-title">
              <User size={18} />
              Información Personal
            </h3>

            <div className="form-row">
              <Select
                label="Tipo Documento *"
                name="tipo_documento"
                value={formData.tipo_documento}
                onChange={handleInputChange}
                options={tiposDocumentoOptions}
                required
              />
              <Input
                label="Número Documento *"
                name="numero_documento"
                value={formData.numero_documento}
                onChange={handleInputChange}
                error={errors.numero_documento}
                required
              />
            </div>

            <Input
              label="Nombre Completo *"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleInputChange}
              error={errors.nombre_completo}
              required
            />

            <div className="form-row">
              <Input
                label="Fecha de Nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleInputChange}
              />
              <Input
                label="Nacionalidad *"
                name="nacionalidad"
                value={formData.nacionalidad}
                onChange={handleInputChange}
                error={errors.nacionalidad}
                placeholder="Colombiana"
                required
              />
            </div>
          </div>

          {/* Sección 3: Información de Contacto */}
          <div className="form-section">
            <h3 className="section-title">
              <Phone size={18} />
              Información de Contacto
            </h3>

            <div className="form-row">
              <Input
                label="Teléfono"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                error={errors.telefono}
                placeholder="3001234567"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="form-row">
              <Input
                label="Ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
              />
              <Input
                label="País"
                name="pais"
                value={formData.pais}
                onChange={handleInputChange}
              />
            </div>

            <Input
              label="Dirección"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              placeholder="Calle, número, barrio..."
            />
          </div>

          {/* Sección 4: Contacto de Emergencia */}
          <div className="form-section">
            <h3 className="section-title">
              <AlertCircle size={18} />
              Contacto de Emergencia
            </h3>

            <Input
              label="Nombre del Contacto"
              name="contacto_emergencia"
              value={formData.contacto_emergencia}
              onChange={handleInputChange}
              placeholder="Nombre completo del familiar o contacto"
            />

            <Input
              label="Teléfono de Emergencia"
              name="telefono_emergencia"
              value={formData.telefono_emergencia}
              onChange={handleInputChange}
              error={errors.telefono_emergencia}
              placeholder="3001234567"
            />
          </div>

          {/* Sección 5: Observaciones */}
          <div className="form-section">
            <h3 className="section-title">Observaciones</h3>

            <div className="form-group">
              <label htmlFor="observaciones" className="form-label">
                Notas adicionales
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows={3}
                className="form-textarea"
                placeholder="Alergias, preferencias, notas especiales..."
              />
            </div>
          </div>

          {/* Sección 6: Datos para TRA (Tarjeta de Registro de Alojamiento) */}
          <div className="form-section">
            <h3 className="section-title">
              Datos para Registro TRA
              <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#6b7280', marginLeft: '0.5rem' }}>
                (MinCIT - Opcional)
              </span>
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lugar_residencia" className="form-label">
                  Lugar de residencia
                </label>
                <input
                  id="lugar_residencia"
                  name="lugar_residencia"
                  type="text"
                  value={formData.lugar_residencia}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ciudad y país de residencia"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lugar_procedencia" className="form-label">
                  Lugar de procedencia
                </label>
                <input
                  id="lugar_procedencia"
                  name="lugar_procedencia"
                  type="text"
                  value={formData.lugar_procedencia}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="De dónde viene"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="motivo_viaje" className="form-label">
                Motivo del viaje
              </label>
              <select
                id="motivo_viaje"
                name="motivo_viaje"
                value={formData.motivo_viaje}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="">Seleccionar motivo...</option>
                <option value="turismo">Turismo</option>
                <option value="negocios">Negocios</option>
                <option value="salud">Salud</option>
                <option value="educacion">Educación</option>
                <option value="eventos">Eventos</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={18} />}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modales de éxito y error */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => {
          setSuccessModal({ isOpen: false, message: '' });
          if (onSuccess) onSuccess();
          onClose();
        }}
        message={successModal.message}
        type="success"
      />

      <SuccessModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
        type="error"
      />
    </>
  );
}

export default HuespedModal;
