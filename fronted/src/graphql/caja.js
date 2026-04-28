import { gql } from '@apollo/client';

// =====================================================
// QUERIES - SISTEMA DE CAJA
// =====================================================

export const GET_CAJAS = gql`
  query GetCajas($activa: Boolean) {
    cajas(activa: $activa) {
      id
      codigo
      nombre
      ubicacion
      activa
      created_at
    }
  }
`;

export const GET_TURNO_ACTUAL = gql`
  query GetTurnoActual($cajaId: Int!) {
    turnoActual(caja_id: $cajaId) {
      id
      codigo
      caja {
        id
        codigo
        nombre
      }
      usuario {
        id
        usuario
        nombre_completo
      }
      fecha_apertura
      monto_inicial
      notas_apertura
      estado
      created_at
    }
  }
`;

export const GET_TURNOS_ABIERTOS = gql`
  query GetTurnosAbiertos {
    turnosAbiertos {
      id
      codigo
      caja {
        id
        codigo
        nombre
      }
      usuario {
        id
        usuario
        nombre_completo
      }
      fecha_apertura
      monto_inicial
      estado
    }
  }
`;

export const GET_TURNOS_CAJA = gql`
  query GetTurnosCaja($fechaDesde: Date, $fechaHasta: Date, $usuarioId: Int) {
    turnosCaja(fecha_desde: $fechaDesde, fecha_hasta: $fechaHasta, usuario_id: $usuarioId) {
      id
      codigo
      caja {
        id
        codigo
        nombre
      }
      usuario {
        id
        usuario
        nombre_completo
      }
      fecha_apertura
      fecha_cierre
      monto_inicial
      monto_esperado
      monto_real
      diferencia
      estado
      notas_apertura
      notas_cierre
    }
  }
`;

export const GET_RESUMEN_TURNO = gql`
  query GetResumenTurno($turnoCajaId: Int!) {
    resumenTurnoCaja(turno_caja_id: $turnoCajaId) {
      turno {
        id
        codigo
        caja {
          id
          codigo
          nombre
        }
        usuario {
          id
          usuario
          nombre_completo
        }
        fecha_apertura
        monto_inicial
        notas_apertura
      }
      num_ventas
      total_ventas
      total_ingresos
      total_egresos
      efectivo_esperado
      ingresos_por_metodo {
        metodo_pago {
          id
          nombre
          tipo
        }
        cantidad
        total
      }
    }
  }
`;

// =====================================================
// MUTATIONS - SISTEMA DE CAJA
// =====================================================

export const APERTURA_CAJA = gql`
  mutation AperturaCaja($input: AbrirCajaInput!) {
    aperturaCaja(input: $input) {
      id
      codigo
      caja {
        id
        codigo
        nombre
      }
      usuario {
        id
        usuario
        nombre_completo
      }
      fecha_apertura
      monto_inicial
      notas_apertura
      estado
    }
  }
`;

export const CIERRE_CAJA = gql`
  mutation CierreCaja($input: CerrarCajaInput!) {
    cierreCaja(input: $input) {
      id
      codigo
      fecha_apertura
      fecha_cierre
      monto_inicial
      monto_esperado
      monto_real
      diferencia
      notas_cierre
      estado
    }
  }
`;

export const REGISTRAR_RETIRO_CAJA = gql`
  mutation RegistrarRetiroCaja($input: RetiroCajaInput!) {
    registrarRetiroCaja(input: $input) {
      id
      tipo
      concepto
      monto
      descripcion
      created_at
    }
  }
`;

// =====================================================
// QUERY - HISTORIAL DE TURNOS
// =====================================================

export const GET_HISTORIAL_TURNOS = gql`
  query GetHistorialTurnos(
    $fechaDesde: Date
    $fechaHasta: Date
    $usuarioId: Int
    $estado: EstadoTurnoCaja
    $limit: Int
    $offset: Int
  ) {
    historialTurnos(
      fecha_desde: $fechaDesde
      fecha_hasta: $fechaHasta
      usuario_id: $usuarioId
      estado: $estado
      limit: $limit
      offset: $offset
    ) {
      turnos {
        id
        codigo
        usuario {
          id
          nombre_completo
        }
        fecha_apertura
        fecha_cierre
        monto_inicial
        monto_esperado
        monto_real
        diferencia
        estado
        num_ventas
        total_ventas
      }
      total
    }
  }
`;

// =====================================================
// QUERY - DETALLE COMPLETO DE TURNO DE CAJA
// =====================================================

export const GET_DETALLE_TURNO = gql`
  query GetDetalleTurno($turnoCajaId: Int!) {
    detalleTurnoCaja(turno_caja_id: $turnoCajaId) {
      turno {
        id
        codigo
        caja {
          id
          codigo
          nombre
        }
        usuario {
          id
          usuario
          nombre_completo
        }
        fecha_apertura
        fecha_cierre
        monto_inicial
        monto_esperado
        monto_real
        diferencia
        notas_apertura
        notas_cierre
        estado
        closed_by {
          id
          nombre_completo
        }
      }
      movimientos {
        id
        tipo
        concepto
        monto
        descripcion
        created_at
      }
      arqueo {
        id
        denominacion
        cantidad
        valor_unitario
        subtotal
      }
      ventas_por_metodo {
        metodo
        monto
        cantidad_transacciones
      }
      total_ventas
      total_ingresos
      total_egresos
    }
  }
`;

// =====================================================
// MUTATION - REIMPRIMIR CIERRE DE CAJA
// =====================================================

export const REIMPRIMIR_CIERRE_CAJA = gql`
  mutation ReimprimirCierreCaja($turnoCajaId: Int!) {
    reimprimirCierreCaja(turno_caja_id: $turnoCajaId)
  }
`;
