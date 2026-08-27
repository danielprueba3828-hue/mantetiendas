export interface SupervisorBillingData {
  ruc: string;
  razonSocial: string;
  direccion: string;
  email: string;
  telefono: string;
}

export const DEFAULT_BILLING_PROFILES: Record<string, SupervisorBillingData> = {
  "LUIS VALLEJOS": {
    ruc: "1790012345001",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN QUITO / SIERRA)",
    direccion: "Av. 6 de Diciembre y Gaspar de Villarroel, Quito",
    email: "facturacion.lvallejos@marathon.com.ec",
    telefono: "(02) 298-3000"
  },
  "JULIO TUBON": {
    ruc: "0990012345001",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN GUAYAQUIL / COSTA)",
    direccion: "Av. Juan Tanca Marengo y Av. Constitución, Guayaquil",
    email: "facturacion.jtubon@marathon.com.ec",
    telefono: "(04) 268-4000"
  },
  "VICKY MONTIEL": {
    ruc: "1890012345001",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN AMBATO / CENTRO)",
    direccion: "Av. Cevallos y Lalama, Ambato",
    email: "facturacion.vmontiel@marathon.com.ec",
    telefono: "(03) 282-1000"
  },
  "MARFA TORRES": {
    ruc: "0190012345001",
    razonSocial: "MARATHON SPORTS S.A. (SUPERVISIÓN CUENCA / AUSTRO)",
    direccion: "Av. Huayna Cápac y Gil Ramírez Dávalos, Cuenca",
    email: "facturacion.mtorres@marathon.com.ec",
    telefono: "(07) 283-5000"
  }
};

export const getSupervisorBillingProfile = (
  supervisorName?: string, 
  customProfiles?: Record<string, SupervisorBillingData>
): { profile: SupervisorBillingData; matchedSupervisor: string } => {
  const profiles = { ...DEFAULT_BILLING_PROFILES, ...(customProfiles || {}) };
  if (!supervisorName) {
    return { profile: DEFAULT_BILLING_PROFILES["LUIS VALLEJOS"], matchedSupervisor: "LUIS VALLEJOS" };
  }
  
  const clean = supervisorName.trim().toUpperCase();
  
  for (const [key, val] of Object.entries(profiles)) {
    if (key.trim().toUpperCase() === clean) {
      return { profile: val, matchedSupervisor: key };
    }
  }

  if (clean.includes("VALLEJOS") || clean.includes("LUIS")) {
    return { profile: profiles["LUIS VALLEJOS"] || DEFAULT_BILLING_PROFILES["LUIS VALLEJOS"], matchedSupervisor: "LUIS VALLEJOS" };
  }
  if (clean.includes("TUBON") || clean.includes("TUBÓN") || clean.includes("JULIO")) {
    return { profile: profiles["JULIO TUBON"] || DEFAULT_BILLING_PROFILES["JULIO TUBON"], matchedSupervisor: "JULIO TUBON" };
  }
  if (clean.includes("MONTIEL") || clean.includes("VICKY")) {
    return { profile: profiles["VICKY MONTIEL"] || DEFAULT_BILLING_PROFILES["VICKY MONTIEL"], matchedSupervisor: "VICKY MONTIEL" };
  }
  if (clean.includes("TORRES") || clean.includes("MARFA")) {
    return { profile: profiles["MARFA TORRES"] || DEFAULT_BILLING_PROFILES["MARFA TORRES"], matchedSupervisor: "MARFA TORRES" };
  }

  return { profile: DEFAULT_BILLING_PROFILES["LUIS VALLEJOS"], matchedSupervisor: supervisorName };
};
