// Configuración específica de la interfaz Hotel
const hotelConfig = {
  id: 'hotel',
  nombre: 'Hotel / Hospedaje',

  // Tema de colores
  theme: {
    primary: '#1e40af',
    primaryHover: '#1e3a8a',
    primaryLight: '#3b82f6',

    secondary: '#06b6d4',
    secondaryHover: '#0891b2',
    secondaryLight: '#67e8f9',

    accent: '#f59e0b',
    accentHover: '#d97706',
    accentLight: '#fbbf24',

    background: '#eff6ff',
    cardBackground: '#ffffff',
    surfaceLight: '#dbeafe',

    text: '#1f2937',
    textSecondary: '#6b7280',
    textLight: '#9ca3af',

    border: '#e5e7eb',
    borderDark: '#d1d5db',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Estados de habitación
  estadosHabitacion: {
    disponible: {
      label: 'Disponible',
      color: '#10b981',
      background: '#d1fae5',
      icon: '✓'
    },
    ocupada: {
      label: 'Ocupada',
      color: '#ef4444',
      background: '#fee2e2',
      icon: '🔴'
    },
    limpieza: {
      label: 'Limpieza',
      color: '#f59e0b',
      background: '#fef3c7',
      icon: '🧹'
    },
    mantenimiento: {
      label: 'Mantenimiento',
      color: '#6b7280',
      background: '#e5e7eb',
      icon: '🔧'
    },
    reservada: {
      label: 'Reservada',
      color: '#3b82f6',
      background: '#dbeafe',
      icon: '⏰'
    }
  },

  // Tipos de habitación
  tiposHabitacion: {
    simple: { label: 'Simple', icon: '🛏️' },
    doble: { label: 'Doble', icon: '🛏️🛏️' },
    suite: { label: 'Suite', icon: '👑' },
    familiar: { label: 'Familiar', icon: '👨‍👩‍👧‍👦' },
    presidencial: { label: 'Presidencial', icon: '⭐' }
  },

  // Canales de reserva
  canalesReserva: [
    { value: 'directo', label: 'Directo' },
    { value: 'booking', label: 'Booking.com' },
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'expedia', label: 'Expedia' },
    { value: 'telefono', label: 'Teléfono' },
    { value: 'web', label: 'Página Web' },
    { value: 'walk_in', label: 'Walk-in' },
  ],

  // Categorías de servicios
  categoriasServicios: [
    { value: 'lavanderia', label: 'Lavandería', icon: '🧺' },
    { value: 'transporte', label: 'Transporte', icon: '🚗' },
    { value: 'spa', label: 'Spa', icon: '💆' },
    { value: 'room_service', label: 'Room Service', icon: '🍽️' },
    { value: 'bar', label: 'Bar', icon: '🍹' },
    { value: 'restaurante', label: 'Restaurante', icon: '🍴' },
    { value: 'tours', label: 'Tours', icon: '🗺️' },
    { value: 'otro', label: 'Otro', icon: '📋' },
  ],

  // Configuración de paginación
  pagination: {
    itemsPerPage: 20,
    itemsPerPageOptions: [10, 20, 50, 100]
  },

  // Formatos
  formats: {
    date: 'DD/MM/YYYY',
    datetime: 'DD/MM/YYYY HH:mm',
    time: 'HH:mm',
    currency: 'COP',
  }
};

export default hotelConfig;
