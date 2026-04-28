import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const ITEM_INVENTARIO_FRAGMENT = gql`
  fragment ItemInventarioFields on ItemInventario {
    id
    codigo
    nombre
    descripcion
    tipo
    categoria_id
    categoria {
      id
      nombre
      descripcion
      tipo
      color
      icono
      orden
      activa
    }
    precio_base
    iva_porcentaje
    precio_con_iva
    stock_actual
    stock_minimo
    unidad_medida
    ubicacion_almacen
    duracion_minutos
    precio_compra
    margen_utilidad
    activo
    imagen_url
    notas
    created_at
    updated_at
  }
`;

export const MOVIMIENTO_INVENTARIO_FRAGMENT = gql`
  fragment MovimientoInventarioFields on MovimientoInventario {
    id
    item_inventario_id
    item {
      id
      codigo
      nombre
      tipo
      categoria {
        id
        nombre
      }
    }
    tipo_movimiento
    cantidad
    stock_anterior
    stock_nuevo
    consumo_id
    motivo
    usuario_id
    usuario {
      id
      nombre
      apellido
      usuario
      rol
    }
    fecha_movimiento
  }
`;

// ============================================================================
// QUERIES - ITEMS INVENTARIO
// ============================================================================

export const GET_ITEMS_INVENTARIO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  query GetItemsInventario(
    $tipo: TipoItem
    $categoria_id: Int
    $activo: Boolean
    $busqueda: String
  ) {
    itemsInventario(
      tipo: $tipo
      categoria_id: $categoria_id
      activo: $activo
      busqueda: $busqueda
    ) {
      ...ItemInventarioFields
    }
  }
`;

export const GET_ITEM_INVENTARIO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  query GetItemInventario($id: Int!) {
    itemInventario(id: $id) {
      ...ItemInventarioFields
    }
  }
`;

export const GET_ITEM_POR_CODIGO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  query GetItemInventarioPorCodigo($codigo: String!) {
    itemInventarioPorCodigo(codigo: $codigo) {
      ...ItemInventarioFields
    }
  }
`;

export const GET_ITEMS_BAJO_STOCK = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  query GetItemsBajoStock {
    itemsBajoStock {
      ...ItemInventarioFields
    }
  }
`;

// ============================================================================
// QUERIES - MOVIMIENTOS INVENTARIO
// ============================================================================

export const GET_MOVIMIENTOS_INVENTARIO = gql`
  ${MOVIMIENTO_INVENTARIO_FRAGMENT}
  query GetMovimientosInventario(
    $itemInventarioId: Int
    $tipoMovimiento: TipoMovimiento
    $fechaDesde: Date
    $fechaHasta: Date
  ) {
    movimientosInventario(
      item_inventario_id: $itemInventarioId
      tipo_movimiento: $tipoMovimiento
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
    ) {
      ...MovimientoInventarioFields
    }
  }
`;

export const GET_ESTADISTICAS_INVENTARIO = gql`
  query GetEstadisticasInventario {
    estadisticasInventario {
      total_items
      total_productos
      total_servicios
      items_bajo_stock
      valor_total_inventario
      items_por_categoria {
        categoria_id
        categoria_nombre
        cantidad
        valor_total
      }
      productos_mas_consumidos {
        item_id
        codigo
        nombre
        tipo
        cantidad_consumida
        veces_consumido
        categoria_nombre
      }
    }
  }
`;

// ============================================================================
// MUTATIONS - ITEMS INVENTARIO
// ============================================================================

export const CREAR_ITEM_INVENTARIO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  mutation CrearItemInventario($input: CrearItemInventarioInput!) {
    crearItemInventario(input: $input) {
      ...ItemInventarioFields
    }
  }
`;

export const CREAR_ITEMS_MASIVO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  mutation CrearItemsMasivo($items: [CrearItemInventarioInput!]!) {
    crearItemsMasivo(items: $items) {
      ...ItemInventarioFields
    }
  }
`;

export const ACTUALIZAR_ITEM_INVENTARIO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  mutation ActualizarItemInventario($id: Int!, $input: ActualizarItemInventarioInput!) {
    actualizarItemInventario(id: $id, input: $input) {
      ...ItemInventarioFields
    }
  }
`;

export const ELIMINAR_ITEM_INVENTARIO = gql`
  ${ITEM_INVENTARIO_FRAGMENT}
  mutation EliminarItemInventario($id: Int!) {
    eliminarItemInventario(id: $id) {
      ...ItemInventarioFields
    }
  }
`;

export const AJUSTAR_STOCK = gql`
  ${MOVIMIENTO_INVENTARIO_FRAGMENT}
  mutation AjustarStock($input: AjustarStockInput!) {
    ajustarStock(input: $input) {
      ...MovimientoInventarioFields
    }
  }
`;
