import type { ShiftEntry, SupervisorBillingProfile, TechAvailabilityItem } from './types';

export const DEFAULT_SHIFT_SCHEDULE: ShiftEntry[] = [
  {
    "id": 1,
    "mes": "JUNIO",
    "fechas": "Sáb 6 - Dom 7",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 2,
    "mes": "JUNIO",
    "fechas": "Sáb 13 - Dom 14",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 3,
    "mes": "JUNIO",
    "fechas": "Sáb 20 - Dom 21",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 4,
    "mes": "JUNIO",
    "fechas": "Sáb 27 - Dom 28",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 5,
    "mes": "JULIO",
    "fechas": "Sáb 4 - Dom 5",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 6,
    "mes": "JULIO",
    "fechas": "Sáb 11 - Dom 12",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 7,
    "mes": "JULIO",
    "fechas": "Sáb 18 - Dom 19",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 8,
    "mes": "JULIO",
    "fechas": "Sáb 25 - Dom 26",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 9,
    "mes": "AGOSTO",
    "fechas": "Sáb 1 - Dom 2",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 10,
    "mes": "AGOSTO",
    "fechas": "Sáb 8 - Dom 9",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 11,
    "mes": "AGOSTO",
    "fechas": "Feriado 10",
    "evento": "independencia",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 12,
    "mes": "AGOSTO",
    "fechas": "Sáb 15 - Dom 16",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 13,
    "mes": "AGOSTO",
    "fechas": "Sáb 22 - Dom 23",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 14,
    "mes": "AGOSTO",
    "fechas": "Sáb 29 - Dom 30",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 15,
    "mes": "SEPTIEMBRE",
    "fechas": "Sáb 5 - Dom 6",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 16,
    "mes": "SEPTIEMBRE",
    "fechas": "Sáb 12 - Dom 13",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 17,
    "mes": "SEPTIEMBRE",
    "fechas": "Sáb 19 - Dom 20",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 18,
    "mes": "SEPTIEMBRE",
    "fechas": "Sáb 26 - Dom 27",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 19,
    "mes": "OCTUBRE",
    "fechas": "Sáb 4 - Dom 5",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 20,
    "mes": "OCTUBRE",
    "fechas": "Feriado 9",
    "evento": "IND GUAYAQUIL",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 21,
    "mes": "OCTUBRE",
    "fechas": "Sáb 10 - Dom 11",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 22,
    "mes": "OCTUBRE",
    "fechas": "Sáb 17 - Dom 18",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 23,
    "mes": "OCTUBRE",
    "fechas": "Sáb 24 - Dom 25",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 24,
    "mes": "NOVIEMBRE",
    "fechas": "Sáb 31 - Dom 1",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 25,
    "mes": "NOVIEMBRE",
    "fechas": "Feriado 2",
    "evento": "IND. CUENCA",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 26,
    "mes": "NOVIEMBRE",
    "fechas": "Feriado 3",
    "evento": "DIA DE DIFUNTOS",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 27,
    "mes": "NOVIEMBRE",
    "fechas": "Sáb 7 - Dom 8",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 28,
    "mes": "NOVIEMBRE",
    "fechas": "Sáb 14 - Dom |5",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 29,
    "mes": "NOVIEMBRE",
    "fechas": "Sáb 21 - Dom 22",
    "evento": "-",
    "supervisorTurno": "JULIO TUBÓN",
    "supervisorApoyo": "MARFA TORRES",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 30,
    "mes": "NOVIEMBRE",
    "fechas": "Sáb 28 - Dom 29",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 31,
    "mes": "NOVIEMBRE",
    "fechas": "Feriado 4",
    "evento": "FIESTAS DE QUITO",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 32,
    "mes": "DICIEMBRE",
    "fechas": "Sáb 5 - Dom 6",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "EFREN U"
  },
  {
    "id": 33,
    "mes": "DICIEMBRE",
    "fechas": "Sáb 12 - Dom 13",
    "evento": "-",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "FERNANDO S."
  },
  {
    "id": 34,
    "mes": "DICIEMBRE",
    "fechas": "Sáb 19 - Dom 20",
    "evento": "-",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "TODOS"
  },
  {
    "id": 35,
    "mes": "DICIEMBRE",
    "fechas": "Feriado 25",
    "evento": "NAVIDAD",
    "supervisorTurno": "MARFA TORRES",
    "supervisorApoyo": "JULIO TUBÓN",
    "tecnicoGuardia": "TODOS"
  },
  {
    "id": 36,
    "mes": "DICIEMBRE",
    "fechas": "Sáb 26 - Dom 27",
    "evento": "-",
    "supervisorTurno": "VICKY MONTIEL",
    "supervisorApoyo": "LUIS VALLEJOS",
    "tecnicoGuardia": "TODOS"
  },
  {
    "id": 37,
    "mes": "DICIEMBRE",
    "fechas": "Feriado 31",
    "evento": "FIN AÑO",
    "supervisorTurno": "LUIS VALLEJOS",
    "supervisorApoyo": "VICKY MONTIEL",
    "tecnicoGuardia": "TODOS"
  }
];

export const SUPERVISOR_BILLING_PROFILES: Record<string, SupervisorBillingProfile> = {
  "Luis Vallejos": {
    supervisorNombre: "Luis Vallejos",
    ruc: "1790012345001",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN QUITO / SIERRA)",
    direccion: "Av. 6 de Diciembre y Gaspar de Villarroel, Quito - Ecuador",
    email: "facturacion.lvallejos@marathon.com.ec",
    telefono: "(02) 298-3000"
  },
  "Julio Tubón": {
    supervisorNombre: "Julio Tubón",
    ruc: "1790012345002",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN GUAYAQUIL / COSTA)",
    direccion: "Av. Juan Tanca Marengo y Av. Constitución, Guayaquil - Ecuador",
    email: "facturacion.jtubon@marathon.com.ec",
    telefono: "(04) 268-4000"
  },
  "Vicky Montiel": {
    supervisorNombre: "Vicky Montiel",
    ruc: "1790012345003",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN AMBATO / CENTRO)",
    direccion: "Av. Cevallos y Lalama, Ambato - Ecuador",
    email: "facturacion.vmontiel@marathon.com.ec",
    telefono: "(03) 282-1000"
  },
  "Marfa Torres": {
    supervisorNombre: "Marfa Torres",
    ruc: "1790012345004",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN CUENCA / SUR)",
    direccion: "Av. Remigio Crespo Toral y Garaycoa, Cuenca - Ecuador",
    email: "facturacion.mtorres@marathon.com.ec",
    telefono: "(07) 288-5000"
  }
};

export const DEFAULT_TECH_AVAILABILITY: TechAvailabilityItem[] = [
  { id: 1, tecnicoNombre: 'Efrén U (Técnico Nivel 1)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Domingo / Lunes', estatus: 'disponible', cobertura: 'Quito / Pichincha / Zona Norte' },
  { id: 2, tecnicoNombre: 'Fernando S (Técnico Nivel 1)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Guayaquil / Guayas / Zona Sur' },
  { id: 3, tecnicoNombre: 'Luis Vallejos (Supervisor General)', horarioTrabajo: '07:30 AM - 05:30 PM', diasLibres: 'Fin de semana rotativo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 4, tecnicoNombre: 'Julio Tubón (Supervisor Técnico)', horarioTrabajo: '07:30 AM - 05:30 PM', diasLibres: 'Fin de semana rotativo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 5, tecnicoNombre: 'Vicky Montiel (Supervisora Operativa)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 6, tecnicoNombre: 'Marfa Torres (Supervisora Logística)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Nacional' }
];
