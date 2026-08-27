import type { MaterialCatalogItem } from './types';

export const DEFAULT_MATERIAL_CATALOG: MaterialCatalogItem[] = [
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

export const DEFAULT_CATEGORIES = [
  { id: 1, nombre: 'Fallo Eléctrico Total', prioridadSugerida: 1 },
  { id: 2, nombre: 'Falla de Climatización / Aire Acondicionado', prioridadSugerida: 2 },
  { id: 3, nombre: 'Falla del Sistema de Ventas (POS)', prioridadSugerida: 2 },
  { id: 4, nombre: 'Fuga de Agua / Inundación', prioridadSugerida: 1 },
  { id: 5, nombre: 'Problema de Iluminación en Tienda', prioridadSugerida: 3 },
  { id: 6, nombre: 'Daño en Mobiliario / Exhibidores', prioridadSugerida: 4 },
  { id: 7, nombre: 'Problema de Cerradura o Puerta Principal', prioridadSugerida: 1 },
  { id: 8, nombre: 'Pintura y Retoques Estéticos', prioridadSugerida: 4 },
];
