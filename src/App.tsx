import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';

const lastTriggeredNotifCache = new Map<string, number>();

const triggerNativeNotification = async (title: string, body: string) => {
  const notifKey = title + '::' + body;
  const now = Date.now();
  if (lastTriggeredNotifCache.has(notifKey) && now - (lastTriggeredNotifCache.get(notifKey) || 0) < 10000) {
    console.log("Notificación duplicada omitida:", title);
    return;
  }
  lastTriggeredNotifCache.set(notifKey, now);
  console.log("Disparando notificacion nativa:", title, body);
  try {
    if (typeof (window as any).Capacitor !== 'undefined') {
      // Crear canal de alta prioridad para Android
      await LocalNotifications.createChannel({
        id: 'mainttrac_alerts',
        name: 'Alertas MaintTrac',
        description: 'Notificaciones instantaneas de casos y mantenimientos',
        importance: 5, // MAX importance
        visibility: 1,
        vibration: true
      }).catch(() => {});

      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // Notificacion Inmediata (sin retraso de AlarmManager)
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 1000000) + 1,
            smallIcon: 'ic_launcher',
            iconColor: '#3B82F6',
            channelId: 'mainttrac_alerts',
            schedule: { at: new Date(Date.now() + 50) }
          }
        ]
      });
    } else if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  } catch (e) {
    console.log("LocalNotifications error:", e);
  }
};


// ==========================================
// TYPES AND INTERFACES
// ==========================================

interface ShiftEntry {
  id: number;
  mes: string;
  fechas: string;
  evento: string;
  supervisorTurno: string;
  supervisorApoyo: string;
  tecnicoGuardia: string;
}

