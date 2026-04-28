import { gql } from '@apollo/client';

// ============================================================================
// QUERIES - DATOS DEL HOTEL
// ============================================================================

export const GET_DATOS_HOTEL = gql`
  query DatosHotel {
    datosHotel {
      id
      nombre_comercial
      razon_social
      nit
      digito_verificacion
      tipo_persona
      regimen_tributario
      direccion
      ciudad
      departamento
      codigo_postal
      pais
      telefono
      celular
      email
      sitio_web
      resolucion_dian
      fecha_inicio_resolucion
      fecha_fin_resolucion
      prefijo_factura
      numero_actual_factura
      rango_inicial_factura
      rango_final_factura
      ambiente_dian
      logo_url
      color_primario
      color_secundario
      eslogan
      descripcion_empresa
      moneda
      timezone
      idioma
      created_at
      updated_at
      activo
    }
  }
`;

export const UPDATE_DATOS_HOTEL = gql`
  mutation ActualizarDatosHotel($input: DatosHotelInput!) {
    actualizarDatosHotel(input: $input) {
      id
      nombre_comercial
      razon_social
      nit
      digito_verificacion
      tipo_persona
      regimen_tributario
      direccion
      ciudad
      departamento
      codigo_postal
      pais
      telefono
      celular
      email
      sitio_web
      resolucion_dian
      fecha_inicio_resolucion
      fecha_fin_resolucion
      prefijo_factura
      numero_actual_factura
      rango_inicial_factura
      rango_final_factura
      ambiente_dian
      logo_url
      color_primario
      color_secundario
      eslogan
      descripcion_empresa
      moneda
      timezone
      idioma
      updated_at
      activo
    }
  }
`;

// ============================================================================
// QUERIES - PARÁMETROS GENERALES
// ============================================================================

export const GET_PARAMETROS_GENERALES = gql`
  query ParametrosGenerales {
    parametrosGenerales {
      id
      hora_checkin
      hora_checkout
      hora_apertura
      hora_cierre
      anticipo_minimo_pct
      dias_cancelacion_gratuita
      penalizacion_cancelacion_pct
      max_dias_reserva_anticipada
      max_noches_por_reserva
      tolerancia_late_checkout_min
      cargo_late_checkout_pct
      tolerancia_early_checkin_min
      cargo_early_checkin_pct
      permite_mascotas
      cargo_mascota
      iva_hospedaje
      iva_consumos
      iva_servicios
      aplica_retefuente
      porcentaje_retefuente
      aplica_ica
      porcentaje_ica
      enviar_confirmacion_reserva
      enviar_recordatorio_checkin
      dias_recordatorio_checkin
      enviar_agradecimiento_checkout
      enviar_factura_email
      alerta_stock_bajo
      alerta_habitaciones_sucias
      alerta_vencimiento_resolucion_dias
      backup_automatico
      frecuencia_backup_horas
      redondeo_facturas
      decimales_moneda
      mostrar_saldo_cuenta
      dias_validez_cotizacion
      created_at
      updated_at
      activo
    }
  }
`;

export const UPDATE_PARAMETROS_GENERALES = gql`
  mutation ActualizarParametrosGenerales($input: ParametrosGeneralesInput!) {
    actualizarParametrosGenerales(input: $input) {
      id
      hora_checkin
      hora_checkout
      hora_apertura
      hora_cierre
      anticipo_minimo_pct
      dias_cancelacion_gratuita
      penalizacion_cancelacion_pct
      max_dias_reserva_anticipada
      max_noches_por_reserva
      tolerancia_late_checkout_min
      cargo_late_checkout_pct
      tolerancia_early_checkin_min
      cargo_early_checkin_pct
      permite_mascotas
      cargo_mascota
      iva_hospedaje
      iva_consumos
      iva_servicios
      aplica_retefuente
      porcentaje_retefuente
      aplica_ica
      porcentaje_ica
      enviar_confirmacion_reserva
      enviar_recordatorio_checkin
      dias_recordatorio_checkin
      enviar_agradecimiento_checkout
      enviar_factura_email
      alerta_stock_bajo
      alerta_habitaciones_sucias
      alerta_vencimiento_resolucion_dias
      backup_automatico
      frecuencia_backup_horas
      redondeo_facturas
      decimales_moneda
      mostrar_saldo_cuenta
      dias_validez_cotizacion
      updated_at
      activo
    }
  }
`;

