import { gql } from '@apollo/client';

// =====================================================
// QUERIES - VENTAS POS
// =====================================================

export const GET_VENTAS_POS = gql`
  query GetVentasPOS(
    $fechaDesde: Date
    $fechaHasta: Date
    $turnoCajaId: Int
    $tipoCliente: TipoCliente
    $estadoPago: EstadoPagoVenta
  ) {
    ventasPOS(
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
      turno_caja_id: $turnoCajaId
      tipo_cliente: $tipoCliente
      estado_pago: $estadoPago
    ) {
      id
      codigo
      tipo_cliente
      subtotal
      descuento_monto
      iva
      propina
      total
      estado_pago
      created_at
      cliente {
        id
        nombre
        apellido
      }
      huesped {
        id
        nombre_completo
      }
      turno_caja {
        id
        codigo
      }
    }
  }
`;

export const GET_VENTA_POS = gql`
  query GetVentaPOS($id: Int!) {
    ventaPOS(id: $id) {
      id
      codigo
      tipo_cliente
      subtotal
      descuento_porcentaje
      descuento_monto
      iva
      propina
      total
      estado_pago
      notas
      created_at
      turno_caja {
        id
        codigo
      }
      cliente {
        id
        nombre
        apellido
      }
      huesped {
        id
        nombre_completo
      }
      hospedaje {
        id
        codigo
        habitacion {
          numero
        }
      }
      descuento {
        id
        codigo
        nombre
        tipo
        valor
      }
      created_by {
        id
        usuario
        nombre_completo
      }
      detalles {
        id
        cantidad
        precio_unitario
        precio_total
        notas
        item_inventario {
          id
          codigo
          nombre
        }
        servicio_hotel {
          id
          nombre
          codigo
        }
      }
      pagos {
        id
        monto
        referencia
        metodo_pago {
          id
          nombre
          tipo
        }
      }
    }
  }
`;

export const GET_ESTADISTICAS_VENTAS_POS = gql`
  query GetEstadisticasVentasPOS($fechaDesde: Date, $fechaHasta: Date, $turnoCajaId: Int) {
    estadisticasVentasPOS(
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
      turno_caja_id: $turnoCajaId
    ) {
      num_ventas
      total_subtotal
      total_descuentos
      total_iva
      total_propinas
      total_ventas
      ticket_promedio
    }
  }
`;

export const GET_TOP_PRODUCTOS_VENDIDOS = gql`
  query GetTopProductosVendidos(
    $fechaDesde: Date!
    $fechaHasta: Date!
    $limite: Int
    $ordenarPor: String
  ) {
    topProductosVendidos(
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
      limite: $limite
      ordenar_por: $ordenarPor
    ) {
      item_id
      item_nombre
      categoria_nombre
      cantidad_vendida
      num_ventas
      ingresos_totales
      precio_promedio
      precio_compra
      costo_total
      utilidad_total
      margen_utilidad_porcentaje
    }
  }
`;

export const GET_VENTAS_POR_HORA = gql`
  query GetVentasPorHora($fecha: Date!) {
    ventasPorHora(fecha: $fecha) {
      hora
      num_ventas
      total_ventas
    }
  }
`;

// =====================================================
// QUERIES - DESCUENTOS
// =====================================================

export const GET_DESCUENTOS = gql`
  query GetDescuentos($activo: Boolean, $tipo: TipoDescuento) {
    descuentos(activo: $activo, tipo: $tipo) {
      id
      codigo
      nombre
      descripcion
      tipo
      valor
      monto_minimo
      categoria_aplicable {
        id
        nombre
      }
      tipo_item_aplicable
      fecha_inicio
      fecha_fin
      dias_semana
      hora_inicio
      hora_fin
      requiere_autorizacion
      rol_autorizador
      activo
    }
  }
`;

export const GET_DESCUENTOS_APLICABLES = gql`
  query GetDescuentosAplicables($monto: Float!, $categoriaId: Int, $tipoItem: String) {
    descuentosAplicables(monto: $monto, categoria_id: $categoriaId, tipo_item: $tipoItem) {
      id
      codigo
      nombre
      descripcion
      tipo
      valor
      monto_minimo
    }
  }
`;

// =====================================================
// MUTATIONS - VENTAS POS
// =====================================================

export const CREAR_VENTA_POS = gql`
  mutation CrearVentaPOS($input: CrearVentaPOSInput!) {
    crearVentaPOS(input: $input) {
      id
      codigo
      tipo_cliente
      subtotal
      descuento_monto
      iva
      propina
      total
      estado_pago
      created_at
      turno_caja {
        id
        codigo
      }
      cliente {
        id
        nombre
        apellido
      }
      huesped {
        id
        nombre_completo
      }
      detalles {
        id
        cantidad
        precio_unitario
        precio_total
        item_inventario {
          id
          nombre
        }
        servicio_hotel {
          id
          nombre
        }
      }
      pagos {
        id
        monto
        metodo_pago {
          id
          nombre
        }
      }
    }
  }
`;

export const ANULAR_VENTA_POS = gql`
  mutation AnularVentaPOS($ventaPosId: Int!, $motivo: String!) {
    anularVentaPOS(venta_pos_id: $ventaPosId, motivo: $motivo)
  }
`;

// =====================================================
// MUTATIONS - DESCUENTOS
// =====================================================

export const CREAR_DESCUENTO = gql`
  mutation CrearDescuento($input: CrearDescuentoInput!) {
    crearDescuento(input: $input) {
      id
      codigo
      nombre
      descripcion
      tipo
      valor
      activo
    }
  }
`;

export const ACTUALIZAR_DESCUENTO = gql`
  mutation ActualizarDescuento($id: Int!, $input: ActualizarDescuentoInput!) {
    actualizarDescuento(id: $id, input: $input) {
      id
      codigo
      nombre
      descripcion
      tipo
      valor
      activo
    }
  }
`;

export const ELIMINAR_DESCUENTO = gql`
  mutation EliminarDescuento($id: Int!) {
    eliminarDescuento(id: $id)
  }
`;
