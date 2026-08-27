export interface ShiftEntry {
  id: number;
  mes: string;
  fechas: string;
  evento: string;
  supervisorTurno: string;
  supervisorApoyo: string;
  tecnicoGuardia: string;
}

export interface SupervisorBillingProfile {
  supervisorNombre: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  email: string;
  telefono: string;
}

export interface TechAvailabilityItem {
  nombre?: string;
  id: number;
  tecnicoNombre: string;
  horarioTrabajo: string;
  diasLibres: string;
  estatus: string;
  cobertura: string;
}

export interface Store {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  unidad?: string;
  supervisorName?: string;
}

export interface MaterialCatalogItem {
  id: number;
  categoria: string;
  nombre: string;
  marca: string;
  medidasSpecs: string;
  unidadMedida: string;
}

export interface User {
  id: number;
  nombre: string;
  correo: string;
  usuario: string;
  contrasena?: string;
  rol: 'administrador' | 'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico';
  tiendaId?: number;
  supervisorTiendas?: number[];
  estado: boolean;
  passwordCambiado?: boolean;
}

export interface Comment {
  id: number;
  autor: string;
  rol: string;
  texto: string;
  fecha: string;
}

export interface Evidence {
  id: number;
  subidoPor: string;
  tipo: 'inicial' | 'final';
  archivoUrl: string;
  nombreArchivo: string;
  fecha: string;
}

export interface HistoryLog {
  id: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  usuario: string;
  fecha: string;
  detalle?: string;
}

export interface JornadaAsistencia {
  id: number;
  numeroVisita: number;
  tecnicoNombre: string;
  horaEntrada: string;
  horaSalida?: string;
  motivoPausa?: string;
  tipoSalida?: 'pausa_material' | 'salida_temporal' | 'conclusion_final' | 'reapertura';
  registradoEntradaPor: string;
  registradoSalidaPor?: string;
}

export interface Case {
  id: number;
  tiendaId: number;
  creadoPor: number;
  categoria: string;
  descripcion: string;
  prioridad: number;
  estado: 'pendiente' | 'en_proceso' | 'concluido' | 'cerrado';
  tecnicoAsignadoId?: number;
  fechaCreacion: string;
  fechaLimiteSla: string;
  fechaCierre?: string;
  evidencias: Evidence[];
  comentarios: Comment[];
  historial: HistoryLog[];
  tecnico_presencial_nombre?: string;
  tecnico_apoyo_nombre?: string;
  hora_entrada?: string;
  hora_salida?: string;
  jornadas?: JornadaAsistencia[];
  es_caso_tecnico?: boolean;
  tecnico_estatus_trabajo?: string;
  reaperturas_count?: number;
  pausado_por_material?: boolean;
  motivo_pausa_material?: string;
  fecha_pausa_material?: string;
  materiales_llegaron_tienda?: boolean;
  fecha_llegada_materiales?: string;
  fecha_programada?: string;
  turno_programado?: string;
  agendado_por?: string;
  horas_estimadas?: number;
  solicitud_material_anticipada?: boolean;
  material_anticipado_nombre?: string;
  material_anticipado_cantidad?: number;
  material_anticipado_estado?: 'pendiente_aprobacion' | 'aprobado' | 'rechazado';
  material_anticipado_aprobado_por?: string;
}

export interface AppNotification {
  id: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
  tipo: 'nuevo_caso' | 'comentario' | 'estado_cambio' | 'materiales' | 'facturacion';
  tiendaId?: number;
  prioridad?: number;
  casoId?: number;
  autorRol?: string;
  estadoNuevo?: string;
  usuarioId?: number;
}

export interface MaterialRequest {
  id: number;
  casoId: number;
  tecnicoId: number;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'denegado';
  createdAt: string;
}

export interface TechAvailability {
  id: number;
  tecnicoNombre: string;
  usuarioId?: number;
  diasLibres?: string;
  estatus: 'disponible' | 'libre' | 'en_ruta' | 'trabajando';
}