// ============================================================================
// QUERIES - TIPOS DE HABITACIÓN
// ============================================================================

export const GET_TIPOS_HABITACION_CONFIG = gql`
  query TiposHabitacionConfig($activo: Boolean) {
    tiposHabitacionConfig(activo: $activo) {
      codigo
      nombre
      descripcion
      capacidad_adultos
      capacidad_ninos
      precio_base
      metros_cuadrados
      comodidades
      orden
      activo
      created_at
      updated_at
    }
  }
`;

export const GET_TIPO_HABITACION_CONFIG = gql`
  query TipoHabitacionConfig($codigo: String!) {
    tipoHabitacionConfig(codigo: $codigo) {
      codigo
      nombre
      descripcion
      capacidad_adultos
      capacidad_ninos
      precio_base
      metros_cuadrados
      comodidades
      orden
      activo
      created_at
      updated_at
    }
  }
`;

export const CREATE_TIPO_HABITACION_CONFIG = gql`
  mutation CrearTipoHabitacionConfig($input: TipoHabitacionConfigInput!) {
    crearTipoHabitacionConfig(input: $input) {
      codigo
      nombre
      descripcion
      capacidad_adultos
      capacidad_ninos
      precio_base
      metros_cuadrados
      comodidades
      orden
      activo
      created_at
    }
  }
`;

export const UPDATE_TIPO_HABITACION_CONFIG = gql`
  mutation ActualizarTipoHabitacionConfig($codigo: String!, $input: TipoHabitacionConfigInput!) {
    actualizarTipoHabitacionConfig(codigo: $codigo, input: $input) {
      codigo
      nombre
      descripcion
      capacidad_adultos
      capacidad_ninos
      precio_base
      metros_cuadrados
      comodidades
      orden
      activo
      updated_at
    }
  }
`;

export const DELETE_TIPO_HABITACION_CONFIG = gql`
  mutation EliminarTipoHabitacionConfig($codigo: String!) {
    eliminarTipoHabitacionConfig(codigo: $codigo)
  }
`;

// ============================================================================
// QUERIES - CANALES DE RESERVA
// ============================================================================

export const GET_CANALES_RESERVA_CONFIG = gql`
  query CanalesReservaConfig($activo: Boolean) {
    canalesReservaConfig(activo: $activo) {
      codigo
      nombre
      descripcion
      comision_pct
      requiere_pago_anticipado
      url_integracion
      color_identificacion
      icono
      orden
      activo
      created_at
      updated_at
    }
  }
`;

export const GET_CANAL_RESERVA_CONFIG = gql`
  query CanalReservaConfig($codigo: String!) {
    canalReservaConfig(codigo: $codigo) {
      codigo
      nombre
      descripcion
      comision_pct
      requiere_pago_anticipado
      url_integracion
      color_identificacion
      icono
      orden
      activo
      created_at
      updated_at
    }
  }
`;

export const CREATE_CANAL_RESERVA_CONFIG = gql`
  mutation CrearCanalReservaConfig($input: CanalReservaConfigInput!) {
    crearCanalReservaConfig(input: $input) {
      codigo
      nombre
      descripcion
      comision_pct
      requiere_pago_anticipado
      url_integracion
      color_identificacion
      icono
      orden
      activo
      created_at
    }
  }
`;

export const UPDATE_CANAL_RESERVA_CONFIG = gql`
  mutation ActualizarCanalReservaConfig($codigo: String!, $input: CanalReservaConfigInput!) {
    actualizarCanalReservaConfig(codigo: $codigo, input: $input) {
      codigo
      nombre
      descripcion
      comision_pct
      requiere_pago_anticipado
      url_integracion
      color_identificacion
      icono
      orden
      activo
      updated_at
    }
  }
`;

export const DELETE_CANAL_RESERVA_CONFIG = gql`
  mutation EliminarCanalReservaConfig($codigo: String!) {
    eliminarCanalReservaConfig(codigo: $codigo)
  }
`;

// ============================================================================
// QUERIES - MÉTODOS DE PAGO
// ============================================================================

export const GET_METODOS_PAGO = gql`
  query MetodosPago($activo: Boolean) {
    metodosPago(activo: $activo) {
      id
      nombre
      tipo
      activo
      requiere_referencia
      icono
      orden
    }
  }
`;

// ============================================================================
// QUERIES - NOTIFICACIONES
// ============================================================================

