import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { X, Building, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { GET_DATOS_HOTEL, UPDATE_DATOS_HOTEL } from '../../graphql/configuracion';
import './ModalConfig.css';

function ModalDatosHotel({ onClose }) {
  const [formData, setFormData] = useState({});
  const [mensaje, setMensaje] = useState(null);

  // Query para obtener datos actuales
  const { data, loading, error } = useQuery(GET_DATOS_HOTEL);

  // Mutation para actualizar
  const [actualizarDatos, { loading: saving }] = useMutation(UPDATE_DATOS_HOTEL, {
    onCompleted: () => {
      setMensaje({ tipo: 'success', texto: 'Datos actualizados exitosamente' });
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (error) => {
      setMensaje({ tipo: 'error', texto: error.message });
    },
  });

  // Cargar datos cuando estén disponibles
  useEffect(() => {
    if (data?.datosHotel) {
      setFormData(data.datosHotel);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Preparar input (excluir campos que no se deben actualizar)
    const { id, created_at, updated_at, __typename, ...input } = formData;

    await actualizarDatos({
      variables: { input }
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-config" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Loader size={40} className="spinner" />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Cargando datos...</p>
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
            <p style={{ marginTop: '1rem', color: '#ef4444' }}>Error al cargar datos: {error.message}</p>
            <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-config modal-config--large">
        {/* Header */}
        <div className="modal-config__header">
          <div className="modal-config__header-icon">
            <Building size={24} />
          </div>
          <div>
            <h2 className="modal-config__title">Datos del Hotel</h2>
            <p className="modal-config__subtitle">Información legal, NIT, DIAN y facturación electrónica</p>
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="modal-config__form">
          <div className="form-grid">
            {/* Sección 1: Información Legal */}
            <div className="form-section">
              <h3 className="form-section__title">Información Legal</h3>

              <div className="form-field">
                <label htmlFor="nombre_comercial">Nombre Comercial *</label>
                <input
                  type="text"
                  id="nombre_comercial"
                  name="nombre_comercial"
                  value={formData.nombre_comercial || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="razon_social">Razón Social *</label>
                <input
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="nit">NIT *</label>
                  <input
                    type="text"
                    id="nit"
                    name="nit"
                    value={formData.nit || ''}
                    onChange={handleChange}
                    required
                    placeholder="900123456"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="digito_verificacion">DV</label>
                  <input
                    type="text"
                    id="digito_verificacion"
                    name="digito_verificacion"
                    value={formData.digito_verificacion || ''}
                    onChange={handleChange}
                    maxLength="1"
                    placeholder="7"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tipo_persona">Tipo de Persona *</label>
                <select
                  id="tipo_persona"
                  name="tipo_persona"
                  value={formData.tipo_persona || 'juridica'}
                  onChange={handleChange}
                  required
                >
                  <option value="juridica">Persona Jurídica</option>
                  <option value="natural">Persona Natural</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="regimen_tributario">Régimen Tributario *</label>
                <select
                  id="regimen_tributario"
                  name="regimen_tributario"
                  value={formData.regimen_tributario || 'simplificado'}
                  onChange={handleChange}
                  required
                >
                  <option value="simplificado">Simplificado</option>
                  <option value="comun">Común</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
            </div>

            {/* Sección 2: Ubicación y Contacto */}
            <div className="form-section">
              <h3 className="form-section__title">Ubicación y Contacto</h3>

              <div className="form-field">
                <label htmlFor="direccion">Dirección *</label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={formData.direccion || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="ciudad">Ciudad *</label>
                  <input
                    type="text"
                    id="ciudad"
                    name="ciudad"
                    value={formData.ciudad || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="departamento">Departamento *</label>
                  <input
                    type="text"
                    id="departamento"
                    name="departamento"
                    value={formData.departamento || ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="codigo_postal">Código Postal</label>
                  <input
                    type="text"
                    id="codigo_postal"
                    name="codigo_postal"
                    value={formData.codigo_postal || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="pais">País *</label>
                  <input
                    type="text"
                    id="pais"
                    name="pais"
                    value={formData.pais || 'Colombia'}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono || ''}
                    onChange={handleChange}
                    placeholder="(+57) 601 234 5678"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="celular">Celular</label>
                  <input
                    type="tel"
                    id="celular"
                    name="celular"
                    value={formData.celular || ''}
                    onChange={handleChange}
                    placeholder="(+57) 300 123 4567"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  required
                  placeholder="info@hotel.com"
                />
              </div>

              <div className="form-field">
                <label htmlFor="sitio_web">Sitio Web</label>
                <input
                  type="url"
                  id="sitio_web"
                  name="sitio_web"
                  value={formData.sitio_web || ''}
                  onChange={handleChange}
                  placeholder="https://www.hotel.com"
                />
              </div>
            </div>

            {/* Sección 3: Facturación DIAN */}
            <div className="form-section">
              <h3 className="form-section__title">Facturación Electrónica DIAN</h3>

              <div className="form-field">
                <label htmlFor="resolucion_dian">Resolución DIAN</label>
                <input
                  type="text"
                  id="resolucion_dian"
                  name="resolucion_dian"
                  value={formData.resolucion_dian || ''}
                  onChange={handleChange}
                  placeholder="18760000001234"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="fecha_inicio_resolucion">Fecha Inicio</label>
                  <input
                    type="date"
                    id="fecha_inicio_resolucion"
                    name="fecha_inicio_resolucion"
                    value={formData.fecha_inicio_resolucion?.split('T')[0] || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="fecha_fin_resolucion">Fecha Fin</label>
                  <input
                    type="date"
                    id="fecha_fin_resolucion"
                    name="fecha_fin_resolucion"
                    value={formData.fecha_fin_resolucion?.split('T')[0] || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="prefijo_factura">Prefijo *</label>
                  <input
                    type="text"
                    id="prefijo_factura"
                    name="prefijo_factura"
                    value={formData.prefijo_factura || ''}
                    onChange={handleChange}
                    required
                    placeholder="FH"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="numero_actual_factura">Número Actual *</label>
                  <input
                    type="number"
                    id="numero_actual_factura"
                    name="numero_actual_factura"
                    value={formData.numero_actual_factura || ''}
                    onChange={handleChange}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="rango_inicial_factura">Rango Inicial</label>
                  <input
                    type="number"
                    id="rango_inicial_factura"
                    name="rango_inicial_factura"
                    value={formData.rango_inicial_factura || ''}
                    onChange={handleChange}
                    min="1"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="rango_final_factura">Rango Final</label>
                  <input
                    type="number"
                    id="rango_final_factura"
                    name="rango_final_factura"
                    value={formData.rango_final_factura || ''}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="ambiente_dian">Ambiente DIAN *</label>
                <select
                  id="ambiente_dian"
                  name="ambiente_dian"
                  value={formData.ambiente_dian || 'pruebas'}
                  onChange={handleChange}
                  required
                >
                  <option value="pruebas">Pruebas</option>
                  <option value="produccion">Producción</option>
                </select>
              </div>
            </div>

            {/* Sección 4: Branding */}
            <div className="form-section">
              <h3 className="form-section__title">Branding</h3>

              <div className="form-field">
                <label htmlFor="logo_url">URL del Logo</label>
                <input
                  type="url"
                  id="logo_url"
                  name="logo_url"
                  value={formData.logo_url || ''}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="color_primario">Color Primario</label>
                  <input
                    type="color"
                    id="color_primario"
                    name="color_primario"
                    value={formData.color_primario || '#1e40af'}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="color_secundario">Color Secundario</label>
                  <input
                    type="color"
                    id="color_secundario"
                    name="color_secundario"
                    value={formData.color_secundario || '#06b6d4'}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="eslogan">Eslogan</label>
                <input
                  type="text"
                  id="eslogan"
                  name="eslogan"
                  value={formData.eslogan || ''}
                  onChange={handleChange}
                  placeholder="Tu mejor experiencia de hospedaje"
                />
              </div>

              <div className="form-field">
                <label htmlFor="descripcion_empresa">Descripción</label>
                <textarea
                  id="descripcion_empresa"
                  name="descripcion_empresa"
                  value={formData.descripcion_empresa || ''}
                  onChange={handleChange}
                  placeholder="Descripción de la empresa"
                />
              </div>
            </div>

            {/* Sección 5: Configuración Regional */}
            <div className="form-section form-section--full">
              <h3 className="form-section__title">Configuración Regional</h3>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="moneda">Moneda *</label>
                  <select
                    id="moneda"
                    name="moneda"
                    value={formData.moneda || 'COP'}
                    onChange={handleChange}
                    required
                  >
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="USD">USD - Dólar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="timezone">Zona Horaria *</label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone || 'America/Bogota'}
                    onChange={handleChange}
                    required
                  >
                    <option value="America/Bogota">America/Bogota</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="idioma">Idioma *</label>
                  <select
                    id="idioma"
                    name="idioma"
                    value={formData.idioma || 'es'}
                    onChange={handleChange}
                    required
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con botones */}
          <div className="modal-config__footer">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader size={16} className="spinner" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalDatosHotel;
