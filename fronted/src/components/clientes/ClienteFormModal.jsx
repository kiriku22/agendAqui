import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREAR_CLIENTE, ACTUALIZAR_CLIENTE } from '../../graphql/huespedes';
import { GET_MUNICIPIOS_DANE } from '../../graphql/municipios';
import { useTiposDocumentoDian } from '../../hooks/useTiposDocumentoDian';
import Button from '../shared/Button';
import { X, Save, User, FileText, Mail, Phone, MapPin } from 'lucide-react';
import './ClienteFormModal.css';

function ClienteFormModal({ visible, onClose, cliente, modoEdicion }) {
  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    tipo_documento_dian: 13,  // Código DIAN para CC (valor por defecto)
    numero_documento: '',
    digito_verificacion: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    codigo_municipio: null,
    pais: 'Colombia',
    fecha_nacimiento: '',
    regimen_tributario: null,
    responsable_iva: false,
    observaciones: ''
  });

  const [errors, setErrors] = useState({});
  const [busquedaMunicipio, setBusquedaMunicipio] = useState('');
  const [mostrarMunicipios, setMostrarMunicipios] = useState(false);

  // Cargar tipos de documento DIAN y municipios
  const {
    tiposDocumentoOptions,
    legacyToDianCode,
    validarDocumento,
    getTipoDocumentoDianInfo
  } = useTiposDocumentoDian();

  const { data: municipiosData, loading: loadingMunicipios } = useQuery(GET_MUNICIPIOS_DANE);
  const municipios = municipiosData?.municipiosDane || [];

  // Mutations
  const [crearCliente, { loading: loadingCrear }] = useMutation(CREAR_CLIENTE, {
    onCompleted: () => {
      onClose();
    },
    onError: (error) => {
      alert(`Error al crear cliente: ${error.message}`);
    }
  });

  const [actualizarCliente, { loading: loadingActualizar }] = useMutation(ACTUALIZAR_CLIENTE, {
    onCompleted: () => {
      onClose();
    },
    onError: (error) => {
      alert(`Error al actualizar cliente: ${error.message}`);
    }
  });

  const loading = loadingCrear || loadingActualizar;

  // Cargar datos del cliente en modo edición
  useEffect(() => {
    if (modoEdicion && cliente) {
      setFormData({
        tipo_documento: cliente.tipo_documento || 'CC',
        tipo_documento_dian: cliente.tipo_documento_dian || null,
        numero_documento: cliente.numero_documento || '',
        digito_verificacion: cliente.digito_verificacion || '',
        nombre: cliente.nombre || '',
        apellido: cliente.apellido || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
        codigo_municipio: cliente.codigo_municipio || null,
        pais: cliente.pais || 'Colombia',
        fecha_nacimiento: cliente.fecha_nacimiento || '',
        regimen_tributario: cliente.regimen_tributario || null,
        responsable_iva: cliente.responsable_iva || false,
        observaciones: cliente.observaciones || ''
      });
    } else {
      // Reset form for new cliente
      setFormData({
        tipo_documento: 'CC',
        tipo_documento_dian: 13,  // Código DIAN para CC (valor por defecto)
        numero_documento: '',
        digito_verificacion: '',
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        codigo_municipio: null,
        pais: 'Colombia',
        fecha_nacimiento: '',
        regimen_tributario: null,
        responsable_iva: false,
        observaciones: ''
      });
    }
    setErrors({});
    setBusquedaMunicipio('');
  }, [cliente, modoEdicion, visible]);

  // Auto-convertir tipo_documento a tipo_documento_dian
  useEffect(() => {
    if (formData.tipo_documento) {
      const codigoDian = legacyToDianCode(formData.tipo_documento);
      if (codigoDian && codigoDian !== formData.tipo_documento_dian) {
        setFormData(prev => ({
          ...prev,
          tipo_documento_dian: codigoDian
        }));
      }
    }
  }, [formData.tipo_documento, legacyToDianCode]);

  // Auto-calcular dígito de verificación para NIT
  useEffect(() => {
    if (formData.tipo_documento === 'NIT' && formData.numero_documento) {
      const nit = formData.numero_documento.replace(/\D/g, '');
      if (nit.length > 0) {
        const digito = calcularDigitoNIT(nit);
        if (digito !== formData.digito_verificacion) {
          setFormData(prev => ({
            ...prev,
            digito_verificacion: digito
          }));
        }
      }
    } else if (formData.tipo_documento !== 'NIT' && formData.digito_verificacion) {
      // Limpiar dígito si no es NIT
      setFormData(prev => ({
        ...prev,
        digito_verificacion: ''
      }));
    }
  }, [formData.tipo_documento, formData.numero_documento]);

  // Función para calcular dígito de verificación NIT según algoritmo DIAN
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

  // Filtrar municipios según búsqueda
  const municipiosFiltrados = municipios.filter((mun) => {
    if (!busquedaMunicipio) return false;

    const searchLower = busquedaMunicipio.toLowerCase();

    return (
      mun.nombre.toLowerCase().includes(searchLower) ||
      mun.departamento.toLowerCase().includes(searchLower) ||
      mun.codigo.includes(searchLower)
    );
  }).slice(0, 50); // Limitar a 50 resultados

  // Encontrar municipio seleccionado actualmente
  const municipioSeleccionado = municipios.find(
    m => m.codigo === formData.codigo_municipio
  );

  // Handler de selección de municipio
  const handleSeleccionarMunicipio = (municipio) => {
    setFormData({
      ...formData,
      codigo_municipio: municipio.codigo
    });
    setMostrarMunicipios(false);
    setBusquedaMunicipio('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Limpiar error del campo al modificarlo
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    // Validar nombre
    if (!formData.nombre || !formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    // Validar apellido (excepto para NIT)
    if (formData.tipo_documento !== 'NIT' && (!formData.apellido || !formData.apellido.trim())) {
      newErrors.apellido = 'El apellido es obligatorio';
    }

    // Validar número de documento
    if (!formData.numero_documento || !formData.numero_documento.trim()) {
      newErrors.numero_documento = 'El número de documento es obligatorio';
    }

    // Validar email (si se proporciona)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'El formato del email es inválido';
      }
    }

    // Validar teléfono (si se proporciona)
    if (formData.telefono && formData.telefono.trim()) {
      const telefonoLimpio = formData.telefono.replace(/[\s()-]/g, '');
      if (telefonoLimpio.length < 7 || telefonoLimpio.length > 10) {
        newErrors.telefono = 'El teléfono debe tener entre 7 y 10 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ============ VALIDACIÓN CRÍTICA: Asegurar tipo_documento_dian ============
    if (!formData.tipo_documento_dian) {
      setErrors(prev => ({
        ...prev,
        tipo_documento: 'Debe seleccionar un tipo de documento válido'
      }));
      return;
    }

    // ============ VALIDACIÓN OBLIGATORIA: Código Municipio DANE ============
    if (!formData.codigo_municipio) {
      setErrors(prev => ({
        ...prev,
        codigo_municipio: 'El municipio DANE es obligatorio'
      }));
      return;
    }

    if (!validate()) {
      return;
    }

    const input = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido ? formData.apellido.trim() : null,
      tipo_documento: formData.tipo_documento,
      tipo_documento_dian: formData.tipo_documento_dian,
      numero_documento: formData.numero_documento.trim(),
      digito_verificacion: formData.digito_verificacion || null,
      email: formData.email ? formData.email.trim() : null,
      telefono: formData.telefono ? formData.telefono.trim() : null,
      direccion: formData.direccion ? formData.direccion.trim() : null,
      codigo_municipio: formData.codigo_municipio || null,
      pais: formData.pais || 'Colombia',
      fecha_nacimiento: formData.fecha_nacimiento || null,
      regimen_tributario: formData.regimen_tributario || null,
      responsable_iva: formData.responsable_iva,
      observaciones: formData.observaciones ? formData.observaciones.trim() : null
    };

    try {
      if (modoEdicion && cliente) {
        await actualizarCliente({
          variables: {
            id: parseInt(cliente.id),
            input
          }
        });
      } else {
        await crearCliente({
          variables: { input }
        });
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
  };

  if (!visible) return null;

  return (
    <div className="Modal">
      <div className="Modal__content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="Modal__header">
          <div className="Modal__header-title">
            <User size={24} />
            <h2>{modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          </div>
          <button className="Modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="Modal__form" onSubmit={handleSubmit}>
          {/* Sección: Datos de Identificación */}
          <div className="Modal__section">
            <div className="Modal__section-header">
              <FileText size={18} />
              <h3>Datos de Identificación</h3>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group">
                <label htmlFor="tipo_documento">
                  Tipo de Documento <span className="required">*</span>
                </label>
                <select
                  id="tipo_documento"
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
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

              <div className="Modal__form-group">
                <label htmlFor="numero_documento">
                  Número de Documento <span className="required">*</span>
                  {modoEdicion && <span className="help-text" style={{marginLeft: '0.5rem'}}>(No editable)</span>}
                </label>
                <input
                  type="text"
                  id="numero_documento"
                  name="numero_documento"
                  value={formData.numero_documento}
                  onChange={handleChange}
                  className={errors.numero_documento ? 'error' : (modoEdicion ? 'input-disabled' : '')}
                  required
                  disabled={modoEdicion}
                  title={modoEdicion ? "El número de documento no puede modificarse una vez creado el cliente" : ""}
                />
                {errors.numero_documento && (
                  <span className="error-message">{errors.numero_documento}</span>
                )}
              </div>
            </div>

            {/* Campos DIAN (informativos y condicionales) */}
            {formData.tipo_documento_dian && (
              <div className="Modal__form-row">
                <div className="Modal__form-group">
                  <label htmlFor="tipo_documento_dian">
                    Código DIAN (Auto-calculado)
                  </label>
                  <input
                    type="text"
                    id="tipo_documento_dian"
                    value={`${formData.tipo_documento_dian} - ${getTipoDocumentoDianInfo(formData.tipo_documento_dian)?.nombre || ''}`}
                    disabled
                    className="input-disabled"
                    title="Código numérico DIAN (auto-calculado)"
                  />
                  <small className="help-text">
                    {getTipoDocumentoDianInfo(formData.tipo_documento_dian)?.descripcion}
                  </small>
                </div>

                {formData.tipo_documento === 'NIT' && (
                  <div className="Modal__form-group">
                    <label htmlFor="digito_verificacion">
                      Dígito de Verificación
                    </label>
                    <input
                      type="text"
                      id="digito_verificacion"
                      name="digito_verificacion"
                      value={formData.digito_verificacion}
                      readOnly
                      className="input-small input-disabled"
                      title="Calculado automáticamente según algoritmo DIAN"
                    />
                    <small className="help-text">Calculado automáticamente</small>
                  </div>
                )}
              </div>
            )}

            {/* Campos adicionales para NIT (empresas) */}
            {formData.tipo_documento === 'NIT' && (
              <div className="Modal__form-row">
                <div className="Modal__form-group">
                  <label htmlFor="regimen_tributario">Régimen Tributario</label>
                  <select
                    id="regimen_tributario"
                    name="regimen_tributario"
                    value={formData.regimen_tributario || ''}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Común">Régimen Común</option>
                    <option value="Simplificado">Régimen Simplificado</option>
                    <option value="Grande Contribuyente">Grande Contribuyente</option>
                  </select>
                </div>

                <div className="Modal__form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="responsable_iva"
                      checked={formData.responsable_iva}
                      onChange={(e) => setFormData({ ...formData, responsable_iva: e.target.checked })}
                    />
                    <span>Responsable de IVA</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Sección: Datos Personales */}
          <div className="Modal__section">
            <div className="Modal__section-header">
              <User size={18} />
              <h3>Datos Personales</h3>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group">
                <label htmlFor="nombre">
                  {formData.tipo_documento === 'NIT' ? 'Razón Social' : 'Nombres'}{' '}
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={errors.nombre ? 'error' : ''}
                  required
                />
                {errors.nombre && (
                  <span className="error-message">{errors.nombre}</span>
                )}
              </div>

              <div className="Modal__form-group">
                <label htmlFor="apellido">
                  Apellidos {formData.tipo_documento !== 'NIT' && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className={errors.apellido ? 'error' : ''}
                  required={formData.tipo_documento !== 'NIT'}
                  disabled={formData.tipo_documento === 'NIT'}
                />
                {errors.apellido && (
                  <span className="error-message">{errors.apellido}</span>
                )}
              </div>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group">
                <label htmlFor="fecha_nacimiento">Fecha de Nacimiento</label>
                <input
                  type="date"
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Sección: Datos de Contacto */}
          <div className="Modal__section">
            <div className="Modal__section-header">
              <Mail size={18} />
              <h3>Datos de Contacto</h3>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group">
                <label htmlFor="email">
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="ejemplo@correo.com"
                />
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>

              <div className="Modal__form-group">
                <label htmlFor="telefono">
                  <Phone size={16} />
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className={errors.telefono ? 'error' : ''}
                  placeholder="3001234567"
                />
                {errors.telefono && (
                  <span className="error-message">{errors.telefono}</span>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Ubicación */}
          <div className="Modal__section">
            <div className="Modal__section-header">
              <MapPin size={18} />
              <h3>Ubicación</h3>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group Modal__form-group--full">
                <label htmlFor="direccion">Dirección</label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Calle 123 # 45-67"
                />
              </div>
            </div>

            <div className="Modal__form-row">
              <div className="Modal__form-group">
                <label htmlFor="pais">País</label>
                <input
                  type="text"
                  id="pais"
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Selector de Municipio DANE */}
            <div className="Modal__form-row">
              <div className="Modal__form-group municipio-selector">
                <label htmlFor="municipio">
                  Municipio (Código DANE) <span style={{color: 'red'}}>*</span>
                </label>

                <div className="municipio-input-wrapper">
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
                  />

                  {/* Botón para limpiar selección */}
                  {municipioSeleccionado && !busquedaMunicipio && (
                    <button
                      type="button"
                      className="btn-clear-municipio"
                      onClick={() => {
                        setFormData({ ...formData, codigo_municipio: null });
                        setBusquedaMunicipio('');
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown con resultados */}
                {mostrarMunicipios && busquedaMunicipio && (
                  <div className="municipios-dropdown">
                    {loadingMunicipios ? (
                      <div className="loading-small">Cargando municipios...</div>
                    ) : municipiosFiltrados.length === 0 ? (
                      <div className="no-results-small">No se encontraron municipios</div>
                    ) : (
                      municipiosFiltrados.map((mun) => (
                        <button
                          key={mun.codigo}
                          type="button"
                          className="municipio-item"
                          onClick={() => handleSeleccionarMunicipio(mun)}
                        >
                          <div className="municipio-nombre">
                            {mun.nombre} - {mun.departamento}
                          </div>
                          <div className="municipio-codigo">
                            Código: {mun.codigo}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {formData.codigo_municipio && (
                  <small className="help-text">
                    Código DANE: {formData.codigo_municipio}
                  </small>
                )}

                {errors.codigo_municipio && (
                  <small className="error-text" style={{color: 'red', display: 'block', marginTop: '4px'}}>
                    {errors.codigo_municipio}
                  </small>
                )}
              </div>

              {formData.tipo_documento !== 'NIT' && (
                <div className="Modal__form-group">
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Notas adicionales..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer con botones */}
          <div className="Modal__footer">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={18} />}
              disabled={loading}
            >
              {loading ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClienteFormModal;