export const GET_NOTIFICACIONES_CONFIG = gql`
  query NotificacionesConfig {
    notificacionesConfig {
      id
      email_habilitado
      email_servidor
      email_puerto
      email_usuario
      email_remitente
      email_nombre_remitente
      email_usa_tls
      sms_habilitado
      sms_proveedor
      sms_remitente
      whatsapp_habilitado
      whatsapp_proveedor
      whatsapp_numero
      notif_nueva_reserva_email
      notif_nueva_reserva_sms
      notif_nueva_reserva_whatsapp
      notif_confirmacion_reserva_email
      notif_confirmacion_reserva_sms
      notif_confirmacion_reserva_whatsapp
      notif_cancelacion_reserva_email
      notif_cancelacion_reserva_sms
      notif_cancelacion_reserva_whatsapp
      notif_recordatorio_checkin_email
      notif_recordatorio_checkin_sms
      notif_recordatorio_checkin_whatsapp
      notif_dias_antes_recordatorio
      notif_checkin_email
      notif_checkin_sms
      notif_checkin_whatsapp
      notif_checkout_email
      notif_checkout_sms
      notif_checkout_whatsapp
      notif_factura_email
      notif_factura_sms
      notif_factura_whatsapp
      notif_stock_bajo_email
      notif_vencimiento_resolucion_email
      notif_habitaciones_sucias_email
      emails_admin
      plantilla_confirmacion_reserva
      plantilla_recordatorio_checkin
      plantilla_factura
      plantilla_agradecimiento
      created_at
      updated_at
      activo
    }
  }
`;

export const UPDATE_NOTIFICACIONES_CONFIG = gql`
  mutation ActualizarNotificacionesConfig($input: NotificacionesConfigInput!) {
    actualizarNotificacionesConfig(input: $input) {
      id
      email_habilitado
      email_servidor
      email_puerto
      email_usuario
      email_remitente
      email_nombre_remitente
      email_usa_tls
      sms_habilitado
      sms_proveedor
      sms_remitente
      whatsapp_habilitado
      whatsapp_proveedor
      whatsapp_numero
      notif_nueva_reserva_email
      notif_nueva_reserva_sms
      notif_nueva_reserva_whatsapp
      notif_confirmacion_reserva_email
      notif_confirmacion_reserva_sms
      notif_confirmacion_reserva_whatsapp
      notif_cancelacion_reserva_email
      notif_cancelacion_reserva_sms
      notif_cancelacion_reserva_whatsapp
      notif_recordatorio_checkin_email
      notif_recordatorio_checkin_sms
      notif_recordatorio_checkin_whatsapp
      notif_dias_antes_recordatorio
      notif_checkin_email
      notif_checkin_sms
      notif_checkin_whatsapp
      notif_checkout_email
      notif_checkout_sms
      notif_checkout_whatsapp
      notif_factura_email
      notif_factura_sms
      notif_factura_whatsapp
      notif_stock_bajo_email
      notif_vencimiento_resolucion_email
      notif_habitaciones_sucias_email
      emails_admin
      plantilla_confirmacion_reserva
      plantilla_recordatorio_checkin
      plantilla_factura
      plantilla_agradecimiento
      updated_at
      activo
    }
  }
`;

// ============================================================================
// QUERIES - USUARIOS
// ============================================================================

export const GET_USUARIOS = gql`
  query Usuarios($activo: Boolean) {
    usuarios(activo: $activo) {
      id
      usuario
      nombre
      apellido
      email
      rol
      telefono
      activo
      created_at
    }
  }
`;

export const CREATE_USUARIO = gql`
  mutation CrearUsuario($input: UsuarioInput!) {
    crearUsuario(input: $input) {
      id
      usuario
      nombre
      apellido
      email
      rol
      telefono
      activo
      created_at
    }
  }
`;

export const UPDATE_USUARIO = gql`
  mutation ActualizarUsuario($id: Int!, $input: UsuarioInput!) {
    actualizarUsuario(id: $id, input: $input) {
      id
      usuario
      nombre
      apellido
      email
      rol
      telefono
      activo
      created_at
    }
  }
`;

export const CAMBIAR_PASSWORD_USUARIO = gql`
  mutation CambiarPasswordUsuario($id: Int!, $password: String!) {
    cambiarPasswordUsuario(id: $id, password: $password)
  }
`;

export const DESACTIVAR_USUARIO = gql`
  mutation DesactivarUsuario($id: Int!) {
    desactivarUsuario(id: $id)
  }
`;
