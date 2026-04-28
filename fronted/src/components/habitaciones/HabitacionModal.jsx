import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { CREAR_HABITACION, ACTUALIZAR_HABITACION } from '../../graphql/habitaciones';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Button from '../shared/Button';
import './HabitacionModal.css';

const COMODIDADES_OPTIONS = [
  'Aire acondicionado',
  'Wi-Fi',
  'TV por cable',
  'Minibar',
  'Caja fuerte',
  'Baño privado',
  'Agua caliente',
  'Escritorio',
  'Balcón',
  'Vista al mar',
  'Vista a la ciudad',
  'Jacuzzi',
  'Cocina',
  'Nevera'
];

const TIPOS_HABITACION = [
  { value: 'simple', label: 'Simple' },
  { value: 'doble', label: 'Doble' },
  { value: 'suite', label: 'Suite' },
  { value: 'familiar', label: 'Familiar' },
  { value: 'presidencial', label: 'Presidencial' }
];

function HabitacionModal({ isOpen, onClose, habitacion, onSuccess }) {
  const isEditMode = !!habitacion;

  const [formData, setFormData] = useState({
    numero: '',
    piso: '',
    tipo: 'simple',
    capacidad: 1,
    precio_noche: '',
    descripcion: '',
    comodidades: [],
    imagen_url: ''
  });

  const [errors, setErrors] = useState({});

  // Cargar datos si es modo edición
  useEffect(() => {
    if (habitacion) {
      // Normalizar comodidades - puede venir como array o string JSON
      let comodidades = [];
      if (habitacion.comodidades) {
        if (Array.isArray(habitacion.comodidades)) {
          comodidades = habitacion.comodidades;
        } else if (typeof habitacion.comodidades === 'string') {
          try {
            comodidades = JSON.parse(habitacion.comodidades);
          } catch (e) {
            console.warn('Error al parsear comodidades:', e);
            comodidades = [];
          }
        }
      }

      setFormData({
        numero: habitacion.numero || '',
        piso: habitacion.piso || '',
        tipo: habitacion.tipo || 'simple',
        capacidad: habitacion.capacidad || 1,
        precio_noche: habitacion.precio_noche || '',
        descripcion: habitacion.descripcion || '',
        comodidades: comodidades,
        imagen_url: habitacion.imagen_url || ''
      });
    } else {
      // Resetear formulario en modo crear
      setFormData({
        numero: '',
        piso: '',
        tipo: 'simple',
        capacidad: 1,
        precio_noche: '',
        descripcion: '',
        comodidades: [],
        imagen_url: ''
      });
    }
    setErrors({});
  }, [habitacion, isOpen]);

  const [crearHabitacion, { loading: creando }] = useMutation(CREAR_HABITACION, {
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error('Error al crear habitación:', error);
      if (error.message.includes('unique')) {
        setErrors({ numero: 'Ya existe una habitación con este número' });
      } else {
        setErrors({ general: error.message });
      }
    }
  });

  const [actualizarHabitacion, { loading: actualizando }] = useMutation(ACTUALIZAR_HABITACION, {
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error('Error al actualizar habitación:', error);
      if (error.message.includes('unique')) {
        setErrors({ numero: 'Ya existe una habitación con este número' });
      } else {
        setErrors({ general: error.message });
      }
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleComodidadToggle = (comodidad) => {
    setFormData(prev => ({
      ...prev,
      comodidades: prev.comodidades.includes(comodidad)
        ? prev.comodidades.filter(c => c !== comodidad)
        : [...prev.comodidades, comodidad]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.numero.trim()) {
      newErrors.numero = 'El número de habitación es requerido';
    }

    if (!formData.piso || formData.piso < 1) {
      newErrors.piso = 'El piso debe ser mayor a 0';
    }

    if (!formData.capacidad || formData.capacidad < 1) {
      newErrors.capacidad = 'La capacidad debe ser mayor a 0';
    }

    if (!formData.precio_noche || formData.precio_noche <= 0) {
      newErrors.precio_noche = 'El precio por noche debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const input = {
      numero: formData.numero.trim(),
      piso: parseInt(formData.piso),
      tipo: formData.tipo,
      capacidad: parseInt(formData.capacidad),
      precio_noche: parseFloat(formData.precio_noche),
      descripcion: formData.descripcion.trim() || null,
      comodidades: formData.comodidades,
      imagen_url: formData.imagen_url.trim() || null
    };

    try {
      if (isEditMode) {
        await actualizarHabitacion({
          variables: {
            id: parseInt(habitacion.id),
            input
          }
        });
      } else {
        await crearHabitacion({
          variables: { input }
        });
      }
    } catch (error) {
      // El error ya se maneja en onError
      console.error('Error en submit:', error);
    }
  };

  const loading = creando || actualizando;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Habitación' : 'Nueva Habitación'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="habitacion-form">
        {errors.general && (
          <div className="error-message error-message--general">
            {errors.general}
          </div>
        )}

        {/* Información Básica */}
        <div className="form-section">
          <h3 className="form-section__title">Información Básica</h3>

          <div className="form-row">
            <div className="form-col">
              <Input
                label="Número de Habitación"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                error={errors.numero}
                placeholder="Ej: 101, A-202"
                required
                disabled={loading}
              />
            </div>

            <div className="form-col">
              <Input
                label="Piso"
                name="piso"
                type="number"
                value={formData.piso}
                onChange={handleChange}
                error={errors.piso}
                min="1"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <Select
                label="Tipo de Habitación"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                options={TIPOS_HABITACION}
                required
                disabled={loading}
              />
            </div>

            <div className="form-col">
              <Input
                label="Capacidad (personas)"
                name="capacidad"
                type="number"
                value={formData.capacidad}
                onChange={handleChange}
                error={errors.capacidad}
                min="1"
                max="10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <Input
                label="Precio por Noche"
                name="precio_noche"
                type="number"
                value={formData.precio_noche}
                onChange={handleChange}
                error={errors.precio_noche}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>

            <div className="form-col">
              <Input
                label="URL de Imagen (opcional)"
                name="imagen_url"
                type="url"
                value={formData.imagen_url}
                onChange={handleChange}
                placeholder="https://ejemplo.com/imagen.jpg"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="form-section">
          <h3 className="form-section__title">Descripción</h3>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            className="form-textarea"
            placeholder="Descripción detallada de la habitación..."
            rows="3"
            disabled={loading}
          />
        </div>

        {/* Comodidades */}
        <div className="form-section">
          <h3 className="form-section__title">Comodidades</h3>
          <div className="comodidades-grid">
            {COMODIDADES_OPTIONS.map(comodidad => (
              <label key={comodidad} className="comodidad-checkbox">
                <input
                  type="checkbox"
                  checked={formData.comodidades.includes(comodidad)}
                  onChange={() => handleComodidadToggle(comodidad)}
                  disabled={loading}
                />
                <span className="comodidad-label">{comodidad}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="modal-footer">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear Habitación')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default HabitacionModal;
