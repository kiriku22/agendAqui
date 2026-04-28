import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const SERVICIO_HOTEL_FRAGMENT = gql`
  fragment ServicioHotelFields on ServicioHotel {
    id
    codigo
    nombre
    descripcion
    categoria
    precio
    iva
    precio_con_iva
    unidad
    duracion_minutos
    activo
    imagen_url
    created_at
  }
`;

export const PRODUCTO_FRAGMENT = gql`
  fragment ProductoFields on Producto {
    id
    codigo
    nombre
    descripcion
    categoria
    precio_venta
    precio_compra
    stock_actual
    stock_minimo
    unidad_medida
    activo
    imagen_url
    created_at
  }
`;

export const METODO_PAGO_FRAGMENT = gql`
  fragment MetodoPagoFields on MetodoPago {
    id
    nombre
    tipo
    activo
    requiere_referencia
    icono
    orden
  }
`;

// ============================================================================
// QUERIES - SERVICIOS HOTEL
// ============================================================================

export const GET_SERVICIOS_HOTEL = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  query GetServiciosHotel($activo: Boolean) {
    serviciosHotel(activo: $activo) {
      ...ServicioHotelFields
    }
  }
`;

export const GET_SERVICIO_HOTEL = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  query GetServicioHotel($id: Int!) {
    servicioHotel(id: $id) {
      ...ServicioHotelFields
    }
  }
`;

export const GET_SERVICIOS_POR_CATEGORIA = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  query GetServiciosPorCategoria($categoria: CategoriaServicio!) {
    serviciosPorCategoria(categoria: $categoria) {
      ...ServicioHotelFields
    }
  }
`;

// ============================================================================
// QUERIES - PRODUCTOS
// ============================================================================

export const GET_PRODUCTOS = gql`
  ${PRODUCTO_FRAGMENT}
  query GetProductos($categoria: String, $activo: Boolean) {
    productos(categoria: $categoria, activo: $activo) {
      ...ProductoFields
    }
  }
`;

export const BUSCAR_PRODUCTOS = gql`
  ${PRODUCTO_FRAGMENT}
  query BuscarProductos($termino: String!) {
    buscarProductos(termino: $termino) {
      ...ProductoFields
    }
  }
`;

// ============================================================================
// QUERIES - MÉTODOS DE PAGO
// ============================================================================

export const GET_METODOS_PAGO = gql`
  ${METODO_PAGO_FRAGMENT}
  query GetMetodosPago($activo: Boolean) {
    metodosPago(activo: $activo) {
      ...MetodoPagoFields
    }
  }
`;

// ============================================================================
// MUTATIONS - SERVICIOS HOTEL
// ============================================================================

export const CREAR_SERVICIO_HOTEL = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  mutation CrearServicioHotel($input: CrearServicioHotelInput!) {
    crearServicioHotel(input: $input) {
      ...ServicioHotelFields
    }
  }
`;

export const ACTUALIZAR_SERVICIO_HOTEL = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  mutation ActualizarServicioHotel($id: Int!, $input: ActualizarServicioHotelInput!) {
    actualizarServicioHotel(id: $id, input: $input) {
      ...ServicioHotelFields
    }
  }
`;

export const ELIMINAR_SERVICIO_HOTEL = gql`
  ${SERVICIO_HOTEL_FRAGMENT}
  mutation EliminarServicioHotel($id: Int!) {
    eliminarServicioHotel(id: $id) {
      ...ServicioHotelFields
    }
  }
`;
