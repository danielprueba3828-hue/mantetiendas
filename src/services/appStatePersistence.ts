/**
 * D&Nax Studios - MaintTrac State & Session Preservation Service
 * 
 * Evita la pérdida de datos cuando los usuarios minimizan o cambian de aplicación
 * (ej. cambiar a WhatsApp, navegador o visor de materiales):
 * 1. Mantiene la sesión viva sin deslogueos agresivos al perder el foco.
 * 2. Guarda automáticamente la pestaña activa, caso seleccionado y filtros.
 * 3. Guarda y restaura borradores de formularios en curso (creación de casos, notas, fotos).
 */

const STORAGE_KEYS = {
  USER: 'maint_user',
  SESSION_TIMESTAMP: 'maint_session_timestamp',
  NAVIGATION_STATE: 'maint_nav_state',
  FORM_DRAFT_TECH_CASE: 'maint_draft_tech_case',
  FORM_DRAFT_NEW_CASE: 'maint_draft_new_case',
  FORM_DRAFT_COMMENT: 'maint_draft_comment_'
};

export interface NavigationState {
  activeTab: string;
  selectedCaseId: number | null;
  casesViewMode?: 'pendientes' | 'concluidos';
  statusFilter?: string;
  priorityFilter?: string;
  storeFilter?: number;
  categoryFilter?: string;
  searchQuery?: string;
}

export interface TechCaseDraft {
  storeId: number;
  category: string;
  description: string;
  status: string;
  gpsPhotoUrl?: string | null;
  savedAt: number;
}

export interface NewCaseDraft {
  storeId: number;
  category: string;
  priority: number;
  description: string;
  isScheduled: boolean;
  scheduleDate?: string;
  scheduleShift?: string;
  savedAt: number;
}

// 24 horas de vigencia de sesión activa de trabajo continuo
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const appStatePersistence = {
  /**
   * Guarda la sesión del usuario de forma persistente
   */
  saveUserSession(user: any): void {
    if (!user) return;
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, String(Date.now()));
      sessionStorage.setItem('maint_session_active', 'true');
    } catch {}
  },

  /**
   * Obtiene la sesión activa validando que no haya expirado por inactividad extrema
   */
  getActiveUserSession(): any | null {
    try {
      const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
      if (!userRaw) return null;

      const timestampStr = localStorage.getItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      if (timestampStr) {
        const lastActive = Number(timestampStr);
        if (Date.now() - lastActive > SESSION_TTL_MS) {
          // Sesión expirada después de 24h
          this.clearUserSession();
          return null;
        }
      }

      // Actualizar timestamp de última actividad
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, String(Date.now()));
      sessionStorage.setItem('maint_session_active', 'true');
      return JSON.parse(userRaw);
    } catch {
      return null;
    }
  },

  /**
   * Cierra formalmente la sesión
   */
  clearUserSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
      sessionStorage.removeItem('maint_session_active');
    } catch {}
  },

  /**
   * Guarda el estado actual de navegación (pestaña, caso abierto, filtros)
   */
  saveNavigationState(state: NavigationState): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NAVIGATION_STATE, JSON.stringify(state));
    } catch {}
  },

  /**
   * Recupera el estado de navegación para volver exactamente donde se quedó
   */
  getNavigationState(): NavigationState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NAVIGATION_STATE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Guarda borrador del formulario de caso técnico
   */
  saveTechCaseDraft(draft: Omit<TechCaseDraft, 'savedAt'>): void {
    try {
      // Si el borrador está vacío, limpiarlo
      if (!draft.description && !draft.category && !draft.storeId && !draft.gpsPhotoUrl) {
        localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT_TECH_CASE);
        return;
      }
      localStorage.setItem(
        STORAGE_KEYS.FORM_DRAFT_TECH_CASE,
        JSON.stringify({ ...draft, savedAt: Date.now() })
      );
    } catch {}
  },

  /**
   * Obtiene el borrador del caso técnico si existe
   */
  getTechCaseDraft(): TechCaseDraft | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORM_DRAFT_TECH_CASE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Limpia el borrador del caso técnico al guardarse con éxito
   */
  clearTechCaseDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT_TECH_CASE);
    } catch {}
  },

  /**
   * Guarda borrador del formulario general de nuevo caso
   */
  saveNewCaseDraft(draft: Omit<NewCaseDraft, 'savedAt'>): void {
    try {
      if (!draft.description && !draft.category && !draft.storeId) {
        localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT_NEW_CASE);
        return;
      }
      localStorage.setItem(
        STORAGE_KEYS.FORM_DRAFT_NEW_CASE,
        JSON.stringify({ ...draft, savedAt: Date.now() })
      );
    } catch {}
  },

  /**
   * Obtiene el borrador de nuevo caso general
   */
  getNewCaseDraft(): NewCaseDraft | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FORM_DRAFT_NEW_CASE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Limpia el borrador de nuevo caso general
   */
  clearNewCaseDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FORM_DRAFT_NEW_CASE);
    } catch {}
  }
};