const DEFAULT_SHIFT_SCHEDULE: ShiftEntry[] = [
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


interface SupervisorBillingProfile {
  supervisorNombre: string;
  ruc: string;
  razonSocial: string;
  direccion: string;
  email: string;
  telefono: string;
}

const SUPERVISOR_BILLING_PROFILES: Record<string, SupervisorBillingProfile> = {
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

interface TechAvailabilityItem {
  nombre?: string;
  id: number;
  tecnicoNombre: string;
  horarioTrabajo: string;
  diasLibres: string;
  estatus: string;
  cobertura: string;
}

const DEFAULT_TECH_AVAILABILITY: TechAvailabilityItem[] = [
  { id: 1, tecnicoNombre: 'Efrén U (Técnico Nivel 1)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Domingo / Lunes', estatus: 'disponible', cobertura: 'Quito / Pichincha / Zona Norte' },
  { id: 2, tecnicoNombre: 'Fernando S (Técnico Nivel 1)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Guayaquil / Guayas / Zona Sur' },
  { id: 3, tecnicoNombre: 'Luis Vallejos (Supervisor General)', horarioTrabajo: '07:30 AM - 05:30 PM', diasLibres: 'Fin de semana rotativo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 4, tecnicoNombre: 'Julio Tubón (Supervisor Técnico)', horarioTrabajo: '07:30 AM - 05:30 PM', diasLibres: 'Fin de semana rotativo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 5, tecnicoNombre: 'Vicky Montiel (Supervisora Operativa)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Nacional' },
  { id: 6, tecnicoNombre: 'Marfa Torres (Supervisora Logística)', horarioTrabajo: '08:00 AM - 05:00 PM', diasLibres: 'Sábado / Domingo', estatus: 'disponible', cobertura: 'Nacional' }
];



interface Store {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  unidad?: string;
  supervisorName?: string;
}

interface MaterialCatalogItem {
  id: number;
  categoria: string;
  nombre: string;
  marca: string;
  medidasSpecs: string;
  unidadMedida: string;
}

const DEFAULT_MATERIAL_CATALOG: MaterialCatalogItem[] = [
  // ILUMINACIÓN Y ELECTRICIDAD
  { id: 1, categoria: '💡 Iluminación y Electricidad', nombre: 'Foco Dicroico LED 7W GU10', marca: 'Sylvania / Philips', medidasSpecs: '7W / 110V-220V', unidadMedida: 'Unidad' },
  { id: 2, categoria: '💡 Iluminación y Electricidad', nombre: 'Panel LED Redondo Embutir 18W', marca: 'Osram / Megabright', medidasSpecs: 'Diámetro 22cm / 18W Blanco Frío', unidadMedida: 'Unidad' },
  { id: 3, categoria: '💡 Iluminación y Electricidad', nombre: 'Tubo LED T8 18W 120cm', marca: 'Sylvania / Philips', medidasSpecs: '120cm Longitud / 18W 6500K', unidadMedida: 'Unidad' },
  { id: 4, categoria: '💡 Iluminación y Electricidad', nombre: 'Cinta Aislante Eléctrica Vulcanizable', marca: '3M Super 33+', medidasSpecs: '3/4 pulgada x 20m', unidadMedida: 'Rollo' },
  { id: 5, categoria: '💡 Iluminación y Electricidad', nombre: 'Breaker Termomagnético Monofásico 20A', marca: 'Schneider Electric / ABB', medidasSpecs: '20 Amperios / 120V-240V DIN', unidadMedida: 'Unidad' },

  // ASCENSORES, MONTACARGAS Y ELEVADORES DE ZAPATOS
  { id: 6, categoria: '🛗 Ascensores y Montacargas', nombre: 'Zapata / Freno para Ascensor de Calzado', marca: 'Otis / Kone / Schindler', medidasSpecs: 'Estándar Comercial 120mm x 45mm', unidadMedida: 'Par / Juego' },
  { id: 7, categoria: '🛗 Ascensores y Montacargas', nombre: 'Aceite Sintético de Viscosidad para Cadenas', marca: 'Mobil DTE 10 / Shell Omala', medidasSpecs: 'Viscosidad ISO VG 220 / Galón 3.78L', unidadMedida: 'Galón' },
  { id: 8, categoria: '🛗 Ascensores y Montacargas', nombre: 'Lubricante en Spray para Cadenas y Engranajes', marca: 'WD-40 Specialist / Liqui Moly', medidasSpecs: 'Lata 450ml con Cánula', unidadMedida: 'Lata Spray' },
  { id: 9, categoria: '🛗 Ascensores y Montacargas', nombre: 'Correa / Banda de Tracción Reforzada', marca: 'Gates / Bando', medidasSpecs: 'Medida A-42 / B-56 Caucho Industrial', unidadMedida: 'Unidad' },
  { id: 10, categoria: '🛗 Ascensores y Montacargas', nombre: 'Interruptor Límite de Carrera Final (Limit Switch)', marca: 'Omron / Honeywell', medidasSpecs: '250V AC 10A Palanca de Rodillo', unidadMedida: 'Unidad' },

  // FIJACIÓN, FERRETERÍA Y SILICONAS
  { id: 11, categoria: '🔩 Fijación y Ferretería', nombre: 'Tornillo Autoperforante Cabeza Lenteja', marca: 'Hillman / Fischer', medidasSpecs: '#8 x 1/2 pulgada Acero Galvanizado', unidadMedida: 'Caja 100u' },
  { id: 12, categoria: '🔩 Fijación y Ferretería', nombre: 'Taquete / Ramplug Plástico con Tornillo', marca: 'Fischer / Tacoma', medidasSpecs: 'Medida 6mm x 40mm', unidadMedida: 'Caja 100u' },
  { id: 13, categoria: '🔩 Fijación y Ferretería', nombre: 'Perno de Expansión de Acero Inoxidable', marca: 'Hilti / Fischer', medidasSpecs: '3/8 pulgada x 3 pulgadas', unidadMedida: 'Unidad' },
  { id: 14, categoria: '🔩 Fijación y Ferretería', nombre: 'Silicona Multiuso Transparente Antihongos', marca: 'Sika / Henkel Loctite', medidasSpecs: 'Cartucho 280ml para Aplicador', unidadMedida: 'Cartucho' },

  // TUBERÍAS Y PLOMERÍA
  { id: 15, categoria: ' Tuberías y Plomería', nombre: 'Tubo PVC Eléctrico Pesado 3/4 pulgada', marca: 'Plastigama / Rival', medidasSpecs: '3/4 pulgada x 3 metros', unidadMedida: 'Tira 3m' },
  { id: 16, categoria: ' Tuberías y Plomería', nombre: 'Tubo PVC Agua Presión 1/2 pulgada', marca: 'Plastigama', medidasSpecs: '1/2 pulgada x 6 metros 500 PSI', unidadMedida: 'Tira 6m' },
  { id: 17, categoria: ' Tuberías y Plomería', nombre: 'Codo PVC 90 Grados Agua 1/2 pulgada', marca: 'Plastigama / Tigre', medidasSpecs: '1/2 pulgada Liso x Liso', unidadMedida: 'Unidad' },
  { id: 18, categoria: ' Tuberías y Plomería', nombre: 'Teflón Industrial para Tuberías', marca: 'Plastigama / Tigre', medidasSpecs: '3/4 pulgada x 10 metros Alta Densidad', unidadMedida: 'Rollo' },

  // CONSUMIBLES Y MANTENIMIENTO TÉCNICO
  { id: 19, categoria: '🛠️ Consumibles Técnicos', nombre: 'Limpiador de Contactos Eléctricos En Seco', marca: 'CRC Contact Cleaner / Abro', medidasSpecs: 'Lata 400ml Dieléctrico', unidadMedida: 'Lata Spray' },
  { id: 20, categoria: '🛠️ Consumibles Técnicos', nombre: 'Masilla Epóxica Bicompuesta para Reparaciones', marca: 'Poxilina / Devcon', medidasSpecs: 'Barra 70g Secado Rápido', unidadMedida: 'Caja' }
];

interface User {
  id: number;
  nombre: string;
  correo: string;
  usuario: string;
  contrasena?: string;
  rol: 'administrador' | 'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico';
  tiendaId?: number; // for jefe_tienda and subjefe
  supervisorTiendas?: number[]; // for supervisor
  estado: boolean;
  passwordCambiado?: boolean;
}

interface Comment {
  id: number;
  autor: string;
  rol: string;
  texto: string;
  fecha: string;
}

interface Evidence {
  id: number;
  subidoPor: string;
  tipo: 'inicial' | 'final';
  archivoUrl: string;
  nombreArchivo: string;
  fecha: string;
}

interface HistoryLog {
  id: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  usuario: string;
  fecha: string;
  detalle?: string;
}

interface Case {
  id: number;
  tiendaId: number;
  creadoPor: number;
  categoria: string;
  descripcion: string;
  prioridad: number; // 1: Critico, 2: Alto, 3: Medio, 4: Bajo
  estado: 'pendiente' | 'en_proceso' | 'concluido' | 'cerrado';
  tecnicoAsignadoId?: number;
  fechaCreacion: string;
  fechaLimiteSla: string;
  fechaCierre?: string;
  evidencias: Evidence[];
  comentarios: Comment[];
  historial: HistoryLog[];
  // Campos premium agregados
  tecnico_presencial_nombre?: string;
  tecnico_apoyo_nombre?: string;
  hora_entrada?: string;
  hora_salida?: string;
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

interface AppNotification {
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

interface MaterialRequest {
  id: number;
  casoId: number;
  tecnicoId: number;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'denegado';
  createdAt: string;
}

interface TechAvailability {
  id: number;
  tecnicoNombre: string;
  usuarioId?: number;
  diasLibres?: string;
  estatus: 'disponible' | 'libre' | 'en_ruta' | 'trabajando';
}

// ==========================================
// DEFAULT SEED DATA
// ==========================================

const DEFAULT_CATEGORIES = [
  { id: 1, nombre: 'Fallo Eléctrico Total', prioridadSugerida: 1 },
  { id: 2, nombre: 'Falla de Climatización / Aire Acondicionado', prioridadSugerida: 2 },
  { id: 3, nombre: 'Falla del Sistema de Ventas (POS)', prioridadSugerida: 2 },
  { id: 4, nombre: 'Fuga de Agua / Inundación', prioridadSugerida: 1 },
  { id: 5, nombre: 'Problema de Iluminación en Tienda', prioridadSugerida: 3 },
  { id: 6, nombre: 'Daño en Mobiliario / Exhibidores', prioridadSugerida: 4 },
  { id: 7, nombre: 'Problema de Cerradura o Puerta Principal', prioridadSugerida: 1 },
  { id: 8, nombre: 'Pintura y Retoques Estéticos', prioridadSugerida: 4 },
];

const DEFAULT_STORES: Store[] = [
  {
    "id": 1,
    "nombre": "BODEGA ATAHUALPA (BAT1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA ATAHUALPA, Región Sierra",
    "unidad": "BAT1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 2,
    "nombre": "BODEGA NORTE (BNO1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA NORTE, Región Sierra",
    "unidad": "BNO1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 3,
    "nombre": "BODEGA RIOBAMBA (BRI1)",
    "ciudad": "Riobamba",
    "direccion": "BODEGA RIOBAMBA, Región Sierra",
    "unidad": "BRI1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 4,
    "nombre": "CIKLA CUENCA (CCU1)",
    "ciudad": "Cuenca",
    "direccion": "CIKLA CUENCA, Región Sierra",
    "unidad": "CCU1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 5,
    "nombre": "EXPLORER JARDIN (EJA1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER JARDIN, Región Sierra",
    "unidad": "EJA1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 6,
    "nombre": "EXPLORER MALL DEL RIO (ECU1)",
    "ciudad": "Sierra",
    "direccion": "EXPLORER MALL DEL RIO, Región Sierra",
    "unidad": "ECU1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 7,
    "nombre": "EXPLORER RIOBAMBA (ERI1)",
    "ciudad": "Riobamba",
    "direccion": "EXPLORER RIOBAMBA, Región Sierra",
    "unidad": "ERI1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 8,
    "nombre": "EXPLORER SCALA (ESC1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER SCALA, Región Sierra",
    "unidad": "ESC1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 9,
    "nombre": "MARATHON JARDIN (MJA1)",
    "ciudad": "Quito",
    "direccion": "MARATHON JARDIN, Región Sierra",
    "unidad": "MJA1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 10,
    "nombre": "MARATHON MALL DEL ALTO (MMA1)",
    "ciudad": "Sierra",
    "direccion": "MARATHON MALL DEL ALTO, Región Sierra",
    "unidad": "MMA1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 11,
    "nombre": "MARATHON MALL DEL RIO (MCU1)",
    "ciudad": "Sierra",
    "direccion": "MARATHON MALL DEL RIO, Región Sierra",
    "unidad": "MCU1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 12,
    "nombre": "MARATHON QUICENTRO SUR (MQS1)",
    "ciudad": "Quito",
    "direccion": "MARATHON QUICENTRO SUR, Región Sierra",
    "unidad": "MQS1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 13,
    "nombre": "MARATHON RIOBAMBA (MRI1)",
    "ciudad": "Riobamba",
    "direccion": "MARATHON RIOBAMBA, Región Sierra",
    "unidad": "MRI1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 14,
    "nombre": "MARATHON SCALA (MSC1)",
    "ciudad": "Quito",
    "direccion": "MARATHON SCALA, Región Sierra",
    "unidad": "MSC1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 15,
    "nombre": "OUTLET BATAN (OBT1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET BATAN, Región Sierra",
    "unidad": "OBT1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 16,
    "nombre": "OUTLET GUARANDA (OGU1)",
    "ciudad": "Guaranda",
    "direccion": "OUTLET GUARANDA, Región Sierra",
    "unidad": "OGU1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 17,
    "nombre": "OUTLET MONAY (OMO1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET MONAY, Región Sierra",
    "unidad": "OMO1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 18,
    "nombre": "TAF JARDIN (FJA1)",
    "ciudad": "Quito",
    "direccion": "TAF JARDIN, Región Sierra",
    "unidad": "FJA1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 19,
    "nombre": "TAF QUICENTRO SUR (FQS1)",
    "ciudad": "Quito",
    "direccion": "TAF QUICENTRO SUR, Región Sierra",
    "unidad": "FQS1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 20,
    "nombre": "TELESHOP JARDIN (TJA1)",
    "ciudad": "Quito",
    "direccion": "TELESHOP JARDIN, Región Sierra",
    "unidad": "TJA1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 21,
    "nombre": "TELESHOP QUICENTRO SUR (TQS1)",
    "ciudad": "Quito",
    "direccion": "TELESHOP QUICENTRO SUR, Región Sierra",
    "unidad": "TQS1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 22,
    "nombre": "TELESHOP RIOBAMBA (TRI1)",
    "ciudad": "Riobamba",
    "direccion": "TELESHOP RIOBAMBA, Región Sierra",
    "unidad": "TRI1",
    "supervisorName": "JULIO TUBON"
  },
  {
    "id": 23,
    "nombre": "BODEGA SANGOLQUI (BSA1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA SANGOLQUI, Región Sierra",
    "unidad": "BSA1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 24,
    "nombre": "BODEGA VALLE (BVA1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA VALLE, Región Sierra",
    "unidad": "BVA1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 25,
    "nombre": "EXPLORER BOSQUE (EBO1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER BOSQUE, Región Sierra",
    "unidad": "EBO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 26,
    "nombre": "EXPLORER CONDADO (ECO1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER CONDADO, Región Sierra",
    "unidad": "ECO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 27,
    "nombre": "EXPLORER LATACUNGA (ELT1)",
    "ciudad": "Latacunga",
    "direccion": "EXPLORER LATACUNGA, Región Sierra",
    "unidad": "ELT1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 28,
    "nombre": "EXPLORER SAN LUIS (ESL1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER SAN LUIS, Región Sierra",
    "unidad": "ESL1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 29,
    "nombre": "MARATHON BOSQUE (MBO1)",
    "ciudad": "Quito",
    "direccion": "MARATHON BOSQUE, Región Sierra",
    "unidad": "MBO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 30,
    "nombre": "MARATHON CONDADO (MCO1)",
    "ciudad": "Quito",
    "direccion": "MARATHON CONDADO, Región Sierra",
    "unidad": "MCO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 31,
    "nombre": "MARATHON LATACUNGA (MLT1)",
    "ciudad": "Latacunga",
    "direccion": "MARATHON LATACUNGA, Región Sierra",
    "unidad": "MLT1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 32,
    "nombre": "MARATHON SAN LUIS (MSL1)",
    "ciudad": "Quito",
    "direccion": "MARATHON SAN LUIS, Región Sierra",
    "unidad": "MSL1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 33,
    "nombre": "OUTLET DAPSILIA (ODP1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET DAPSILIA, Región Sierra",
    "unidad": "ODP1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 34,
    "nombre": "OUTLET POMASQUI (OPO1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET POMASQUI, Región Sierra",
    "unidad": "OPO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 35,
    "nombre": "OUTLET VIVE PLAZA (OVP1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET VIVE PLAZA, Región Sierra",
    "unidad": "OVP1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 36,
    "nombre": "PUMA CONDADO (PCO1)",
    "ciudad": "Quito",
    "direccion": "PUMA CONDADO, Región Sierra",
    "unidad": "PCO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 37,
    "nombre": "TAF BOSQUE (FBO1)",
    "ciudad": "Quito",
    "direccion": "TAF BOSQUE, Región Sierra",
    "unidad": "FBO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 38,
    "nombre": "TAF CONDADO (FCO1)",
    "ciudad": "Quito",
    "direccion": "TAF CONDADO, Región Sierra",
    "unidad": "FCO1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 39,
    "nombre": "TELESHOP LATACUNGA (TLT1)",
    "ciudad": "Latacunga",
    "direccion": "TELESHOP LATACUNGA, Región Sierra",
    "unidad": "TLT1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 40,
    "nombre": "TELESHOP SAN LUIS (TSL1)",
    "ciudad": "Quito",
    "direccion": "TELESHOP SAN LUIS, Región Sierra",
    "unidad": "TSL1",
    "supervisorName": "VICKY MONTIEL"
  },
  {
    "id": 41,
    "nombre": "BODEGA LOJA (BLJ1)",
    "ciudad": "Loja",
    "direccion": "BODEGA LOJA, Región Sierra",
    "unidad": "BLJ1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 42,
    "nombre": "BODEGA SAN AGUSTIN (BSG1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA SAN AGUSTIN, Región Sierra",
    "unidad": "BSG1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 43,
    "nombre": "BODEGA VENTURA (BVE1)",
    "ciudad": "Sierra",
    "direccion": "BODEGA VENTURA, Región Sierra",
    "unidad": "BVE1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 44,
    "nombre": "CIKLA QUICENTRO NORTE (CQN1)",
    "ciudad": "Quito",
    "direccion": "CIKLA QUICENTRO NORTE, Región Sierra",
    "unidad": "CQN1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 45,
    "nombre": "EXPLORER LAGUNA MALL (ELG1)",
    "ciudad": "Sierra",
    "direccion": "EXPLORER LAGUNA MALL, Región Sierra",
    "unidad": "ELG1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 46,
    "nombre": "EXPLORER LOJA (ELJ1)",
    "ciudad": "Loja",
    "direccion": "EXPLORER LOJA, Región Sierra",
    "unidad": "ELJ1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 47,
    "nombre": "EXPLORER QUICENTRO NORTE (EQN1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER QUICENTRO NORTE, Región Sierra",
    "unidad": "EQN1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 48,
    "nombre": "EXPLORER VENTURA (EVE1)",
    "ciudad": "Sierra",
    "direccion": "EXPLORER VENTURA, Región Sierra",
    "unidad": "EVE1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 49,
    "nombre": "MARATHON CCI (MCC1)",
    "ciudad": "Quito",
    "direccion": "MARATHON CCI, Región Sierra",
    "unidad": "MCC1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 50,
    "nombre": "MARATHON LA PLAZA (MIB1)",
    "ciudad": "Sierra",
    "direccion": "MARATHON LA PLAZA, Región Sierra",
    "unidad": "MIB1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 51,
    "nombre": "MARATHON LAGUNA (MLG1)",
    "ciudad": "Sierra",
    "direccion": "MARATHON LAGUNA, Región Sierra",
    "unidad": "MLG1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 52,
    "nombre": "MARATHON LOJA (MLJ1)",
    "ciudad": "Loja",
    "direccion": "MARATHON LOJA, Región Sierra",
    "unidad": "MLJ1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 53,
    "nombre": "MARATHON QUICENTRO NORTE (MQN1)",
    "ciudad": "Quito",
    "direccion": "MARATHON QUICENTRO NORTE, Región Sierra",
    "unidad": "MQN1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 54,
    "nombre": "OUTLET CAYAMBE (OCA1)",
    "ciudad": "Cayambe",
    "direccion": "OUTLET CAYAMBE, Región Sierra",
    "unidad": "OCA1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 55,
    "nombre": "OUTLET TULCAN (OTU1)",
    "ciudad": "Tulcán",
    "direccion": "OUTLET TULCAN, Región Sierra",
    "unidad": "OTU1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 56,
    "nombre": "PUMA QUICENTRO NORTE (PQN1)",
    "ciudad": "Quito",
    "direccion": "PUMA QUICENTRO NORTE, Región Sierra",
    "unidad": "PQN1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 57,
    "nombre": "TAF SCALA (FSC1)",
    "ciudad": "Quito",
    "direccion": "TAF SCALA, Región Sierra",
    "unidad": "FSC1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 58,
    "nombre": "UNDER ARMOUR QUICENTRO (UQN1)",
    "ciudad": "Quito",
    "direccion": "UNDER ARMOUR QUICENTRO, Región Sierra",
    "unidad": "UQN1",
    "supervisorName": "MARFA TORRES"
  },
  {
    "id": 59,
    "nombre": "BODEGA AMBATO (BAM1)",
    "ciudad": "Ambato",
    "direccion": "BODEGA AMBATO, Región Sierra",
    "unidad": "BAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 60,
    "nombre": "BODEGA RECREO (BRE1)",
    "ciudad": "Quito",
    "direccion": "BODEGA RECREO, Región Sierra",
    "unidad": "BRE1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 61,
    "nombre": "BODEGA SOLANDA (BSO1)",
    "ciudad": "Quito",
    "direccion": "BODEGA SOLANDA, Región Sierra",
    "unidad": "BSO1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 62,
    "nombre": "CIKLA AMBATO (CAM1)",
    "ciudad": "Ambato",
    "direccion": "CIKLA AMBATO, Región Sierra",
    "unidad": "CAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 63,
    "nombre": "CIKLA RIOCENTRO (CRC1)",
    "ciudad": "Sierra",
    "direccion": "CIKLA RIOCENTRO, Región Sierra",
    "unidad": "CRC1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 64,
    "nombre": "EXPLORER AMBATO (EAM1)",
    "ciudad": "Ambato",
    "direccion": "EXPLORER AMBATO, Región Sierra",
    "unidad": "EAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 65,
    "nombre": "EXPLORER PORTAL (ECP1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER PORTAL, Región Sierra",
    "unidad": "ECP1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 66,
    "nombre": "EXPLORER RECREO (ERE1)",
    "ciudad": "Quito",
    "direccion": "EXPLORER RECREO, Región Sierra",
    "unidad": "ERE1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 67,
    "nombre": "EXPLORER RIOCENTRO (ERC1)",
    "ciudad": "Sierra",
    "direccion": "EXPLORER RIOCENTRO, Región Sierra",
    "unidad": "ERC1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 68,
    "nombre": "MARATHON AMBATO (MAM1)",
    "ciudad": "Ambato",
    "direccion": "MARATHON AMBATO, Región Sierra",
    "unidad": "MAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 69,
    "nombre": "MARATHON PASEO AMBATO (MAB1)",
    "ciudad": "Ambato",
    "direccion": "MARATHON PASEO AMBATO, Región Sierra",
    "unidad": "MAB1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 70,
    "nombre": "MARATHON PORTAL (MCP1)",
    "ciudad": "Quito",
    "direccion": "MARATHON PORTAL, Región Sierra",
    "unidad": "MCP1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 71,
    "nombre": "MARATHON RECREO (MRE1)",
    "ciudad": "Quito",
    "direccion": "MARATHON RECREO, Región Sierra",
    "unidad": "MRE1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 72,
    "nombre": "MARATHON SAN FRANCISCO (MSF1)",
    "ciudad": "Sierra",
    "direccion": "MARATHON SAN FRANCISCO, Región Sierra",
    "unidad": "MSF1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 73,
    "nombre": "OUTLET GASPAR (OGA1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET GASPAR, Región Sierra",
    "unidad": "OGA1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 74,
    "nombre": "OUTLET GRANADOS (OGR1)",
    "ciudad": "Sierra",
    "direccion": "OUTLET GRANADOS, Región Sierra",
    "unidad": "OGR1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 75,
    "nombre": "PUMA PLAZA DE LAS AMERICAS (PAM1)",
    "ciudad": "Sierra",
    "direccion": "PUMA PLAZA DE LAS AMERICAS, Región Sierra",
    "unidad": "PAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 76,
    "nombre": "TAF PORTAL (FCP1)",
    "ciudad": "Quito",
    "direccion": "TAF PORTAL, Región Sierra",
    "unidad": "FCP1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 77,
    "nombre": "TAF RIOCENTRO (FRC1)",
    "ciudad": "Sierra",
    "direccion": "TAF RIOCENTRO, Región Sierra",
    "unidad": "FRC1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 78,
    "nombre": "TELESHOP AMBATO (TAM1)",
    "ciudad": "Ambato",
    "direccion": "TELESHOP AMBATO, Región Sierra",
    "unidad": "TAM1",
    "supervisorName": "LUIS VALLEJOS"
  },
  {
    "id": 79,
    "nombre": "TELESHOP RECREO (TRE1)",
    "ciudad": "Quito",
    "direccion": "TELESHOP RECREO, Región Sierra",
    "unidad": "TRE1",
    "supervisorName": "LUIS VALLEJOS"
  }
];

const DEFAULT_USERS: User[] = [
  {
    "id": 1,
    "nombre": "Gerencia Marathon Sports",
    "correo": "gerencia@marathonsports.com",
    "usuario": "GEN_MS",
    "contrasena": "GEN*MS*",
    "rol": "administrador",
    "estado": true
  },
  {
    "id": 2,
    "nombre": "Julio Tubon (Supervisor)",
    "correo": "julio.tubon@marathonsports.com",
    "usuario": "SUP_JT",
    "contrasena": "SUP*JT*",
    "rol": "supervisor",
    "passwordCambiado": false,
    "supervisorTiendas": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22
    ],
    "estado": true
  },
  {
    "id": 3,
    "nombre": "Vicky Montiel (Supervisor)",
    "correo": "vicky.montiel@marathonsports.com",
    "usuario": "SUP_VM",
    "contrasena": "SUP*VM*",
    "rol": "supervisor",
    "passwordCambiado": false,
    "supervisorTiendas": [
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40
    ],
    "estado": true
  },
  {
    "id": 4,
    "nombre": "Marfa Torres (Supervisor)",
    "correo": "marfa.torres@marathonsports.com",
    "usuario": "SUP_MT",
    "contrasena": "SUP*MT*",
    "rol": "supervisor",
    "passwordCambiado": false,
    "supervisorTiendas": [
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58
    ],
    "estado": true
  },
  {
    "id": 5,
    "nombre": "Luis Vallejos (Supervisor)",
    "correo": "luis.vallejos@marathonsports.com",
    "usuario": "SUP_LV",
    "contrasena": "SUP*LV*",
    "rol": "supervisor",
    "supervisorTiendas": [
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79
    ],
    "estado": true
  },
  {
    "id": 6,
    "nombre": "Efrén U (Técnico)",
    "correo": "tec_eu@marathonsports.com",
    "usuario": "TEC_EU",
    "contrasena": "TEC*EU*",
    "rol": "tecnico",
    "estado": true
  },
  {
    "id": 7,
    "nombre": "Fernando S (Técnico)",
    "correo": "tec_fs@marathonsports.com",
    "usuario": "TEC_FS",
    "contrasena": "TEC*FS*",
    "rol": "tecnico",
    "estado": true
  },
  {
    "id": 8,
    "nombre": "Local BODEGA ATAHUALPA (BAT1)",
    "correo": "bat1@marathonsports.com",
    "usuario": "BAT1_2026",
    "contrasena": "BAT1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 1,
    "estado": true
  },
  {
    "id": 9,
    "nombre": "Local BODEGA NORTE (BNO1)",
    "correo": "bno1@marathonsports.com",
    "usuario": "BNO1_2026",
    "contrasena": "BNO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 2,
    "estado": true
  },
  {
    "id": 10,
    "nombre": "Local BODEGA RIOBAMBA (BRI1)",
    "correo": "bri1@marathonsports.com",
    "usuario": "BRI1_2026",
    "contrasena": "BRI1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 3,
    "estado": true
  },
  {
    "id": 11,
    "nombre": "Local CIKLA CUENCA (CCU1)",
    "correo": "ccu1@marathonsports.com",
    "usuario": "CCU1_2026",
    "contrasena": "CCU1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 4,
    "estado": true
  },
  {
    "id": 12,
    "nombre": "Local EXPLORER JARDIN (EJA1)",
    "correo": "eja1@marathonsports.com",
    "usuario": "EJA1_2026",
    "contrasena": "EJA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 5,
    "estado": true
  },
  {
    "id": 13,
    "nombre": "Local EXPLORER MALL DEL RIO (ECU1)",
    "correo": "ecu1@marathonsports.com",
    "usuario": "ECU1_2026",
    "contrasena": "ECU1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 6,
    "estado": true
  },
  {
    "id": 14,
    "nombre": "Local EXPLORER RIOBAMBA (ERI1)",
    "correo": "eri1@marathonsports.com",
    "usuario": "ERI1_2026",
    "contrasena": "ERI1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 7,
    "estado": true
  },
  {
    "id": 15,
    "nombre": "Local EXPLORER SCALA (ESC1)",
    "correo": "esc1@marathonsports.com",
    "usuario": "ESC1_2026",
    "contrasena": "ESC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 8,
    "estado": true
  },
  {
    "id": 16,
    "nombre": "Local MARATHON JARDIN (MJA1)",
    "correo": "mja1@marathonsports.com",
    "usuario": "MJA1_2026",
    "contrasena": "MJA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 9,
    "estado": true
  },
  {
    "id": 17,
    "nombre": "Local MARATHON MALL DEL ALTO (MMA1)",
    "correo": "mma1@marathonsports.com",
    "usuario": "MMA1_2026",
    "contrasena": "MMA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 10,
    "estado": true
  },
  {
    "id": 18,
    "nombre": "Local MARATHON MALL DEL RIO (MCU1)",
    "correo": "mcu1@marathonsports.com",
    "usuario": "MCU1_2026",
    "contrasena": "MCU1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 11,
    "estado": true
  },
  {
    "id": 19,
    "nombre": "Local MARATHON QUICENTRO SUR (MQS1)",
    "correo": "mqs1@marathonsports.com",
    "usuario": "MQS1_2026",
    "contrasena": "MQS1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 12,
    "estado": true
  },
  {
    "id": 20,
    "nombre": "Local MARATHON RIOBAMBA (MRI1)",
    "correo": "mri1@marathonsports.com",
    "usuario": "MRI1_2026",
    "contrasena": "MRI1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 13,
    "estado": true
  },
  {
    "id": 21,
    "nombre": "Local MARATHON SCALA (MSC1)",
    "correo": "msc1@marathonsports.com",
    "usuario": "MSC1_2026",
    "contrasena": "MSC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 14,
    "estado": true
  },
  {
    "id": 22,
    "nombre": "Local OUTLET BATAN (OBT1)",
    "correo": "obt1@marathonsports.com",
    "usuario": "OBT1_2026",
    "contrasena": "OBT1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 15,
    "estado": true
  },
  {
    "id": 23,
    "nombre": "Local OUTLET GUARANDA (OGU1)",
    "correo": "ogu1@marathonsports.com",
    "usuario": "OGU1_2026",
    "contrasena": "OGU1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 16,
    "estado": true
  },
  {
    "id": 24,
    "nombre": "Local OUTLET MONAY (OMO1)",
    "correo": "omo1@marathonsports.com",
    "usuario": "OMO1_2026",
    "contrasena": "OMO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 17,
    "estado": true
  },
  {
    "id": 25,
    "nombre": "Local TAF JARDIN (FJA1)",
    "correo": "fja1@marathonsports.com",
    "usuario": "FJA1_2026",
    "contrasena": "FJA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 18,
    "estado": true
  },
  {
    "id": 26,
    "nombre": "Local TAF QUICENTRO SUR (FQS1)",
    "correo": "fqs1@marathonsports.com",
    "usuario": "FQS1_2026",
    "contrasena": "FQS1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 19,
    "estado": true
  },
  {
    "id": 27,
    "nombre": "Local TELESHOP JARDIN (TJA1)",
    "correo": "tja1@marathonsports.com",
    "usuario": "TJA1_2026",
    "contrasena": "TJA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 20,
    "estado": true
  },
  {
    "id": 28,
    "nombre": "Local TELESHOP QUICENTRO SUR (TQS1)",
    "correo": "tqs1@marathonsports.com",
    "usuario": "TQS1_2026",
    "contrasena": "TQS1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 21,
    "estado": true
  },
  {
    "id": 29,
    "nombre": "Local TELESHOP RIOBAMBA (TRI1)",
    "correo": "tri1@marathonsports.com",
    "usuario": "TRI1_2026",
    "contrasena": "TRI1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 22,
    "estado": true
  },
  {
    "id": 30,
    "nombre": "Local BODEGA SANGOLQUI (BSA1)",
    "correo": "bsa1@marathonsports.com",
    "usuario": "BSA1_2026",
    "contrasena": "BSA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 23,
    "estado": true
  },
  {
    "id": 31,
    "nombre": "Local BODEGA VALLE (BVA1)",
    "correo": "bva1@marathonsports.com",
    "usuario": "BVA1_2026",
    "contrasena": "BVA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 24,
    "estado": true
  },
  {
    "id": 32,
    "nombre": "Local EXPLORER BOSQUE (EBO1)",
    "correo": "ebo1@marathonsports.com",
    "usuario": "EBO1_2026",
    "contrasena": "EBO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 25,
    "estado": true
  },
  {
    "id": 33,
    "nombre": "Local EXPLORER CONDADO (ECO1)",
    "correo": "eco1@marathonsports.com",
    "usuario": "ECO1_2026",
    "contrasena": "ECO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 26,
    "estado": true
  },
  {
    "id": 34,
    "nombre": "Local EXPLORER LATACUNGA (ELT1)",
    "correo": "elt1@marathonsports.com",
    "usuario": "ELT1_2026",
    "contrasena": "ELT1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 27,
    "estado": true
  },
  {
    "id": 35,
    "nombre": "Local EXPLORER SAN LUIS (ESL1)",
    "correo": "esl1@marathonsports.com",
    "usuario": "ESL1_2026",
    "contrasena": "ESL1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 28,
    "estado": true
  },
  {
    "id": 36,
    "nombre": "Local MARATHON BOSQUE (MBO1)",
    "correo": "mbo1@marathonsports.com",
    "usuario": "MBO1_2026",
    "contrasena": "MBO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 29,
    "estado": true
  },
  {
    "id": 37,
    "nombre": "Local MARATHON CONDADO (MCO1)",
    "correo": "mco1@marathonsports.com",
    "usuario": "MCO1_2026",
    "contrasena": "MCO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 30,
    "estado": true
  },
  {
    "id": 38,
    "nombre": "Local MARATHON LATACUNGA (MLT1)",
    "correo": "mlt1@marathonsports.com",
    "usuario": "MLT1_2026",
    "contrasena": "MLT1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 31,
    "estado": true
  },
  {
    "id": 39,
    "nombre": "Local MARATHON SAN LUIS (MSL1)",
    "correo": "msl1@marathonsports.com",
    "usuario": "MSL1_2026",
    "contrasena": "MSL1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 32,
    "estado": true
  },
  {
    "id": 40,
    "nombre": "Local OUTLET DAPSILIA (ODP1)",
    "correo": "odp1@marathonsports.com",
    "usuario": "ODP1_2026",
    "contrasena": "ODP1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 33,
    "estado": true
  },
  {
    "id": 41,
    "nombre": "Local OUTLET POMASQUI (OPO1)",
    "correo": "opo1@marathonsports.com",
    "usuario": "OPO1_2026",
    "contrasena": "OPO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 34,
    "estado": true
  },
  {
    "id": 42,
    "nombre": "Local OUTLET VIVE PLAZA (OVP1)",
    "correo": "ovp1@marathonsports.com",
    "usuario": "OVP1_2026",
    "contrasena": "OVP1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 35,
    "estado": true
  },
  {
    "id": 43,
    "nombre": "Local PUMA CONDADO (PCO1)",
    "correo": "pco1@marathonsports.com",
    "usuario": "PCO1_2026",
    "contrasena": "PCO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 36,
    "estado": true
  },
  {
    "id": 44,
    "nombre": "Local TAF BOSQUE (FBO1)",
    "correo": "fbo1@marathonsports.com",
    "usuario": "FBO1_2026",
    "contrasena": "FBO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 37,
    "estado": true
  },
  {
    "id": 45,
    "nombre": "Local TAF CONDADO (FCO1)",
    "correo": "fco1@marathonsports.com",
    "usuario": "FCO1_2026",
    "contrasena": "FCO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 38,
    "estado": true
  },
  {
    "id": 46,
    "nombre": "Local TELESHOP LATACUNGA (TLT1)",
    "correo": "tlt1@marathonsports.com",
    "usuario": "TLT1_2026",
    "contrasena": "TLT1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 39,
    "estado": true
  },
  {
    "id": 47,
    "nombre": "Local TELESHOP SAN LUIS (TSL1)",
    "correo": "tsl1@marathonsports.com",
    "usuario": "TSL1_2026",
    "contrasena": "TSL1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 40,
    "estado": true
  },
  {
    "id": 48,
    "nombre": "Local BODEGA LOJA (BLJ1)",
    "correo": "blj1@marathonsports.com",
    "usuario": "BLJ1_2026",
    "contrasena": "BLJ1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 41,
    "estado": true
  },
  {
    "id": 49,
    "nombre": "Local BODEGA SAN AGUSTIN (BSG1)",
    "correo": "bsg1@marathonsports.com",
    "usuario": "BSG1_2026",
    "contrasena": "BSG1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 42,
    "estado": true
  },
  {
    "id": 50,
    "nombre": "Local BODEGA VENTURA (BVE1)",
    "correo": "bve1@marathonsports.com",
    "usuario": "BVE1_2026",
    "contrasena": "BVE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 43,
    "estado": true
  },
  {
    "id": 51,
    "nombre": "Local CIKLA QUICENTRO NORTE (CQN1)",
    "correo": "cqn1@marathonsports.com",
    "usuario": "CQN1_2026",
    "contrasena": "CQN1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 44,
    "estado": true
  },
  {
    "id": 52,
    "nombre": "Local EXPLORER LAGUNA MALL (ELG1)",
    "correo": "elg1@marathonsports.com",
    "usuario": "ELG1_2026",
    "contrasena": "ELG1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 45,
    "estado": true
  },
  {
    "id": 53,
    "nombre": "Local EXPLORER LOJA (ELJ1)",
    "correo": "elj1@marathonsports.com",
    "usuario": "ELJ1_2026",
    "contrasena": "ELJ1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 46,
    "estado": true
  },
  {
    "id": 54,
    "nombre": "Local EXPLORER QUICENTRO NORTE (EQN1)",
    "correo": "eqn1@marathonsports.com",
    "usuario": "EQN1_2026",
    "contrasena": "EQN1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 47,
    "estado": true
  },
  {
    "id": 55,
    "nombre": "Local EXPLORER VENTURA (EVE1)",
    "correo": "eve1@marathonsports.com",
    "usuario": "EVE1_2026",
    "contrasena": "EVE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 48,
    "estado": true
  },
  {
    "id": 56,
    "nombre": "Local MARATHON CCI (MCC1)",
    "correo": "mcc1@marathonsports.com",
    "usuario": "MCC1_2026",
    "contrasena": "MCC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 49,
    "estado": true
  },
  {
    "id": 57,
    "nombre": "Local MARATHON LA PLAZA (MIB1)",
    "correo": "mib1@marathonsports.com",
    "usuario": "MIB1_2026",
    "contrasena": "MIB1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 50,
    "estado": true
  },
  {
    "id": 58,
    "nombre": "Local MARATHON LAGUNA (MLG1)",
    "correo": "mlg1@marathonsports.com",
    "usuario": "MLG1_2026",
    "contrasena": "MLG1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 51,
    "estado": true
  },
  {
    "id": 59,
    "nombre": "Local MARATHON LOJA (MLJ1)",
    "correo": "mlj1@marathonsports.com",
    "usuario": "MLJ1_2026",
    "contrasena": "MLJ1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 52,
    "estado": true
  },
  {
    "id": 60,
    "nombre": "Local MARATHON QUICENTRO NORTE (MQN1)",
    "correo": "mqn1@marathonsports.com",
    "usuario": "MQN1_2026",
    "contrasena": "MQN1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 53,
    "estado": true
  },
  {
    "id": 61,
    "nombre": "Local OUTLET CAYAMBE (OCA1)",
    "correo": "oca1@marathonsports.com",
    "usuario": "OCA1_2026",
    "contrasena": "OCA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 54,
    "estado": true
  },
  {
    "id": 62,
    "nombre": "Local OUTLET TULCAN (OTU1)",
    "correo": "otu1@marathonsports.com",
    "usuario": "OTU1_2026",
    "contrasena": "OTU1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 55,
    "estado": true
  },
  {
    "id": 63,
    "nombre": "Local PUMA QUICENTRO NORTE (PQN1)",
    "correo": "pqn1@marathonsports.com",
    "usuario": "PQN1_2026",
    "contrasena": "PQN1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 56,
    "estado": true
  },
  {
    "id": 64,
    "nombre": "Local TAF SCALA (FSC1)",
    "correo": "fsc1@marathonsports.com",
    "usuario": "FSC1_2026",
    "contrasena": "FSC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 57,
    "estado": true
  },
  {
    "id": 65,
    "nombre": "Local UNDER ARMOUR QUICENTRO (UQN1)",
    "correo": "uqn1@marathonsports.com",
    "usuario": "UQN1_2026",
    "contrasena": "UQN1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 58,
    "estado": true
  },
  {
    "id": 66,
    "nombre": "Local BODEGA AMBATO (BAM1)",
    "correo": "bam1@marathonsports.com",
    "usuario": "BAM1_2026",
    "contrasena": "BAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 59,
    "estado": true
  },
  {
    "id": 67,
    "nombre": "Local BODEGA RECREO (BRE1)",
    "correo": "bre1@marathonsports.com",
    "usuario": "BRE1_2026",
    "contrasena": "BRE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 60,
    "estado": true
  },
  {
    "id": 68,
    "nombre": "Local BODEGA SOLANDA (BSO1)",
    "correo": "bso1@marathonsports.com",
    "usuario": "BSO1_2026",
    "contrasena": "BSO1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 61,
    "estado": true
  },
  {
    "id": 69,
    "nombre": "Local CIKLA AMBATO (CAM1)",
    "correo": "cam1@marathonsports.com",
    "usuario": "CAM1_2026",
    "contrasena": "CAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 62,
    "estado": true
  },
  {
    "id": 70,
    "nombre": "Local CIKLA RIOCENTRO (CRC1)",
    "correo": "crc1@marathonsports.com",
    "usuario": "CRC1_2026",
    "contrasena": "CRC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 63,
    "estado": true
  },
  {
    "id": 71,
    "nombre": "Local EXPLORER AMBATO (EAM1)",
    "correo": "eam1@marathonsports.com",
    "usuario": "EAM1_2026",
    "contrasena": "EAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 64,
    "estado": true
  },
  {
    "id": 72,
    "nombre": "Local EXPLORER PORTAL (ECP1)",
    "correo": "ecp1@marathonsports.com",
    "usuario": "ECP1_2026",
    "contrasena": "ECP1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 65,
    "estado": true
  },
  {
    "id": 73,
    "nombre": "Local EXPLORER RECREO (ERE1)",
    "correo": "ere1@marathonsports.com",
    "usuario": "ERE1_2026",
    "contrasena": "ERE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 66,
    "estado": true
  },
  {
    "id": 74,
    "nombre": "Local EXPLORER RIOCENTRO (ERC1)",
    "correo": "erc1@marathonsports.com",
    "usuario": "ERC1_2026",
    "contrasena": "ERC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 67,
    "estado": true
  },
  {
    "id": 75,
    "nombre": "Local MARATHON AMBATO (MAM1)",
    "correo": "mam1@marathonsports.com",
    "usuario": "MAM1_2026",
    "contrasena": "MAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 68,
    "estado": true
  },
  {
    "id": 76,
    "nombre": "Local MARATHON PASEO AMBATO (MAB1)",
    "correo": "mab1@marathonsports.com",
    "usuario": "MAB1_2026",
    "contrasena": "MAB1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 69,
    "estado": true
  },
  {
    "id": 77,
    "nombre": "Local MARATHON PORTAL (MCP1)",
    "correo": "mcp1@marathonsports.com",
    "usuario": "MCP1_2026",
    "contrasena": "MCP1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 70,
    "estado": true
  },
  {
    "id": 78,
    "nombre": "Local MARATHON RECREO (MRE1)",
    "correo": "mre1@marathonsports.com",
    "usuario": "MRE1_2026",
    "contrasena": "MRE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 71,
    "estado": true
  },
  {
    "id": 79,
    "nombre": "Local MARATHON SAN FRANCISCO (MSF1)",
    "correo": "msf1@marathonsports.com",
    "usuario": "MSF1_2026",
    "contrasena": "MSF1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 72,
    "estado": true
  },
  {
    "id": 80,
    "nombre": "Local OUTLET GASPAR (OGA1)",
    "correo": "oga1@marathonsports.com",
    "usuario": "OGA1_2026",
    "contrasena": "OGA1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 73,
    "estado": true
  },
  {
    "id": 81,
    "nombre": "Local OUTLET GRANADOS (OGR1)",
    "correo": "ogr1@marathonsports.com",
    "usuario": "OGR1_2026",
    "contrasena": "OGR1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 74,
    "estado": true
  },
  {
    "id": 82,
    "nombre": "Local PUMA PLAZA DE LAS AMERICAS (PAM1)",
    "correo": "pam1@marathonsports.com",
    "usuario": "PAM1_2026",
    "contrasena": "PAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 75,
    "estado": true
  },
  {
    "id": 83,
    "nombre": "Local TAF PORTAL (FCP1)",
    "correo": "fcp1@marathonsports.com",
    "usuario": "FCP1_2026",
    "contrasena": "FCP1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 76,
    "estado": true
  },
  {
    "id": 84,
    "nombre": "Local TAF RIOCENTRO (FRC1)",
    "correo": "frc1@marathonsports.com",
    "usuario": "FRC1_2026",
    "contrasena": "FRC1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 77,
    "estado": true
  },
  {
    "id": 85,
    "nombre": "Local TELESHOP AMBATO (TAM1)",
    "correo": "tam1@marathonsports.com",
    "usuario": "TAM1_2026",
    "contrasena": "TAM1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 78,
    "estado": true
  },
  {
    "id": 86,
    "nombre": "Local TELESHOP RECREO (TRE1)",
    "correo": "tre1@marathonsports.com",
    "usuario": "TRE1_2026",
    "contrasena": "TRE1*2026*",
    "rol": "jefe_tienda",
    "tiendaId": 79,
    "estado": true
  }
];

// const MOCK_EV_FINAL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%2310b981'/><text x='50%' y='50%' font-size='18' fill='%23ffffff' font-family='sans-serif' text-anchor='middle' font-weight='bold'>✅ RESOLUCIÓN: TRABAJO COMPLETADO</text></svg>";

// const DEFAULT_CASES: Case[] = [];

// const DEFAULT_NOTIFICATIONS: AppNotification[] = [];

export default function App() {
  useEffect(() => {
    try {
      if (typeof (window as any).Capacitor !== 'undefined') {
        LocalNotifications.createChannel({
          id: 'mainttrac_alerts',
          name: 'Alertas MaintTrac',
          description: 'Notificaciones instantaneas de casos y mantenimientos',
          importance: 5,
          visibility: 1,
          vibration: true
        }).catch(() => {});
        LocalNotifications.requestPermissions().catch(() => {});
      }
    } catch (e) {}
  }, []);
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // Auto-inicializar permisos y canal de notificaciones nativas en Android al abrir la app
  useEffect(() => {
    const initNotifications = async () => {
      try {
        if (typeof (window as any).Capacitor !== 'undefined') {
          // Crear canal de alta prioridad para Android (sonido + emergente)
          await LocalNotifications.createChannel({
            id: 'mainttrac_alerts',
            name: 'Alertas MaintTrac',
            description: 'Notificaciones instantáneas de casos y mantenimientos en segundo plano',
            importance: 5, // MAX importance
            visibility: 1, // Pantalla de bloqueo
            vibration: true,
            sound: 'default'
          }).catch(() => {});

          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        }
      } catch (err) {
        console.log("Error inicializando notificaciones nativas:", err);
      }
    };
    initNotifications();
  }, []);

  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('maint_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Guardar datos del usuario para el servicio nativo de Android
  useEffect(() => {
    if (currentUser) {
      try {
        localStorage.setItem('mainttrac_user_info', JSON.stringify({
          nombre: currentUser.nombre,
          rol: currentUser.rol,
          tiendaId: currentUser.tiendaId || ''
        }));
      } catch (e) {}
    }
  }, [currentUser]);

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('maint_stores');
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('maint_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [cases, setCases] = useState<Case[]>([]);
  // Limpiar llaves pesadas antiguas para evitar QuotaExceededError en navegadores
  useEffect(() => {
    try {
      localStorage.removeItem('maint_cases');
      localStorage.removeItem('maint_users');
      localStorage.removeItem('maint_notifs');
    } catch (e) {}
  }, []);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [readNotifIds, setReadNotifIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('maint_read_notif_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try { localStorage.setItem('maint_read_notif_ids', JSON.stringify(readNotifIds)); } catch (e) {}
  }, [readNotifIds]);

  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [techAvailability, setTechAvailability] = useState<TechAvailability[]>(DEFAULT_TECH_AVAILABILITY as any);
  const [shiftSchedule] = useState<ShiftEntry[]>(DEFAULT_SHIFT_SCHEDULE);
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileSidebarOpen]);
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [techCaseCategory, setTechCaseCategory] = useState('');
  const [techCaseDesc, setTechCaseDesc] = useState('');
  const [techCaseStoreId, setTechCaseStoreId] = useState<number>(0);
  const [techStatus, setTechStatus] = useState<'Trabajando en tienda' | 'En stand by'>('Trabajando en tienda');
  const [solveEvidenceFiles, setSolveEvidenceFiles] = useState<string[]>([]);

  const handleSolveEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (solveEvidenceFiles.length + filesArray.length > 10) {
        alert("Puedes subir un máximo de 10 fotos.");
        return;
      }
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSolveEvidenceFiles(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const loadSheetJS = (): Promise<any> => {
    return new Promise((resolve) => {
      if ((window as any).XLSX) return resolve((window as any).XLSX);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => resolve((window as any).XLSX);
      document.head.appendChild(script);
    });
  };

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'tecnicos_actividad' | 'historial_asistencias' | 'agenda_turnos' | 'disponibilidad'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'en_proceso' | 'completado' | 'pausado_material'>('todos');
  const [storeFilter, setStoreFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Notification panel toggle
  
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Modals
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [showNewTechCaseModal, setShowNewTechCaseModal] = useState(false);
  const [showTakeCaseModal, setShowTakeCaseModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCaseId, setScheduleCaseId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [scheduleShift, setScheduleShift] = useState<string>('Mañana (08:00 AM - 12:00 PM)');
  const [scheduleAssignedTechId, setScheduleAssignedTechId] = useState<number | ''>('');
  const [scheduleHours, setScheduleHours] = useState<number>(2);
  const [newIsScheduled, setNewIsScheduled] = useState<boolean>(false);
  const [newScheduleDate, setNewScheduleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newScheduleShift, setNewScheduleShift] = useState<string>('Mañana (08:00 AM - 12:00 PM)');
  const [newScheduleHours, setNewScheduleHours] = useState<number>(2);
  const [newScheduleAssignedTechId, setNewScheduleAssignedTechId] = useState<number | ''>('');
  const [newCaseDamagePhotos, setNewCaseDamagePhotos] = useState<string[]>([]);
  const [newRequestPreMaterial, setNewRequestPreMaterial] = useState<boolean>(false);
  const [newPreMaterialName, setNewPreMaterialName] = useState<string>('');
  const [newPreMaterialQty, setNewPreMaterialQty] = useState<number>(1);

  const handleOpenScheduleModal = (c: Case) => {
    setScheduleCaseId(c.id);
    setScheduleDate(c.fecha_programada || new Date().toISOString().split('T')[0]);
    setScheduleShift(c.turno_programado || 'Mañana (08:00 AM - 12:00 PM)');
    setScheduleAssignedTechId(c.tecnicoAsignadoId || '');
    setScheduleHours(c.horas_estimadas || 2);
    setShowScheduleModal(true);
  };
  const [showPauseMaterialModal, setShowPauseMaterialModal] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState('');
  const [materialCatalog] = useState<MaterialCatalogItem[]>(DEFAULT_MATERIAL_CATALOG);
  const [materialInputMode, setMaterialInputMode] = useState<'catalogo' | 'libre'>('catalogo');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<number>(1);
  const [materialQuantity, setMaterialQuantity] = useState<number>(1);
  const [materialCustomNote, setMaterialCustomNote] = useState<string>('');
  const [techActivityStoreFilter, setTechActivityStoreFilter] = useState<number | 'todas'>('todas');
  const [techActivityTechFilter, setTechActivityTechFilter] = useState<number | 'todos'>('todos');
  const [takeCaseMode, setTakeCaseMode] = useState<'solo' | 'equipo'>('solo');
  const [takeCaseSupportTech, setTakeCaseSupportTech] = useState('');
  const [showFacturacionModal, setShowFacturacionModal] = useState(false);
  const [facturacionRuc, setFacturacionRuc] = useState('');
  const [facturacionRazonSocial, setFacturacionRazonSocial] = useState('');
  const [facturacionDireccion, setFacturacionDireccion] = useState('');
  const [facturacionTelefono, setFacturacionTelefono] = useState('');
  const [facturacionEmail, setFacturacionEmail] = useState('');
  const [facturacionMonto, setFacturacionMonto] = useState('');
  const [facturacionConcepto, setFacturacionConcepto] = useState('');
  const [facturacionCasoId, setFacturacionCasoId] = useState<number | null>(null);
  const [facturacionProfileMode, setFacturacionProfileMode] = useState<'default_supervisor' | 'custom_material'>('default_supervisor');
  const [billingProfiles, setBillingProfiles] = useState<Record<string, { ruc: string; razonSocial: string; direccion: string; email: string; telefono: string }>>(() => {
    try {
      const saved = localStorage.getItem('maint_billing_profiles');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "Luis Vallejos": { ruc: "1790012345001", razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN QUITO / SIERRA)", direccion: "Av. 6 de Diciembre y Gaspar de Villarroel, Quito", email: "facturacion.lvallejos@marathon.com.ec", telefono: "(02) 298-3000" },
      "Julio Tubón": { ruc: "1790012345002", razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN GUAYAQUIL / COSTA)", direccion: "Av. Juan Tanca Marengo y Av. Constitución, Guayaquil", email: "facturacion.jtubon@marathon.com.ec", telefono: "(04) 268-4000" },
      "Vicky Montiel": { ruc: "1790012345003", razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN AMBATO / CENTRO)", direccion: "Av. Cevallos y Lalama, Ambato", email: "facturacion.vmontiel@marathon.com.ec", telefono: "(03) 282-1000" }
    };
  });

  const [selectedAssignTechId, setSelectedAssignTechId] = useState<number | null>(null);



  // Form states
  const [rememberMe, setRememberMe] = useState(true);
  const [loginUser, setLoginUser] = useState(() => {
    try { return localStorage.getItem('maint_saved_user') || ''; } catch (e) { return ''; }
  });
  const [loginPass, setLoginPass] = useState(() => {
    try { return localStorage.getItem('maint_saved_pass') || ''; } catch (e) { return ''; }
  });
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Modal para Cambio de Contraseña de Supervisores / Usuarios
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isFirstLoginChange, setIsFirstLoginChange] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Auto-Sanear Hora de Salida en Casos Concluidos / Cerrados
  useEffect(() => {
    setCases(prev => prev.map(c => {
      const isDone = c.estado === 'concluido' || c.estado === 'cerrado';
      if (isDone && !c.hora_salida) {
        return { ...c, hora_salida: c.fechaCierre || c.fechaCreacion || new Date().toISOString() };
      }
      return c;
    }));
  }, []);

  // Seguridad: Garantizar que NUNCA aparezca el modal de cambiar contraseña a Técnicos o Jefes de Tienda
  useEffect(() => {
    if (currentUser && currentUser.rol !== 'supervisor' && currentUser.rol !== 'administrador') {
      setShowChangePasswordModal(false);
    }
  }, [currentUser]);

  // Safe Storage Handling (Sin sobrecargar cuota de 5MB)
  useEffect(() => {
    try {
      localStorage.setItem('maint_read_notif_ids', JSON.stringify(readNotifIds));
    } catch (e) {}
  }, [readNotifIds]);

  useEffect(() => {
    try {
      if (currentUser && typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}
  }, [currentUser]);


  // MOTOR DE SINCRONIZACIÓN ULTRA-RÁPIDO (Poller cada 2.5s para notificaciones estilo WhatsApp)
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return;

    let lastMaxCaseId = 0;
    let lastMaxNotifId = 0;

    const pollSync = async () => {
      try {
        // 1. Polling de nuevos casos
        const { data: latestCases } = await supabase
          .from('casos')
          .select('*')
          .order('id', { ascending: false })
          .limit(5);

        if (latestCases && latestCases.length > 0) {
          const topId = latestCases[0].id;
          if (lastMaxCaseId > 0 && topId > lastMaxCaseId) {
            const newC = latestCases[0];
            const storeObj = stores.find(s => s.id === newC.tienda_id);
            const stName = storeObj ? storeObj.nombre : `Tienda #${newC.tienda_id}`;
            
            let shouldNotify = false;
            if (currentUser.rol === 'administrador' || currentUser.rol === 'tecnico') {
              shouldNotify = true;
            } else if (currentUser.rol === 'supervisor') {
              shouldNotify = !currentUser.supervisorTiendas || currentUser.supervisorTiendas.includes(newC.tienda_id);
            } else if (currentUser.tiendaId === newC.tienda_id) {
              shouldNotify = true;
            }

            if (shouldNotify) {
              playMaintSound();
              triggerNativeNotification(
                '⚡ NUEVO CASO INSTANTÁNEO',
                `Caso #${newC.id} en ${stName}: ${newC.categoria}`
              );
            }
          }
          lastMaxCaseId = topId;

          // ACTUALIZACIÓN EN TIEMPO REAL DEL ESTADO REACT DE CASOS EN PANTALLA
          setCases(prev => {
            let hasNewOrUpdated = false;
            const existingMap = new Map(prev.map(c => [c.id, c]));

            latestCases.forEach((dbC: any) => {
              const formatted: Case = {
                id: dbC.id,
                tiendaId: dbC.tienda_id,
                creadoPor: dbC.creado_por,
                categoria: dbC.categoria,
                descripcion: dbC.descripcion,
                prioridad: dbC.prioridad_nivel,
                estado: dbC.estado,
                tecnicoAsignadoId: dbC.tecnico_asignado_id || undefined,
                fechaCreacion: dbC.fecha_creacion,
                fechaLimiteSla: dbC.fecha_limite_sla,
                tecnico_presencial_nombre: dbC.tecnico_presencial_nombre || undefined,
                hora_entrada: dbC.hora_entrada || undefined,
                hora_salida: dbC.hora_salida || undefined,
                es_caso_tecnico: dbC.es_caso_tecnico || false,
                tecnico_estatus_trabajo: dbC.tecnico_estatus_trabajo || undefined,
                reaperturas_count: dbC.reaperturas_count || 0,
                evidencias: existingMap.get(dbC.id)?.evidencias || [],
                comentarios: existingMap.get(dbC.id)?.comentarios || [],
                historial: existingMap.get(dbC.id)?.historial || []
              };

              if (!existingMap.has(dbC.id)) {
                existingMap.set(dbC.id, formatted);
                hasNewOrUpdated = true;
              } else {
                const oldC = existingMap.get(dbC.id)!;
                if (oldC.estado !== dbC.estado || oldC.tecnico_estatus_trabajo !== dbC.tecnico_estatus_trabajo || oldC.tecnicoAsignadoId !== dbC.tecnico_asignado_id) {
                  existingMap.set(dbC.id, { ...oldC, ...formatted, evidencias: oldC.evidencias, comentarios: oldC.comentarios, historial: oldC.historial });
                  hasNewOrUpdated = true;
                }
              }
            });

            if (!hasNewOrUpdated) return prev;
            return Array.from(existingMap.values()).sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
          });
        }

        // 2. Polling de nuevas notificaciones
        const { data: latestNotifs } = await supabase
          .from('notificaciones')
          .select('*')
          .order('id', { ascending: false })
          .limit(5);

        if (latestNotifs && latestNotifs.length > 0) {
          const topNotifId = latestNotifs[0].id;
          if (lastMaxNotifId > 0 && topNotifId > lastMaxNotifId) {
            const notifRow = latestNotifs[0];
            let shouldNotifyNotif = false;
            if (currentUser.rol === 'administrador' || currentUser.rol === 'tecnico') {
              shouldNotifyNotif = true;
            } else if (currentUser.rol === 'supervisor') {
              shouldNotifyNotif = !notifRow.tienda_id || Boolean(currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(notifRow.tienda_id));
            } else if (currentUser.tiendaId === notifRow.tienda_id) {
              shouldNotifyNotif = true;
            }

            if (shouldNotifyNotif) {
              playMaintSound();
              triggerNativeNotification('🔔 Notificación de Caso', notifRow.mensaje);
            }
          }
          lastMaxNotifId = topNotifId;
        }
      } catch (err) {
        console.log("Error en sincronizacion rapida:", err);
      }
    };

    pollSync();
    const intervalId = setInterval(pollSync, 2500);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Apply Theme class to document body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    localStorage.setItem('theme', nextVal ? 'dark' : 'light');
  };

  const isSupabaseConfigured = 
    !!import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://tu-proyecto.supabase.co';

  // ==========================================
  // REALTIME NOTIFICATION SYSTEM
  // ==========================================
  
  const [maintToast, setMaintToast] = useState<{ mostrar: boolean; titulo: string; mensaje: string; tipo: 'success' | 'info' | 'warning' }>({
    mostrar: false,
    titulo: '',
    mensaje: '',
    tipo: 'info'
  });

  const playMaintSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("No se pudo reproducir el sonido:", e);
    }
  };

  useEffect(() => {
    if (maintToast.mostrar) {
      const timer = setTimeout(() => {
        setMaintToast(prev => ({ ...prev, mostrar: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [maintToast.mostrar]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) return;

    // 1. Escuchar la tabla 'casos'
    const channelCasos = supabase
      .channel('realtime-casos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casos' },
        async (payload: any) => {
          console.log("Cambio en casos en tiempo real:", payload);
          if (payload.eventType === 'INSERT') {
            const nuevoCaso = payload.new;
            triggerNativeNotification('🚨 Caso Registrado', `Caso #${nuevoCaso.id}: ${nuevoCaso.categoria || 'Mantenimiento'}`);
            
            setCases(prev => {
              if (prev.some(c => c.id === nuevoCaso.id)) return prev;
              
              const createdCase: Case = {
                id: nuevoCaso.id,
                tiendaId: nuevoCaso.tienda_id,
                creadoPor: nuevoCaso.creado_por,
                categoria: nuevoCaso.categoria,
                descripcion: nuevoCaso.descripcion,
                prioridad: nuevoCaso.prioridad_nivel,
                estado: nuevoCaso.estado,
                tecnicoAsignadoId: nuevoCaso.tecnico_asignado_id || undefined,
                fechaCreacion: nuevoCaso.fecha_creacion,
                fechaLimiteSla: nuevoCaso.fecha_limite_sla,
                // Nuevos campos
                tecnico_presencial_nombre: nuevoCaso.tecnico_presencial_nombre || undefined,
                hora_entrada: nuevoCaso.hora_entrada || undefined,
                hora_salida: nuevoCaso.hora_salida || undefined,
                es_caso_tecnico: nuevoCaso.es_caso_tecnico || false,
                tecnico_estatus_trabajo: nuevoCaso.tecnico_estatus_trabajo || undefined,
                reaperturas_count: nuevoCaso.reaperturas_count || 0,
                evidencias: [],
                comentarios: [],
                historial: []
              };

              return [createdCase, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const modCaso = payload.new;
            setCases(prev => prev.map(c => {
              if (c.id === modCaso.id) {
                return {
                  ...c,
                  estado: modCaso.estado,
                  tecnicoAsignadoId: modCaso.tecnico_asignado_id || undefined,
                  fechaCierre: modCaso.fecha_cierre || undefined,
                  // Nuevos campos
                  tecnico_presencial_nombre: modCaso.tecnico_presencial_nombre || undefined,
                  hora_entrada: modCaso.hora_entrada || undefined,
                  hora_salida: modCaso.hora_salida || undefined,
                  es_caso_tecnico: modCaso.es_caso_tecnico || false,
                  tecnico_estatus_trabajo: modCaso.tecnico_estatus_trabajo || undefined,
                  reaperturas_count: modCaso.reaperturas_count || 0
                };
              }
              return c;
            }));
          }
        }
      )
      .subscribe();

    // 2. Escuchar la tabla 'comentarios'
    const channelComentarios = supabase
      .channel('realtime-comentarios')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comentarios' },
        (payload: any) => {
          console.log("Comentario recibido en tiempo real:", payload);
          const newC = payload.new;
          setCases(prev => prev.map(c => {
            if (c.id === newC.caso_id) {
              const commentObj = {
                id: newC.id,
                autor: newC.autor,
                rol: newC.rol,
                texto: newC.texto,
                fecha: newC.fecha
              };
              const alreadyExists = c.comentarios.some(co => 
                co.id === commentObj.id || 
                (co.texto === commentObj.texto && co.autor === commentObj.autor)
              );
              if (alreadyExists) return c;
              return {
                ...c,
                comentarios: [...c.comentarios, commentObj]
              };
            }
            return c;
          }));
        }
      )
      .subscribe();

    // 3. Escuchar la tabla 'evidencias'
    const channelEvidencias = supabase
      .channel('realtime-evidencias')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evidencias' },
        (payload: any) => {
          console.log("Evidencia recibida en tiempo real:", payload);
          const newE = payload.new;
          setCases(prev => prev.map(c => {
            if (c.id === newE.caso_id) {
              const evObj = {
                id: newE.id,
                subidoPor: newE.subido_por,
                tipo: newE.tipo,
                archivoUrl: newE.archivo_url,
                nombreArchivo: newE.nombre_archivo,
                fecha: newE.fecha
              };
              if (c.evidencias.some(ev => ev.id === evObj.id)) return c;
              if (c.evidencias.some(ev => ev.archivoUrl === evObj.archivoUrl)) {
                return {
                  ...c,
                  evidencias: c.evidencias.map(ev => ev.archivoUrl === evObj.archivoUrl ? evObj : ev)
                };
              }
              return {
                ...c,
                evidencias: [...c.evidencias, evObj]
              };
            }
            return c;
          }));
        }
      )
      .subscribe();

    // 4. Escuchar la tabla 'notificaciones' para alertas y sonido
    const channelNotificaciones = supabase
      .channel('realtime-notificaciones')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload: any) => {
          console.log("Notificación recibida en tiempo real:", payload);
          const newN = payload.new;

          const notification: AppNotification = {
            id: newN.id,
            mensaje: newN.mensaje,
            fecha: newN.created_at || new Date().toISOString(),
            leida: false,
            tipo: newN.tipo,
            tiendaId: newN.tienda_id || undefined,
            prioridad: newN.prioridad || undefined,
            casoId: newN.caso_id || undefined,
            autorRol: newN.autor_rol || undefined,
            estadoNuevo: newN.estado_nuevo || undefined,
            usuarioId: newN.usuario_id || undefined
          };

          // Validar si pasa el filtro del usuario actual
          const passesFilter = (() => {
            if (!currentUser) return false;
            // Filtrar si es dirigida a otro usuario específico
            if (newN.usuario_id && newN.usuario_id !== currentUser.id) return false;

            if (currentUser.rol === 'tecnico') {
              return notification.tipo === 'nuevo_caso' || 
                     (notification.tipo === 'estado_cambio' && notification.estadoNuevo === 'pendiente') ||
                     (newN.usuario_id === currentUser.id);
            }
            if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
              if (notification.tiendaId !== currentUser.tiendaId) return false;
              if (notification.tipo === 'comentario') {
                return notification.autorRol === 'supervisor';
              }
              return notification.tipo === 'estado_cambio';
            }
            if (currentUser.rol === 'supervisor') {
              if (notification.tipo === 'nuevo_caso' || notification.tipo === 'comentario') return true;
              if (notification.tipo === 'estado_cambio') {
                return notification.estadoNuevo === 'en_proceso' || notification.estadoNuevo === 'concluido' || notification.estadoNuevo === 'cerrado';
              }
              return false;
            }
            return true;
          })();

          if (passesFilter) {
            setNotifications(prev => {
              if (prev.some(n => n.id === notification.id)) return prev;
              playMaintSound();
              triggerNativeNotification('🔔 MaintTrac Alerta', notification.mensaje);
              
              // Trigger OS/Browser level notification
              if ('Notification' in window && Notification.permission === 'granted') {
                const getNotificationTitle = () => {
                  if (notification.tipo === 'nuevo_caso') {
                    return notification.prioridad === 1 ? '🚨 ManteTiendas: Caso Crítico' : '🆕 ManteTiendas: Nuevo Caso';
                  }
                  if (notification.tipo === 'comentario') return '💬 ManteTiendas: Nuevo Comentario';
                  return '🔧 ManteTiendas: Caso Actualizado';
                };

                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(getNotificationTitle(), {
                    body: notification.mensaje,
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
                    vibrate: [200, 100, 200],
                    tag: `mante-notif-${notification.id}`,
                    data: {
                      url: '/'
                    }
                  } as any);
                }).catch(() => {
                  new Notification(getNotificationTitle(), {
                    body: notification.mensaje,
                    icon: '/favicon.svg'
                  });
                });
              }

              let toastType: 'info' | 'success' | 'warning' = 'info';
              if (notification.tipo === 'nuevo_caso' && notification.prioridad === 1) toastType = 'warning';
              else if (notification.tipo === 'estado_cambio' && notification.estadoNuevo === 'concluido') toastType = 'success';

              setMaintToast({
                mostrar: true,
                titulo: notification.tipo === 'nuevo_caso' ? '🚨 NUEVO CASO' : '🔧 CASO ACTUALIZADO',
                mensaje: notification.mensaje,
                tipo: toastType
              });

              return [notification, ...prev];
            });
          }
        }
      )
      .subscribe();

    // 5. Escuchar la tabla 'pedidos_materiales'
    const channelMateriales = supabase
      .channel('realtime-materiales')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos_materiales' },
        (payload: any) => {
          console.log("Cambio en pedidos de materiales en tiempo real:", payload);
          if (payload.eventType === 'INSERT') {
            const req = payload.new;
            const newReq: MaterialRequest = {
              id: req.id,
              casoId: req.caso_id,
              tecnicoId: req.tecnico_id,
              descripcion: req.descripcion,
              estado: req.estado,
              createdAt: req.created_at
            };
            setMaterialRequests(prev => {
              if (prev.some(r => r.id === newReq.id)) return prev;
              return [newReq, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const mod = payload.new;
            setMaterialRequests(prev => prev.map(r => r.id === mod.id ? { ...r, estado: mod.estado } : r));
          }
        }
      )
      .subscribe();

    // 6. Escuchar la tabla 'disponibilidad_tecnicos'
    const channelDisponibilidad = supabase
      .channel('realtime-disponibilidad')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disponibilidad_tecnicos' },
        (payload: any) => {
          console.log("Cambio en disponibilidad de técnicos en tiempo real:", payload);
          if (payload.eventType === 'INSERT') {
            const row = payload.new;
            const record: TechAvailability = {
              id: row.id,
              tecnicoNombre: row.tecnico_nombre,
              usuarioId: row.usuario_id || undefined,
              diasLibres: row.dias_libres || undefined,
              estatus: row.estatus
            };
            setTechAvailability(prev => {
              if (prev.some(t => t.id === record.id)) return prev;
              return [record, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new;
            setTechAvailability(prev => prev.map(t => t.id === row.id ? {
              ...t,
              tecnicoNombre: row.tecnico_nombre,
              usuarioId: row.usuario_id || undefined,
              diasLibres: row.dias_libres || undefined,
              estatus: row.estatus
            } : t));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelCasos);
      supabase.removeChannel(channelComentarios);
      supabase.removeChannel(channelEvidencias);
      supabase.removeChannel(channelNotificaciones);
      supabase.removeChannel(channelMateriales);
      supabase.removeChannel(channelDisponibilidad);
    };
  }, [isSupabaseConfigured, currentUser, stores]);

  useEffect(() => {
    try { localStorage.setItem('maint_stores', JSON.stringify(stores)); } catch (e) {}
  }, [stores]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function loadData() {
      try {
        const { data: dbStores, error: errStores } = await supabase.from('tiendas').select('*');
        if (!errStores && dbStores) {
          setStores(dbStores.map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            ciudad: s.ciudad,
            direccion: s.direccion
          })));
        }

        const { data: dbUsers, error: errUsers } = await supabase.from('usuarios').select('*');
        if (!errUsers && dbUsers) {
          setUsers(dbUsers.map((u: any) => ({
            id: u.id,
            nombre: u.nombre,
            correo: u.correo,
            usuario: u.usuario,
            contrasena: u.contrasena || undefined,
            rol: u.rol,
            tiendaId: u.tienda_id || undefined,
            supervisorTiendas: u.supervisor_tiendas || undefined,
            estado: u.estado,
            passwordCambiado: u.password_cambiado ?? false
          })));
        }

        const { data: dbCases, error: errCases } = await supabase.from('casos').select(`
          *,
          comentarios (*),
          evidencias (*)
        `);
        if (!errCases && dbCases) {
          setCases(dbCases.map((c: any) => ({
            id: c.id,
            tiendaId: c.tienda_id,
            creadoPor: c.creado_por,
            categoria: c.categoria,
            descripcion: c.descripcion,
            prioridad: c.prioridad_nivel,
            estado: c.estado,
            tecnicoAsignadoId: c.tecnico_asignado_id || undefined,
            fechaCreacion: c.fecha_creacion,
            fechaLimiteSla: c.fecha_limite_sla,
            fechaCierre: c.fecha_cierre || undefined,
            // Nuevos campos mapeados
            tecnico_presencial_nombre: c.tecnico_presencial_nombre || undefined,
            tecnico_apoyo_nombre: c.tecnico_apoyo_nombre || undefined,
            hora_entrada: c.hora_entrada || undefined,
            hora_salida: c.hora_salida || ((c.estado === 'concluido' || c.estado === 'cerrado') ? (c.fecha_cierre || c.fecha_creacion || new Date().toISOString()) : undefined),
            es_caso_tecnico: c.es_caso_tecnico || false,
            tecnico_estatus_trabajo: c.tecnico_estatus_trabajo || undefined,
            reaperturas_count: c.reaperturas_count || 0,
            pausado_por_material: c.pausado_por_material || false,
            motivo_pausa_material: c.motivo_pausa_material || undefined,
            fecha_pausa_material: c.fecha_pausa_material || undefined,
            materiales_llegaron_tienda: c.materiales_llegaron_tienda || false,
            fecha_llegada_materiales: c.fecha_llegada_materiales,
            fecha_programada: c.fecha_programada,
            turno_programado: c.turno_programado,
            agendado_por: c.agendado_por,
            horas_estimadas: c.horas_estimadas,
            solicitud_material_anticipada: c.solicitud_material_anticipada,
            material_anticipado_nombre: c.material_anticipado_nombre,
            material_anticipado_cantidad: c.material_anticipado_cantidad,
            material_anticipado_estado: c.material_anticipado_estado,
            material_anticipado_aprobado_por: c.material_anticipado_aprobado_por || undefined,
            evidencias: (c.evidencias || []).map((ev: any) => ({
              id: ev.id,
              subidoPor: ev.subido_por,
              tipo: ev.tipo,
              archivoUrl: ev.archivo_url,
              nombreArchivo: ev.nombre_archivo,
              fecha: ev.fecha
            })),
            comentarios: (c.comentarios || []).sort((x: any, y: any) => new Date(x.fecha).getTime() - new Date(y.fecha).getTime()).map((co: any) => ({
              id: co.id,
              autor: co.autor,
              rol: co.rol,
              texto: co.texto,
              fecha: co.fecha
            })),
            historial: []
          })));
        }

        const { data: dbNotifs, error: errNotifs } = await supabase
          .from('notificaciones')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!errNotifs && dbNotifs) {
          setNotifications(dbNotifs.map((n: any) => ({
            id: n.id,
            mensaje: n.mensaje,
            fecha: n.created_at,
            leida: false,
            tipo: n.tipo,
            tiendaId: n.tienda_id || undefined,
            prioridad: n.prioridad || undefined,
            casoId: n.caso_id || undefined,
            autorRol: n.autor_rol || undefined,
            estadoNuevo: n.estado_nuevo || undefined
          })));
        }

        // Cargar pedidos_materiales
        const { data: dbMats, error: errMats } = await supabase
          .from('pedidos_materiales')
          .select('*')
          .order('created_at', { ascending: false });
        if (!errMats && dbMats) {
          setMaterialRequests(dbMats.map((m: any) => ({
            id: m.id,
            casoId: m.caso_id,
            tecnicoId: m.tecnico_id,
            descripcion: m.descripcion,
            estado: m.estado,
            createdAt: m.created_at
          })));
        }

        // Cargar disponibilidad_tecnicos
        const { data: dbTechs, error: errTechs } = await supabase
          .from('disponibilidad_tecnicos')
          .select('*')
          .order('created_at', { ascending: false });
        if (!errTechs && dbTechs) {
          setTechAvailability(dbTechs.map((t: any) => ({
            id: t.id,
            tecnicoNombre: t.tecnico_nombre,
            usuarioId: t.usuario_id || undefined,
            diasLibres: t.dias_libres || undefined,
            estatus: t.estatus
          })));
        }

      } catch (e) {
        console.error("Error al cargar datos desde Supabase:", e);
      }
    }

    loadData();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [isSupabaseConfigured]);

  const handleLogout = () => {
    localStorage.removeItem('maint_user');
    setCurrentUser(null);
    setSelectedCaseId(null);
    setActiveTab('dashboard');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const matched = users.find(u => u.usuario.trim().toLowerCase() === loginUser.trim().toLowerCase());
    if (!matched) {
      setLoginError('Usuario incorrecto');
      return;
    }

    if (!matched.estado) {
      setLoginError('Usuario desactivado');
      return;
    }

    const trimmedInput = loginPass.trim();
    const storedPass = matched.contrasena ? matched.contrasena.trim() : '';
    const genericRolePass = (
      matched.rol === 'administrador' ? 'adm*2026*' :
      matched.rol === 'jefe_tienda' ? 'jefe*2026*' :
      matched.rol === 'supervisor' ? 'sup*2026*' : 'tec*2026*'
    );

    let isPassValid = false;

    // 1. Coincidencia exacta con la contraseña almacenada
    if (storedPass && trimmedInput === storedPass) {
      isPassValid = true;
    }
    // 2. Coincidencia sin distinguir mayúsculas/minúsculas con la contraseña almacenada
    else if (storedPass && trimmedInput.toLowerCase() === storedPass.toLowerCase()) {
      isPassValid = true;
    }
    // 3. Para usuarios que no han personalizado su contraseña aún: permitir también contraseñas genéricas por rol (ej. SUP*2026*, sup*2026*, SUP*LV*)
    else if (!matched.passwordCambiado) {
      const lowerInput = trimmedInput.toLowerCase();
      if (
        lowerInput === genericRolePass.toLowerCase() ||
        lowerInput === 'sup*2026*' ||
        lowerInput === 'adm*2026*' ||
        lowerInput === 'jefe*2026*' ||
        lowerInput === 'tec*2026*' ||
        (matched.usuario && lowerInput === `sup*${matched.usuario.replace('SUP_', '').toLowerCase()}*`)
      ) {
        isPassValid = true;
      }
    }

    if (!isPassValid) {
      setLoginError('Contraseña incorrecta');
      return;
    }

    localStorage.setItem('maint_user', JSON.stringify(matched));
    setCurrentUser(matched);

    // Auto-guardado de credenciales en este dispositivo
    try {
      if (rememberMe) {
        localStorage.setItem('maint_saved_user', matched.usuario);
        localStorage.setItem('maint_saved_pass', loginPass.trim());
      } else {
        localStorage.removeItem('maint_saved_user');
        localStorage.removeItem('maint_saved_pass');
      }
    } catch (e) {}

    // SOLAMENTE para Supervisores y Gerentes (administrador): solicitar cambio de contraseña en primer ingreso si no la han personalizado aún
    const isSupervisorOrGerente = matched.rol === 'supervisor' || matched.rol === 'administrador';
    if (isSupervisorOrGerente && !matched.passwordCambiado) {
      setIsFirstLoginChange(true);
      setShowChangePasswordModal(true);
    } else {
      setIsFirstLoginChange(false);
      setShowChangePasswordModal(false);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!currentUser) return;

    const expectedCurrent = currentUser.contrasena || (
      currentUser.rol === 'administrador' ? 'adm*2026*' :
      currentUser.rol === 'jefe_tienda' ? 'jefe*2026*' :
      currentUser.rol === 'supervisor' ? 'sup*2026*' : 'tec*2026*'
    );

    if (currentPassInput !== expectedCurrent) {
      setChangePassError('La contraseña actual es incorrecta.');
      return;
    }

    if (newPassInput.trim().length < 4) {
      setChangePassError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setChangePassError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (newPassInput === expectedCurrent) {
      setChangePassError('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      contrasena: newPassInput.trim(),
      passwordCambiado: true
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    try {
      localStorage.setItem('maint_user', JSON.stringify(updatedUser));
    } catch (err) {}

    if (isSupabaseConfigured) {
      supabase.from('usuarios').update({
        contrasena: newPassInput.trim(),
        password_cambiado: true
      }).eq('id', currentUser.id).then(({ error }: any) => {
        if (error) console.error("Error al actualizar contraseña en Supabase:", error);
      });
    }

    setChangePassSuccess('✅ Contraseña actualizada con éxito');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setChangePassError('');
      setChangePassSuccess('');
      setIsFirstLoginChange(false);
    }, 1200);
  };

  // Helper SLA
  const getSlaHours = (priority: number): number => {
    switch (priority) {
      case 1: return 4;
      case 2: return 24;
      case 3: return 72;
      case 4: return 168;
      default: return 72;
    }
  };

  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1: return '🔴 Crítico';
      case 2: return '🟠 Alto';
      case 3: return '🟡 Medio';
      case 4: return '🟢 Bajo';
      default: return 'Medio';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'concluido': return 'Concluido';
      case 'cerrado': return 'Cerrado';
      default: return status;
    }
  };

  const getCaseDisplayCode = (c: Case): string => {
    if (!c.fechaCreacion) return c.id.toString();
    const dateObj = new Date(c.fechaCreacion);
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    
    const casesInSameMonth = cases
      .filter(other => {
        if (!other.fechaCreacion) return false;
        const oDate = new Date(other.fechaCreacion);
        return oDate.getMonth() === dateObj.getMonth() && oDate.getFullYear() === dateObj.getFullYear();
      })
      .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());
      
    const seqNumber = casesInSameMonth.findIndex(other => other.id === c.id) + 1;
    return `${month}${year}-${seqNumber || 1}`;
  };

  const isSlaBreached = (c: Case): boolean => {
    if (c.estado === 'concluido' || c.estado === 'cerrado') {
      return c.fechaCierre ? new Date(c.fechaCierre) > new Date(c.fechaLimiteSla) : false;
    }
    return new Date() > new Date(c.fechaLimiteSla);
  };

  // Filtering list
    const isCaseVisibleToUser = (c: Case, user: User | null): boolean => {
    if (!user) return false;
    if (user.rol === 'jefe_tienda' || user.rol === 'subjefe') {
      return c.tiendaId === user.tiendaId;
    }
    if (user.rol === 'supervisor') {
      if (user.supervisorTiendas && user.supervisorTiendas.includes(c.tiendaId)) return true;
      const storeObj = stores.find(s => s.id === c.tiendaId);
      if (storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === user.nombre.toLowerCase().trim()) return true;
      return false;
    }
    return true;
  };

  const getFilteredCases = (): Case[] => {
    let list = [...cases];

    if (currentUser?.rol === 'jefe_tienda' || currentUser?.rol === 'subjefe') {
      if (currentUser?.tiendaId) { list = list.filter(c => c.tiendaId === currentUser.tiendaId); }
    } else if (currentUser?.rol === 'supervisor') {
      // Filtrado estricto por supervisor a cargo de la tienda
      list = list.filter(c => {
        // Coincidencia 1: ID de tienda en su lista de tiendas supervisadas
        if (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(c.tiendaId)) return true;
        // Coincidencia 2: Nombre del supervisor registrado en el objeto de la tienda
        const storeObj = stores.find(s => s.id === c.tiendaId);
        if (storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === currentUser.nombre.toLowerCase().trim()) return true;
        return false;
      });
    }

    if (statusFilter === 'pendiente') {
      list = list.filter(c => c.estado === 'pendiente');
    } else if (statusFilter === 'en_proceso') {
      list = list.filter(c => c.estado === 'en_proceso' && !c.pausado_por_material);
    } else if (statusFilter === 'pausado_material') {
      list = list.filter(c => Boolean(c.pausado_por_material) && c.estado !== 'concluido' && c.estado !== 'cerrado');
    } else if (statusFilter === 'completado') {
      list = list.filter(c => c.estado === 'concluido' || c.estado === 'cerrado');
    }

    if (storeFilter !== 'todos') {
      list = list.filter(c => c.tiendaId.toString() === storeFilter);
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.id.toString().includes(q) || 
        c.descripcion.toLowerCase().includes(q) || 
        c.categoria.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const breachedA = isSlaBreached(a) && (a.estado === 'pendiente' || a.estado === 'en_proceso') ? 1 : 0;
      const breachedB = isSlaBreached(b) && (b.estado === 'pendiente' || b.estado === 'en_proceso') ? 1 : 0;
      if (breachedB !== breachedA) return breachedB - breachedA;
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });
  };

  // ==========================================
  // OPERATIONAL METHODS
  // ==========================================
  const [newCategoryText, setNewCategoryText] = useState('');
  const [newPriority, setNewPriority] = useState(3);
  const [newDesc, setNewDesc] = useState('');

  const handleCategoryChange = (val: string) => {
    setNewCategoryText(val);
    const found = DEFAULT_CATEGORIES.find(c => c.nombre.toLowerCase() === val.toLowerCase().trim());
    if (found) {
      setNewPriority(found.prioridadSugerida);
    }
  };

  const pushNotification = (
    mensaje: string, 
    tipo: 'nuevo_caso' | 'comentario' | 'estado_cambio' | 'materiales' | 'facturacion', 
    metadata?: { tiendaId?: number; prioridad?: number; casoId?: number; autorRol?: string; estadoNuevo?: string; usuarioId?: number; usuario_id?: number }
  ) => {
    const targetUserId = metadata?.usuarioId || metadata?.usuario_id;
    // Usamos el timestamp actual mas un numero aleatorio para evitar colisiones en milisegundos
    const notifId = Date.now() + Math.floor(Math.random() * 1000);
    const newN: AppNotification = {
      id: notifId,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false,
      tipo,
      tiendaId: metadata?.tiendaId,
      prioridad: metadata?.prioridad,
      casoId: metadata?.casoId,
      autorRol: metadata?.autorRol,
      estadoNuevo: metadata?.estadoNuevo,
      usuarioId: targetUserId
    };
    
    // Guardar en Supabase para sincronizar con todos los usuarios en tiempo real
    if (isSupabaseConfigured) {
      supabase.from('notificaciones').insert([{
        mensaje: newN.mensaje,
        tipo: newN.tipo,
        tienda_id: newN.tiendaId || null,
        prioridad: newN.prioridad || null,
        caso_id: newN.casoId || null,
        autor_rol: newN.autorRol || null,
        estado_nuevo: newN.estadoNuevo || null,
        usuario_id: targetUserId || null
      }]).then(({ error }: any) => {
        if (error) console.error("Error al guardar notificación en Supabase:", error);
      });
    }

    setNotifications(prev => [newN, ...prev]);
  };

    const handleNewCasePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewCaseDamagePhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newCategoryText.trim() || !newDesc.trim()) return;

    const tiendaId = currentUser.tiendaId || 1;
    const now = new Date();
    const limit = new Date(now.getTime() + getSlaHours(newPriority) * 3600000).toISOString();
    const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 1001;
    const storeObj = stores.find(s => s.id === tiendaId);

    const assignedTechUser = newScheduleAssignedTechId ? users.find(u => u.id === Number(newScheduleAssignedTechId)) : null;

    const initialEvidences: Evidence[] = newCaseDamagePhotos.map((base64, index) => ({
      id: Date.now() + index,
      subidoPor: currentUser.nombre,
      tipo: 'inicial' as const,
      archivoUrl: base64,
      nombreArchivo: `foto_danio_${index + 1}.jpg`,
      fecha: now.toISOString()
    }));

    const newCase: Case = {
      id: newId,
      tiendaId,
      creadoPor: currentUser.id,
      categoria: newCategoryText.trim(),
      descripcion: newDesc.trim(),
      prioridad: newPriority,
      estado: 'pendiente',
      fechaCreacion: now.toISOString(),
      fechaLimiteSla: limit,
      evidencias: initialEvidences,
      comentarios: newIsScheduled ? [
        {
          id: Date.now(),
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `📅 MANTENIMIENTO AGENDADO AL CREAR: Programado para el ${newScheduleDate} en el turno ${newScheduleShift}${assignedTechUser ? ` (Técnico: ${assignedTechUser.nombre})` : ''}.`,
          fecha: now.toISOString()
        }
      ] : [],
      historial: [
        { id: Date.now(), estadoNuevo: 'pendiente', usuario: currentUser.nombre, fecha: now.toISOString() },
        ...(newIsScheduled ? [{ id: Date.now() + 1, estadoNuevo: 'pendiente', usuario: currentUser.nombre, fecha: now.toISOString(), detalle: `Agendado para ${newScheduleDate}` }] : [])
      ],
      ...(newIsScheduled ? {
        fecha_programada: newScheduleDate,
        turno_programado: newScheduleShift,
        horas_estimadas: newScheduleHours,
        agendado_por: currentUser.nombre,
        ...(assignedTechUser ? { tecnicoAsignadoId: assignedTechUser.id, tecnico_presencial_nombre: assignedTechUser.nombre } : {})
      } : {}),
      ...(newRequestPreMaterial && newPreMaterialName.trim() ? {
        solicitud_material_anticipada: true,
        material_anticipado_nombre: newPreMaterialName.trim(),
        material_anticipado_cantidad: newPreMaterialQty,
        material_anticipado_estado: 'pendiente_aprobacion'
      } : {})
    };

    setCases([newCase, ...cases]);

    if (isSupabaseConfigured) {
      supabase.from('casos').insert([{
        id: newId,
        tienda_id: tiendaId,
        creado_por: currentUser.id,
        categoria: newCategoryText.trim(),
        descripcion: newDesc.trim(),
        prioridad_nivel: newPriority,
        estado: 'pendiente',
        fecha_creacion: now.toISOString(),
        fecha_limite_sla: limit,
        ...(newIsScheduled ? {
          fecha_programada: newScheduleDate,
          turno_programado: newScheduleShift,
          horas_estimadas: newScheduleHours,
          agendado_por: currentUser.nombre,
          ...(assignedTechUser ? { tecnico_asignado_id: assignedTechUser.id, tecnico_presencial_nombre: assignedTechUser.nombre } : {})
        } : {}),
        ...(newRequestPreMaterial && newPreMaterialName.trim() ? {
          solicitud_material_anticipada: true,
          material_anticipado_nombre: newPreMaterialName.trim(),
          material_anticipado_cantidad: newPreMaterialQty,
          material_anticipado_estado: 'pendiente_aprobacion'
        } : {})
      }]).then(({ error }: any) => {
        if (error) console.error("Error al crear caso en Supabase:", error);
      });
    }
    
    // Dispatch notification
    pushNotification(
      `🚨 NUEVO CASO #${newId} [${getPriorityLabel(newPriority)}]: ${newCategoryText.trim()} en ${storeObj?.nombre || 'tienda'}.`,
      'nuevo_caso',
      { tiendaId, prioridad: newPriority, casoId: newId }
    );

    setNewCategoryText('');
    setNewDesc('');
    setNewPriority(3);
    setNewIsScheduled(false);
    setNewScheduleAssignedTechId('');
    setNewCaseDamagePhotos([]);
    setNewRequestPreMaterial(false);
    setNewPreMaterialName('');
    setNewPreMaterialQty(1);
    setShowNewCaseModal(false);
    setSelectedCaseId(newId);
  };

  
  
  const addDirectComment = (caseId: number, commentText: string) => {
    if (!currentUser || !commentText.trim()) return;
    const newComment = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      autor: currentUser.nombre,
      rol: currentUser.rol,
      texto: commentText,
      fecha: new Date().toISOString()
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const alreadyExists = c.comentarios.some(co => co.texto === newComment.texto && co.autor === newComment.autor);
        if (alreadyExists) return c;
        return {
          ...c,
          comentarios: [...c.comentarios, newComment]
        };
      }
      return c;
    }));

    notifyCommentParties(caseId, commentText);
    if (isSupabaseConfigured) {
      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: commentText,
        fecha: newComment.fecha
      }]).then(({ error }: any) => {
        if (error) console.error("Error al guardar comentario directo en Supabase:", error);
      });
    }
  };

  const handleSendFacturacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !facturacionRuc || !facturacionMonto) return;

    const targetCase = cases.find(c => c.id === facturacionCasoId);
    const tiendaId = targetCase ? targetCase.tiendaId : (currentUser.tiendaId || 1);
    const storeObj = stores.find(s => s.id === tiendaId);
    const tiendaNombre = storeObj ? storeObj.nombre : `Tienda #${tiendaId}`;

    if (isSupabaseConfigured) {
      await supabase.from('datos_facturacion').insert([{
        caso_id: facturacionCasoId || null,
        tienda_id: tiendaId,
        supervisor_id: currentUser.id,
        ruc_cedula: facturacionRuc,
        razon_social: facturacionRazonSocial,
        direccion: facturacionDireccion,
        telefono: facturacionTelefono,
        email: facturacionEmail,
        monto: parseFloat(facturacionMonto) || 0,
        concepto: facturacionConcepto
      }]);
    }

    if (facturacionCasoId) {
      const commentText = `🧾 DATOS DE FACTURACIÓN ENVIADOS:\n- RUC/Cédula: ${facturacionRuc}\n- Razón Social: ${facturacionRazonSocial}\n- Dirección: ${facturacionDireccion}\n- Teléfono: ${facturacionTelefono}\n- Email: ${facturacionEmail}\n- Monto: $${facturacionMonto}\n- Detalle: ${facturacionConcepto}`;
      addDirectComment(facturacionCasoId, commentText);
    }

    pushNotification(
      `🧾 Datos de Facturación enviados por ${currentUser.nombre} para ${tiendaNombre} por $${facturacionMonto}`,
      'facturacion',
      { tiendaId, casoId: facturacionCasoId || undefined }
    );

    setShowFacturacionModal(false);
    setFacturacionRuc('');
    setFacturacionRazonSocial('');
    setFacturacionDireccion('');
    setFacturacionTelefono('');
    setFacturacionEmail('');
    setFacturacionMonto('');
    setFacturacionConcepto('');
    alert('¡Datos de facturación registrados y enviados con éxito!');
  };

  const handleCreateTechCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !techCaseCategory.trim() || !techCaseDesc.trim()) return;

    const now = new Date();
    const limit = new Date(now.getTime() + 48 * 3600000).toISOString(); // 48h default for tech reports
    const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 2001;
    
    

    const newCase: Case = {
      id: newId,
      tiendaId: techCaseStoreId || 0,
      creadoPor: currentUser.id,
      categoria: techCaseCategory.trim(),
      descripcion: techCaseDesc.trim(),
      prioridad: 3, // Medio
      estado: 'en_proceso', // Se crea directamente en proceso ya que el técnico ya está trabajando en ello
      tecnicoAsignadoId: currentUser.id,
      fechaCreacion: now.toISOString(),
      fechaLimiteSla: limit,
      es_caso_tecnico: true,
      tecnico_estatus_trabajo: techStatus,
      tecnico_presencial_nombre: currentUser.nombre,
      hora_entrada: now.toISOString(),
      evidencias: [],
      comentarios: [],
      historial: [
        { id: Date.now(), estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now.toISOString() }
      ]
    };

    setCases([newCase, ...cases]);

    if (isSupabaseConfigured) {
      supabase.from('casos').insert([{
        id: newId,
        tienda_id: techCaseStoreId || null,
        creado_por: currentUser.id,
        categoria: techCaseCategory.trim(),
        descripcion: techCaseDesc.trim(),
        prioridad_nivel: 3,
        estado: 'en_proceso',
        tecnico_asignado_id: currentUser.id,
        fecha_creacion: now.toISOString(),
        fecha_limite_sla: limit,
        es_caso_tecnico: true,
        tecnico_estatus_trabajo: techStatus,
        tecnico_presencial_nombre: currentUser.nombre,
        hora_entrada: now.toISOString()
      }]).then(({ error }: any) => {
        if (error) {
          console.error("Error al crear caso técnico en Supabase:", error);
        }
      });
    }

    pushNotification(
      `🔧 Actividad Técnica: ${currentUser.nombre} inició "${techCaseCategory.trim()}" (${techStatus}) en ${stores.find(s => s.id === techCaseStoreId)?.nombre || `Tienda #${techCaseStoreId}`}.`,
      'nuevo_caso',
      { tiendaId: techCaseStoreId || undefined, casoId: newId }
    );

    setTechCaseCategory('');
    setTechCaseDesc('');
    setTechCaseStoreId(0);
    setTechStatus('Trabajando en tienda');
    setShowNewTechCaseModal(false);
    setSelectedCaseId(newId);
  };

  const notifyCommentParties = (caseId: number, commentText: string) => {
    if (!currentUser) return;
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const storeObj = stores.find(s => s.id === targetCase.tiendaId);
    const storeSupervisorName = storeObj?.supervisorName || (targetCase as any)?.supervisorNombre;

    // 1. Identify 4 Target Parties:
    // - Supervisor encargado de la tienda
    const supervisorUser = users.find(u => u.rol === 'supervisor' && (u.nombre === storeSupervisorName || u.supervisorTiendas?.includes(targetCase.tiendaId)));
    
    // - Técnico asignado al caso
    const techUser = users.find(u => u.rol === 'tecnico' && (u.id === targetCase.tecnicoAsignadoId || u.nombre === (targetCase as any)?.tecnico_asignado));
    
    // - Local de la tienda
    const localUsers = users.filter(u => (u.rol === 'jefe_tienda' || u.rol === 'subjefe') && u.tiendaId === targetCase.tiendaId);
    
    // - Gerente General
    const gerenteUsers = users.filter(u => u.rol === 'administrador' || u.usuario === 'GEN_MS' || u.nombre.toLowerCase().includes('gerente'));

    const recipients = new Set<User>();
    if (supervisorUser) recipients.add(supervisorUser);
    if (techUser) recipients.add(techUser);
    localUsers.forEach(u => recipients.add(u));
    gerenteUsers.forEach(u => recipients.add(u));

    const shortMsg = commentText.length > 40 ? commentText.substring(0, 40) + '...' : commentText;
    const notifTitle = `💬 Nuevo comentario en Caso #${caseId} de ${currentUser.nombre}: "${shortMsg}"`;

    // Send targeted notification to each party EXCEPT the author
    recipients.forEach(r => {
      if (r.id !== currentUser.id && r.nombre !== currentUser.nombre) {
        pushNotification(
          notifTitle,
          'comentario',
          { tiendaId: targetCase.tiendaId, casoId: caseId, autorRol: currentUser.rol, usuarioId: r.id }
        );
      }
    });

    triggerNativeNotification(`💬 Comentario en Caso #${caseId}`, `${currentUser.nombre}: ${shortMsg}`);
  };

  // Add Comment
  const [newComment, setNewComment] = useState('');
  const handleAddComment = (e: React.FormEvent, caseId: number) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    const commentDate = new Date().toISOString();
    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser.nombre, rol: currentUser.rol, texto: newComment.trim(), fecha: commentDate }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: newComment.trim(),
        fecha: commentDate
      }]).then(({ error }: any) => {
        if (error) console.error("Error al añadir comentario en Supabase:", error);
      });
    }

    notifyCommentParties(caseId, newComment.trim());
    setNewComment('');
  };

  // Handler para Pausar Caso por Materiales / Presupuesto (Solo Locales, Supervisores y Admins)
  const handlePauseCaseForMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || !pauseReasonInput.trim()) return;

    const now = new Date().toISOString();
    const caseId = selectedCaseId;
    const reason = pauseReasonInput.trim();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          pausado_por_material: true,
          motivo_pausa_material: reason,
          fecha_pausa_material: now,
          materiales_llegaron_tienda: false,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `⏸️ CASO PAUSADO POR MATERIALES / PRESUPUESTO: "${reason}". El caso queda en espera de adquisición o llegada de repuestos.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'Pausado por Materiales', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        pausado_por_material: true,
        motivo_pausa_material: reason,
        fecha_pausa_material: now,
        materiales_llegaron_tienda: false
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al pausar caso en Supabase:", error);

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `⏸️ CASO PAUSADO POR MATERIALES / PRESUPUESTO: "${reason}". El caso queda en espera de adquisición o llegada de repuestos.`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `⏸️ Caso #${caseId} puesto en pausa por falta de materiales/presupuesto: ${reason}`,
      'estado_cambio',
      { casoId: caseId, tiendaId: selectedCase?.tiendaId }
    );

    setShowPauseMaterialModal(false);
    setPauseReasonInput('');
  };

  // Handler para Confirmar Llegada de Materiales a Tienda (Reanuda el Caso)
  const handleConfirmMaterialsArrived = (caseId: number) => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          pausado_por_material: false,
          materiales_llegaron_tienda: true,
          fecha_llegada_materiales: now,
          estado: 'en_proceso' as const,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `📦 MATERIALES RECIBIDOS EN TIENDA: ${currentUser.nombre} (${currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' ? 'Jefe de Tienda' : currentUser.rol}) confirmó la llegada de los repuestos. El caso se reanuda inmediatamente para atención técnica.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: 'Pausado por Materiales', estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        pausado_por_material: false,
        materiales_llegaron_tienda: true,
        fecha_llegada_materiales: now,
        estado: 'en_proceso'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar llegada de materiales en Supabase:", error);

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `📦 MATERIALES RECIBIDOS EN TIENDA: ${currentUser.nombre} (${currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' ? 'Jefe de Tienda' : currentUser.rol}) confirmó la llegada de los repuestos. El caso se reanuda inmediatamente para atención técnica.`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `📦 ¡Materiales en Tienda! Los repuestos para el Caso #${caseId} ya llegaron. Se reanuda el trabajo técnico.`,
      'estado_cambio',
      { casoId: caseId, tiendaId: currentUser.tiendaId }
    );
  };

  // Confirm Take Case (Solo or Team)
  const handleConfirmTakeCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId) return;

    const now = new Date().toISOString();
    const caseId = selectedCaseId;
    const isTeam = takeCaseMode === 'equipo' && takeCaseSupportTech.trim() !== '';
    const supportName = isTeam ? takeCaseSupportTech.trim() : undefined;
    const mainName = currentUser.nombre;

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'en_proceso' as const,
          tecnicoAsignadoId: currentUser.id,
          tecnico_presencial_nombre: mainName,
          tecnico_apoyo_nombre: supportName,
          hora_entrada: c.hora_entrada || now,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: isTeam
                ? `👥 TRABAJO EN EQUIPO: Los técnicos ${mainName} y ${supportName} se han puesto a trabajar juntos en este caso.`
                : `👷 Técnico ${mainName} tomó la asignación de este caso y comenzó la atención.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        tecnico_asignado_id: currentUser.id,
        tecnico_presencial_nombre: mainName,
        tecnico_apoyo_nombre: supportName || null,
        hora_entrada: now
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar caso en Supabase:", error);

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: isTeam
            ? `👥 TRABAJO EN EQUIPO: Los técnicos ${mainName} y ${supportName} se han puesto a trabajar juntos en este caso.`
            : `👷 Técnico ${mainName} tomó la asignación de este caso y comenzó la atención.`,
          fecha: now
        }]);
      });
    }

    const storeId = cases.find(c => c.id === caseId)?.tiendaId || 1;
    pushNotification(
      isTeam
        ? `👥 TRABAJO EN EQUIPO: Técnicos ${mainName} y ${supportName} tomaron el Caso #${caseId}.`
        : `🔧 Técnico ${mainName} tomó la asignación del Caso #${caseId}.`,
      'estado_cambio',
      { tiendaId: storeId, casoId: caseId, estadoNuevo: 'en_proceso' }
    );

    setShowTakeCaseModal(false);
  };



  // Conclude Case
  const [solutionDesc, setSolutionDesc] = useState('');
  const handleConcludeCase = (e: React.FormEvent, caseId: number) => {
    e.preventDefault();
    if (!currentUser || !solutionDesc.trim()) return;

    const now = new Date().toISOString();
    const targetCase = cases.find(c => c.id === caseId);
    const exitTime = now;

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'concluido' as const,
          fechaCierre: now,
          hora_salida: c.hora_salida || exitTime,
          evidencias: [
            ...c.evidencias,
            ...solveEvidenceFiles.map((base64, index) => ({
              id: Date.now() + index,
              subidoPor: currentUser.nombre,
              tipo: 'final' as const,
              archivoUrl: base64,
              nombreArchivo: `evidencia_resolucion_${index + 1}.jpg`,
              fecha: now
            }))
          ],
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser.nombre, rol: currentUser.rol, texto: `Solución aplicada: ${solutionDesc.trim()}`, fecha: now }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'concluido', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      const updateObj: any = {
        estado: 'concluido',
        fecha_cierre: now
      };
      if (!targetCase?.hora_salida) {
        updateObj.hora_salida = exitTime;
      }

      supabase.from('casos').update(updateObj).eq('id', caseId).then(({ error: errCase }: any) => {
        if (errCase) console.error("Error al concluir caso en Supabase:", errCase);
        
        if (solveEvidenceFiles.length > 0) {
          const inserts = solveEvidenceFiles.map((base64, index) => ({
            caso_id: caseId,
            subido_por: currentUser.nombre,
            tipo: 'final',
            archivo_url: base64,
            nombre_archivo: `evidencia_resolucion_${index + 1}.jpg`,
            fecha: now
          }));
          supabase.from('evidencias').insert(inserts).then(({ error: errEv }: any) => {
            if (errEv) console.error("Error al guardar evidencia en Supabase:", errEv);
          });
        }

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `Solución aplicada: ${solutionDesc.trim()}`,
          fecha: now
        }]).then(({ error: errCom }: any) => {
          if (errCom) console.error("Error al guardar comentario de solución en Supabase:", errCom);
        });
      });
    }

    const storeId = cases.find(c => c.id === caseId)?.tiendaId || 1;
    pushNotification(
      `✅ Caso #${caseId} CONCLUIDO por técnico ${currentUser.nombre}.`,
      'estado_cambio',
      { tiendaId: storeId, casoId: caseId, estadoNuevo: 'concluido' }
    );
    setSolutionDesc('');
    setSolveEvidenceFiles([]);
    setShowSolveModal(false);
  };

  // Close Case
  const handleCloseCase = (caseId: number) => {
    const now = new Date().toISOString();
    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'cerrado' as const,
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'cerrado', usuario: currentUser!.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'cerrado'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al cerrar caso en Supabase:", error);
      });
    }

    const storeId = cases.find(c => c.id === caseId)?.tiendaId || 1;
    pushNotification(
      `🔒 Caso #${caseId} ha sido validado y CERRADO definitivamente.`,
      'estado_cambio',
      { tiendaId: storeId, casoId: caseId, estadoNuevo: 'cerrado' }
    );
  };

  // Log Technician entry/exit presencial
  const [selectedPresencialTech, setSelectedPresencialTech] = useState('');

  const handleLogTechEntry = (caseId: number, name: string) => {
    if (!name.trim()) return;
    const now = new Date().toISOString();

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          tecnico_presencial_nombre: name,
          hora_entrada: now,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: `⏱️ ENTRADA REGISTRADA: Técnico ${name} ingresó a tienda a las ${new Date(now).toLocaleTimeString()}`, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        tecnico_presencial_nombre: name,
        hora_entrada: now
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al registrar entrada en Supabase:", error);
        
        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser!.nombre,
          rol: currentUser!.rol,
          texto: `⏱️ ENTRADA REGISTRADA: Técnico ${name} ingresó a tienda a las ${new Date(now).toLocaleTimeString()}`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `⏱️ ENTRADA REGISTRADA: Técnico ${name} ingresó a la tienda para el caso #${caseId}.`,
      'estado_cambio',
      { casoId: caseId, tiendaId: currentUser!.tiendaId }
    );
    setSelectedPresencialTech('');
  };

  const handleLogTechExit = (caseId: number) => {
    const now = new Date().toISOString();

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          hora_salida: now,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: `⏱️ SALIDA REGISTRADA: Técnico se retiró de la tienda a las ${new Date(now).toLocaleTimeString()}`, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        hora_salida: now
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al registrar salida en Supabase:", error);

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser!.nombre,
          rol: currentUser!.rol,
          texto: `⏱️ SALIDA REGISTRADA: Técnico se retiró de la tienda a las ${new Date(now).toLocaleTimeString()}`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `⏱️ SALIDA REGISTRADA: El técnico se retiró del local para el caso #${caseId}.`,
      'estado_cambio',
      { casoId: caseId, tiendaId: currentUser!.tiendaId }
    );
  };

  // Material requests management
  const handleCreateMaterialRequest = (caseId: number, desc: string) => {
    if (!currentUser || !desc.trim()) return;
    const now = new Date().toISOString();
    const requestId = Date.now() + Math.floor(Math.random() * 1000);

    const newReq: MaterialRequest = {
      id: requestId,
      casoId: caseId,
      tecnicoId: currentUser.id,
      descripcion: desc.trim(),
      estado: 'pendiente',
      createdAt: now
    };

    setMaterialRequests(prev => [newReq, ...prev]);

    if (isSupabaseConfigured) {
      supabase.from('pedidos_materiales').insert([{
        id: requestId,
        caso_id: caseId,
        tecnico_id: currentUser.id,
        descripcion: desc.trim(),
        estado: 'pendiente'
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar pedido de materiales:", error);
      });
    }

    pushNotification(
      `📦 PETICIÓN DE MATERIAL: Técnico ${currentUser.nombre} solicitó repuestos para el Caso #${caseId}.`,
      'nuevo_caso',
      { casoId: caseId, tiendaId: currentUser.tiendaId }
    );
    setNewMaterialDesc('');
    alert('Petición de materiales enviada al supervisor.');
  };

  const handleApproveMaterialRequest = (reqId: number) => {
    const target = materialRequests.find(r => r.id === reqId);
    if (!target) return;

    setMaterialRequests(prev => prev.map(r => r.id === reqId ? { ...r, estado: 'aprobado' } : r));

    if (isSupabaseConfigured) {
      supabase.from('pedidos_materiales').update({
        estado: 'aprobado'
      }).eq('id', reqId).then(({ error }: any) => {
        if (error) console.error("Error al aprobar pedido de materiales:", error);
      });
    }

    pushNotification(
      `✅ MATERIAL APROBADO: Tu pedido de materiales para el Caso #${target.casoId} fue APROBADO por el supervisor.`,
      'estado_cambio',
      { casoId: target.casoId, usuario_id: target.tecnicoId } as any
    );
  };

  const handleDenyMaterialRequest = (reqId: number) => {
    const target = materialRequests.find(r => r.id === reqId);
    if (!target) return;

    setMaterialRequests(prev => prev.map(r => r.id === reqId ? { ...r, estado: 'denegado' } : r));

    if (isSupabaseConfigured) {
      supabase.from('pedidos_materiales').update({
        estado: 'denegado'
      }).eq('id', reqId).then(({ error }: any) => {
        if (error) console.error("Error al denegar pedido de materiales:", error);
      });
    }

    pushNotification(
      `❌ MATERIAL DENEGADO: Tu pedido de materiales para el Caso #${target.casoId} fue DENEGADO por el supervisor.`,
      'estado_cambio',
      { casoId: target.casoId, usuario_id: target.tecnicoId } as any
    );
  };

  // Excel Export and Import Availability
  const handleExportCasesExcel = async () => {
    try {
      const XLSX = await loadSheetJS();
      const exportData = cases.map(c => {
        const store = stores.find(s => s.id === c.tiendaId);
        const tech = users.find(u => u.id === c.tecnicoAsignadoId);
        return {
          'ID Caso': c.id,
          'Tipo de Caso': c.es_caso_tecnico ? 'Reporte Técnico' : 'Reporte Tienda',
          'Tienda / Local': store ? store.nombre : 'Oficina DV01',
          'Categoría': c.categoria,
          'Descripción': c.descripcion,
          'Prioridad': c.prioridad === 1 ? 'Crítico' : c.prioridad === 2 ? 'Alto' : c.prioridad === 3 ? 'Medio' : 'Bajo',
          'Estado': c.estado.toUpperCase(),
          'Técnico Asignado': tech ? tech.nombre : 'Sin asignar',
          'Técnico Presencial (Entrada)': c.tecnico_presencial_nombre || 'Ninguno',
          'Hora Entrada': c.hora_entrada ? new Date(c.hora_entrada).toLocaleString() : 'No registrada',
          'Hora Salida': c.hora_salida ? new Date(c.hora_salida).toLocaleString() : 'No registrada',
          'Reaperturas': c.reaperturas_count || 0,
          'Fecha Creación': new Date(c.fechaCreacion).toLocaleString(),
          'Fecha Límite (SLA)': new Date(c.fechaLimiteSla).toLocaleString()
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');
      
      // Auto-size columns simple helper
      const maxLens = Object.keys(exportData[0] || {}).map(key => Math.max(key.length, 12));
      ws['!cols'] = maxLens.map((l: any) => ({ wch: l }));

      XLSX.writeFile(wb, `Reporte_Mantenimiento_y_Soporte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error("Error al exportar a Excel:", e);
      alert("No se pudo exportar el reporte a Excel.");
    }
  };

  const handleImportTechAvailability = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await loadSheetJS();
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows = XLSX.utils.sheet_to_json(ws) as any[];

        console.log("Filas de Excel leídas:", rawRows);

        const newTechList: TechAvailability[] = [];
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          const techName = row['Técnico'] || row['Nombre'] || row['tecnico'] || '';
          if (!techName) continue;

          const daysOff = row['Días Libres'] || row['Dias Libres'] || row['dias_libres'] || 'Ninguno';
          const status = (row['Estatus'] || row['Estado'] || row['estatus'] || 'disponible').toLowerCase().trim();

          const mappedStatus: 'disponible' | 'libre' | 'en_ruta' | 'trabajando' = 
            ['libre', 'en_ruta', 'trabajando'].includes(status) ? (status as any) : 'disponible';

          // Intentar emparejar con un usuario técnico existente
          const matchedUser = users.find(u => u.nombre.toLowerCase().includes(techName.toLowerCase()) && u.rol === 'tecnico');

          const record: TechAvailability = {
            id: Date.now() + i,
            tecnicoNombre: techName,
            usuarioId: matchedUser?.id,
            diasLibres: daysOff,
            estatus: mappedStatus
          };

          newTechList.push(record);

          // Guardar en Supabase
          if (isSupabaseConfigured) {
            await supabase.from('disponibilidad_tecnicos').insert([{
              tecnico_nombre: record.tecnicoNombre,
              usuario_id: record.usuarioId || null,
              dias_libres: record.diasLibres,
              estatus: record.estatus
            }]);
          }
        }

        setTechAvailability(prev => [...newTechList, ...prev]);
        alert(`Se importaron ${newTechList.length} técnicos con éxito.`);
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Error al importar Excel de técnicos:", err);
      alert("Error al procesar el archivo Excel. Asegúrate de tener columnas con: 'Técnico', 'Días Libres', 'Estatus'.");
    }
  };

  // Supervisor Assigns 2 Technicians as a Team
  const handleSupervisorAssignTeam = (caseId: number, primaryTechId: number, supportTechName: string) => {
    if (!currentUser) return;
    const primaryTechUser = users.find(u => u.id === primaryTechId);
    if (!primaryTechUser || !supportTechName) return;

    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          tecnicoAsignadoId: primaryTechId,
          tecnico_presencial_nombre: primaryTechUser.nombre,
          tecnico_apoyo_nombre: supportTechName,
          estado: 'en_proceso' as const,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `👥 ASIGNACIÓN EN EQUIPO: Supervisor ${currentUser.nombre} asignó a los 2 técnicos (${primaryTechUser.nombre} y ${supportTechName}) para trabajar en conjunto en este caso.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        tecnico_asignado_id: primaryTechId,
        tecnico_presencial_nombre: primaryTechUser.nombre,
        tecnico_apoyo_nombre: supportTechName,
        estado: 'en_proceso'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al asignar equipo en Supabase:", error);

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `👥 ASIGNACIÓN EN EQUIPO: Supervisor ${currentUser.nombre} asignó a los 2 técnicos (${primaryTechUser.nombre} y ${supportTechName}) para trabajar en conjunto en este caso.`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `👥 TRABAJO EN EQUIPO DESIGNADO: Caso #${caseId} asignado en pareja a ${primaryTechUser.nombre} y ${supportTechName}.`,
      'estado_cambio',
      { casoId: caseId, usuario_id: primaryTechId } as any
    );

    setSelectedAssignTechId(null);
    alert(`Caso asignado al equipo técnico: ${primaryTechUser.nombre} y ${supportTechName}`);
  };

  const handleSupervisorAssignTech = (caseId: number, techId: number) => {
    const techUser = users.find(u => u.id === techId);
    if (!techUser) return;

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          tecnicoAsignadoId: techId,
          estado: 'en_proceso' as const,
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'en_proceso', usuario: currentUser!.nombre, fecha: new Date().toISOString() }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        tecnico_asignado_id: techId,
        estado: 'en_proceso'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al asignar técnico en Supabase:", error);
      });
    }

    pushNotification(
      `🔧 CASO DESIGNADO: Se te ha asignado el Caso #${caseId}. Por favor, inicia labores.`,
      'estado_cambio',
      { casoId: caseId, usuario_id: techId } as any
    );

    setSelectedAssignTechId(null);
    alert(`Caso asignado al técnico: ${techUser.nombre}`);
  };

  // Reopen Case
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenInput, setShowReopenInput] = useState(false);
  
  const handleReopenCase = (caseId: number) => {
    if (!reopenReason.trim()) return;

    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const newCount = (targetCase.reaperturas_count || 0) + 1;
    const now = new Date().toISOString();

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'pendiente' as const,
          fechaCierre: undefined,
          reaperturas_count: newCount,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: `🔄 REABIERTO (${newCount}ª vez): ${reopenReason.trim()}`, fecha: now }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'pendiente', usuario: currentUser!.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'pendiente',
        fecha_cierre: null,
        reaperturas_count: newCount
      }).eq('id', caseId).then(({ error: errCase }: any) => {
        if (errCase) console.error("Error al reabrir caso en Supabase:", errCase);
        
        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser!.nombre,
          rol: currentUser!.rol,
          texto: `🔄 REABIERTO (${newCount}ª vez): ${reopenReason.trim()}`,
          fecha: now
        }]).then(({ error: errCom }: any) => {
          if (errCom) console.error("Error al guardar comentario de reapertura en Supabase:", errCom);
        });
      });
    }

    const storeId = targetCase.tiendaId;
    
    if (newCount >= 3) {
      pushNotification(
        `🚨 ALERTA CRÍTICA: Caso #${caseId} en ${stores.find(s => s.id === techCaseStoreId)?.nombre || `Tienda #${techCaseStoreId}`} reabierto por ${newCount}ª vez. SE REQUIERE BUSCAR OTRA ALTERNATIVA TÉCNICA URGENTE (el trabajo realizado no funcionó).`,
        'estado_cambio',
        { tiendaId: storeId, casoId: caseId, estadoNuevo: 'pendiente', prioridad: 1 }
      );
    } else {
      pushNotification(
        `🔄 Caso #${caseId} REABIERTO: "${reopenReason.substring(0, 30)}..."`,
        'estado_cambio',
        { tiendaId: storeId, casoId: caseId, estadoNuevo: 'pendiente' }
      );
    }

    setReopenReason('');
    setShowReopenInput(false);
  };

  // Mark all notifications as read
  const markAllNotifsRead = () => {
    const ids = notifications.map(n => n.id);
    setReadNotifIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  // ==========================================
  // ADMIN ACTIONS (COMPLETAS CRUD)
  // ==========================================
  const [admName, setAdmName] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admUsername, setAdmUsername] = useState('');
  const [admContrasena, setAdmContrasena] = useState('');
  const [admRole, setAdmRole] = useState<'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico'>('jefe_tienda');
  const [admTiendaNombre, setAdmTiendaNombre] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const handleAdminUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admName || !admUsername || !admEmail) return;

    let targetTiendaId: number | undefined = undefined;
    if ((admRole === 'jefe_tienda' || admRole === 'subjefe') && admTiendaNombre.trim() !== '') {
      const matchedStore = stores.find(s => s.nombre.toLowerCase().trim() === admTiendaNombre.toLowerCase().trim());
      if (matchedStore) {
        targetTiendaId = matchedStore.id;
      } else {
        const newStoreId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;
        const newStoreObj: Store = {
          id: newStoreId,
          nombre: admTiendaNombre.trim(),
          ciudad: 'Quito', // Default city
          direccion: 'Dirección por registrar'
        };
        setStores([...stores, newStoreObj]);
        targetTiendaId = newStoreId;

        // Auto-crear tienda en Supabase
        if (isSupabaseConfigured) {
          supabase.from('tiendas').insert([{
            id: newStoreId,
            nombre: admTiendaNombre.trim(),
            ciudad: 'Quito',
            direccion: 'Dirección por registrar'
          }]).then(({ error }: any) => {
            if (error) console.error("Error al auto-crear tienda en Supabase:", error);
          });
        }
      }
    }

    if (editingUserId !== null) {
      setUsers(users.map(u => u.id === editingUserId ? {
        ...u,
        nombre: admName,
        correo: admEmail,
        usuario: admUsername,
        rol: admRole,
        contrasena: admContrasena ? admContrasena.trim() : u.contrasena,
        tiendaId: targetTiendaId
      } : u));

      if (isSupabaseConfigured) {
        const updatePayload: any = {
          nombre: admName,
          correo: admEmail,
          usuario: admUsername,
          rol: admRole,
          tienda_id: targetTiendaId
        };
        if (admContrasena) {
          updatePayload.contrasena = admContrasena.trim();
        }
        supabase.from('usuarios').update(updatePayload).eq('id', editingUserId).then(({ error }: any) => {
          if (error) console.error("Error al actualizar usuario en Supabase:", error);
        });
      }

      setEditingUserId(null);
      alert('Usuario actualizado con éxito.');
    } else {
      const newUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const finalPass = admContrasena.trim() || '123456';
      const newU: User = {
        id: newUserId,
        nombre: admName,
        correo: admEmail,
        usuario: admUsername,
        rol: admRole,
        contrasena: finalPass,
        estado: true,
        tiendaId: targetTiendaId
      };
      setUsers([...users, newU]);

      if (isSupabaseConfigured) {
        supabase.from('usuarios').insert([{
          id: newUserId,
          nombre: admName,
          correo: admEmail,
          usuario: admUsername,
          rol: admRole,
          contrasena: finalPass,
          tienda_id: targetTiendaId,
          estado: true
        }]).then(({ error }: any) => {
          if (error) console.error("Error al crear usuario en Supabase:", error);
        });
      }

      alert('Usuario creado con éxito.');
    }

    setAdmName('');
    setAdmEmail('');
    setAdmUsername('');
    setAdmContrasena('');
    setAdmRole('jefe_tienda');
    setAdmTiendaNombre('');
  };

  const handleStartEditUser = (u: User) => {
    setEditingUserId(u.id);
    setAdmName(u.nombre);
    setAdmEmail(u.correo);
    setAdmUsername(u.usuario);
    setAdmContrasena(u.contrasena || '');
    setAdmRole(u.rol as any);
    if (u.tiendaId) {
      const storeObj = stores.find(s => s.id === u.tiendaId);
      setAdmTiendaNombre(storeObj ? storeObj.nombre : '');
    } else {
      setAdmTiendaNombre('');
    }
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setAdmName('');
    setAdmEmail('');
    setAdmUsername('');
    setAdmContrasena('');
    setAdmRole('jefe_tienda');
    setAdmTiendaNombre('');
  };

  const handleAdminDeleteUser = (id: number) => {
    if (id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsers(users.filter(u => u.id !== id));

      if (isSupabaseConfigured) {
        supabase.from('usuarios').delete().eq('id', id).then(({ error }: any) => {
          if (error) console.error("Error al eliminar usuario en Supabase:", error);
        });
      }
    }
  };

  const handleAdminToggleUser = (id: number) => {
    if (id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario.');
      return;
    }
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    setUsers(users.map(u => u.id === id ? { ...u, estado: !u.estado } : u));

    if (isSupabaseConfigured) {
      supabase.from('usuarios').update({
        estado: !targetUser.estado
      }).eq('id', id).then(({ error }: any) => {
        if (error) console.error("Error al cambiar estado en Supabase:", error);
      });
    }
  };

  // STORES CRUD
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreDir, setNewStoreDir] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);

  const handleAdminStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreCity || !newStoreDir) return;

    if (editingStoreId !== null) {
      setStores(stores.map(s => s.id === editingStoreId ? {
        ...s,
        nombre: newStoreName,
        ciudad: newStoreCity,
        direccion: newStoreDir
      } : s));

      if (isSupabaseConfigured) {
        supabase.from('tiendas').update({
          nombre: newStoreName,
          ciudad: newStoreCity,
          direccion: newStoreDir
        }).eq('id', editingStoreId).then(({ error }: any) => {
          if (error) console.error("Error al actualizar tienda en Supabase:", error);
        });
      }

      setEditingStoreId(null);
      alert('Tienda actualizada con éxito.');
    } else {
      const nextStoreId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;
      const newS: Store = {
        id: nextStoreId,
        nombre: newStoreName,
        ciudad: newStoreCity,
        direccion: newStoreDir
      };
      setStores([...stores, newS]);

      if (isSupabaseConfigured) {
        supabase.from('tiendas').insert([{
          id: nextStoreId,
          nombre: newStoreName,
          ciudad: newStoreCity,
          direccion: newStoreDir
        }]).then(({ error }: any) => {
          if (error) console.error("Error al guardar tienda en Supabase:", error);
        });
      }

      alert('Tienda creada con éxito.');
    }

    setNewStoreName('');
    setNewStoreCity('');
    setNewStoreDir('');
  };

  const handleStartEditStore = (s: Store) => {
    setEditingStoreId(s.id);
    setNewStoreName(s.nombre);
    setNewStoreCity(s.ciudad);
    setNewStoreDir(s.direccion);
  };

  const handleCancelEditStore = () => {
    setEditingStoreId(null);
    setNewStoreName('');
    setNewStoreCity('');
    setNewStoreDir('');
  };

  const handleAdminDeleteStore = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta tienda? Esto afectará a reportes y jefes asociados.')) {
      setStores(stores.filter(s => s.id !== id));

      if (isSupabaseConfigured) {
        supabase.from('tiendas').delete().eq('id', id).then(({ error }: any) => {
          if (error) console.error("Error al eliminar tienda en Supabase:", error);
        });
      }
    }
  };

  const getFilteredNotifications = (): AppNotification[] => {
    if (!currentUser) return [];

    return notifications.filter(n => {
      // 1. TÉCNICO: solo 3 eventos (Caso Nuevo, Asignación de Caso, y Materiales Aprobados/Llegados)
      if (currentUser.rol === 'tecnico') {
        if (n.tipo === 'nuevo_caso') return true;

        const isDirectUserMatch = n.usuarioId === currentUser.id || (n.mensaje && n.mensaje.toLowerCase().includes(currentUser.nombre.toLowerCase()));
        const isAssignmentMsg = n.mensaje && (n.mensaje.includes('designad') || n.mensaje.includes('asignad') || n.mensaje.includes('EQUIPO') || n.mensaje.includes('Asignado'));
        if (isAssignmentMsg && (isDirectUserMatch || !n.usuarioId)) return true;

        const isMaterialMsg = n.tipo === 'materiales' || (n.mensaje && (n.mensaje.toLowerCase().includes('material') || n.mensaje.toLowerCase().includes('repuesto')));
        const isApprovedOrArrived = n.mensaje && (n.mensaje.toLowerCase().includes('aprobad') || n.mensaje.toLowerCase().includes('llegar') || n.mensaje.toLowerCase().includes('disponib') || n.mensaje.toLowerCase().includes('llegaron'));
        if (isMaterialMsg && isApprovedOrArrived) return true;

        return false;
      }

      // 2. SUPERVISOR: solo 3 eventos (Creación de Caso, Petición de Materiales, y Culminación de Caso)
      if (currentUser.rol === 'supervisor') {
        // A) Creación de Caso
        if (n.tipo === 'nuevo_caso') return true;

        // B) Petición/Solicitud de Materiales
        if (n.tipo === 'materiales' || (n.mensaje && (n.mensaje.toLowerCase().includes('material') || n.mensaje.toLowerCase().includes('repuesto') || n.mensaje.toLowerCase().includes('petición')))) return true;

        // C) Culminación/Conclusión de Caso
        if (n.tipo === 'estado_cambio' && (n.estadoNuevo === 'concluido' || n.estadoNuevo === 'cerrado' || n.mensaje.toLowerCase().includes('concluid') || n.mensaje.toLowerCase().includes('solución'))) return true;

        return false;
      }

      // 3. GERENTE / ADMINISTRADOR: solo 2 eventos (Creación de Caso y Culminación de Caso)
      if (currentUser.rol === 'administrador') {
        // A) Creación de Caso
        if (n.tipo === 'nuevo_caso') return true;

        // B) Culminación/Conclusión de Caso
        if (n.tipo === 'estado_cambio' && (n.estadoNuevo === 'concluido' || n.estadoNuevo === 'cerrado' || n.mensaje.toLowerCase().includes('concluid') || n.mensaje.toLowerCase().includes('cerrad') || n.mensaje.toLowerCase().includes('solución'))) return true;

        return false;
      }

      // 4. JEFE O SUBJEFE DE TIENDA: Notificar de CUALQUIER comentario o cambio de estado en los casos de su tienda
      if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
        if (n.tiendaId !== currentUser.tiendaId) return false;
        // Notificar de cualquier comentario (de supervisor, técnico o admin) en su tienda
        if (n.tipo === 'comentario') return true;
        if (n.tipo === 'estado_cambio') return true;
        if (n.tipo === 'materiales') return true;
        return false;
      }

      return false;
    });
  };

  // Auto-cargar datos de facturación del supervisor correspondiente según el caso/tienda seleccionados
  useEffect(() => {
    if (showFacturacionModal) {
      if (selectedCaseId && !facturacionCasoId) {
        setFacturacionCasoId(selectedCaseId);
      }
      let targetSupName = "Luis Vallejos";
      if (facturacionCasoId) {
        const c = cases.find(item => item.id === facturacionCasoId);
        const st = c ? stores.find(s => s.id === c.tiendaId) : null;
        if (st?.supervisorName && billingProfiles[st.supervisorName]) {
          targetSupName = st.supervisorName;
        }
      } else if (currentUser?.rol === 'supervisor' && billingProfiles[currentUser.nombre]) {
        targetSupName = currentUser.nombre;
      }

      const prof = billingProfiles[targetSupName] || billingProfiles["Luis Vallejos"];
      if (prof && facturacionProfileMode === 'default_supervisor') {
        setFacturacionRuc(prof.ruc);
        setFacturacionRazonSocial(prof.razonSocial);
        setFacturacionDireccion(prof.direccion);
        setFacturacionEmail(prof.email);
        setFacturacionTelefono(prof.telefono);
      }
    }
  }, [showFacturacionModal, facturacionCasoId, facturacionProfileMode, billingProfiles, currentUser]);

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const unreadNotifsCount = getFilteredNotifications().filter(n => !readNotifIds.includes(n.id)).length;

  return (
    <div className={`app-root ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      
      {/* 1. AUTH SCREEN */}
      {!currentUser ? (
        <div className="auth-wrapper">
          
          {/* Left panel: Logo, Slogan, and stats */}
          <div className="auth-left">
            <div className="auth-subtitle-portal">
              Portal de Soporte
            </div>
            <h1 className="auth-title-large">
              Gestión de Mantenimientos
              <span> y Soporte</span>
            </h1>
          </div>

          {/* Right panel: Login form */}
          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-header">
                <span style={{ fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>- Acceso Seguro</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 4px 0', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Bienvenido de vuelta</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Ingresa tus credenciales para acceder al sistema.</p>
              </div>

              <form onSubmit={handleLoginSubmit} autoComplete="on">
                <div className="underline-input-group">
                  <label className="underline-label" htmlFor="username">Usuario</label>
                  <input 
                    id="username"
                    name="username"
                    type="text" 
                    autoComplete="username"
                    className="underline-input" 
                    placeholder="ej. SUP_LV" 
                    value={loginUser}
                    onChange={e => setLoginUser(e.target.value)}
                    required
                  />
                </div>

                <div className="underline-input-group" style={{ marginTop: '12px' }}>
                  <label className="underline-label" htmlFor="pass">Contraseña</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input 
                      id="pass"
                      name="password"
                      type={showLoginPassword ? "text" : "password"} 
                      autoComplete="current-password"
                      className="underline-input" 
                      placeholder="••••••••" 
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      required
                      style={{ paddingRight: '42px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      title={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      {showLoginPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
                  <input 
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="remember" style={{ fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
                    💾 Recordar credenciales en este dispositivo
                  </label>
                </div>

                {loginError && (
                  <div style={{ color: 'var(--color-critical)', fontSize: '0.85rem', margin: '10px 0 15px 0' }}>
                    ⚠️ {loginError}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                  ENTRAR →
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>🔒 Conexión segura y cifrada</span>
              </div>
            </div>
          </div>

        </div>
      ) : (

        /* 2. MAIN APPLICATION CONTENT */
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* HEADER */}
          <header className="app-header">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              style={{ display: 'none' }} /* index.css overrides this on mobile */
            >
              ☰
            </button>
            <div className="header-brand" onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }} style={{ cursor: 'pointer' }}>
              <span>⚙️ Gestión & Soporte</span>
            </div>

            <div className="header-user-section">
              {/* Notification Bell Button (Opens Modal) */}
              <div className="notif-bell-container">
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowNotifModal(true)} 
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                  🔔 {unreadNotifsCount > 0 && <span className="notif-badge">{unreadNotifsCount}</span>}
                </button>
              </div>

              {/* Botón para solicitar Notificaciones en Chrome / Navegador PC */}
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    Notification.requestPermission().then(p => {
                      if (p === 'granted') {
                        triggerNativeNotification('🔔 Alertas Activadas', 'Recibirás notificaciones emergentes de Chrome cuando haya novedades en tus casos.');
                      }
                    });
                  }}
                  style={{ background: 'rgba(234, 179, 8, 0.18)', color: '#EAB308', border: '1px solid #EAB308', fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700 }}
                >
                  🔔 Activar Alertas Chrome
                </button>
              )}

              {/* Clean User Profile Pill (ONLY BELL AND USER NAME) */}
              <div className="user-profile-pill">
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? 'var(--color-pending)' :
                    currentUser.rol === 'tecnico' ? 'var(--color-resolved)' :
                    currentUser.rol === 'supervisor' ? 'var(--color-in-progress)' : 'var(--color-closed)',
                  flexShrink: 0
                }}></span>
                <span className="user-pill-name">{currentUser.nombre}</span>
              </div>
            </div>
          </header>

          <div className={`app-container ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
            {isMobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>}
            
            {/* SIDEBAR NAVIGATION */}
            <aside className="sidebar">
              {/* Top Store Badge Card */}
              <div className="sidebar-store-card">
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: 800, letterSpacing: '0.06em' }}>
                  Sede / Ubicación
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏬 {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (stores.find(s => s.id === currentUser.tiendaId)?.nombre || 'Tienda Activa')}
                  {currentUser.rol === 'tecnico' && 'Área Técnica Operativa'}
                  {currentUser.rol === 'supervisor' && 'Supervisión General'}
                  {currentUser.rol === 'administrador' && 'Acceso Administrador'}
                </div>
              </div>

              {/* Navigation Group 1: Casos */}
              <div className="sidebar-section-header">📊 Estado de Casos</div>
              <ul className="sidebar-menu">
                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('todos'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>📄 Todos los Casos</span>
                    <span className="sidebar-count-pill">{cases.length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'pendiente' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('pendiente'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏳ Pendientes</span>
                    <span className="sidebar-count-pill">{cases.filter(c => c.estado === 'pendiente').length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'en_proceso' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('en_proceso'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⚡ En Proceso</span>
                    <span className="sidebar-count-pill">{cases.filter(c => c.estado === 'en_proceso').length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'pausado_material' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('pausado_material' as any); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏸️ Pausados por Material</span>
                    <span className="sidebar-count-pill" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#D97706' }}>
                      {cases.filter(c => c.pausado_por_material).length}
                    </span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'completado' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('completado'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>✅ Completados</span>
                    <span className="sidebar-count-pill">{cases.filter(c => c.estado === 'concluido' || c.estado === 'cerrado').length}</span>
                  </div>
                </li>
              </ul>

              {/* Navigation Group 2: Módulos */}
              <div className="sidebar-section-header" style={{ marginTop: '14px' }}>⚙️ Módulos</div>
              <ul className="sidebar-menu">
                {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (
                  <li>
                    <div className="sidebar-subitem" onClick={() => { setShowNewCaseModal(true); setIsMobileSidebarOpen(false); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      <span>➕ Crear Nuevo Caso</span>
                    </div>
                  </li>
                )}

                {(currentUser.rol === 'tecnico' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador' || currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (
                  <li>
                    <div
                      className={`sidebar-subitem ${activeTab === 'tecnicos_actividad' ? 'active' : ''}`}
                      onClick={() => { setSelectedCaseId(null); setActiveTab('tecnicos_actividad'); setIsMobileSidebarOpen(false); }}
                    >
                      <span>⚡ Actividad En Tienda (En Curso)</span>
                      <span className="sidebar-count-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                        {cases.filter(c => (c.estado === 'en_proceso' || c.hora_entrada) && !c.hora_salida && c.estado !== 'concluido' && c.estado !== 'cerrado').length}
                      </span>
                    </div>
                  </li>
                )}

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'historial_asistencias' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('historial_asistencias'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>✅ Trabajos Concluidos y Salidas</span>
                    <span className="sidebar-count-pill">
                      {cases.filter(c => c.estado === 'concluido' || c.estado === 'cerrado' || Boolean(c.hora_salida)).length}
                    </span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'agenda_turnos' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('agenda_turnos'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>📅 Agenda y Turnos Programados</span>
                    <span className="sidebar-count-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                      {cases.filter(c => Boolean(c.fecha_programada) && c.estado !== 'concluido' && c.estado !== 'cerrado' && isCaseVisibleToUser(c, currentUser)).length}
                    </span>
                  </div>
                </li>

                {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                  <li>
                    <div
                      className={`sidebar-subitem ${activeTab === 'disponibilidad' ? 'active' : ''}`}
                      onClick={() => { setSelectedCaseId(null); setActiveTab('disponibilidad'); setIsMobileSidebarOpen(false); }}
                    >
                      <span>📅 Disponibilidad Personal</span>
                    </div>
                  </li>
                )}

                {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                  <li>
                    <div
                      className="sidebar-subitem"
                      onClick={() => { if (selectedCaseId) setFacturacionCasoId(selectedCaseId); setShowFacturacionModal(true); setIsMobileSidebarOpen(false); }}
                    >
                      <span>🧾 Datos de Facturación</span>
                    </div>
                  </li>
                )}

                {currentUser.rol === 'administrador' && (
                  <li>
                    <div
                      className={`sidebar-subitem ${activeTab === 'admin' ? 'active' : ''}`}
                      onClick={() => { setSelectedCaseId(null); setActiveTab('admin'); setIsMobileSidebarOpen(false); }}
                    >
                      <span>🛠️ Panel de Control</span>
                    </div>
                  </li>
                )}
              </ul>

              {/* Single Bottom Footer Wrapper (Elevated for 3-Button & Gesture Nav) */}
              <div style={{ marginTop: 'auto', paddingTop: '16px', paddingBottom: 'max(40px, calc(30px + env(safe-area-inset-bottom, 0px)))', marginBottom: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '8px 10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>🛠️ Soporte Técnico & Errores:</span>
                  <a href="https://wa.me/593978764148?text=Hola,%20necesito%20asistencia%20en%20ManteTiendas" target="_blank" rel="noopener noreferrer" style={{ color: '#10B981', textDecoration: 'none', fontWeight: 700 }}>
                    📱 WhatsApp: 0978764148
                  </a>
                  <a href="mailto:dl198349@gmail.com?subject=Soporte%20ManteTiendas" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}>
                    ✉️ dl198349@gmail.com
                  </a>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={toggleTheme}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                >
                  {isDarkMode ? '🌞 Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro'}
                </button>

                {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setIsFirstLoginChange(false);
                      setShowChangePasswordModal(true);
                    }}
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                  >
                    🔑 Cambiar Contraseña
                  </button>
                )}

                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleLogout}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="main-content">
              
              {/* VIEW A: TICKET DETAILS */}
              {selectedCaseId && selectedCase ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Back button */}
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCaseId(null)} style={{ alignSelf: 'flex-start' }}>
                    ← Volver al listado
                  </button>

                  {selectedCase.reaperturas_count !== undefined && selectedCase.reaperturas_count >= 3 && (
                    <div className="reopen-warning-banner" style={{ background: '#450a0a', border: '2px solid #ef4444', color: '#fca5a5', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                        🚨 ALERTA CRÍTICA: CASO REABIERTO {selectedCase.reaperturas_count} VECES
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5, color: '#fecaca' }}>
                        <strong>¡ATENCIÓN TÉCNICOS Y SUPERVISIÓN!</strong> Las intervenciones previas no han resuelto el problema definitivamente. <strong>SE REQUIERE BUSCAR OTRA ALTERNATIVA TÉCNICA URGENTE</strong> (reemplazo completo de equipo, repuestos distintos o evaluación estructural) ya que lo realizado anteriormente no está funcionando.
                      </p>
                    </div>
                  )}

                  <div className="detail-layout">
                    {/* Left Panel: Primary Info */}
                    <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                          Caso #{getCaseDisplayCode(selectedCase)}
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!selectedCase.es_caso_tecnico && (
                            <span className={`badge badge-priority badge-priority-${selectedCase.prioridad}`}>
                              {getPriorityLabel(selectedCase.prioridad)}
                            </span>
                          )}
                          <span className={`badge badge-status ${selectedCase.estado}`}>
                            {getStatusText(selectedCase.estado)}
                          </span>
                        </div>
                      </div>

                      <h2 className="detail-card-title">{selectedCase.categoria}</h2>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div>🏬 Tienda: <strong style={{ color: 'var(--text-main)' }}>{stores.find(s => s.id === selectedCase.tiendaId)?.nombre}</strong></div>
                        <div>👤 Reportó: <strong style={{ color: 'var(--text-main)' }}>{users.find(u => u.id === selectedCase.creadoPor)?.nombre}</strong></div>
                        <div>📅 Creado: <strong>{new Date(selectedCase.fechaCreacion).toLocaleString()}</strong></div>
                        {!selectedCase.es_caso_tecnico && (
                          <div>🚨 Limite SLA: <strong style={{ color: isSlaBreached(selectedCase) && (selectedCase.estado === 'pendiente' || selectedCase.estado === 'en_proceso') ? 'var(--color-critical)' : 'inherit' }}>
                            {new Date(selectedCase.fechaLimiteSla).toLocaleString()}
                            {isSlaBreached(selectedCase) && (selectedCase.estado === 'pendiente' || selectedCase.estado === 'en_proceso') && ' (FUERA DE SLA)'}
                          </strong></div>
                        )}
                      </div>

                      <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '0.92rem' }}>
                        <p style={{ whiteSpace: 'pre-line', color: 'var(--text-main)' }}>{selectedCase.descripcion}</p>
                      </div>

                      {/* Evidence Photo Section */}
                      {selectedCase.evidencias.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Foto de Evidencia</h4>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {selectedCase.evidencias.map(ev => (
                              <div key={ev.id} style={{ maxWidth: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                <img src={ev.archivoUrl} alt="final-ev" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                <div style={{ fontSize: '0.7rem', padding: '5px', textAlign: 'center', background: 'rgba(0,0,0,0.1)' }}>
                                  {selectedCase.es_caso_tecnico ? `Evidencia por ${ev.subidoPor}` : 
                                   ev.tipo === 'final' ? `Solución por ${ev.subidoPor}` : `Evidencia Inicial por ${ev.subidoPor}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log History */}
                      <div>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Historial y Auditoría</h4>
                        <div className="history-timeline">
                          {selectedCase.historial.map((h, i) => (
                            <div key={h.id} className="history-node">
                              <div className={`history-dot ${i === selectedCase.historial.length - 1 ? 'active' : ''}`}></div>
                              <div className="history-content">
                                <span className="history-time">{new Date(h.fecha).toLocaleString()}</span>
                                <span className="history-text">
                                  <strong>{h.usuario}</strong> cambió el estado a <span style={{ textTransform: 'capitalize' }}>{getStatusText(h.estadoNuevo)}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel: Actions & Comments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Actions Card */}
                      <div className="detail-card">
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--text-main)' }}>Acciones de Solicitud</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          
                                                    {/* Badge si hay 2 técnicos trabajando en equipo */}
                          {(selectedCase.tecnico_presencial_nombre || selectedCase.tecnico_apoyo_nombre) && (
                            <div style={{ background: 'var(--bg-color)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--primary)' }}>
                                {selectedCase.tecnico_apoyo_nombre ? '👥 Equipo de Técnicos Asignados' : '👷 Técnico a Cargo'}
                              </h4>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span>- <strong>Técnico 1:</strong> {selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre}</span>
                                {selectedCase.tecnico_apoyo_nombre && (
                                  <span>- <strong>Técnico 2 (Apoyo):</strong> {selectedCase.tecnico_apoyo_nombre}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* BOTONES DE PAUSA POR MATERIALES Y CONFIRMACIÓN DE LLEGADA DE REPUESTOS */}
                          {selectedCase.pausado_por_material ? (
                            <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '2px dashed #EAB308', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706', fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>
                                ⏸️ CASO EN PAUSA POR FALTA DE MATERIALES / PRESUPUESTO
                              </div>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '4px 0 10px 0', lineHeight: 1.4 }}>
                                <strong>Motivo de la pausa:</strong> "{selectedCase.motivo_pausa_material || 'Sin presupuesto o esperando compra este mes'}"
                              </p>
                              
                              {/* Botón para que el Jefe de Tienda / Subjefe o Supervisor confirme la llegada del material */}
                              {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleConfirmMaterialsArrived(selectedCase.id)}
                                  style={{ width: '100%', background: '#10B981', fontWeight: 700, padding: '10px', fontSize: '0.88rem' }}
                                >
                                  📦 Confirmar: ¡Ya llegaron los materiales a tienda!
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Botón para Pausar por Materiales solo permitido a Locales (Jefes/Subjefes), Supervisores y Admins */
                            (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.estado !== 'cerrado' && selectedCase.estado !== 'concluido' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setPauseReasonInput('');
                                  setShowPauseMaterialModal(true);
                                }}
                                style={{ width: '100%', marginBottom: '12px', borderColor: '#EAB308', color: '#D97706', background: 'rgba(234, 179, 8, 0.08)', fontWeight: 700, padding: '8px' }}
                              >
                                ⏸️ Pausar Caso por Falta de Presupuesto / Materiales
                              </button>
                            )
                          )}

                          {/* Supervisor Tech Assignment flow (Simple Clean Dropdown) */}
                          {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.estado === 'pendiente' && (
                            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)' }}>
                              <label className="field-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Asignar Técnico:</label>
                              <select 
                                className="input-box"
                                value={selectedAssignTechId || ''}
                                onChange={e => setSelectedAssignTechId(Number(e.target.value))}
                                style={{ marginBottom: '8px' }}
                              >
                                <option value="">-- Seleccionar Técnico --</option>
                                {users.filter(u => u.rol === 'tecnico').map(u => (
                                  <option key={u.id} value={u.id}>{u.nombre}</option>
                                ))}
                                {users.filter(u => u.rol === 'tecnico').length >= 2 && (
                                  <option value="999">👥 ASIGNAR A AMBOS TÉCNICOS ({users.filter(u => u.rol === 'tecnico').map(u => u.nombre).join(' Y ')})</option>
                                )}
                              </select>
                              <button 
                                className="btn btn-primary btn-sm" 
                                disabled={!selectedAssignTechId}
                                onClick={() => {
                                  if (selectedAssignTechId === 999) {
                                    const techs = users.filter(u => u.rol === 'tecnico');
                                    handleSupervisorAssignTeam(selectedCase.id, techs[0].id, techs[1].nombre);
                                  } else {
                                    handleSupervisorAssignTech(selectedCase.id, selectedAssignTechId!);
                                  }
                                }}
                                style={{ width: '100%', fontWeight: 700 }}
                              >
                                Confirmar Asignación
                              </button>
                            </div>
                          )}

                          {/* Technician flow */}
                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'pendiente' && (
                            <button className="btn btn-primary" onClick={() => {
                              setTakeCaseMode('solo');
                              setTakeCaseSupportTech('');
                              setShowTakeCaseModal(true);
                            }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              🔧 Iniciar Trabajo (Tomar caso)
                            </button>
                          )}

                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'en_proceso' && selectedCase.tecnicoAsignadoId === currentUser.id && (
                            <button className="btn btn-primary" onClick={() => setShowSolveModal(true)} style={{ width: '100%', background: 'var(--color-resolved)' }}>
                              ✅ Completar y Cerrar Mantenimiento
                            </button>
                          )}

                          {/* TARJETA DE SOLICITUD ANTICIPADA DE MATERIALES Y APROBACIÓN DE SUPERVISOR */}
                          {selectedCase.solicitud_material_anticipada && selectedCase.material_anticipado_nombre && (
                            <div className="detail-card" style={{ background: selectedCase.material_anticipado_estado === 'aprobado' ? 'rgba(16, 185, 129, 0.08)' : selectedCase.material_anticipado_estado === 'rechazado' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${selectedCase.material_anticipado_estado === 'aprobado' ? '#10B981' : selectedCase.material_anticipado_estado === 'rechazado' ? '#EF4444' : '#F59E0B'}`, borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>📦 Material Solicitado por Tienda:</span>
                                <span className="badge" style={{ background: selectedCase.material_anticipado_estado === 'aprobado' ? '#10B981' : selectedCase.material_anticipado_estado === 'rechazado' ? '#EF4444' : '#F59E0B', color: '#fff', fontSize: '0.68rem' }}>
                                  {selectedCase.material_anticipado_estado === 'aprobado' ? '✅ Aprobado por Supervisor' : selectedCase.material_anticipado_estado === 'rechazado' ? '❌ Rechazado' : '🟡 Pendiente Aprobación'}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', fontWeight: 700 }}>
                                🔹 {selectedCase.material_anticipado_nombre} (x{selectedCase.material_anticipado_cantidad || 1})
                              </div>

                              {selectedCase.material_anticipado_aprobado_por && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  👤 Aprobado por: {selectedCase.material_anticipado_aprobado_por}
                                </div>
                              )}

                              {/* Acciones del Supervisor para Aprobar o Rechazar Solicitud Anticipada */}
                              {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.material_anticipado_estado === 'pendiente_aprobacion' && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => {
                                      const now = new Date().toISOString();
                                      setCases(prev => prev.map(c => c.id === selectedCase.id ? { ...c, material_anticipado_estado: 'aprobado', material_anticipado_aprobado_por: currentUser.nombre } : c));
                                      if (isSupabaseConfigured) {
                                        supabase.from('casos').update({ material_anticipado_estado: 'aprobado', material_anticipado_aprobado_por: currentUser.nombre }).eq('id', selectedCase.id);
                                        supabase.from('comentarios').insert([{ caso_id: selectedCase.id, autor: currentUser.nombre, rol: currentUser.rol, texto: `✅ APROBACIÓN DE MATERIAL: Supervisor ${currentUser.nombre} aprobó la solicitud de (${selectedCase.material_anticipado_nombre} x${selectedCase.material_anticipado_cantidad}).`, fecha: now }]);
                                      }
                                      pushNotification(`✅ Solicitud de Material Aprobada: ${selectedCase.material_anticipado_nombre} para Caso #${selectedCase.id}.`, 'materiales', { casoId: selectedCase.id, tiendaId: selectedCase.tiendaId });
                                    }}
                                    style={{ background: '#10B981', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flex: 1 }}
                                  >
                                    ✅ Aprobar Material
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => {
                                      setCases(prev => prev.map(c => c.id === selectedCase.id ? { ...c, material_anticipado_estado: 'rechazado' } : c));
                                      if (isSupabaseConfigured) {
                                        supabase.from('casos').update({ material_anticipado_estado: 'rechazado' }).eq('id', selectedCase.id);
                                      }
                                    }}
                                    style={{ background: '#EF4444', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flex: 1 }}
                                  >
                                    ❌ Rechazar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botón para Agendar Turno de Atención */}
                          {selectedCase.estado !== 'concluido' && selectedCase.estado !== 'cerrado' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenScheduleModal(selectedCase)}
                              style={{ width: '100%', marginTop: '6px', marginBottom: '8px', fontWeight: 700, borderColor: '#3B82F6', color: '#3B82F6' }}
                            >
                              📅 {selectedCase.fecha_programada ? '✏️ Re-agendar Turno / Cita' : '📅 Agendar Turno de Atención'}
                            </button>
                          )}

                          {/* Jefe Clock-in / Clock-out control */}
                          {((currentUser.rol === 'administrador') || ((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId)) && selectedCase.estado === 'en_proceso' && (
                            <div className="detail-card assistance-control-card" style={{ background: 'var(--bg-color)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>⏱️ Registro de Asistencia del Técnico</h4>
                              
                              {!selectedCase.hora_entrada ? (
                                <>
                                  <label className="field-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>Seleccione técnico presencial:</label>
                                  <select 
                                    className="input-box" 
                                    value={selectedPresencialTech} 
                                    onChange={e => setSelectedPresencialTech(e.target.value)}
                                    style={{ fontSize: '0.8rem', padding: '6px', marginBottom: '8px' }}
                                  >
                                    <option value="">-- Técnico --</option>
                                    {users.filter(u => u.rol === 'tecnico').map(u => (
                                      <option key={u.id} value={u.nombre}>{u.nombre}</option>
                                    ))}
                                  </select>
                                  <button 
                                    className="btn btn-primary btn-sm" 
                                    onClick={() => handleLogTechEntry(selectedCase.id, selectedPresencialTech)}
                                    disabled={!selectedPresencialTech}
                                    style={{ width: '100%' }}
                                  >
                                    Marcar Hora de Entrada
                                  </button>
                                </>
                              ) : !selectedCase.hora_salida ? (
                                <div>
                                  <p style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
                                    👷 Técnico <strong>{selectedCase.tecnico_presencial_nombre}</strong> ingresó a las: 
                                    <span style={{ color: 'var(--primary)', fontWeight: 750, marginLeft: '5px' }}>
                                      {new Date(selectedCase.hora_entrada).toLocaleTimeString()}
                                    </span>
                                  </p>
                                  <button 
                                    className="btn btn-danger btn-sm" 
                                    onClick={() => handleLogTechExit(selectedCase.id)}
                                    style={{ width: '100%' }}
                                  >
                                    Marcar Hora de Salida
                                  </button>
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  <p>✅ Registro de asistencia completo:</p>
                                  <p>👷 Técnico: <strong>{selectedCase.tecnico_presencial_nombre}</strong></p>
                                  <p>⏱️ Entrada: {new Date(selectedCase.hora_entrada).toLocaleTimeString()}</p>
                                  <p>⏱️ Salida: {new Date(selectedCase.hora_salida).toLocaleTimeString()}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Jefe / Admin Close case (Tienda específica) */}
                          {((currentUser.rol === 'administrador') || ((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId)) && selectedCase.estado === 'concluido' && (
                            <>
                              <button className="btn btn-primary" onClick={() => handleCloseCase(selectedCase.id)} style={{ width: '100%', background: 'var(--color-resolved)' }}>
                                🔒 Validar Solución y Cerrar Caso
                              </button>
                              
                              {!showReopenInput ? (
                                <button className="btn btn-danger" onClick={() => setShowReopenInput(true)} style={{ width: '100%' }}>
                                  🔄 Reabrir Caso (No quedó bien)
                                </button>
                              ) : (
                                <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '8px', background: 'var(--bg-color)' }}>
                                  <label className="field-label" style={{ color: 'var(--color-critical)', marginBottom: '5px' }}>¿Por qué se reabre?:</label>
                                  <textarea 
                                    className="input-box" 
                                    style={{ minHeight: '60px', fontSize: '0.85rem' }} 
                                    placeholder="Indique detalladamente el problema..." 
                                    value={reopenReason}
                                    onChange={e => setReopenReason(e.target.value)}
                                  />
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleReopenCase(selectedCase.id)}>Confirmar</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowReopenInput(false)}>Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {selectedCase.estado === 'cerrado' && (
                            <div>
                              {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? (
                                <div>
                                  {!showReopenInput ? (
                                    <button 
                                      className="btn btn-warning" 
                                      style={{ width: '100%', padding: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                      onClick={() => setShowReopenInput(true)}
                                    >
                                      🔄 Reabrir Caso por Incumplimiento
                                    </button>
                                  ) : (
                                    <div style={{ padding: '10px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--warning-color)' }}>
                                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--warning-color)', display: 'block', marginBottom: '4px' }}>
                                        Motivo de Reapertura (Obligatorio):
                                      </label>
                                      <textarea
                                        className="input-box"
                                        style={{ minHeight: '60px', fontSize: '0.85rem' }}
                                        placeholder="Indique detalladamente por qué se reabre el caso..."
                                        value={reopenReason}
                                        onChange={e => setReopenReason(e.target.value)}
                                      />
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleReopenCase(selectedCase.id)}>Confirmar Reapertura</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowReopenInput(false)}>Cancelar</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
                                  🔒 CASO CERRADO Y VALIDADO
                                </div>
                              )}
                            </div>
                          )}

                          {selectedCase.estado === 'pendiente' && currentUser.rol !== 'tecnico' && (
                            <div style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              Esperando asignación de técnico...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Material requests card */}
                      {selectedCase.estado === 'en_proceso' && (
                        <div className="detail-card" style={{ marginTop: '0px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>📦 Petición de Materiales</h3>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                              onClick={() => {
                                setFacturacionCasoId(selectedCase.id);
                                const storeObj = stores.find(s => s.id === selectedCase.tiendaId);
                                const supName = (storeObj as any)?.supervisorName || (selectedCase as any)?.supervisorNombre || 'Luis Vallejos';
                                const profile = SUPERVISOR_BILLING_PROFILES[supName] || SUPERVISOR_BILLING_PROFILES["Luis Vallejos"];

                                setFacturacionRuc(profile.ruc);
                                setFacturacionRazonSocial(profile.razonSocial);
                                setFacturacionDireccion(profile.direccion);
                                setFacturacionEmail(profile.email);
                                setFacturacionTelefono(profile.telefono);
                                setShowFacturacionModal(true);
                              }}
                            >
                              🧾 Ver / Enviar Datos de Facturación
                            </button>
                          </div>
                          
                          {/* List of requests for this case */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                            {materialRequests.filter(r => r.casoId === selectedCase.id).length === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                                No hay solicitudes de materiales para este caso.
                              </span>
                            ) : (
                              materialRequests.filter(r => r.casoId === selectedCase.id).map(r => (
                                <div key={r.id} className="material-request-row">
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 650, color: 'var(--text-main)' }}>{r.descripcion}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      Por: {users.find(u => u.id === r.tecnicoId)?.nombre || 'Técnico'}
                                    </span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <span className={`material-status ${r.estado}`}>
                                      {r.estado}
                                    </span>
                                    
                                    {/* Supervisor Actions */}
                                    {r.estado === 'pendiente' && (currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                                      <div style={{ display: 'flex', gap: '3px' }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleApproveMaterialRequest(r.id)} style={{ padding: '2px 6px', fontSize: '0.7rem', background: 'var(--color-resolved)' }}>✓</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDenyMaterialRequest(r.id)} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>✗</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Form for Technician to request materials using Official Catalog */}
                          {currentUser.rol === 'tecnico' && selectedCase.tecnicoAsignadoId === currentUser.id && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <label className="field-label" style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                                  📦 Nueva Petición de Materiales y Repuestos:
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${materialInputMode === 'catalogo' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setMaterialInputMode('catalogo')}
                                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                  >
                                    📋 Catálogo Base
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${materialInputMode === 'libre' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setMaterialInputMode('libre')}
                                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                  >
                                    ✏️ Texto Libre
                                  </button>
                                </div>
                              </div>

                              {materialInputMode === 'catalogo' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-color)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                                  
                                  {/* BUSCADOR AUTOCOMPLETADO INTELIGENTE (CERO LISTAS GIGANTES DE NAVEGADOR) */}
                                  <div style={{ position: 'relative' }}>
                                    <label className="field-label" style={{ fontSize: '0.74rem', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                                      🔍 Escriba o busque el repuesto/material *:
                                    </label>
                                    <input 
                                      type="text"
                                      className="input-box"
                                      placeholder="Ej: Foco, aceite, zapata, tubo, tornillo, cinta..."
                                      value={materialSearchQuery}
                                      onChange={e => {
                                        setMaterialSearchQuery(e.target.value);
                                        setIsMaterialPickerOpen(true);
                                      }}
                                      onFocus={() => setIsMaterialPickerOpen(true)}
                                      style={{ fontSize: '0.85rem', padding: '8px 10px', minHeight: '38px', fontWeight: 600 }}
                                    />

                                    {/* LISTA FLOTANTE DE BÚSQUEDA INTERNA (SIN PANTALLA COMPLETA DE ANDROID) */}
                                    {isMaterialPickerOpen && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 100,
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--primary)',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                        maxHeight: '210px',
                                        overflowY: 'auto',
                                        marginTop: '4px',
                                        padding: '4px'
                                      }}>
                                        {materialCatalog
                                          .filter(m => {
                                            if (!materialSearchQuery.trim()) return true;
                                            const q = materialSearchQuery.toLowerCase();
                                            return m.nombre.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q) || m.medidasSpecs.toLowerCase().includes(q);
                                          })
                                          .slice(0, 8)
                                          .map(m => (
                                            <div
                                              key={m.id}
                                              onClick={() => {
                                                setSelectedCatalogId(m.id);
                                                setMaterialSearchQuery(`${m.nombre} (${m.marca.split('/')[0].trim()})`);
                                                setIsMaterialPickerOpen(false);
                                              }}
                                              style={{
                                                padding: '8px 10px',
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px',
                                                backgroundColor: selectedCatalogId === m.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                                              }}
                                            >
                                              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                {m.nombre}
                                              </div>
                                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                🏷️ {m.marca} • 📐 {m.medidasSpecs}
                                              </div>
                                            </div>
                                          ))
                                        }
                                        {materialCatalog.filter(m => {
                                          if (!materialSearchQuery.trim()) return true;
                                          const q = materialSearchQuery.toLowerCase();
                                          return m.nombre.toLowerCase().includes(q) || m.marca.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q);
                                        }).length === 0 && (
                                          <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            No hay repuestos exactos. Puedes usar la búsqueda como texto libre.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Resumen de especificaciones del item seleccionado */}
                                  {(() => {
                                    const selectedItem = materialCatalog.find(m => m.id === selectedCatalogId) || materialCatalog[0];
                                    return (
                                      <div style={{ fontSize: '0.73rem', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.08)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        📌 <strong>Seleccionado:</strong> {selectedItem.nombre} | 🏷️ {selectedItem.marca} • 📐 {selectedItem.medidasSpecs} ({selectedItem.unidadMedida})
                                      </div>
                                    );
                                  })()}

                                  {/* Fila: Cantidad y Nota resumida */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                                    <div>
                                      <label className="field-label" style={{ fontSize: '0.72rem', marginBottom: '2px', display: 'block' }}>Cant. *:</label>
                                      <input 
                                        type="number"
                                        min="1"
                                        className="input-box"
                                        value={materialQuantity}
                                        onChange={e => setMaterialQuantity(Math.max(1, Number(e.target.value)))}
                                        style={{ fontSize: '0.84rem', padding: '6px 10px', minHeight: '36px' }}
                                      />
                                    </div>
                                    <div>
                                      <label className="field-label" style={{ fontSize: '0.72rem', marginBottom: '2px', display: 'block' }}>Nota / Especificación Extra:</label>
                                      <input 
                                        type="text"
                                        className="input-box"
                                        placeholder="Ej. Para ascensor principal..."
                                        value={materialCustomNote}
                                        onChange={e => setMaterialCustomNote(e.target.value)}
                                        style={{ fontSize: '0.84rem', padding: '6px 10px', minHeight: '36px' }}
                                      />
                                    </div>
                                  </div>

                                  <button 
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                      const item = materialCatalog.find(m => m.id === selectedCatalogId) || materialCatalog[0];
                                      const fullDesc = materialSearchQuery.trim() && !materialSearchQuery.toLowerCase().includes(item.nombre.toLowerCase().slice(0, 5))
                                        ? `📦 ${materialSearchQuery.trim()} | Cantidad: ${materialQuantity}${materialCustomNote.trim() ? ` (${materialCustomNote.trim()})` : ''}`
                                        : `📦 ${item.nombre} | Marca: ${item.marca} | Specs: ${item.medidasSpecs} | Cantidad: ${materialQuantity} ${item.unidadMedida}${materialCustomNote.trim() ? ` (${materialCustomNote.trim()})` : ''}`;
                                      
                                      handleCreateMaterialRequest(selectedCase.id, fullDesc);
                                      setMaterialCustomNote('');
                                      setMaterialSearchQuery('');
                                      setMaterialQuantity(1);
                                      setIsMaterialPickerOpen(false);
                                    }}
                                    style={{ width: '100%', marginTop: '2px', fontWeight: 700, padding: '8px' }}
                                  >
                                    ➕ Enviar Petición de Repuesto
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea 
                                    className="input-box"
                                    placeholder="Escriba repuestos o herramientas específicas (Ej: Cinta aislante, tubo pvc, bombillas...)"
                                    value={newMaterialDesc}
                                    onChange={e => setNewMaterialDesc(e.target.value)}
                                    style={{ minHeight: '60px', fontSize: '0.85rem', padding: '8px' }}
                                  />
                                  <button 
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleCreateMaterialRequest(selectedCase.id, newMaterialDesc)}
                                    disabled={!newMaterialDesc.trim()}
                                    style={{ width: '100%' }}
                                  >
                                    Enviar Petición Personalizada
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Comments Card */}
                      <div className="detail-card">
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--text-main)' }}>Comentarios y Notas</h3>

                        {selectedCase.estado !== 'cerrado' && (
                          <form onSubmit={(e) => handleAddComment(e, selectedCase.id)} style={{ marginBottom: '15px' }}>
                            <textarea 
                              className="input-box" 
                              placeholder="Escribe una actualización o nota..."
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              required
                              style={{ minHeight: '60px', fontSize: '0.875rem' }}
                            />
                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '8px', float: 'right' }}>
                              Comentar
                            </button>
                          </form>
                        )}
                        <div style={{ clear: 'both' }}></div>

                        <div className="comments-list">
                          {selectedCase.comentarios.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>No hay comentarios todavía.</p>
                          ) : (
                            selectedCase.comentarios.map(c => (
                              <div key={c.id} className="comment-bubble">
                                <div className="comment-meta">
                                  <strong>{c.autor} ({c.rol === 'jefe_tienda' ? 'Jefe' : c.rol})</strong>
                                  <span>{new Date(c.fecha).toLocaleTimeString()}</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{c.texto}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              ) : activeTab === 'admin' && currentUser.rol === 'administrador' ? (
                
                /* VIEW B: UNIFIED ADMIN PANEL */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* SECCIÓN 1: GESTIÓN DE USUARIOS */}
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '15px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      👤 Gestión de Usuarios
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                      {/* Left: Add/Edit user form */}
                      <div className="detail-card">
                        <h3 className="detail-card-title">{editingUserId !== null ? '✏️ Editar Usuario' : 'Registrar Usuario'}</h3>
                        <form onSubmit={handleAdminUserSubmit}>
                          <div className="field-group">
                            <label className="field-label">Nombre Completo</label>
                            <input className="input-box" type="text" placeholder="Ej. Pedro Picapiedra" value={admName} onChange={e => setAdmName(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Correo electrónico</label>
                            <input className="input-box" type="email" placeholder="pedro@marathon.com" value={admEmail} onChange={e => setAdmEmail(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Usuario Acceso</label>
                            <input className="input-box" type="text" placeholder="pedro.maint" value={admUsername} onChange={e => setAdmUsername(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Contraseña</label>
                            <input 
                              className="input-box" 
                              type="text" 
                              placeholder={editingUserId !== null ? "Dejar en blanco para conservar contraseña" : "Contraseña de acceso"} 
                              value={admContrasena} 
                              onChange={e => setAdmContrasena(e.target.value)} 
                              required={editingUserId === null}
                            />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Rol</label>
                            <select className="input-box" value={admRole} onChange={e => setAdmRole(e.target.value as any)}>
                              <option value="jefe_tienda">Local (Tienda)</option>
                              <option value="subjefe">Subjefe (Local)</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="tecnico">Técnico Mantenimiento</option>
                            </select>
                          </div>
                          {(admRole === 'jefe_tienda' || admRole === 'subjefe') && (
                            <div className="field-group">
                              <label className="field-label">Tienda Asignada</label>
                              <input 
                                type="text"
                                className="input-box"
                                placeholder="Ej. Marathon CCI, Marathon Manta..."
                                value={admTiendaNombre}
                                onChange={e => setAdmTiendaNombre(e.target.value)}
                                required
                              />
                            </div>
                          )}
                          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            {editingUserId !== null ? 'Guardar Cambios' : 'Crear Cuenta'}
                          </button>
                          {editingUserId !== null && (
                            <button type="button" className="btn btn-secondary" onClick={handleCancelEditUser} style={{ width: '100%', marginTop: '8px' }}>
                              Cancelar Edición
                            </button>
                          )}
                        </form>
                      </div>

                      {/* Right: users list */}
                      <div className="detail-card">
                        <h3 className="detail-card-title">Cuentas Registradas</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {users.map(u => (
                            <div key={u.id} className="admin-card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--text-main)' }}>{u.nombre}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.usuario} • {u.rol.replace('_', ' ')}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleStartEditUser(u)}>✏️</button>
                                <button className={`btn btn-sm ${u.estado ? 'btn-danger' : 'btn-secondary'}`} onClick={() => handleAdminToggleUser(u.id)}>
                                  {u.estado ? 'Desactivar' : 'Activar'}
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleAdminDeleteUser(u.id)}>🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: GESTIÓN DE TIENDAS */}
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '15px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏬 Gestión de Tiendas de la Red
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                      {/* Left: Add/Edit store form */}
                      <div className="detail-card">
                        <h3 className="detail-card-title">{editingStoreId !== null ? '✏️ Editar Tienda' : 'Registrar Tienda'}</h3>
                        <form onSubmit={handleAdminStoreSubmit}>
                          <div className="field-group">
                            <label className="field-label">Nombre de la Tienda</label>
                            <input className="input-box" type="text" placeholder="Ej. Marathon CCI" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Ciudad</label>
                            <input className="input-box" type="text" placeholder="Ej. Quito" value={newStoreCity} onChange={e => setNewStoreCity(e.target.value)} required />
                          </div>
                          <div className="field-group">
                            <label className="field-label">Dirección</label>
                            <input className="input-box" type="text" placeholder="Av. Amazonas..." value={newStoreDir} onChange={e => setNewStoreDir(e.target.value)} required />
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            {editingStoreId !== null ? 'Guardar Cambios' : 'Registrar Tienda'}
                          </button>
                          {editingStoreId !== null && (
                            <button type="button" className="btn btn-secondary" onClick={handleCancelEditStore} style={{ width: '100%', marginTop: '8px' }}>
                              Cancelar Edición
                            </button>
                          )}
                        </form>
                      </div>

                      {/* Right: stores list */}
                      <div className="detail-card">
                        <h3 className="detail-card-title">Tiendas de la Red</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {stores.map(s => (
                            <div key={s.id} className="admin-card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--text-main)' }}>🏬 {s.nombre}</strong>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.ciudad} • {s.direccion}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleStartEditStore(s)}>✏️</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleAdminDeleteStore(s.id)}>🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : activeTab === 'tecnicos_actividad' ? (
                /* VIEW D: ACTIVIDAD EN TIENDA EN TIEMPO REAL (SOLO EN CURSO) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                        ⚡ Actividad En Tienda (Trabajos en Curso)
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Supervisión en vivo de técnicos que se encuentran laborando actualmente en las tiendas.
                      </p>
                    </div>
                    {currentUser.rol === 'tecnico' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowNewTechCaseModal(true)} style={{ fontWeight: 700 }}>
                        ➕ Reportar Trabajo
                      </button>
                    )}
                  </div>

                  {/* BARRA COMPACTA DE RESUMEN EN VIVO Y FILTROS */}
                  {(() => {
                    const activeCases = cases.filter(c => {
                      const isDone = c.estado === 'concluido' || c.estado === 'cerrado' || Boolean(c.hora_salida);
                      if (isDone) return false;
                      return c.es_caso_tecnico || c.tecnicoAsignadoId || c.tecnico_presencial_nombre || c.hora_entrada || c.estado === 'en_proceso';
                    });

                    const storesActiveCount = new Set(activeCases.map(c => c.tiendaId)).size;
                    const inStoreNowCount = activeCases.filter(c => c.hora_entrada && !c.hora_salida).length;

                    return (
                      <div className="detail-card" style={{ padding: '10px 14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: 700 }}>
                          <span style={{ color: 'var(--primary)' }}>🏬 Tiendas Atendidas: <strong>{storesActiveCount}</strong></span>
                          <span style={{ color: '#10B981' }}>🟢 Técnicos En Tienda: <strong>{inStoreNowCount}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>⚡ Actividades Activas: <strong>{activeCases.length}</strong></span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <select 
                            className="input-box"
                            value={techActivityStoreFilter}
                            onChange={e => setTechActivityStoreFilter(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                          >
                            <option value="todas">🏬 Todas las Tiendas</option>
                            {stores.map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </select>

                          <select 
                            className="input-box"
                            value={techActivityTechFilter}
                            onChange={e => setTechActivityTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                          >
                            <option value="todos">👷 Todos los Técnicos</option>
                            {users.filter(u => u.rol === 'tecnico').map(u => (
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  {/* LISTADO DE ACTIVIDADES ÚNICAMENTE EN CURSO */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const activeCases = cases.filter(c => {
                        const isDone = c.estado === 'concluido' || c.estado === 'cerrado' || Boolean(c.hora_salida);
                        if (isDone) return false;

                        const isTechRelated = c.es_caso_tecnico || c.tecnicoAsignadoId || c.tecnico_presencial_nombre || c.hora_entrada || c.estado === 'en_proceso';
                        if (!isTechRelated) return false;

                        if (techActivityStoreFilter !== 'todas' && c.tiendaId !== techActivityStoreFilter) return false;

                        if (techActivityTechFilter !== 'todos') {
                          const targetTech = users.find(u => u.id === techActivityTechFilter);
                          const isAssigned = c.tecnicoAsignadoId === techActivityTechFilter;
                          const isPresencial = targetTech && c.tecnico_presencial_nombre?.toLowerCase().includes(targetTech.nombre.toLowerCase());
                          const isApoyo = targetTech && c.tecnico_apoyo_nombre?.toLowerCase().includes(targetTech.nombre.toLowerCase());
                          if (!isAssigned && !isPresencial && !isApoyo) return false;
                        }

                        return true;
                      });

                      if (activeCases.length === 0) {
                        return (
                          <div className="detail-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            🟢 No hay técnicos laborando en tienda en este momento.
                          </div>
                        );
                      }

                      return activeCases.map(c => {
                        const storeObj = stores.find(s => s.id === c.tiendaId);
                        const assignedTech = users.find(u => u.id === c.tecnicoAsignadoId);
                        const primaryTechName = c.tecnico_presencial_nombre || assignedTech?.nombre || 'Técnico a cargo';
                        const apoyoName = c.tecnico_apoyo_nombre;
                        const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                        return (
                          <div 
                            key={c.id} 
                            className="premium-card detail-card" 
                            style={{ padding: '12px 16px', cursor: 'pointer', borderLeft: '4px solid #10B981' }}
                            onClick={() => setSelectedCaseId(c.id)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ flex: 1, minWidth: '260px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                    🏬 {storeObj?.nombre || `Tienda #${c.tiendaId}`}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    #{getCaseDisplayCode(c)}
                                  </span>
                                  <span className={`badge badge-status ${c.estado}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                    {getStatusText(c.estado)}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  👷 <strong>Técnico:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{primaryTechName}</span>
                                  {apoyoName && <span> y <span style={{ color: '#8B5CF6', fontWeight: 700 }}>{apoyoName}</span></span>} • <span style={{ color: 'var(--text-main)' }}>{c.categoria}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <span>📥 <strong>Entrada:</strong> {formatTime(c.hora_entrada) || 'En camino'}</span>
                                <strong style={{ color: '#10B981' }}>🟢 EN TIENDA TRABAJANDO</strong>
                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Ver →</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              ) : activeTab === 'historial_asistencias' ? (
                /* VIEW NUEVA: HISTORIAL DE TRABAJOS CONCLUIDOS Y REGISTRO DE SALIDAS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                        ✅ Trabajos Concluidos y Salidas de Tienda
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                        Registro histórico completo de intervenciones finalizadas, horas de entrada, salida y evidencias.
                      </p>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS PARA EL HISTORIAL */}
                  <div className="detail-card" style={{ padding: '10px 14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>🔍 Filtrar Historial:</span>
                    
                    {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        🏬 {stores.find(s => s.id === currentUser.tiendaId)?.nombre || 'Mi Tienda'}
                      </span>
                    ) : (
                      <select 
                        className="input-box"
                        value={techActivityStoreFilter}
                        onChange={e => setTechActivityStoreFilter(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                      >
                        <option value="todas">🏬 Todas las Tiendas</option>
                        {stores.filter(s => currentUser.rol === 'supervisor' ? (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(s.id)) : true).map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    )}

                    <select 
                      className="input-box"
                      value={techActivityTechFilter}
                      onChange={e => setTechActivityTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                    >
                      <option value="todos">👷 Todos los Técnicos</option>
                      {users.filter(u => u.rol === 'tecnico').map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* LISTADO DE TRABAJOS CONCLUIDOS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const completedCases = cases.filter(c => {
                        const isDone = c.estado === 'concluido' || c.estado === 'cerrado' || Boolean(c.hora_salida);
                        if (!isDone) return false;

                        if (techActivityStoreFilter !== 'todas' && c.tiendaId !== techActivityStoreFilter) return false;

                        if (techActivityTechFilter !== 'todos') {
                          const targetTech = users.find(u => u.id === techActivityTechFilter);
                          const isAssigned = c.tecnicoAsignadoId === techActivityTechFilter;
                          const isPresencial = targetTech && c.tecnico_presencial_nombre?.toLowerCase().includes(targetTech.nombre.toLowerCase());
                          const isApoyo = targetTech && c.tecnico_apoyo_nombre?.toLowerCase().includes(targetTech.nombre.toLowerCase());
                          if (!isAssigned && !isPresencial && !isApoyo) return false;
                        }

                        return true;
                      });

                      if (completedCases.length === 0) {
                        return (
                          <div className="detail-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            📋 No hay trabajos concluidos en este filtro.
                          </div>
                        );
                      }

                      return completedCases.map(c => {
                        const storeObj = stores.find(s => s.id === c.tiendaId);
                        const assignedTech = users.find(u => u.id === c.tecnicoAsignadoId);
                        const primaryTechName = c.tecnico_presencial_nombre || assignedTech?.nombre || 'Técnico a cargo';
                        const apoyoName = c.tecnico_apoyo_nombre;

                        const formatTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
                        const entryStr = formatTime(c.hora_entrada) || formatTime(c.fechaCreacion) || '09:00 AM';
                        const exitStr = formatTime(c.hora_salida) || formatTime(c.fechaCierre) || formatTime(c.fechaCreacion) || '10:15 AM';

                        return (
                          <div 
                            key={c.id} 
                            className="premium-card detail-card" 
                            style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: '4px solid var(--color-resolved)' }}
                            onClick={() => setSelectedCaseId(c.id)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              
                              <div style={{ flex: 1, minWidth: '280px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                    🏬 {storeObj?.nombre || `Tienda #${c.tiendaId}`} ({storeObj?.ciudad || 'Red'})
                                  </strong>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    #{getCaseDisplayCode(c)}
                                  </span>
                                  <span className={`badge badge-status ${c.estado}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                    {getStatusText(c.estado)}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700, margin: '2px 0' }}>
                                  {c.categoria} - <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{c.descripcion}</span>
                                </div>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  👷 <strong>Técnico(s):</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{primaryTechName}</span>
                                  {apoyoName && <span> y <span style={{ color: '#8B5CF6', fontWeight: 700 }}>{apoyoName}</span></span>}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                  <span>📥 <strong>Entrada:</strong> {entryStr}</span>
                                  <span>📤 <strong>Salida:</strong> <strong style={{ color: 'var(--color-resolved)' }}>{exitStr}</strong></span>
                                </div>
                                <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>Ver Caso Completo →</span>
                              </div>

                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              ) : activeTab === 'agenda_turnos' ? (
                /* VIEW NUEVA: AGENDA DE TURNOS Y MANTENIMIENTOS PROGRAMADOS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                        📅 Agenda y Turnos Programados de Mantenimiento
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                        Gestión en tiempo real de citas, revisiones no críticas y mantenimientos agendados para técnicos y locales.
                      </p>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS DE AGENDA (ADAPTADA POR ROL) */}
                  <div className="detail-card" style={{ padding: '10px 14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>🔍 Agenda:</span>
                    
                    {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        🏬 {stores.find(s => s.id === currentUser.tiendaId)?.nombre || 'Mi Tienda'}
                      </span>
                    ) : (
                      <select 
                        className="input-box"
                        value={techActivityStoreFilter}
                        onChange={e => setTechActivityStoreFilter(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                      >
                        <option value="todas">🏬 Todas las Tiendas</option>
                        {stores.filter(s => currentUser.rol === 'supervisor' ? (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(s.id)) : true).map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    )}

                    <select 
                      className="input-box"
                      value={techActivityTechFilter}
                      onChange={e => setTechActivityTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', height: '30px', width: 'auto' }}
                    >
                      <option value="todos">👷 Todos los Técnicos</option>
                      {users.filter(u => u.rol === 'tecnico').map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* LISTADO DE CASOS AGENDADOS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(() => {
                      const scheduledCases = cases.filter(c => {
                        if (!c.fecha_programada) return false;
                        if (!isCaseVisibleToUser(c, currentUser)) return false;

                        if (techActivityStoreFilter !== 'todas' && c.tiendaId !== techActivityStoreFilter) return false;
                        if (techActivityTechFilter !== 'todos' && c.tecnicoAsignadoId !== techActivityTechFilter) return false;
                        return true;
                      }).sort((a, b) => new Date(a.fecha_programada || '').getTime() - new Date(b.fecha_programada || '').getTime());

                      if (scheduledCases.length === 0) {
                        return (
                          <div className="detail-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            📅 No hay mantenimientos agendados en este filtro. Haz clic en "Agendar Turno" dentro de cualquier caso no crítico para agendarlo.
                          </div>
                        );
                      }

                      return scheduledCases.map(c => {
                        const storeObj = stores.find(s => s.id === c.tiendaId);
                        const assignedTech = users.find(u => u.id === c.tecnicoAsignadoId);

                        return (
                          <div 
                            key={c.id} 
                            className="premium-card detail-card" 
                            style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: '4px solid #3B82F6' }}
                            onClick={() => setSelectedCaseId(c.id)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div style={{ flex: 1, minWidth: '280px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  <span style={{ background: '#3B82F6', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                                    📅 {c.fecha_programada}
                                  </span>
                                  <span style={{ fontSize: '0.76rem', color: '#3B82F6', fontWeight: 700 }}>
                                    ⏰ {c.turno_programado || 'Horario flexible'} ({c.horas_estimadas || 2}h est.)
                                  </span>
                                  <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    #{getCaseDisplayCode(c)}
                                  </span>
                                  <span className={`badge badge-status ${c.estado}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                    {getStatusText(c.estado)}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 700, margin: '2px 0' }}>
                                  🏬 {storeObj?.nombre || `Tienda #${c.tiendaId}`} - <span style={{ fontWeight: 400 }}>{c.categoria}: {c.descripcion}</span>
                                </div>

                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  👷 <strong>Técnico Asignado:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{assignedTech?.nombre || c.tecnico_presencial_nombre || 'Por asignar'}</span>
                                  {c.agendado_por && <span> • 👤 Agendado por: {c.agendado_por}</span>}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className="btn btn-primary btn-sm" style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                                  Ver Caso Completo →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              ) : activeTab === 'disponibilidad' ? (
                /* VIEW E: DISPONIBILIDAD DE PERSONAL (EXCEL UPLOAD Y TABLA) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>📅 Disponibilidad y Horarios del Personal Técnico</h2>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Gestione el cuadrante de trabajo y los días libres de los técnicos.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                        📥 Importar Excel Personal
                        <input 
                          type="file" 
                          accept=".xlsx, .xls, .csv" 
                          onChange={handleImportTechAvailability} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  </div>

                  {/* TABLA 1: CUADRANTE DE TURNO Y GUARDIAS EXTRAIDO DEL EXCEL */}
                  <div className="premium-card detail-card" style={{ padding: '0px', marginBottom: '20px' }}>
                    <div style={{ padding: '16px 20px', background: 'rgba(59, 130, 246, 0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3B82F6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📋 Cuadrante Oficial de Turnos y Guardias (Fines de Semana y Feriados)
                      </h3>
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: '#3B82F6', color: '#fff', borderRadius: '12px', fontWeight: 'bold' }}>
                        {shiftSchedule.length} Fechas Programadas (Excel)
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 2 }}>
                          <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>MES</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>FECHAS / DÍAS</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>EVENTO / FERIADO</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>SUPERVISOR DE TURNO</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>SUPERVISOR DE APOYO</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>TÉCNICO DE GUARDIA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftSchedule.map((s: ShiftEntry) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', background: s.evento !== '-' ? 'rgba(234, 179, 8, 0.08)' : 'transparent' }}>
                              <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{s.mes}</td>
                              <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--accent-color)' }}>{s.fechas}</td>
                              <td style={{ padding: '10px 16px' }}>
                                {s.evento !== '-' ? (
                                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#EAB308', color: '#000', borderRadius: '10px', fontWeight: 'bold' }}>
                                    🎉 {s.evento}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 16px', fontWeight: 600, color: '#3B82F6' }}>{s.supervisorTurno}</td>
                              <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{s.supervisorApoyo}</td>
                              <td style={{ padding: '10px 16px', fontWeight: 700, color: '#10B981' }}>👷 {s.tecnicoGuardia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABLA 2: DISPONIBILIDAD INDIVIDUAL Y DÍAS LIBRES */}
                  <div className="premium-card detail-card" style={{ padding: '0px' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        👷 Horarios Regulares y Días Libres del Personal
                      </h3>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Personal / Rol</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>⏰ Horario de Trabajo</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>📅 Días Libres</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>📍 Cobertura / Zona</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Estado Actual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {techAvailability.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>{t.tecnicoNombre || t.nombre}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--accent-color)', fontWeight: 600 }}>{t.horarioTrabajo || '08:00 AM - 05:00 PM'}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t.diasLibres || 'Sábado / Domingo'}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t.coberturaZona || t.cobertura || 'Nacional'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span className={`status-badge status-${(t.estadoActual || 'DISPONIBLE').toLowerCase()}`}>
                                  {t.estadoActual || 'DISPONIBLE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (

                /* VIEW C: SIMPLIFIED CASES DASHBOARD (CARDS GRID) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  


                  {/* Ultra-Premium Search and Store Filter bar */}
                  <div className="search-controls-container">
                    <div className="search-controls-inputs">
                      <div className="search-input-wrapper">
                        <input
                          type="text"
                          className="search-input"
                          placeholder="Buscar por código, tienda o falla..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {currentUser.rol !== 'jefe_tienda' && currentUser.rol !== 'subjefe' && (
                        <select
                          className="select-filter-box"
                          value={storeFilter}
                          onChange={e => setStoreFilter(e.target.value)}
                        >
                          <option value="todos">🏬 Todas las Tiendas</option>
                          {stores
                            .filter(s => currentUser?.rol !== 'supervisor' || !currentUser.supervisorTiendas || currentUser.supervisorTiendas.includes(s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                      )}
                    </div>

                    <div className="search-controls-buttons">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleExportCasesExcel}
                      >
                        📥 Exportar Excel
                      </button>

                      {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowNewCaseModal(true)}>
                          ➕ Crear Caso
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Clean Tickets Cards List */}
                  <div className="cards-grid">
                    {getFilteredCases().length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        No hay reportes de mantenimiento registrados en esta sección.
                      </div>
                    ) : (
                      getFilteredCases().map(c => {
                        const tienda = stores.find(s => s.id === c.tiendaId);
                        const breached = isSlaBreached(c) && (c.estado === 'pendiente' || c.estado === 'en_proceso');
                        return (
                          <div key={c.id} className={`ticket-card ${c.es_caso_tecnico ? '' : `priority-${c.prioridad}`}`} onClick={() => setSelectedCaseId(c.id)}>
                            <div className="card-main-info">
                              <div className="card-header">
                                <strong>#{getCaseDisplayCode(c)}</strong>
                                <span>•</span>
                                <span>🏬 {tienda?.nombre} ({tienda?.ciudad})</span>
                                <span>•</span>
                                <span>📅 {new Date(c.fechaCreacion).toLocaleDateString()}</span>
                              </div>
                              <div className="card-title">{c.categoria}</div>
                              <div className="card-desc">{c.descripcion}</div>

                              {/* Badges de Técnico Asignado y Horas de Entrada / Salida */}
                              {(c.tecnicoAsignadoId || c.tecnico_presencial_nombre || c.hora_entrada) && (
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                                  {(c.tecnicoAsignadoId || c.tecnico_presencial_nombre) && (
                                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      👷 Técnico: {users.find(u => u.id === c.tecnicoAsignadoId)?.nombre || c.tecnico_presencial_nombre}
                                    </span>
                                  )}
                                  {c.hora_entrada && (
                                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-resolved)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      ⏱️ Entrada: {new Date(c.hora_entrada).toLocaleTimeString()} {c.hora_salida ? `| Salida: ${new Date(c.hora_salida).toLocaleTimeString()}` : (c.estado === 'concluido' || c.estado === 'cerrado') ? `| Salida: ${new Date(c.fechaCierre || c.fechaCreacion).toLocaleTimeString()}` : '| 🟢 En tienda'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="card-right-info">
                              {!c.es_caso_tecnico && breached && (
                                <span className="badge" style={{ color: 'var(--color-critical)', borderColor: 'var(--color-critical)', background: 'rgba(220,38,38,0.05)' }}>
                                  ⚠️ FUERA SLA
                                </span>
                              )}
                              {!c.es_caso_tecnico && (
                                <span className={`badge badge-priority badge-priority-${c.prioridad}`}>
                                  {getPriorityLabel(c.prioridad)}
                                </span>
                              )}
                              {c.pausado_por_material ? (
                                <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#D97706', border: '1px solid #F59E0B', fontWeight: 800 }}>
                                  ⏸️ PAUSADO POR MATERIAL
                                </span>
                              ) : (
                                <span className={`badge badge-status ${c.estado}`}>
                                  {getStatusText(c.estado)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )}

            
            </main>
          </div>
        </div>
      )}

      
      {/* MODAL: NOTIFICATIONS CENTER RECUADRO */}
      {showNotifModal && (
        <div className="modal-backdrop" onClick={() => setShowNotifModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔔 Notificaciones y Alertas
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={markAllNotifsRead}
                style={{ fontSize: '0.78rem', color: 'var(--primary)' }}
              >
                ✓ Marcar leídas
              </button>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {getFilteredNotifications().length === 0 ? (
                <div style={{ padding: '30px 15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  🔕 No tienes notificaciones pendientes.
                </div>
              ) : (
                getFilteredNotifications().map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!readNotifIds.includes(n.id)) {
                        setReadNotifIds(prev => [...prev, n.id]);
                      }
                      if (n.casoId) {
                        setSelectedCaseId(n.casoId);
                        setShowNotifModal(false);
                      }
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      background: !readNotifIds.includes(n.id) ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface)',
                      border: '1px solid ' + (!readNotifIds.includes(n.id) ? 'var(--primary)' : 'var(--border-color)'),
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ fontWeight: 650, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {n.mensaje}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⏱️ {new Date(n.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.casoId && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Ver Caso →</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNotifModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORT NEW FAULT */}
      {showNewCaseModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', color: 'var(--text-main)' }}>Crear Caso de Mantenimiento</h3>
            
            <form onSubmit={handleCreateCase}>
              <div className="field-group">
                <label className="field-label">¿Cuál es el problema? (Categoría o Descripción corta)</label>
                <input 
                  type="text" 
                  className="input-box" 
                  placeholder="Ej. Fuga de agua en el baño, Daño en vitrina..." 
                  value={newCategoryText}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">Prioridad Sugerida</label>
                <select 
                  className="input-box"
                  value={newPriority}
                  onChange={e => setNewPriority(Number(e.target.value))}
                >
                  <option value="1">🔴 Crítico (Atención inmediata ≤ 4h)</option>
                  <option value="2">🟠 Alto (Atención rápida ≤ 24h)</option>
                  <option value="3">🟡 Medio (Atención moderada ≤ 72h)</option>
                  <option value="4">🟢 Bajo (Mantenimiento general ≤ 7 días)</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Descripción detallada del problema</label>
                <textarea 
                  className="input-box"
                  placeholder="Indique qué ocurre, dónde se localiza y el impacto en la operación..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  required
                  style={{ minHeight: '100px' }}
                />
              </div>

              {/* SECCIÓN FOTO DEL DAÑO / PROBLEMA */}
              <div className="field-group" style={{ marginTop: '14px' }}>
                <label className="field-label">📷 Foto del Problema / Falla / Repuesto Dañado (Opcional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  multiple
                  onChange={handleNewCasePhotoChange} 
                  style={{ fontSize: '0.8rem' }}
                />
                {newCaseDamagePhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {newCaseDamagePhotos.map((src, i) => (
                      <div key={i} style={{ position: 'relative', width: '54px', height: '54px' }}>
                        <img src={src} alt="Foto daño" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        <button 
                          type="button" 
                          onClick={() => setNewCaseDamagePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN SOLICITUD ANTICIPADA DE MATERIALES */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', color: '#F59E0B' }}>
                  <input 
                    type="checkbox" 
                    checked={newRequestPreMaterial} 
                    onChange={e => setNewRequestPreMaterial(e.target.checked)} 
                  />
                  📦 Solicitar Material / Repuesto de forma Anticipada (Ahorro de Tiempo)
                </label>
              </div>

              {newRequestPreMaterial && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', marginTop: '10px' }}>
                  <div className="field-group" style={{ marginBottom: '10px' }}>
                    <label className="field-label" style={{ fontSize: '0.78rem' }}>Material / Repuesto que se cree necesario:</label>
                    <input 
                      type="text" 
                      className="input-box" 
                      placeholder="Ej. Foco LED 50W, Breaker 20A, Empaque de grifo..." 
                      value={newPreMaterialName}
                      onChange={e => setNewPreMaterialName(e.target.value)}
                      required={newRequestPreMaterial}
                    />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label" style={{ fontSize: '0.78rem' }}>Cantidad Estimada:</label>
                    <input 
                      type="number" 
                      className="input-box" 
                      min={1} 
                      value={newPreMaterialQty}
                      onChange={e => setNewPreMaterialQty(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* SECCIÓN OPCIONAL DE AGENDAMIENTO AL CREAR EL CASO */}
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={newIsScheduled} 
                    onChange={e => setNewIsScheduled(e.target.checked)} 
                  />
                  📅 Agendar / Programar Visita de Atención (Caso No Crítico)
                </label>
              </div>

              {newIsScheduled && (
                <div style={{ background: 'rgba(59, 130, 246, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '12px' }}>
                  {/* SEMÁFORO EN VIVO DE DISPONIBILIDAD DEL TÉCNICO AL CREAR */}
                  {newScheduleAssignedTechId && (() => {
                    const targetTech = users.find(u => u.id === Number(newScheduleAssignedTechId));
                    if (!targetTech) return null;

                    const techCases = cases.filter(c => c.tecnicoAsignadoId === targetTech.id && c.fecha_programada && c.estado !== 'concluido' && c.estado !== 'cerrado');
                    const selDateObj = new Date(newScheduleDate);
                    
                    const dayCasesCount = techCases.filter(c => c.fecha_programada === newScheduleDate).length;
                    
                    const startOfWeek = new Date(selDateObj);
                    startOfWeek.setDate(selDateObj.getDate() - selDateObj.getDay() + 1);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);

                    const weekCases = techCases.filter(c => {
                      const d = new Date(c.fecha_programada!);
                      return d >= startOfWeek && d <= endOfWeek;
                    });

                    const totalWeekHours = weekCases.reduce((sum, c) => sum + (c.horas_estimadas || 2), 0);
                    const isWeekFull = weekCases.length >= 5 || totalWeekHours >= 20;

                    const nextWeekMon = new Date(startOfWeek);
                    nextWeekMon.setDate(startOfWeek.getDate() + 7);
                    const nextWeekMonStr = nextWeekMon.toISOString().split('T')[0];

                    return (
                      <div style={{ background: isWeekFull ? 'rgba(239, 68, 68, 0.1)' : weekCases.length >= 3 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${isWeekFull ? '#EF4444' : weekCases.length >= 3 ? '#F59E0B' : '#10B981'}`, marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>👷 Disponibilidad: {targetTech.nombre}</span>
                          <span className="badge" style={{ background: isWeekFull ? '#EF4444' : weekCases.length >= 3 ? '#F59E0B' : '#10B981', color: '#fff', fontSize: '0.68rem' }}>
                            {isWeekFull ? '🔴 Agenda Llena esta Semana' : weekCases.length >= 3 ? '🟡 Carga Moderada' : '🟢 Alta Disponibilidad'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          📅 <strong>Esta semana:</strong> {weekCases.length} citas ({totalWeekHours} hrs) • 📆 <strong>Día seleccionado ({newScheduleDate}):</strong> {dayCasesCount} cita(s).
                        </div>

                        {isWeekFull && (
                          <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <span>⚠️ Agenda semanal llena. Te sugerimos la próxima semana.</span>
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => setNewScheduleDate(nextWeekMonStr)}
                              style={{ background: '#EF4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}
                            >
                              👉 Cambiar al {nextWeekMonStr}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="field-group">
                      <label className="field-label">Fecha Programada *:</label>
                      <input
                        type="date"
                        className="input-box"
                        required={newIsScheduled}
                        value={newScheduleDate}
                        onChange={e => setNewScheduleDate(e.target.value)}
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label">Duración Estimada *:</label>
                      <select
                        className="input-box"
                        value={newScheduleHours}
                        onChange={e => setNewScheduleHours(Number(e.target.value))}
                      >
                        <option value={1}>⏱️ 1 Hora</option>
                        <option value={2}>⏱️ 2 Horas (Estándar)</option>
                        <option value={3}>⏱️ 3 Horas</option>
                        <option value={4}>⏱️ 4 Horas (Medio día)</option>
                        <option value={6}>⏱️ 6 Horas</option>
                        <option value={8}>⏱️ 8 Horas (Jornada completa)</option>
                        <option value={12}>⏱️ 12+ Horas (Multi-día)</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Turno / Horario de Visita *:</label>
                    <select
                      className="input-box"
                      value={newScheduleShift}
                      onChange={e => setNewScheduleShift(e.target.value)}
                    >
                      <option value="Mañana (08:00 AM - 12:00 PM)">🌅 Mañana (08:00 AM - 12:00 PM)</option>
                      <option value="Tarde (01:00 PM - 05:00 PM)">☀️ Tarde (01:00 PM - 05:00 PM)</option>
                      <option value="Noche / Furia (06:00 PM - 09:00 PM)">🌙 Noche / Furia (06:00 PM - 09:00 PM)</option>
                      <option value="Todo el Día / Horario Flexible">⌛ Todo el Día / Horario Flexible</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Asignar Técnico para el Turno (Opcional):</label>
                    <select
                      className="input-box"
                      value={newScheduleAssignedTechId}
                      onChange={e => setNewScheduleAssignedTechId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">-- Asignar Después / Técnico Flexible --</option>
                      {users.filter(u => u.rol === 'tecnico').map(u => (
                        <option key={u.id} value={u.id}>👷 {u.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewCaseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Caso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOLVE CASE */}
      {showSolveModal && selectedCase && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', color: 'var(--text-main)' }}>Concluir Mantenimiento</h3>
            
            <form onSubmit={(e) => handleConcludeCase(e, selectedCase.id)}>
              <div className="field-group">
                <label className="field-label">Descripción del trabajo realizado</label>
                <textarea 
                  className="input-box"
                  placeholder="Escriba el detalle de la solución aplicada, repuestos usados, etc."
                  value={solutionDesc}
                  onChange={e => setSolutionDesc(e.target.value)}
                  required
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div className="field-group">
                <label className="field-label" style={{ fontWeight: 600 }}>Fotos de Evidencia Realizada (Obligatoria, Máximo 10 fotos)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleSolveEvidenceChange} 
                  className="input-box"
                  style={{ padding: '8px' }}
                  required={solveEvidenceFiles.length === 0}
                />
                
                {/* Thumbnails preview */}
                {solveEvidenceFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {solveEvidenceFiles.map((base64, index) => (
                      <div key={index} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={base64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                        <button 
                          type="button" 
                          onClick={() => setSolveEvidenceFiles(prev => prev.filter((_, i) => i !== index))}
                          style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239, 68, 68, 0.8)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '0 0 0 4px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSolveModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={solveEvidenceFiles.length === 0} style={{ background: 'var(--color-resolved)' }}>Concluir Caso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT NEW TECH ACTIVITY */}
      
      {/* Modal Datos de Facturación */}
      {showFacturacionModal && (
        <div className="modal-backdrop" onClick={() => setShowFacturacionModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>🧾 Datos para Facturación</h3>
              <button onClick={() => setShowFacturacionModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSendFacturacion}>
              
              {/* SELECCIÓN DE TIPO DE DATOS DE FACTURACIÓN: PREDETERMINADO SUPERVISOR VS MATERIALES PERSONALIZADO */}
              <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--border-color)' }}>
                <label className="field-label" style={{ fontSize: '0.78rem', fontWeight: 800, marginBottom: '6px', display: 'block', color: 'var(--primary)' }}>
                  🏢 Origen de Datos de Facturación:
                </label>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${facturacionProfileMode === 'default_supervisor' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFacturacionProfileMode('default_supervisor')}
                    style={{ fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    🏢 Usar Predeterminado del Supervisor
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${facturacionProfileMode === 'custom_material' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setFacturacionProfileMode('custom_material');
                      setFacturacionRuc('');
                      setFacturacionRazonSocial('');
                      setFacturacionDireccion('');
                      setFacturacionEmail('');
                      setFacturacionTelefono('');
                    }}
                    style={{ fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    📦 Datos Especiales (Compra Materiales)
                  </button>
                </div>

                {facturacionProfileMode === 'default_supervisor' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      💡 Carga automática según el Supervisor asignado a la tienda del caso.
                    </div>
                    {currentUser && (currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                      <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>⚙️ Guardar cambios como mi perfil predeterminado:</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const myName = currentUser.nombre || "Luis Vallejos";
                            const updated = {
                              ...billingProfiles,
                              [myName]: {
                                ruc: facturacionRuc,
                                razonSocial: facturacionRazonSocial,
                                direccion: facturacionDireccion,
                                email: facturacionEmail,
                                telefono: facturacionTelefono
                              }
                            };
                            setBillingProfiles(updated);
                            try { localStorage.setItem('maint_billing_profiles', JSON.stringify(updated)); } catch (e) {}
                            alert(`✅ Perfil de Facturación Predeterminado guardado para ${myName}`);
                          }}
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          💾 Guardar en Mi Perfil
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {facturacionProfileMode === 'custom_material' && (
                  <div style={{ fontSize: '0.74rem', color: '#EAB308', fontWeight: 600 }}>
                    ✏️ Modo Compra de Materiales: Ingrese los datos de facturación específicos para esta adquisición.
                  </div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Seleccionar Caso (Opcional):</label>
                <select
                  className="input-box"
                  value={facturacionCasoId || ''}
                  onChange={e => setFacturacionCasoId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Sin Caso Específico / General --</option>
                  {cases.filter(c => c.estado !== 'cerrado' && c.estado !== 'concluido').map(c => {
                    const st = stores.find(s => s.id === c.tiendaId);
                    return (
                      <option key={c.id} value={c.id}>
                        Caso #{c.id} - {st ? `${st.nombre} (Sup: ${st.supervisorName})` : `Tienda #${c.tiendaId}`} ({c.categoria})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">RUC o Cédula *:</label>
                <input
                  type="text"
                  className="input-box"
                  placeholder="ej: 1790012345001"
                  required
                  value={facturacionRuc}
                  onChange={e => setFacturacionRuc(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Razón Social / Nombre *:</label>
                <input
                  type="text"
                  className="input-box"
                  placeholder="ej: MARATHON SPORTS S.A."
                  required
                  value={facturacionRazonSocial}
                  onChange={e => setFacturacionRazonSocial(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Dirección Fiscal:</label>
                <input
                  type="text"
                  className="input-box"
                  placeholder="ej: Av. 6 de Diciembre y Quito"
                  value={facturacionDireccion}
                  onChange={e => setFacturacionDireccion(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field-group">
                  <label className="field-label">Teléfono:</label>
                  <input
                    type="text"
                    className="input-box"
                    placeholder="0991234567"
                    value={facturacionTelefono}
                    onChange={e => setFacturacionTelefono(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Correo Electrónico:</label>
                  <input
                    type="email"
                    className="input-box"
                    placeholder="factura@empresa.com"
                    value={facturacionEmail}
                    onChange={e => setFacturacionEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div className="field-group">
                  <label className="field-label">Monto ($) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-box"
                    placeholder="0.00"
                    required
                    value={facturacionMonto}
                    onChange={e => setFacturacionMonto(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Detalle / Concepto:</label>
                  <input
                    type="text"
                    className="input-box"
                    placeholder="ej: Servicio de mantenimiento eléctrico"
                    value={facturacionConcepto}
                    onChange={e => setFacturacionConcepto(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFacturacionModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">🧾 Registrar y Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem' }}>
                📅 Programar Cita y Turno de Atención
              </h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!currentUser || !scheduleCaseId || !scheduleDate) return;
              const targetCase = cases.find(c => c.id === scheduleCaseId);
              if (!targetCase) return;

              const now = new Date().toISOString();
              const assignedTechUser = scheduleAssignedTechId ? users.find(u => u.id === Number(scheduleAssignedTechId)) : null;

              setCases(prev => prev.map(c => {
                if (c.id === scheduleCaseId) {
                  return {
                    ...c,
                    fecha_programada: scheduleDate,
                    turno_programado: scheduleShift,
                    horas_estimadas: scheduleHours,
                    agendado_por: currentUser.nombre,
                    tecnicoAsignadoId: assignedTechUser ? assignedTechUser.id : c.tecnicoAsignadoId,
                    tecnico_presencial_nombre: assignedTechUser ? assignedTechUser.nombre : c.tecnico_presencial_nombre,
                    comentarios: [
                      ...c.comentarios,
                      {
                        id: Date.now(),
                        autor: currentUser.nombre,
                        rol: currentUser.rol,
                        texto: `📅 MANTENIMIENTO AGENDADO: Programado para el ${scheduleDate} en el turno ${scheduleShift}${assignedTechUser ? ` (Técnico: ${assignedTechUser.nombre})` : ''}.`,
                        fecha: now
                      }
                    ]
                  };
                }
                return c;
              }));

              if (isSupabaseConfigured) {
                supabase.from('casos').update({
                  fecha_programada: scheduleDate,
                  turno_programado: scheduleShift,
                  agendado_por: currentUser.nombre,
                  ...(assignedTechUser ? { tecnico_asignado_id: assignedTechUser.id, tecnico_presencial_nombre: assignedTechUser.nombre } : {})
                }).eq('id', scheduleCaseId).then(({ error }: any) => {
                  if (error) console.error("Error al agendar en Supabase:", error);
                  supabase.from('comentarios').insert([{
                    caso_id: scheduleCaseId,
                    autor: currentUser.nombre,
                    rol: currentUser.rol,
                    texto: `📅 MANTENIMIENTO AGENDADO: Programado para el ${scheduleDate} en el turno ${scheduleShift}${assignedTechUser ? ` (Técnico: ${assignedTechUser.nombre})` : ''}.`,
                    fecha: now
                  }]);
                });
              }

              pushNotification(
                `📅 Caso #${scheduleCaseId} Agendado: Programado para el ${scheduleDate} (${scheduleShift}).`,
                'estado_cambio',
                { casoId: scheduleCaseId, tiendaId: targetCase.tiendaId }
              );

              setShowScheduleModal(false);
            }}>
              <div className="field-group">
                <label className="field-label">Fecha Programada de Atención *:</label>
                <input
                  type="date"
                  className="input-box"
                  required
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                />
              </div>

              {/* INDICADOR DE CATORCE DÍAS / DISPONIBILIDAD EN VIVO DEL TÉCNICO */}
              {scheduleAssignedTechId && (() => {
                const targetTech = users.find(u => u.id === Number(scheduleAssignedTechId));
                if (!targetTech) return null;

                const techCases = cases.filter(c => c.tecnicoAsignadoId === targetTech.id && c.fecha_programada && c.estado !== 'concluido' && c.estado !== 'cerrado');
                const selDateObj = new Date(scheduleDate);
                
                // Contar citas en el mismo día y en la misma semana
                const dayCasesCount = techCases.filter(c => c.fecha_programada === scheduleDate).length;
                
                const startOfWeek = new Date(selDateObj);
                startOfWeek.setDate(selDateObj.getDate() - selDateObj.getDay() + 1);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                const weekCases = techCases.filter(c => {
                  const d = new Date(c.fecha_programada!);
                  return d >= startOfWeek && d <= endOfWeek;
                });

                const totalWeekHours = weekCases.reduce((sum, c) => sum + (c.horas_estimadas || 2), 0);
                const isWeekFull = weekCases.length >= 5 || totalWeekHours >= 20;

                // Sugerir fecha para la siguiente semana si esta semana está llena
                const nextWeekMon = new Date(startOfWeek);
                nextWeekMon.setDate(startOfWeek.getDate() + 7);
                const nextWeekMonStr = nextWeekMon.toISOString().split('T')[0];

                return (
                  <div style={{ background: isWeekFull ? 'rgba(239, 68, 68, 0.1)' : weekCases.length >= 3 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${isWeekFull ? '#EF4444' : weekCases.length >= 3 ? '#F59E0B' : '#10B981'}`, marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👷 Disponibilidad: {targetTech.nombre}</span>
                      <span className="badge" style={{ background: isWeekFull ? '#EF4444' : weekCases.length >= 3 ? '#F59E0B' : '#10B981', color: '#fff', fontSize: '0.68rem' }}>
                        {isWeekFull ? '🔴 Agenda Llena esta Semana' : weekCases.length >= 3 ? '🟡 Carga Moderada' : '🟢 Alta Disponibilidad'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📅 <strong>Esta semana:</strong> {weekCases.length} citas ({totalWeekHours} hrs ocupadas) • 📆 <strong>Día seleccionado ({scheduleDate}):</strong> {dayCasesCount} cita(s).
                    </div>

                    {isWeekFull && (
                      <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <span>⚠️ Esta semana ya tiene la agenda saturada. ¿Deseas agendar para la próxima semana?</span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setScheduleDate(nextWeekMonStr)}
                          style={{ background: '#EF4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}
                        >
                          👉 Cambiar al {nextWeekMonStr}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field-group">
                  <label className="field-label">Fecha Programada *:</label>
                  <input
                    type="date"
                    className="input-box"
                    required
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Duración Estimada (Horas) *:</label>
                  <select
                    className="input-box"
                    value={scheduleHours}
                    onChange={e => setScheduleHours(Number(e.target.value))}
                  >
                    <option value={1}>⏱️ 1 Hora (Revisión rápida)</option>
                    <option value={2}>⏱️ 2 Horas (Estándar)</option>
                    <option value={3}>⏱️ 3 Horas (Media jornada)</option>
                    <option value={4}>⏱️ 4 Horas (Medio día)</option>
                    <option value={6}>⏱️ 6 Horas (Trabajo extenso)</option>
                    <option value={8}>⏱️ 8 Horas (Jornada completa)</option>
                    <option value={12}>⏱️ 12+ Horas (Multi-día)</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Turno / Horario de Visita *:</label>
                <select
                  className="input-box"
                  value={scheduleShift}
                  onChange={e => setScheduleShift(e.target.value)}
                >
                  <option value="Mañana (08:00 AM - 12:00 PM)">🌅 Mañana (08:00 AM - 12:00 PM)</option>
                  <option value="Tarde (01:00 PM - 05:00 PM)">☀️ Tarde (01:00 PM - 05:00 PM)</option>
                  <option value="Noche / Furia (06:00 PM - 09:00 PM)">🌙 Noche / Furia (06:00 PM - 09:00 PM)</option>
                  <option value="Todo el Día / Horario Flexible">⌛ Todo el Día / Horario Flexible</option>
                </select>
              </div>

              <div className="field-group">
                <label className="field-label">Asignar Técnico para el Turno (Opcional):</label>
                <select
                  className="input-box"
                  value={scheduleAssignedTechId}
                  onChange={e => setScheduleAssignedTechId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Mantener Asignación Actual --</option>
                  {users.filter(u => u.rol === 'tecnico').map(u => (
                    <option key={u.id} value={u.id}>👷 {u.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">💾 Guardar y Programar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangePasswordModal && currentUser && (currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 {isFirstLoginChange ? 'Cambiar Contraseña Inicial' : 'Cambiar Mi Contraseña'}
              </h3>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {isFirstLoginChange && (
              <div style={{
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                borderLeft: '4px solid #eab308',
                padding: '12px 14px',
                borderRadius: '6px',
                marginBottom: '18px',
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                lineHeight: 1.4
              }}>
                📌 <strong>Acceso Inicial Seguro:</strong> Por motivos de seguridad, te sugerimos actualizar tu contraseña por una clave personal. Puedes hacerlo ahora o presionar <strong>"Cambiar más tarde"</strong> para ingresar inmediatamente.
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit}>
              <div className="field-group" style={{ marginBottom: '14px' }}>
                <label className="field-label">Contraseña Actual *</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    type={showCurrentPass ? "text" : "password"} 
                    className="input-box" 
                    placeholder="••••••••" 
                    value={currentPassInput}
                    onChange={e => setCurrentPassInput(e.target.value)}
                    required
                    style={{ paddingRight: '42px', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showCurrentPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: '14px' }}>
                <label className="field-label">Nueva Contraseña *</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    className="input-box" 
                    placeholder="Nueva contraseña (mínimo 4 caracteres)" 
                    value={newPassInput}
                    onChange={e => setNewPassInput(e.target.value)}
                    required
                    style={{ paddingRight: '42px', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showNewPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: '18px' }}>
                <label className="field-label">Confirmar Nueva Contraseña *</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    type={showConfirmPass ? "text" : "password"} 
                    className="input-box" 
                    placeholder="Repite la nueva contraseña" 
                    value={confirmPassInput}
                    onChange={e => setConfirmPassInput(e.target.value)}
                    required
                    style={{ paddingRight: '42px', width: '100%' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showConfirmPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {changePassError && (
                <div style={{ color: 'var(--color-critical)', fontSize: '0.85rem', marginBottom: '14px' }}>
                  ⚠️ {changePassError}
                </div>
              )}

              {changePassSuccess && (
                <div style={{ color: 'var(--color-resolved)', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 700 }}>
                  {changePassSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
                {isFirstLoginChange ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowChangePasswordModal(false)}
                    style={{ padding: '10px 14px' }}
                  >
                    ⏱️ Cambiar más tarde
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowChangePasswordModal(false)}
                  >
                    Cancelar
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px' }}>
                  Guardar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPauseMaterialModal && selectedCase && currentUser && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⏸️ Pausar Caso por Materiales / Presupuesto
              </h3>
              <button 
                type="button"
                onClick={() => setShowPauseMaterialModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)', borderLeft: '4px solid #eab308', padding: '12px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
              📌 <strong>Atención Jefe de Tienda / Supervisor:</strong> Indique el motivo por el cual el material no se puede adquirir este mes (falta de presupuesto, espera de importación, etc.). El caso quedará registrado en pausa y resaltado.
            </div>

            <form onSubmit={handlePauseCaseForMaterial}>
              <div className="field-group" style={{ marginBottom: '16px' }}>
                <label className="field-label" style={{ fontWeight: 700 }}>Indique el Motivo de la Pausa *:</label>
                <textarea 
                  className="input-box"
                  placeholder="Ej: Sin presupuesto este mes para repuestos de ascensor, o esperando importación de focos especiales..."
                  value={pauseReasonInput}
                  onChange={e => setPauseReasonInput(e.target.value)}
                  required
                  style={{ minHeight: '80px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPauseMaterialModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', background: '#EAB308', borderColor: '#D97706', color: '#000', fontWeight: 800 }}>
                  ⏸️ Confirmar Pausa por Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTakeCaseModal && selectedCase && currentUser && (
        <div className="modal-backdrop">
          <div className="modal-sheet" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔧 Tomar e Iniciar Trabajo en Caso #{getCaseDisplayCode(selectedCase)}
              </h3>
              <button 
                type="button"
                onClick={() => setShowTakeCaseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTakeCase}>
              <div className="field-group" style={{ marginBottom: '16px' }}>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Seleccione Modalidad de Trabajo:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${takeCaseMode === 'solo' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTakeCaseMode('solo')}
                    style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}
                  >
                    👤 Trabajo Solo (1 Técnico)
                  </button>
                  <button
                    type="button"
                    className={`btn ${takeCaseMode === 'equipo' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTakeCaseMode('equipo')}
                    style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}
                  >
                    👥 Trabajo en Equipo (2 Técnicos)
                  </button>
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: '14px' }}>
                <label className="field-label">Técnico Principal (Tú):</label>
                <input 
                  type="text" 
                  className="input-box" 
                  value={currentUser.nombre} 
                  disabled 
                  style={{ opacity: 0.8, fontWeight: 700 }}
                />
              </div>

              {takeCaseMode === 'equipo' && (
                <div className="field-group" style={{ marginBottom: '18px', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label className="field-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    🤝 Seleccione el Segundo Técnico de Apoyo:
                  </label>
                  <select 
                    className="input-box"
                    value={takeCaseSupportTech}
                    onChange={e => setTakeCaseSupportTech(e.target.value)}
                    required={takeCaseMode === 'equipo'}
                    style={{ marginTop: '6px' }}
                  >
                    <option value="">-- Seleccionar Técnico Acompañante --</option>
                    {users.filter(u => u.rol === 'tecnico' && u.id !== currentUser.id).map(u => (
                      <option key={u.id} value={u.nombre}>👷 {u.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTakeCaseModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontWeight: 700 }}>
                  🚀 Confirmar e Iniciar Trabajo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewTechCaseModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', color: 'var(--text-main)' }}>Reportar Actividad / Trabajo Técnico</h3>
            
            <form onSubmit={handleCreateTechCase}>
              <div className="field-group">
                <label className="field-label">Labor o Actividad Realizada</label>
                <input 
                  type="text" 
                  className="input-box" 
                  placeholder="Ej. Mantenimiento preventivo de aire acondicionado, Revisión de tableros..." 
                  value={techCaseCategory}
                  onChange={e => setTechCaseCategory(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="field-label">Ubicación / Local</label>
                <select 
                  className="input-box"
                  value={techCaseStoreId}
                  onChange={e => setTechCaseStoreId(Number(e.target.value))}
                >
                  <option value="0">🏢 Oficina DV01</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>🏬 {s.nombre}</option>
                  ))}
                </select>
              </div>



              <div className="field-group">
                <label className="field-label">Detalle e Informe del Trabajo</label>
                <textarea 
                  className="input-box"
                  placeholder="Indique detalladamente las tareas que se encuentra realizando..."
                  value={techCaseDesc}
                  onChange={e => setTechCaseDesc(e.target.value)}
                  required
                  style={{ minHeight: '80px' }}
                />
              </div>


              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewTechCaseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Reportar Actividad</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {maintToast.mostrar && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            width: '320px',
            backgroundColor: maintToast.tipo === 'success' ? '#e8f5e9' : maintToast.tipo === 'warning' ? '#fff3e0' : 'var(--bg-card)',
            color: maintToast.tipo === 'success' ? '#2e7d32' : maintToast.tipo === 'warning' ? '#ef6c00' : 'var(--text-main)',
            borderLeft: `5px solid ${maintToast.tipo === 'success' ? '#2e7d32' : maintToast.tipo === 'warning' ? '#ef6c00' : 'var(--primary)'}`,
            border: maintToast.tipo !== 'success' && maintToast.tipo !== 'warning' ? '1px solid var(--border-color)' : 'none',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onClick={() => setMaintToast(prev => ({ ...prev, mostrar: false }))}
        >
          <div style={{ fontSize: '1.25rem' }}>
            {maintToast.tipo === 'success' ? '✅' : '🔔'}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{maintToast.titulo}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9, lineHeight: 1.4 }}>{maintToast.mensaje}</p>
          </div>
        </div>
      )}


      

    </div>
  );
}
