import { App as CapApp } from '@capacitor/app';
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';
import { checkBiometricsAvailability, saveBiometricCredentials, authenticateWithBiometrics } from './biometrics';

import type { 
  ShiftEntry, MaterialCatalogItem, Store, User, Evidence, Case, 
  AppNotification, MaterialRequest, TechAvailability, JornadaAsistencia, ActiveTechPunchClock 
} from './types';

import { 
  DEFAULT_SHIFT_SCHEDULE, SUPERVISOR_BILLING_PROFILES, DEFAULT_TECH_AVAILABILITY, 
  DEFAULT_MATERIAL_CATALOG, DEFAULT_CATEGORIES, DEFAULT_STORES, DEFAULT_USERS 
} from './data';

import { 
  triggerNativeNotification, getUserBadgeText, encodeGpsInFilename, parseGpsFromFilename 
} from './helpers';

import type { SupervisorBillingData } from './billing';
import { 
  DEFAULT_BILLING_PROFILES, 
  getSupervisorBillingProfile 
} from './billing';

import { AdminTab } from './components/AdminTab';
import { TecnicosActividadTab } from './components/TecnicosActividadTab';
import { HistorialAsistenciasTab } from './components/HistorialAsistenciasTab';
import { AgendaTurnosTab } from './components/AgendaTurnosTab';
import { DisponibilidadTab } from './components/DisponibilidadTab';
import { NewCaseModal } from './components/NewCaseModal';
import { SearchableStoreSelect } from './components/SearchableStoreSelect';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { PauseMaterialModal } from './components/PauseMaterialModal';
import { TakeCaseModal } from './components/TakeCaseModal';
import { SolveModal } from './components/SolveModal';
import { NewTechCaseModal } from './components/NewTechCaseModal';
import { FacturacionModal } from './components/FacturacionModal';
import { ScheduleModal } from './components/ScheduleModal';
import { EditCaseModal } from './components/EditCaseModal';
import { DeleteCaseModal } from './components/DeleteCaseModal';
import { TechTimbradorModal } from './components/TechTimbradorModal';
import { TechTimbradorBanner } from './components/TechTimbradorBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { dbOptimizer, DB_CACHE_PRESETS } from './services/dbOptimization';
import { appStatePersistence } from './services/appStatePersistence';
import { GpsCameraCapture } from './components/GpsCameraCapture';
import type { GpsLocation } from './services/geoPhotoService';


export default function App() {
  const effectiveSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kqoftkwezwtfrthqjmdq.supabase.co';
  const isSupabaseConfigured = 
    !!effectiveSupabaseUrl && 
    effectiveSupabaseUrl !== 'https://tu-proyecto.supabase.co';

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

  
  // Manejo de sesión persistente: al salir o cambiar de app (ver WhatsApp, fotos, materiales),
  // se preserva la sesión activa sin deslogueos agresivos.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      return appStatePersistence.getActiveUserSession();
    } catch {
      return null;
    }
  });

  // Guardar datos del usuario para persistencia y servicio de notificaciones
  useEffect(() => {
    if (currentUser) {
      try {
        appStatePersistence.saveUserSession(currentUser);
        localStorage.setItem('mainttrac_user_info', JSON.stringify({
          nombre: currentUser.nombre,
          rol: currentUser.rol,
          tiendaId: currentUser.tiendaId || ''
        }));
      } catch {}
    }
  }, [currentUser]);

  // Manejo de ciclo de vida en Android APK / iOS / Web:
  // Al minimizar o cambiar de app, mantener la sesión y guardar el estado actual
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // La app fue al fondo (cambio de app para ver materiales, etc.):
          // Guardar timestamp de sesión activa
          if (currentUser) {
            appStatePersistence.saveUserSession(currentUser);
          }
        } else {
          // La app volvió a primer plano: asegurar sesión
          const sessionUser = appStatePersistence.getActiveUserSession();
          if (sessionUser && !currentUser) {
            setCurrentUser(sessionUser);
          }
        }
      }).then(handle => {
        removeListener = () => handle.remove();
      });
    } catch (e) {
      console.log("CapApp appStateChange listener:", e);
    }

    return () => {
      if (removeListener) removeListener();
    };
  }, [currentUser]);

  // Estados y verificación de autenticación biométrica (Huella / Face ID / Windows Hello)
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Huella / Face ID');
  const [savedBiometricUser, setSavedBiometricUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('maint_biometric_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
  const [showManualLoginForm, setShowManualLoginForm] = useState(false);

  useEffect(() => {
    const checkBioAvailability = async () => {
      try {
        const res = await checkBiometricsAvailability();
        if (res.isAvailable) {
          setIsBiometricAvailable(true);
          setBiometricType(res.biometryType);
        } else {
          setIsBiometricAvailable(false);
        }
      } catch (err) {
        console.log("Error verificando biometría:", err);
      }
    };
    checkBioAvailability();
  }, []);

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
      localStorage.removeItem('maint_notifs');
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('maint_users', JSON.stringify(users)); } catch {}
  }, [users]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [readNotifIds, setReadNotifIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('maint_read_notif_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try { localStorage.setItem('maint_read_notif_ids', JSON.stringify(readNotifIds)); } catch {}
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve((e.target?.result as string) || '');
          }
        };
        img.onerror = () => {
          resolve((e.target?.result as string) || '');
        };
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSolveEvidenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (solveEvidenceFiles.length + filesArray.length > 10) {
        alert("Puedes subir un máximo de 10 fotos.");
        return;
      }
      for (const file of filesArray) {
        try {
          const compressed = await compressImage(file);
          if (compressed) {
            setSolveEvidenceFiles(prev => [...prev, compressed]);
          }
        } catch {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setSolveEvidenceFiles(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
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

  // Theme State (Predeterminado: Tema Claro Corporativo)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false; // Default: Light Mode
  });

  // Navigation & Filters con recuperación de estado al cambiar de app
  const savedNav = appStatePersistence.getNavigationState();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'tecnicos_actividad' | 'historial_asistencias' | 'agenda_turnos' | 'disponibilidad'>(() => {
    return (savedNav?.activeTab as any) || 'dashboard';
  });
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(() => {
    return savedNav?.selectedCaseId ?? null;
  });
  const [caseDetailTab, setCaseDetailTab] = useState<'info' | 'asistencia' | 'bitacora' | 'evidencias' | 'materiales'>('info');
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<Evidence | null>(null);
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState(false);
  const [addEvidencePhoto, setAddEvidencePhoto] = useState<string | null>(null);
  const [addEvidenceGpsLoc, setAddEvidenceGpsLoc] = useState<GpsLocation | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [disponibilidadTab, setDisponibilidadTab] = useState<'cuadrante' | 'horarios'>('cuadrante');
  const [adminSectionTab, setAdminSectionTab] = useState<'usuarios' | 'tiendas'>('usuarios');
  const [showAdminUserForm, setShowAdminUserForm] = useState(false);
  const [showAdminStoreForm, setShowAdminStoreForm] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>('todos');
  const [adminSupervisorFilter, setAdminSupervisorFilter] = useState<string>('todos');
  const [adminStoreSearch, setAdminStoreSearch] = useState('');
  const [scheduleMonthFilter, setScheduleMonthFilter] = useState<string>('todos');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'en_proceso' | 'completado' | 'pausado_material'>(() => {
    return (savedNav?.statusFilter as any) || 'todos';
  });
  const [casesViewMode, setCasesViewMode] = useState<'pendientes' | 'concluidos'>(() => {
    return savedNav?.casesViewMode || 'pendientes';
  });
  const [storeFilter, setStoreFilter] = useState<string>(() => {
    return savedNav?.storeFilter ? String(savedNav.storeFilter) : 'todos';
  });
  const [searchTerm, setSearchTerm] = useState(savedNav?.searchQuery || '');

  // Guardar estado de navegación para mantener el lugar al cambiar de app
  useEffect(() => {
    appStatePersistence.saveNavigationState({
      activeTab,
      selectedCaseId,
      casesViewMode,
      statusFilter,
      storeFilter: storeFilter !== 'todos' ? Number(storeFilter) : undefined,
      searchQuery: searchTerm
    });
  }, [activeTab, selectedCaseId, casesViewMode, statusFilter, storeFilter, searchTerm]);

  // Estados para foto con coordenadas GPS (obligatorio para técnicos)
  const [techCaseGpsPhoto, setTechCaseGpsPhoto] = useState<string | null>(null);
  const [techCaseGpsLocation, setTechCaseGpsLocation] = useState<GpsLocation | null>(null);
  
  // Notification panel toggle
  
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Modals
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [showEditCaseModal, setShowEditCaseModal] = useState(false);
  const [deletingCase, setDeletingCase] = useState<Case | null>(null);
  const [showDeleteCaseModal, setShowDeleteCaseModal] = useState(false);
  const [newCaseStoreId, setNewCaseStoreId] = useState<number>(1);
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
  const [newPreMaterialItems, setNewPreMaterialItems] = useState<{ id: number; nombre: string; cantidad: number }[]>([
    { id: 1, nombre: '', cantidad: 1 }
  ]);

  // Estados del Timbrador de Asistencia para Técnicos
  const [showTechTimbradorModal, setShowTechTimbradorModal] = useState(false);
  const [activePunchClock, setActivePunchClock] = useState<ActiveTechPunchClock | null>(() => {
    try {
      const savedUser = localStorage.getItem('maint_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.rol === 'tecnico') {
          const savedPunch = localStorage.getItem(`maint_tech_punch_${u.id}`);
          return savedPunch ? JSON.parse(savedPunch) : null;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Estado para alertar de acción bloqueada cuando el técnico tiene un caso activo
  const [blockedActionMessage, setBlockedActionMessage] = useState<{ title: string; detail: string; caseId?: number } | null>(null);

  // Limpiar punch clock si el caso activo ya no existe en el sistema o fue concluido/eliminado
  useEffect(() => {
    if (activePunchClock && cases.length > 0) {
      const activeCase = cases.find(c => c.id === activePunchClock.casoId);
      if (!activeCase || activeCase.estado === 'concluido' || activeCase.estado === 'cerrado') {
        setActivePunchClock(null);
        try {
          localStorage.removeItem(`maint_tech_punch_${currentUser?.id}`);
        } catch {}
      }
    }
  }, [cases, activePunchClock, currentUser?.id]);


  const handleAddPreMaterialItem = () => {
    setNewPreMaterialItems(prev => [
      ...prev,
      { id: Date.now() + Math.floor(Math.random() * 1000), nombre: '', cantidad: 1 }
    ]);
  };

  const handleRemovePreMaterialItem = (id: number | string) => {
    setNewPreMaterialItems(prev => {
      if (prev.length <= 1) {
        return [{ id: Date.now(), nombre: '', cantidad: 1 }];
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const handleUpdatePreMaterialItem = (id: number | string, field: 'nombre' | 'cantidad', val: string | number) => {
    setNewPreMaterialItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

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
  const [billingProfiles, setBillingProfiles] = useState<Record<string, SupervisorBillingData>>(() => {
    try {
      const saved = localStorage.getItem('maint_billing_profiles');
      if (saved) return { ...DEFAULT_BILLING_PROFILES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_BILLING_PROFILES;
  });

  const [selectedAssignTechId, setSelectedAssignTechId] = useState<number | null>(null);



  // Form states
  const [rememberMe, setRememberMe] = useState(true);
  const [loginUser, setLoginUser] = useState(() => {
    try { return localStorage.getItem('maint_saved_user') || ''; } catch { return ''; }
  });
  const [loginPass, setLoginPass] = useState(() => {
    try { return localStorage.getItem('maint_saved_pass') || ''; } catch { return ''; }
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
    } catch {}
  }, [readNotifIds]);

  useEffect(() => {
    try {
      if (currentUser && typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  }, [currentUser]);


  // MOTOR DE SINCRONIZACIÓN ULTRA-RÁPIDO (Poller cada 2.5s para notificaciones estilo WhatsApp)
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return;

    let lastMaxCaseId = 0;
    let lastMaxNotifId = 0;

    const pollSync = async () => {
      try {
        // 1. Polling de casos activos y recientes con evidencias ligeras (sin base64 para evitar statement timeout 500)
        const { data: latestCases } = await supabase
          .from('casos')
          .select(`
            *,
            evidencias (id, caso_id, tipo, subido_por, nombre_archivo, fecha),
            comentarios (*)
          `)
          .order('id', { ascending: false })
          .limit(15);

        // Si el usuario tiene un caso abierto específico que no está en los top 15, sincronizarlo también
        if (selectedCaseId && latestCases && !latestCases.some((c: any) => c.id === selectedCaseId)) {
          const { data: currentSelectedRow } = await supabase
            .from('casos')
            .select(`*, evidencias (id, caso_id, tipo, subido_por, nombre_archivo, fecha), comentarios (*)`)
            .eq('id', selectedCaseId)
            .single();
          if (currentSelectedRow) {
            latestCases.push(currentSelectedRow);
          }
        }

        if (latestCases && latestCases.length > 0) {
          const topId = latestCases[0].id;
          if (lastMaxCaseId > 0 && topId > lastMaxCaseId) {
            const newC = latestCases[0];
            let shouldNotify = false;
            if (currentUser.rol === 'administrador' || currentUser.rol === 'tecnico') {
              shouldNotify = true;
            } else if (currentUser.rol === 'supervisor') {
              shouldNotify = !currentUser.supervisorTiendas || currentUser.supervisorTiendas.includes(newC.tienda_id);
            } else if (currentUser.tiendaId === newC.tienda_id) {
              shouldNotify = true;
            }

            if (shouldNotify) {
              // El aviso sonoro y push lo gestiona la tabla 'notificaciones' de forma única
            }
          }
          lastMaxCaseId = topId;

          // ACTUALIZACIÓN EN TIEMPO REAL DEL ESTADO REACT DE CASOS EN PANTALLA
          setCases(prev => {
            let hasNewOrUpdated = false;
            const existingMap = new Map(prev.map(c => [c.id, c]));

            latestCases.forEach((dbC: any) => {
              const existingCase = existingMap.get(dbC.id);
              const parsedEvs: Evidence[] = (dbC.evidencias || []).map((ev: any) => {
                const parsedCoords = ev.coordenadas || parseGpsFromFilename(ev.nombre_archivo);
                const existingEv = existingCase?.evidencias?.find(e => e.id === ev.id);
                return {
                  id: ev.id,
                  subidoPor: ev.subido_por,
                  tipo: ev.tipo,
                  archivoUrl: ev.archivo_url || existingEv?.archivoUrl || '',
                  nombreArchivo: ev.nombre_archivo,
                  fecha: ev.fecha,
                  coordenadas: parsedCoords
                };
              });

              const entryEv = parsedEvs.find(e => e.tipo === 'foto_ingreso_gps' && e.coordenadas);
              const exitEv = parsedEvs.find(e => (e.tipo === 'final' || e.tipo === 'foto_salida_gps') && e.coordenadas);
              const latIn = dbC.gps_latitud_entrada || entryEv?.coordenadas?.latitude;
              const lngIn = dbC.gps_longitud_entrada || entryEv?.coordenadas?.longitude;
              const latOut = dbC.gps_latitud_salida || exitEv?.coordenadas?.latitude;
              const lngOut = dbC.gps_longitud_salida || exitEv?.coordenadas?.longitude;

              // Mantener fotos locales base64 si aún están en memoria y la nube tiene menos fotos
              const combinedEvidencias = parsedEvs.length >= (existingCase?.evidencias?.length || 0)
                ? parsedEvs
                : existingCase?.evidencias || parsedEvs;

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
                fechaCierre: dbC.fecha_cierre || undefined,
                tecnico_presencial_nombre: dbC.tecnico_presencial_nombre || undefined,
                hora_entrada: dbC.hora_entrada || undefined,
                hora_salida: dbC.hora_salida || undefined,
                es_caso_tecnico: dbC.es_caso_tecnico || false,
                tecnico_estatus_trabajo: dbC.tecnico_estatus_trabajo || undefined,
                reaperturas_count: dbC.reaperturas_count || 0,
                pausado_por_material: dbC.pausado_por_material || false,
                motivo_pausa_material: dbC.motivo_pausa_material || undefined,
                fecha_pausa_material: dbC.fecha_pausa_material || undefined,
                materiales_llegaron_tienda: dbC.materiales_llegaron_tienda || false,
                fecha_llegada_materiales: dbC.fecha_llegada_materiales,
                fecha_programada: dbC.fecha_programada || undefined,
                turno_programado: dbC.turno_programado || undefined,
                horas_estimadas: dbC.horas_estimadas || undefined,
                agendado_por: dbC.agendado_por || undefined,
                solicitud_material_anticipada: dbC.solicitud_material_anticipada || false,
                material_anticipado_nombre: dbC.material_anticipado_nombre || undefined,
                material_anticipado_cantidad: dbC.material_anticipado_cantidad || 1,
                material_anticipado_items: dbC.material_anticipado_items || undefined,
                material_anticipado_estado: dbC.material_anticipado_estado || undefined,
                gps_latitud_entrada: latIn,
                gps_longitud_entrada: lngIn,
                gps_latitud_salida: latOut,
                gps_longitud_salida: lngOut,
                evidencias: combinedEvidencias,
                comentarios: (dbC.comentarios && dbC.comentarios.length > 0)
                  ? dbC.comentarios.map((co: any) => ({
                      id: co.id,
                      autor: co.autor,
                      rol: co.rol,
                      texto: co.texto,
                      fecha: co.fecha
                    }))
                  : (existingCase?.comentarios || []),
                historial: existingCase?.historial || []
              };

              if (!existingMap.has(dbC.id)) {
                existingMap.set(dbC.id, formatted);
                hasNewOrUpdated = true;
              } else {
                const oldC = existingMap.get(dbC.id)!;
                const evDiff = (oldC.evidencias?.length || 0) !== (formatted.evidencias?.length || 0);
                const comDiff = (oldC.comentarios?.length || 0) !== (formatted.comentarios?.length || 0);
                const statusDiff = oldC.estado !== dbC.estado ||
                  oldC.tecnico_estatus_trabajo !== dbC.tecnico_estatus_trabajo ||
                  oldC.tecnicoAsignadoId !== dbC.tecnico_asignado_id ||
                  oldC.hora_entrada !== dbC.hora_entrada ||
                  oldC.hora_salida !== dbC.hora_salida ||
                  oldC.pausado_por_material !== dbC.pausado_por_material;

                if (evDiff || comDiff || statusDiff) {
                  existingMap.set(dbC.id, { ...oldC, ...formatted });
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

        // 3. Sincronización periódica de usuarios (para reflejar nuevos usuarios en todos los administradores y técnicos)
        const { data: latestUsers } = await supabase
          .from('usuarios')
          .select('*');
        if (latestUsers && latestUsers.length > 0) {
          setUsers(prev => {
            const isDifferent = prev.length !== latestUsers.length || latestUsers.some(dbU => {
              const p = prev.find(x => x.id === dbU.id);
              return !p || p.estado !== dbU.estado || p.rol !== dbU.rol || p.nombre !== dbU.nombre || p.usuario !== dbU.usuario;
            });
            if (!isDifferent) return prev;
            return latestUsers.map((u: any) => ({
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
            }));
          });
        }

        // 4. Sincronización periódica de tiendas
        const { data: latestStores } = await supabase
          .from('tiendas')
          .select('*');
        if (latestStores && latestStores.length > 0) {
          setStores(prev => {
            const isDifferent = prev.length !== latestStores.length || latestStores.some(dbS => {
              const p = prev.find(x => x.id === dbS.id);
              return !p || p.nombre !== dbS.nombre || p.ciudad !== dbS.ciudad;
            });
            if (!isDifferent) return prev;
            return latestStores.map((s: any) => ({
              id: s.id,
              nombre: s.nombre,
              ciudad: s.ciudad,
              direccion: s.direccion
            }));
          });
        }
      } catch (err) {
        console.log("Error en sincronizacion rapida:", err);
      }
    };

    pollSync();
    const intervalId = setInterval(pollSync, 2500);
    return () => clearInterval(intervalId);
  }, [currentUser, isSupabaseConfigured]);

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

  // Manejo del botón "Atrás" de Android y reconexión en segundo plano
  useEffect(() => {
    let backListener: any = null;
    let appStateListener: any = null;

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

        backListener = CapApp.addListener('backButton', () => {
          if (showEditCaseModal) {
            setShowEditCaseModal(false);
          } else if (showDeleteCaseModal) {
            setShowDeleteCaseModal(false);
          } else if (showNewCaseModal) {
            setShowNewCaseModal(false);
          } else if (showTechTimbradorModal) {
            setShowTechTimbradorModal(false);
          } else if (showNewTechCaseModal) {
            setShowNewTechCaseModal(false);
          } else if (showSolveModal) {
            setShowSolveModal(false);
          } else if (showTakeCaseModal) {
            setShowTakeCaseModal(false);
          } else if (showPauseMaterialModal) {
            setShowPauseMaterialModal(false);
          } else if (showScheduleModal) {
            setShowScheduleModal(false);
          } else if (showFacturacionModal) {
            setShowFacturacionModal(false);
          } else if (showChangePasswordModal) {
            setShowChangePasswordModal(false);
          } else if (showNotifModal) {
            setShowNotifModal(false);
          } else if (selectedCaseId) {
            setSelectedCaseId(null);
          } else if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
          } else {
            CapApp.minimizeApp();
          }
        });

        appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            // Refrescar timestamp de sesión activa para evitar cierres de sesión no deseados al cambiar de app
            try {
              const currentActive = appStatePersistence.getActiveUserSession();
              if (currentActive) {
                appStatePersistence.saveUserSession(currentActive);
              }
            } catch {}
          }
        });
      }
    } catch {}

    return () => {
      if (backListener && typeof backListener.then === 'function') {
        backListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (backListener && typeof backListener.remove === 'function') {
        try { backListener.remove(); } catch {}
      }

      if (appStateListener && typeof appStateListener.then === 'function') {
        appStateListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (appStateListener && typeof appStateListener.remove === 'function') {
        try { appStateListener.remove(); } catch {}
      }
    };
  }, [
    showEditCaseModal, showDeleteCaseModal,
    showNewCaseModal, showNewTechCaseModal, showSolveModal, showTakeCaseModal,
    showPauseMaterialModal, showScheduleModal, showFacturacionModal,
    showChangePasswordModal, showNotifModal, selectedCaseId, activeTab, isSupabaseConfigured
  ]);

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
            // Notificación nativa centralizada en realtime-notificaciones para evitar duplicidad
            
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
                fecha_programada: nuevoCaso.fecha_programada || undefined,
                turno_programado: nuevoCaso.turno_programado || undefined,
                horas_estimadas: nuevoCaso.horas_estimadas || undefined,
                agendado_por: nuevoCaso.agendado_por || undefined,
                solicitud_material_anticipada: nuevoCaso.solicitud_material_anticipada || false,
                material_anticipado_nombre: nuevoCaso.material_anticipado_nombre || undefined,
                material_anticipado_cantidad: nuevoCaso.material_anticipado_cantidad || 1,
                material_anticipado_items: nuevoCaso.material_anticipado_items || undefined,
                material_anticipado_estado: nuevoCaso.material_anticipado_estado || undefined,
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
                  // Campos presenciales y multi-visita
                  tecnico_presencial_nombre: modCaso.tecnico_presencial_nombre || undefined,
                  hora_entrada: modCaso.hora_entrada || undefined,
                  hora_salida: modCaso.hora_salida || undefined,
                  es_caso_tecnico: modCaso.es_caso_tecnico || false,
                  tecnico_estatus_trabajo: modCaso.tecnico_estatus_trabajo || undefined,
                  reaperturas_count: modCaso.reaperturas_count || 0,
                  pausado_por_material: Boolean(modCaso.pausado_por_material),
                  motivo_pausa_material: modCaso.motivo_pausa_material || undefined,
                  fecha_pausa_material: modCaso.fecha_pausa_material || undefined,
                  materiales_llegaron_tienda: Boolean(modCaso.materiales_llegaron_tienda),
                  fecha_llegada_materiales: modCaso.fecha_llegada_materiales || undefined,
                  fecha_programada: modCaso.fecha_programada || undefined,
                  turno_programado: modCaso.turno_programado || undefined,
                  horas_estimadas: modCaso.horas_estimadas || undefined,
                  agendado_por: modCaso.agendado_por || undefined,
                  solicitud_material_anticipada: modCaso.solicitud_material_anticipada || false,
                  material_anticipado_nombre: modCaso.material_anticipado_nombre || undefined,
                  material_anticipado_cantidad: modCaso.material_anticipado_cantidad || 1,
                  material_anticipado_items: modCaso.material_anticipado_items || undefined,
                  material_anticipado_estado: modCaso.material_anticipado_estado || undefined
                };
              }
              return c;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setCases(prev => prev.filter(c => c.id !== deletedId));
              setSelectedCaseId(prev => (prev === deletedId ? null : prev));
              setActivePunchClock(prev => {
                if (prev?.casoId === deletedId) {
                  try {
                    localStorage.removeItem(`maint_tech_punch_${currentUser?.id}`);
                  } catch {}
                  return null;
                }
                return prev;
              });
              dbOptimizer.invalidate('casos');
            }
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
              const currentComms = c.comentarios || [];
              const alreadyExists = currentComms.some(co => 
                co.id === commentObj.id || 
                (co.texto === commentObj.texto && co.autor === commentObj.autor)
              );
              if (alreadyExists) return c;
              return {
                ...c,
                comentarios: [...currentComms, commentObj]
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
              const currentEvs = c.evidencias || [];
              if (currentEvs.some(ev => ev.id === evObj.id)) return c;
              if (currentEvs.some(ev => ev.archivoUrl === evObj.archivoUrl)) {
                return {
                  ...c,
                  evidencias: currentEvs.map(ev => ev.archivoUrl === evObj.archivoUrl ? evObj : ev)
                };
              }
              return {
                ...c,
                evidencias: [...currentEvs, evObj]
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
              if (notification.tipo === 'nuevo_caso') return true;
              if (newN.usuario_id === currentUser.id) return true;
              const isMaterialMsg = notification.tipo === 'materiales';
              const isStatusChange = notification.tipo === 'estado_cambio' && notification.estadoNuevo === 'pendiente';
              return isMaterialMsg || isStatusChange;
            }

            if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
              if (notification.tiendaId !== currentUser.tiendaId) return false;
              if (notification.tipo === 'comentario') return true;
              if (notification.tipo === 'estado_cambio') return true;
              if (notification.tipo === 'materiales') return true;
              if (notification.tipo === 'facturacion') return true;
              return false;
            }

            if (currentUser.rol === 'supervisor') {
              if (notification.tiendaId) {
                const storeObj = stores.find(s => s.id === notification.tiendaId);
                const isStoreAssigned = (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(notification.tiendaId)) ||
                  (storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === currentUser.nombre.toLowerCase().trim());
                if (!isStoreAssigned) return false;
              }
              if (notification.tipo === 'nuevo_caso' || notification.tipo === 'comentario' || notification.tipo === 'materiales' || notification.tipo === 'facturacion') return true;
              if (notification.tipo === 'estado_cambio') {
                return notification.estadoNuevo === 'en_proceso' || notification.estadoNuevo === 'concluido' || notification.estadoNuevo === 'cerrado';
              }
              return false;
            }

            return true; // Administradores / Gerencia reciben todo
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
              tecnicoId: req.tecnico_id || req.solicitado_por_id || 0,
              descripcion: req.descripcion,
              estado: req.estado,
              createdAt: req.created_at,
              solicitadoPorId: req.solicitado_por_id || req.tecnico_id,
              solicitadoPorNombre: req.solicitado_por_nombre,
              solicitadoPorRol: req.solicitado_por_rol,
              cantidad: req.cantidad || 1,
              materialNombre: req.material_nombre,
              tiendaId: req.tienda_id
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

    // 7. Escuchar la tabla 'usuarios' en tiempo real
    const channelUsuarios = supabase
      .channel('realtime-usuarios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        (payload: any) => {
          console.log("Cambio en usuarios en tiempo real:", payload);
          if (payload.eventType === 'INSERT') {
            const u = payload.new;
            const newU: User = {
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
            };
            setUsers(prev => {
              if (prev.some(x => x.id === newU.id || x.usuario.toLowerCase() === newU.usuario.toLowerCase())) {
                return prev.map(x => (x.id === newU.id || x.usuario.toLowerCase() === newU.usuario.toLowerCase()) ? newU : x);
              }
              return [...prev, newU];
            });
          } else if (payload.eventType === 'UPDATE') {
            const u = payload.new;
            const updatedU: User = {
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
            };
            setUsers(prev => prev.map(x => x.id === u.id ? updatedU : x));
            setCurrentUser(curr => (curr && curr.id === u.id) ? { ...curr, ...updatedU } : curr);
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setUsers(prev => prev.filter(x => x.id !== oldId));
            }
          }
        }
      )
      .subscribe();

    // 8. Escuchar la tabla 'tiendas' en tiempo real
    const channelTiendas = supabase
      .channel('realtime-tiendas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tiendas' },
        (payload: any) => {
          console.log("Cambio en tiendas en tiempo real:", payload);
          if (payload.eventType === 'INSERT') {
            const s = payload.new;
            const newS: Store = {
              id: s.id,
              nombre: s.nombre,
              ciudad: s.ciudad,
              direccion: s.direccion
            };
            setStores(prev => {
              if (prev.some(x => x.id === newS.id)) return prev;
              return [...prev, newS];
            });
          } else if (payload.eventType === 'UPDATE') {
            const s = payload.new;
            setStores(prev => prev.map(x => x.id === s.id ? {
              ...x,
              nombre: s.nombre,
              ciudad: s.ciudad,
              direccion: s.direccion
            } : x));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              setStores(prev => prev.filter(x => x.id !== oldId));
            }
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
      supabase.removeChannel(channelUsuarios);
      supabase.removeChannel(channelTiendas);
    };
  }, [isSupabaseConfigured, currentUser?.id]);

  useEffect(() => {
    try { localStorage.setItem('maint_stores', JSON.stringify(stores)); } catch {}
  }, [stores]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    async function loadData() {
      try {
        // 1. Tiendas (Caché de catálogo estático de 12h con SWR)
        const { data: dbStores, error: errStores } = await dbOptimizer.fetchWithCache(
          'tiendas',
          async () => await supabase.from('tiendas').select('*'),
          { ttlMs: DB_CACHE_PRESETS.STATIC_CATALOG }
        );
        const rawStores = Array.isArray(dbStores) ? dbStores : Array.isArray((dbStores as any)?.data) ? (dbStores as any).data : null;
        if (!errStores && rawStores) {
          setStores(rawStores.map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            ciudad: s.ciudad,
            direccion: s.direccion
          })));
        }

        // 2. Usuarios (Caché de perfiles de 30m con SWR)
        const { data: dbUsers, error: errUsers } = await dbOptimizer.fetchWithCache(
          'usuarios',
          async () => await supabase.from('usuarios').select('*'),
          { ttlMs: DB_CACHE_PRESETS.USER_PROFILES }
        );
        const rawUsers = Array.isArray(dbUsers) ? dbUsers : Array.isArray((dbUsers as any)?.data) ? (dbUsers as any).data : null;
        if (!errUsers && rawUsers) {
          setUsers(rawUsers.map((u: any) => ({
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

        // 3. Casos (Caché operativa con SWR + actualización reactiva por Realtime)
        const { data: dbCases, error: errCases } = await dbOptimizer.fetchWithCache(
          'casos',
          async () => await supabase.from('casos').select(`
            *,
            comentarios (*),
            evidencias (id, caso_id, tipo, subido_por, nombre_archivo, fecha)
          `),
          { ttlMs: DB_CACHE_PRESETS.OPERATIONAL_DATA }
        );
        const rawCases = Array.isArray(dbCases) ? dbCases : Array.isArray((dbCases as any)?.data) ? (dbCases as any).data : null;
        if (!errCases && rawCases) {
          setCases(rawCases.map((c: any) => {
            const parsedEvidencias: Evidence[] = (c.evidencias || []).map((ev: any) => {
              const parsedCoords = ev.coordenadas || parseGpsFromFilename(ev.nombre_archivo);
              return {
                id: ev.id,
                subidoPor: ev.subido_por,
                tipo: ev.tipo,
                archivoUrl: ev.archivo_url || '',
                nombreArchivo: ev.nombre_archivo,
                fecha: ev.fecha,
                coordenadas: parsedCoords
              };
            });

            const entryEv = parsedEvidencias.find(e => e.tipo === 'foto_ingreso_gps' && e.coordenadas);
            const exitEv = parsedEvidencias.find(e => (e.tipo === 'final' || e.tipo === 'foto_salida_gps') && e.coordenadas);
            const latIn = c.gps_latitud_entrada || entryEv?.coordenadas?.latitude;
            const lngIn = c.gps_longitud_entrada || entryEv?.coordenadas?.longitude;
            const latOut = c.gps_latitud_salida || exitEv?.coordenadas?.latitude;
            const lngOut = c.gps_longitud_salida || exitEv?.coordenadas?.longitude;

            return {
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
              gps_latitud_entrada: latIn,
              gps_longitud_entrada: lngIn,
              gps_latitud_salida: latOut,
              gps_longitud_salida: lngOut,
              jornadas: c.hora_entrada ? [{
                id: 1,
                numeroVisita: 1,
                tecnicoNombre: c.tecnico_presencial_nombre || 'Técnico',
                horaEntrada: c.hora_entrada,
                horaSalida: c.hora_salida,
                registradoEntradaPor: c.tecnico_presencial_nombre || 'Técnico',
                gpsEntrada: (latIn && lngIn) ? {
                  latitude: latIn,
                  longitude: lngIn
                } : undefined,
                gpsSalida: (latOut && lngOut) ? {
                  latitude: latOut,
                  longitude: lngOut
                } : undefined
              }] : [],
              evidencias: parsedEvidencias,
              comentarios: (c.comentarios || []).sort((x: any, y: any) => new Date(x.fecha).getTime() - new Date(y.fecha).getTime()).map((co: any) => ({
                id: co.id,
                autor: co.autor,
                rol: co.rol,
                texto: co.texto,
                fecha: co.fecha
              })),
              historial: []
            };
          }));
        }

        // 4. Notificaciones (Caché de 2m con SWR)
        const { data: dbNotifs, error: errNotifs } = await dbOptimizer.fetchWithCache(
          'notificaciones',
          async () => await supabase
            .from('notificaciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
          { ttlMs: DB_CACHE_PRESETS.NOTIFICATIONS }
        );
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

        // 5. Cargar pedidos_materiales (Caché operativa con SWR)
        const { data: dbMats, error: errMats } = await dbOptimizer.fetchWithCache(
          'pedidos_materiales',
          async () => await supabase
            .from('pedidos_materiales')
            .select('*')
            .order('created_at', { ascending: false }),
          { ttlMs: DB_CACHE_PRESETS.OPERATIONAL_DATA }
        );
        if (!errMats && dbMats) {
          setMaterialRequests(dbMats.map((m: any) => ({
            id: m.id,
            casoId: m.caso_id,
            tecnicoId: m.tecnico_id || m.solicitado_por_id || 0,
            descripcion: m.descripcion,
            estado: m.estado,
            createdAt: m.created_at,
            solicitadoPorId: m.solicitado_por_id || m.tecnico_id,
            solicitadoPorNombre: m.solicitado_por_nombre,
            solicitadoPorRol: m.solicitado_por_rol,
            cantidad: m.cantidad || 1,
            materialNombre: m.material_nombre,
            tiendaId: m.tienda_id
          })));
        }

        // 6. Cargar disponibilidad_tecnicos (Caché operativa con SWR)
        const { data: dbTechs, error: errTechs } = await dbOptimizer.fetchWithCache(
          'disponibilidad_tecnicos',
          async () => await supabase
            .from('disponibilidad_tecnicos')
            .select('*')
            .order('created_at', { ascending: false }),
          { ttlMs: DB_CACHE_PRESETS.OPERATIONAL_DATA }
        );
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

  // Sincronización automática de evidencias locales (base64) hacia Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || cases.length === 0) return;

    let isCancelled = false;
    const syncLocalEvidences = async () => {
      for (const c of cases) {
        if (isCancelled) break;
        if (c.evidencias && c.evidencias.length > 0) {
          const base64Evs = c.evidencias.filter(e => e.archivoUrl && e.archivoUrl.startsWith('data:image/'));
          if (base64Evs.length > 0) {
            try {
              // 1. Verificar si el caso realmente existe en Supabase antes de subir evidencias (evita error 409 FK)
              const { data: caseExists } = await supabase
                .from('casos')
                .select('id')
                .eq('id', c.id)
                .maybeSingle();

              if (!caseExists) {
                // El caso fue eliminado o no existe en Supabase -> purgar de la memoria local
                setCases(prev => prev.filter(x => x.id !== c.id));
                dbOptimizer.invalidate('casos');
                continue;
              }

              // 2. Comprobar qué evidencias ya existen en la nube
              const { data: cloudEvs } = await supabase
                .from('evidencias')
                .select('id, nombre_archivo')
                .eq('caso_id', c.id);

              const cloudFilenames = new Set((cloudEvs || []).map(e => e.nombre_archivo));
              const pendingToUpload = base64Evs.filter(ev => {
                const fname = encodeGpsInFilename(ev.nombreArchivo || 'evidencia.jpg', ev.coordenadas);
                return !cloudFilenames.has(fname) && !cloudFilenames.has(ev.nombreArchivo);
              });

              if (pendingToUpload.length > 0) {
                console.log(`[AutoSync] Sincronizando ${pendingToUpload.length} evidencias para el caso #${c.id}...`);
                const inserts = pendingToUpload.map((ev, i) => ({
                  caso_id: c.id,
                  subido_por: ev.subidoPor || 'Técnico',
                  tipo: ev.tipo || 'foto_ingreso_gps',
                  archivo_url: ev.archivoUrl,
                  nombre_archivo: encodeGpsInFilename(ev.nombreArchivo || `evidencia_${i + 1}.jpg`, ev.coordenadas),
                  fecha: ev.fecha || new Date().toISOString()
                }));
                const { error: insErr } = await supabase.from('evidencias').insert(inserts);
                if (!insErr) {
                  console.log(`[AutoSync] ¡Evidencias del caso #${c.id} subidas a Supabase con éxito!`);
                  dbOptimizer.invalidate('casos');
                } else {
                  console.warn(`[AutoSync] Omitiendo inserción de evidencia para caso #${c.id}:`, insErr.message);
                }
              }
            } catch (syncErr) {
              console.warn(`[AutoSync] Error verificando caso #${c.id}:`, syncErr);
            }
          }
        }
      }
    };

    const timer = setTimeout(syncLocalEvidences, 1800);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [cases, isSupabaseConfigured]);

  const handleLogout = () => {
    sessionStorage.removeItem('maint_session_active');
    localStorage.removeItem('maint_user');
    setCurrentUser(null);
    setSelectedCaseId(null);
    setActiveTab('dashboard');
    setShowManualLoginForm(true);
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

    sessionStorage.setItem('maint_session_active', 'true');
    localStorage.setItem('maint_user', JSON.stringify(matched));
    setCurrentUser(matched);

    // Auto-guardado de credenciales y configuración biométrica universal (Android, iPhone y PC)
    try {
      if (rememberMe) {
        localStorage.setItem('maint_saved_user', matched.usuario);
        localStorage.setItem('maint_saved_pass', loginPass.trim());
      } else {
        localStorage.removeItem('maint_saved_user');
        localStorage.removeItem('maint_saved_pass');
      }
      saveBiometricCredentials(matched, loginPass.trim());
      setSavedBiometricUser(matched);
      setShowManualLoginForm(false);
    } catch {}

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

  const handleBiometricLogin = async () => {
    if (!savedBiometricUser) {
      setLoginError('Ingresa primero con tu contraseña para vincular tus datos biométricos.');
      return;
    }

    setIsBiometricAuthenticating(true);
    setLoginError('');

    try {
      const authRes = await authenticateWithBiometrics(savedBiometricUser, biometricType);
      if (authRes.success) {
        sessionStorage.setItem('maint_session_active', 'true');
        localStorage.setItem('maint_user', JSON.stringify(savedBiometricUser));
        setCurrentUser(savedBiometricUser);
        setMaintToast({
          mostrar: true,
          titulo: 'Acceso Biométrico Concedido',
          mensaje: `¡Bienvenido de vuelta, ${savedBiometricUser.nombre}!`,
          tipo: 'success'
        });
      } else if (authRes.error) {
        setLoginError(authRes.error);
      }
    } catch (err: any) {
      console.log("Fallo o cancelación biométrica:", err);
      setLoginError('No se pudo verificar la identidad biométrica. Ingresa con tu contraseña.');
    } finally {
      setIsBiometricAuthenticating(false);
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
    } catch {}

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

  const isCaseVisibleToUser = (c: Case, user: User | null): boolean => {
    if (!user) return false;
    if (user.rol === 'jefe_tienda' || user.rol === 'subjefe') {
      return c.tiendaId === user.tiendaId;
    }
    if (user.rol === 'supervisor') {
      if (user.supervisorTiendas && Array.isArray(user.supervisorTiendas) && user.supervisorTiendas.includes(c.tiendaId)) {
        return true;
      }
      const storeObj = stores.find(s => s.id === c.tiendaId);
      if (storeObj && storeObj.supervisorName && user.nombre && storeObj.supervisorName.toLowerCase().trim() === user.nombre.toLowerCase().trim()) {
        return true;
      }
      return false;
    }
    return true; // tecnico, administrador, gerente
  };

  const getCaseDisplayCode = (c: Case): string => {
    if (!c.fechaCreacion) return c.id.toString();
    const dateObj = new Date(c.fechaCreacion);
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    
    // Conteo correlativo individual e independiente por tienda para cada mes
    const safeCases: Case[] = Array.isArray(cases) 
      ? cases 
      : Array.isArray((cases as any)?.data) 
        ? (cases as any).data 
        : [];

    const casesInSameMonthAndStore = safeCases
      .filter((other: Case) => {
        if (!other || !other.fechaCreacion || other.tiendaId !== c.tiendaId) return false;
        const oDate = new Date(other.fechaCreacion);
        return oDate.getMonth() === dateObj.getMonth() && oDate.getFullYear() === dateObj.getFullYear();
      })
      .sort((a: Case, b: Case) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());
      
    const seqNumber = casesInSameMonthAndStore.findIndex((other: Case) => other && other.id === c.id) + 1;
    return `${month}${year}-${seqNumber || 1}`;
  };

  const isSlaBreached = (c: Case): boolean => {
    if (!c || !c.fechaLimiteSla) return false;
    if (c.estado === 'concluido' || c.estado === 'cerrado') {
      return c.fechaCierre ? new Date(c.fechaCierre) > new Date(c.fechaLimiteSla) : false;
    }
    return new Date() > new Date(c.fechaLimiteSla);
  };

  const safeCases: Case[] = Array.isArray(cases) 
    ? cases 
    : Array.isArray((cases as any)?.data) 
      ? (cases as any).data 
      : [];

  const userVisibleCases = safeCases.filter(c => c && isCaseVisibleToUser(c, currentUser));
  const activeCases = userVisibleCases.filter(c => c && c.estado !== 'concluido' && c.estado !== 'cerrado');
  const concludedCases = userVisibleCases.filter(c => c && (c.estado === 'concluido' || c.estado === 'cerrado'));
  const pendingUnassigned = activeCases.filter(c => c && c.estado === 'pendiente');
  const inProgressCases = activeCases.filter(c => c && c.estado === 'en_proceso' && !c.pausado_por_material);
  const pausedCases = activeCases.filter(c => c && Boolean(c.pausado_por_material));

  const safeStores: Store[] = Array.isArray(stores) ? stores : [];
  const safeUsers: User[] = Array.isArray(users) ? users : [];

  // Caso que el técnico está atendiendo activamente
  const techActiveCase = React.useMemo(() => {
    if (currentUser?.rol !== 'tecnico') return null;
    if (activePunchClock && activePunchClock.casoId) {
      const found = safeCases.find(c => c && c.id === activePunchClock.casoId);
      if (found && found.estado !== 'concluido' && found.estado !== 'cerrado') return found;
    }
    const inProgress = safeCases.find(c => 
      c && 
      c.tecnicoAsignadoId === currentUser.id && 
      (c.estado === 'en_proceso' || c.hora_entrada) && 
      !c.hora_salida && 
      c.estado !== 'concluido' && 
      c.estado !== 'cerrado' &&
      !c.pausado_por_material
    );
    return inProgress || null;
  }, [currentUser, activePunchClock, safeCases]);

  const effectivePunchClock: ActiveTechPunchClock | null = React.useMemo(() => {
    if (activePunchClock) return activePunchClock;
    if (techActiveCase && currentUser) {
      return {
        tecnicoId: currentUser.id,
        tecnicoNombre: currentUser.nombre || 'Técnico',
        tiendaId: techActiveCase.tiendaId,
        casoId: techActiveCase.id,
        horaIngreso: techActiveCase.hora_entrada || techActiveCase.fechaCreacion,
        numeroVisita: 1
      };
    }
    return null;
  }, [activePunchClock, techActiveCase, currentUser]);

  // Selección controlada de casos: Los técnicos solo pueden abrir su caso en curso mientras atienden
  const handleSelectCase = (caseId: number | null) => {
    if (caseId === null) {
      setSelectedCaseId(null);
      return;
    }
    if (currentUser?.rol === 'tecnico' && techActiveCase && techActiveCase.id !== caseId) {
      const store = safeStores.find(s => s && s.id === techActiveCase.tiendaId);
      setBlockedActionMessage({
        title: "Atención Exclusiva en Caso Activo",
        detail: `Actualmente te encuentras atendiendo el Caso #${techActiveCase.id} (${techActiveCase.categoria}) en ${store ? store.nombre : 'tienda'}. Por normativa operativa, debes finalizar o poner en pausa tu caso activo actual para poder cambiar de trabajo o caso.`,
        caseId: techActiveCase.id
      });
      return;
    }
    setSelectedCaseId(caseId);
  };

  // Carga reactiva bajo demanda de evidencias completas con imágenes para el caso seleccionado
  useEffect(() => {
    if (!selectedCaseId || !isSupabaseConfigured) return;
    let isCancelled = false;

    supabase
      .from('evidencias')
      .select('*')
      .eq('caso_id', selectedCaseId)
      .then(({ data: fullEvs, error }: any) => {
        if (isCancelled || error || !fullEvs || fullEvs.length === 0) return;
        setCases(prev => prev.map(c => {
          if (c.id === selectedCaseId) {
            const mappedEvs: Evidence[] = fullEvs.map((ev: any) => ({
              id: ev.id,
              subidoPor: ev.subido_por,
              tipo: ev.tipo,
              archivoUrl: ev.archivo_url,
              nombreArchivo: ev.nombre_archivo,
              fecha: ev.fecha,
              coordenadas: ev.coordenadas || parseGpsFromFilename(ev.nombre_archivo)
            }));
            return {
              ...c,
              evidencias: mappedEvs
            };
          }
          return c;
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCaseId, isSupabaseConfigured]);

  // Creación controlada de casos: Los técnicos no pueden crear otro caso mientras atienden uno
  const handleAttemptNewCase = () => {
    if (currentUser?.rol === 'tecnico' && techActiveCase) {
      const store = safeStores.find(s => s && s.id === techActiveCase.tiendaId);
      setBlockedActionMessage({
        title: "Atención Exclusiva en Caso Activo",
        detail: `Ya te encuentras atendiendo el Caso #${techActiveCase.id} (${techActiveCase.categoria}) en ${store ? store.nombre : 'tienda'}. Debes finalizar o poner en pausa tu caso activo actual para poder cambiar de trabajo o caso.`,
        caseId: techActiveCase.id
      });
      return;
    }
    if (currentUser?.rol === 'tecnico') {
      setShowNewTechCaseModal(true);
    } else {
      setShowNewCaseModal(true);
    }
  };

  const getHumanDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 5) return 'Hace unos momentos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hoy (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      if (diffDays === 1) return `Ayer (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getFilteredCases = (): Case[] => {
    let list: Case[] = [];

    if (casesViewMode === 'concluidos' || statusFilter === 'completado') {
      list = [...concludedCases];
    } else {
      if (statusFilter === 'pendiente') {
        list = activeCases.filter(c => c.estado === 'pendiente');
      } else if (statusFilter === 'en_proceso') {
        list = activeCases.filter(c => c.estado === 'en_proceso' && !c.pausado_por_material);
      } else if (statusFilter === 'pausado_material') {
        list = activeCases.filter(c => Boolean(c.pausado_por_material));
      } else {
        list = [...activeCases];
      }
    }

    if (storeFilter !== 'todos') {
      list = list.filter(c => c.tiendaId.toString() === storeFilter);
    }

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const storeMatches = stores.filter(s => s.nombre.toLowerCase().includes(q) || s.ciudad.toLowerCase().includes(q) || (s.direccion && s.direccion.toLowerCase().includes(q))).map(s => s.id);
      list = list.filter(c => 
        c.id.toString().includes(q) || 
        getCaseDisplayCode(c).toLowerCase().includes(q) ||
        c.descripcion.toLowerCase().includes(q) || 
        c.categoria.toLowerCase().includes(q) ||
        storeMatches.includes(c.tiendaId) ||
        (c.tecnico_presencial_nombre && c.tecnico_presencial_nombre.toLowerCase().includes(q))
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

    const isStoreUser = currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe';
    const tiendaId = isStoreUser ? (currentUser.tiendaId || 1) : (newCaseStoreId || currentUser.tiendaId || 1);
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

    // Preparar materiales solicitados por adelantado
    const validPreMaterials = newPreMaterialItems
      .map(item => ({
        id: item.id,
        nombre: (item.nombre || '').trim(),
        cantidad: Math.max(1, Number(item.cantidad) || 1)
      }))
      .filter(item => item.nombre.length > 0);

    if (validPreMaterials.length === 0 && newPreMaterialName.trim()) {
      validPreMaterials.push({
        id: Date.now(),
        nombre: newPreMaterialName.trim(),
        cantidad: Math.max(1, Number(newPreMaterialQty) || 1)
      });
    }

    const hasPreMaterials = newRequestPreMaterial && validPreMaterials.length > 0;
    const preMaterialsSummary = hasPreMaterials
      ? validPreMaterials.map(m => `${m.cantidad}x ${m.nombre}`).join(' | ')
      : undefined;
    const preMaterialsTotalQty = hasPreMaterials
      ? validPreMaterials.reduce((sum, m) => sum + m.cantidad, 0)
      : undefined;

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
      ...(hasPreMaterials ? {
        solicitud_material_anticipada: true,
        material_anticipado_nombre: preMaterialsSummary,
        material_anticipado_cantidad: preMaterialsTotalQty,
        material_anticipado_items: validPreMaterials,
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
        ...(hasPreMaterials ? {
          solicitud_material_anticipada: true,
          material_anticipado_nombre: preMaterialsSummary,
          material_anticipado_cantidad: preMaterialsTotalQty,
          material_anticipado_items: validPreMaterials,
          material_anticipado_estado: 'pendiente_aprobacion'
        } : {})
      }]).then(async ({ error }: any) => {
        if (error) {
          console.error("Error al crear caso en Supabase:", error);
        } else {
          if (initialEvidences.length > 0) {
            const evRows = initialEvidences.map(ev => ({
              caso_id: newId,
              subido_por: ev.subidoPor,
              tipo: ev.tipo,
              archivo_url: ev.archivoUrl,
              nombre_archivo: ev.nombreArchivo,
              fecha: ev.fecha
            }));
            const { error: evErr } = await supabase.from('evidencias').insert(evRows);
            if (evErr) console.error("Error al guardar evidencias iniciales en Supabase:", evErr);
          }
          dbOptimizer.invalidate('casos');
        }
      });
    }

    // Registrar pedidos en pedidos_materiales si el usuario solicitó materiales por adelantado
    if (hasPreMaterials) {
      const createdRequests: MaterialRequest[] = validPreMaterials.map((mat, idx) => {
        const reqId = Date.now() + idx + Math.floor(Math.random() * 1000);
        return {
          id: reqId,
          casoId: newId,
          tecnicoId: currentUser.id,
          descripcion: `📦 [Pedido Inicial] ${mat.cantidad}x ${mat.nombre}`,
          estado: 'pendiente',
          createdAt: now.toISOString(),
          solicitadoPorId: currentUser.id,
          solicitadoPorNombre: currentUser.nombre,
          solicitadoPorRol: currentUser.rol,
          cantidad: mat.cantidad,
          materialNombre: mat.nombre,
          tiendaId: tiendaId
        };
      });

      setMaterialRequests(prev => [...createdRequests, ...prev]);

      if (isSupabaseConfigured) {
        const supabaseRows = createdRequests.map(r => ({
          id: r.id,
          caso_id: newId,
          tecnico_id: currentUser.id,
          solicitado_por_id: currentUser.id,
          solicitado_por_nombre: currentUser.nombre,
          solicitado_por_rol: currentUser.rol,
          tienda_id: tiendaId,
          descripcion: r.descripcion,
          cantidad: r.cantidad,
          material_nombre: r.materialNombre,
          estado: 'pendiente'
        }));
        supabase.from('pedidos_materiales').insert(supabaseRows).then(({ error }: any) => {
          if (error) console.error("Error al registrar pedidos_materiales anticipados:", error);
        });
      }
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
    setNewPreMaterialItems([{ id: Date.now(), nombre: '', cantidad: 1 }]);
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
        const currentComms = c.comentarios || [];
        const alreadyExists = currentComms.some(co => co.texto === newComment.texto && co.autor === newComment.autor);
        if (alreadyExists) return c;
        return {
          ...c,
          comentarios: [...currentComms, newComment]
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

    const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCaseId) return;

    const updateData = {
      fecha_programada: scheduleDate,
      turno_programado: scheduleShift,
      horas_estimadas: scheduleHours,
      tecnico_asignado_id: scheduleAssignedTechId ? Number(scheduleAssignedTechId) : null,
      agendado_por: currentUser?.nombre || 'Usuario'
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('casos').update(updateData).eq('id', scheduleCaseId);
      } catch (err) {
        console.error('Error guardando agendamiento:', err);
      }
    }

    setCases(prev => prev.map(c => c.id === scheduleCaseId ? {
      ...c,
      fecha_programada: scheduleDate,
      turno_programado: scheduleShift,
      horas_estimadas: scheduleHours,
      tecnicoAsignadoId: scheduleAssignedTechId ? Number(scheduleAssignedTechId) : undefined,
      agendado_por: currentUser?.nombre || 'Usuario'
    } : c));

    setShowScheduleModal(false);
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

    // Validación estricta para técnicos: foto con coordenadas GPS obligatoria
    if (currentUser.rol === 'tecnico' && !techCaseGpsPhoto) {
      alert("Como técnico, es obligatorio capturar una fotografía con coordenadas GPS para registrar el caso.");
      return;
    }

    const now = new Date();
    const limit = new Date(now.getTime() + 48 * 3600000).toISOString(); // 48h default for tech reports
    const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 2001;

    const assignedStoreId = techCaseStoreId || (stores[0]?.id || 1);

    const initialEvidence: Evidence[] = techCaseGpsPhoto ? [{
      id: Date.now(),
      subidoPor: currentUser.nombre,
      tipo: 'foto_ingreso_gps',
      archivoUrl: techCaseGpsPhoto,
      nombreArchivo: 'evidencia_ingreso_gps.jpg',
      fecha: now.toISOString(),
      coordenadas: techCaseGpsLocation ? {
        latitude: techCaseGpsLocation.latitude,
        longitude: techCaseGpsLocation.longitude,
        accuracy: techCaseGpsLocation.accuracy
      } : undefined
    }] : [];

    const initialComments = techCaseGpsPhoto ? [{
      id: Date.now() + 1,
      autor: currentUser.nombre,
      rol: currentUser.rol,
      texto: `📍 CREACIÓN DE CASO CON FOTO GPS: Técnico ${currentUser.nombre} registró el caso en sitio con coordenadas satelitales verificadas.`,
      fecha: now.toISOString()
    }] : [];

    const newCase: Case = {
      id: newId,
      tiendaId: assignedStoreId,
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
      gps_latitud_entrada: techCaseGpsLocation?.latitude,
      gps_longitud_entrada: techCaseGpsLocation?.longitude,
      evidencias: initialEvidence,
      comentarios: initialComments,
      historial: [
        { id: Date.now(), estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now.toISOString() }
      ]
    };

    setCases([newCase, ...cases]);
    // Actualizar en caché L1/L2
    dbOptimizer.updateCachedList<Case>('casos', (prevList) => [newCase, ...(prevList || [])]);

    if (isSupabaseConfigured) {
      const numericStoreId = typeof assignedStoreId === 'number' 
        ? assignedStoreId 
        : parseInt(String(assignedStoreId).replace(/\D/g, ''), 10) || 1;

      supabase.from('casos').insert([{
        id: newId,
        tienda_id: numericStoreId,
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
      }]).then(async ({ error }: any) => {
        if (error) {
          console.error("Error al crear caso técnico en Supabase:", error);
        } else if (techCaseGpsPhoto) {
          // Insertar evidencia con coordenadas satelitales codificadas en el nombre
          const filename = encodeGpsInFilename('evidencia_ingreso_gps.jpg', techCaseGpsLocation);
          const { error: errEv } = await supabase.from('evidencias').insert([{
            caso_id: newId,
            subido_por: currentUser.nombre,
            tipo: 'foto_ingreso_gps',
            archivo_url: techCaseGpsPhoto,
            nombre_archivo: filename,
            fecha: now.toISOString()
          }]);
          if (errEv) console.error("Error al insertar evidencia GPS en Supabase:", errEv);

          await supabase.from('comentarios').insert([{
            caso_id: newId,
            autor: currentUser.nombre,
            rol: currentUser.rol,
            texto: `📍 CREACIÓN DE CASO CON FOTO GPS: Técnico ${currentUser.nombre} registró el caso en sitio con coordenadas satelitales verificadas.`,
            fecha: now.toISOString()
          }]);

          dbOptimizer.invalidate('casos');
        }
      });
    }

    pushNotification(
      `🔧 Actividad Técnica: ${currentUser.nombre} inició "${techCaseCategory.trim()}" (${techStatus}) en ${stores.find(s => s.id === techCaseStoreId)?.nombre || `Tienda #${techCaseStoreId}`}.`,
      'nuevo_caso',
      { tiendaId: techCaseStoreId || undefined, casoId: newId }
    );

    // Limpiar formulario y borrador guardado
    appStatePersistence.clearTechCaseDraft();
    setTechCaseCategory('');
    setTechCaseDesc('');
    setTechCaseStoreId(0);
    setTechCaseGpsPhoto(null);
    setTechCaseGpsLocation(null);
    setTechStatus('Trabajando en tienda');
    setShowNewTechCaseModal(false);
    setSelectedCaseId(newId);
  };

  // ==========================================
  // PERMISOS Y ACCIONES: EDITAR Y ELIMINAR CASO
  // ==========================================
  const canEditOrDeleteCase = (c: Case) => {
    if (!currentUser) return false;
    // Si el usuario es el creador del caso (sea técnico o local)
    if (String(c.creadoPor) === String(currentUser.id)) return true;
    // Si es técnico y está asignado al caso o es caso técnico de él
    if (currentUser.rol === 'tecnico' && (String(c.tecnicoAsignadoId) === String(currentUser.id) || c.es_caso_tecnico)) return true;
    // Si es usuario tienda (jefe_tienda o subjefe) y el caso pertenece a su tienda
    if ((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (!currentUser.tiendaId || currentUser.tiendaId === c.tiendaId)) return true;
    // Administradores y supervisores también tienen facultades de gestión
    if (currentUser.rol === 'administrador' || currentUser.rol === 'supervisor') return true;
    return false;
  };

  const handleOpenEditCase = (c: Case) => {
    setEditingCase(c);
    setShowEditCaseModal(true);
  };

  const handleOpenDeleteCase = (c: Case) => {
    setDeletingCase(c);
    setShowDeleteCaseModal(true);
  };

  const handleSaveEditCase = async (updated: {
    categoria: string;
    descripcion: string;
    prioridad: number;
    tiendaId: number;
  }) => {
    if (!editingCase) return;
    const caseId = editingCase.id;

    // Actualizar en React State
    setCases(prev => prev.map(c => c.id === caseId ? {
      ...c,
      categoria: updated.categoria,
      descripcion: updated.descripcion,
      prioridad: updated.prioridad,
      tiendaId: updated.tiendaId
    } : c));

    // Actualizar en Supabase si está configurado
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('casos')
          .update({
            categoria: updated.categoria,
            descripcion: updated.descripcion,
            prioridad_nivel: updated.prioridad,
            tienda_id: updated.tiendaId
          })
          .eq('id', caseId);

        if (error) {
          console.error("Error al actualizar caso en Supabase:", error);
        } else {
          // Registrar comentario de auditoría
          await supabase.from('comentarios').insert([{
            caso_id: caseId,
            autor: currentUser?.nombre || 'Usuario',
            rol: currentUser?.rol || 'sistema',
            texto: `✏️ Caso editado por ${currentUser?.nombre || 'Usuario'}: se actualizó la categoría y/o descripción.`,
            fecha: new Date().toISOString()
          }]);
          dbOptimizer.invalidate('casos');
        }
      } catch (err) {
        console.error("Error al guardar edición en Supabase:", err);
      }
    }

    setMaintToast({
      mostrar: true,
      titulo: 'Caso Actualizado',
      mensaje: `El Caso #${String(caseId).padStart(4, '0')} se ha modificado exitosamente.`,
      tipo: 'success'
    });
  };

  const handleConfirmDeleteCase = async () => {
    if (!deletingCase) return;
    const caseId = deletingCase.id;

    // Eliminar de React State inmediatamente
    setCases(prev => prev.filter(c => c.id !== caseId));
    if (selectedCaseId === caseId) {
      setSelectedCaseId(null);
    }
    if (activePunchClock?.casoId === caseId) {
      setActivePunchClock(null);
      try {
        localStorage.removeItem(`maint_tech_punch_${currentUser?.id}`);
      } catch {}
    }

    // Eliminar de Supabase si está configurado
    if (isSupabaseConfigured) {
      try {
        // Eliminar registros dependientes primero para evitar conflictos de clave foránea
        await supabase.from('comentarios').delete().eq('caso_id', caseId);
        await supabase.from('evidencias').delete().eq('caso_id', caseId);
        await supabase.from('pedidos_materiales').delete().eq('caso_id', caseId);
        await supabase.from('notificaciones').delete().eq('caso_id', caseId);
        const { error } = await supabase.from('casos').delete().eq('id', caseId);
        if (error) {
          console.error("Error al eliminar caso en Supabase:", error);
        }
        dbOptimizer.invalidate('casos');
      } catch (err) {
        console.error("Error al eliminar caso en Supabase:", err);
      }
    }

    setMaintToast({
      mostrar: true,
      titulo: 'Caso Eliminado',
      mensaje: `El Caso #${String(caseId).padStart(4, '0')} fue eliminado correctamente.`,
      tipo: 'success'
    });
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

  
  // Helper para obtener y calcular el historial cronológico de jornadas/visitas de un caso
  const getCaseJornadas = (c: Case): JornadaAsistencia[] => {
    if (c.jornadas && c.jornadas.length > 0) return c.jornadas;
    if (c.hora_entrada) {
      return [{
        id: 1,
        numeroVisita: 1,
        tecnicoNombre: c.tecnico_presencial_nombre || (users.find(u => u.id === c.tecnicoAsignadoId)?.nombre) || 'Técnico Asignado',
        horaEntrada: c.hora_entrada,
        horaSalida: c.hora_salida,
        motivoPausa: c.motivo_pausa_material,
        tipoSalida: (c.estado === 'concluido' || c.estado === 'cerrado') ? 'conclusion_final' : c.pausado_por_material ? 'pausa_material' : c.hora_salida ? 'salida_temporal' : undefined,
        registradoEntradaPor: 'Jefe de Tienda / Sistema',
        registradoSalidaPor: c.hora_salida ? 'Jefe de Tienda / Sistema' : undefined
      }];
    }
    return [];
  };

  // Helper para Pausar Caso directamente (usado por modal de pausa y timbrador)
  const handlePauseCaseDirect = (caseId: number, reason: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const currentJornadas = getCaseJornadas(c);
        let updatedJornadas = [...currentJornadas];
        if (updatedJornadas.length > 0) {
          const lastIdx = updatedJornadas.length - 1;
          if (!updatedJornadas[lastIdx].horaSalida) {
            updatedJornadas[lastIdx] = {
              ...updatedJornadas[lastIdx],
              horaSalida: now,
              motivoPausa: reason,
              tipoSalida: 'pausa_material',
              registradoSalidaPor: currentUser.nombre
            };
          }
        } else if (c.hora_entrada) {
          updatedJornadas = [{
            id: 1,
            numeroVisita: 1,
            tecnicoNombre: c.tecnico_presencial_nombre || currentUser.nombre,
            horaEntrada: c.hora_entrada,
            horaSalida: now,
            motivoPausa: reason,
            tipoSalida: 'pausa_material',
            registradoEntradaPor: 'Sistema',
            registradoSalidaPor: currentUser.nombre
          }];
        }

        return {
          ...c,
          pausado_por_material: true,
          motivo_pausa_material: reason,
          fecha_pausa_material: now,
          materiales_llegaron_tienda: false,
          hora_salida: now,
          jornadas: updatedJornadas,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `⏸️ CASO PAUSADO (${currentUser.rol === 'tecnico' ? 'Técnico' : currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' ? 'Local' : currentUser.rol}): "${reason}". Se registró la salida del técnico a las ${new Date(now).toLocaleTimeString()} en espera de materiales o solución.`,
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
        materiales_llegaron_tienda: false,
        hora_salida: now
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

    const targetCase = cases.find(c => c.id === caseId);
    pushNotification(
      `⏸️ Caso #${caseId} puesto en pausa por falta de materiales/presupuesto: ${reason}`,
      'estado_cambio',
      { casoId: caseId, tiendaId: targetCase?.tiendaId }
    );
  };

  // Handler para Pausar Caso por Materiales / Imprevisto (Técnicos, Locales, Supervisores y Admins)
  const handlePauseCaseForMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || !pauseReasonInput.trim()) return;
    handlePauseCaseDirect(selectedCaseId, pauseReasonInput.trim());
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
  const handleConfirmTakeCase = (payloadOrEvent?: any) => {
    if (payloadOrEvent && typeof payloadOrEvent.preventDefault === 'function') {
      payloadOrEvent.preventDefault();
    }
    if (!currentUser || !selectedCaseId) return;

    // Validación estricta para técnicos: foto con coordenadas GPS obligatoria
    const gpsPhoto = payloadOrEvent?.gpsPhoto;
    const gpsLocation = payloadOrEvent?.gpsLocation as GpsLocation | undefined;
    if (currentUser.rol === 'tecnico' && !gpsPhoto) {
      alert("Como técnico, es obligatorio capturar una fotografía con coordenadas GPS para validar tu presencia física en tienda antes de tomar el caso.");
      return;
    }

    const now = new Date().toISOString();
    const caseId = selectedCaseId;
    const isTeam = takeCaseMode === 'equipo' && takeCaseSupportTech.trim() !== '';
    const supportName = isTeam ? takeCaseSupportTech.trim() : undefined;
    const mainName = currentUser.nombre;
    const techDisplay = isTeam ? `${mainName} & ${supportName}` : mainName;

    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const currentJornadas = getCaseJornadas(targetCase);
    const newJornadaEntry: JornadaAsistencia = {
      id: Date.now(),
      numeroVisita: currentJornadas.length + 1,
      tecnicoNombre: techDisplay,
      horaEntrada: now,
      horaSalida: undefined,
      registradoEntradaPor: currentUser.nombre
    };
    const updatedJornadas = [...currentJornadas, newJornadaEntry];

    const gpsEvidences: Evidence[] = gpsPhoto ? [{
      id: Date.now(),
      subidoPor: currentUser.nombre,
      tipo: 'foto_ingreso_gps',
      archivoUrl: gpsPhoto,
      nombreArchivo: `ingreso_gps_caso_${caseId}.jpg`,
      fecha: now
    }] : [];

    const gpsCommentDetail = gpsLocation
      ? ` • 📍 Coordenadas GPS: Lat ${gpsLocation.latitude.toFixed(6)}, Lng ${gpsLocation.longitude.toFixed(6)} (±${Math.round(gpsLocation.accuracy)}m)`
      : gpsPhoto ? ` • 📍 Foto con Coordenadas GPS Registrada.` : '';

    const commentText = isTeam
      ? `👥 TRABAJO EN EQUIPO: Los técnicos ${mainName} y ${supportName} se han puesto a trabajar juntos en este caso presencialmente.${gpsCommentDetail}`
      : `👷 Técnico ${mainName} tomó la asignación de este caso y comenzó la atención presencial.${gpsCommentDetail}`;

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'en_proceso' as const,
          tecnicoAsignadoId: currentUser.id,
          tecnico_presencial_nombre: mainName,
          tecnico_apoyo_nombre: supportName,
          hora_entrada: now,
          hora_salida: undefined,
          pausado_por_material: false,
          motivo_pausa_material: undefined,
          fecha_pausa_material: undefined,
          jornadas: updatedJornadas,
          evidencias: [...(c.evidencias || []), ...gpsEvidences],
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: commentText,
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

    // Actualizar en caché L1/L2
    dbOptimizer.updateCachedList<Case>('casos', (prevList) => {
      return (prevList || []).map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            estado: 'en_proceso' as const,
            tecnico_presencial_nombre: mainName,
            hora_entrada: now,
            evidencias: [...(c.evidencias || []), ...gpsEvidences]
          };
        }
        return c;
      });
    });

    // Iniciar Timbrador activo inmediatamente para el técnico
    const punch: ActiveTechPunchClock = {
      tecnicoId: currentUser.id,
      tecnicoNombre: currentUser.nombre,
      tiendaId: targetCase.tiendaId,
      casoId: caseId,
      horaIngreso: now,
      numeroVisita: updatedJornadas.length,
      esNuevoCaso: Boolean(targetCase.es_caso_tecnico)
    };
    setActivePunchClock(punch);
    try {
      localStorage.setItem(`maint_tech_punch_${currentUser.id}`, JSON.stringify(punch));
    } catch {}

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        tecnico_asignado_id: currentUser.id,
        tecnico_presencial_nombre: mainName,
        tecnico_apoyo_nombre: supportName || null,
        hora_entrada: now,
        hora_salida: null,
        pausado_por_material: false,
        motivo_pausa_material: null,
        fecha_pausa_material: null
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar caso en Supabase:", error);

        if (gpsPhoto) {
          supabase.from('evidencias').insert([{
            caso_id: caseId,
            subido_por: currentUser.nombre,
            tipo: 'foto_ingreso_gps',
            archivo_url: gpsPhoto,
            nombre_archivo: `ingreso_gps_caso_${caseId}.jpg`,
            fecha: now
          }]).then(() => {});
        }

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: commentText,
          fecha: now
        }]);
      });
    }

    const storeId = targetCase.tiendaId || 1;
    pushNotification(
      isTeam
        ? `👥 TRABAJO EN EQUIPO: Técnicos ${mainName} y ${supportName} tomaron el Caso #${caseId}.`
        : `🔧 Técnico ${mainName} tomó la asignación del Caso #${caseId}.`,
      'estado_cambio',
      { tiendaId: storeId, casoId: caseId, estadoNuevo: 'en_proceso' }
    );

    setMaintToast({
      mostrar: true,
      titulo: '⚡ Caso Tomado',
      mensaje: `Iniciaste atención en el Caso #${caseId}. Timbrador presencial activo.`,
      tipo: 'success'
    });

    setShowTakeCaseModal(false);
  };



  // Conclude Case
  const [solutionDesc, setSolutionDesc] = useState('');

  // Helper directo para Concluir Caso (usado por SolveModal y por el Timbrador)
  const handleConcludeCaseDirect = (
    caseId: number, 
    solutionText: string, 
    evidencePhotos: string[],
    gpsLocation?: { latitude: number; longitude: number; accuracy?: number }
  ) => {
    if (!currentUser) return;

    const desc = solutionText.trim() || 'Trabajo técnico finalizado y solucionado conforme en tienda.';
    const currentEvidence = [...evidencePhotos];

    const now = new Date().toISOString();
    const targetCase = cases.find(c => c.id === caseId);
    const exitTime = now;

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const currentJornadas = getCaseJornadas(c);
        let updatedJornadas = [...currentJornadas];
        if (updatedJornadas.length > 0) {
          const lastIdx = updatedJornadas.length - 1;
          if (!updatedJornadas[lastIdx].horaSalida) {
            updatedJornadas[lastIdx] = {
              ...updatedJornadas[lastIdx],
              horaSalida: exitTime,
              tipoSalida: 'conclusion_final',
              registradoSalidaPor: currentUser.nombre,
              gpsSalida: gpsLocation
            };
          }
        } else if (c.hora_entrada) {
          updatedJornadas = [{
            id: 1,
            numeroVisita: 1,
            tecnicoNombre: c.tecnico_presencial_nombre || currentUser.nombre,
            horaEntrada: c.hora_entrada,
            horaSalida: exitTime,
            tipoSalida: 'conclusion_final',
            registradoEntradaPor: 'Sistema',
            registradoSalidaPor: currentUser.nombre,
            gpsSalida: gpsLocation
          }];
        }

        return {
          ...c,
          estado: 'concluido' as const,
          fechaCierre: now,
          hora_salida: exitTime,
          gps_latitud_salida: gpsLocation?.latitude || c.gps_latitud_salida,
          gps_longitud_salida: gpsLocation?.longitude || c.gps_longitud_salida,
          jornadas: updatedJornadas,
          evidencias: [
            ...(c.evidencias || []),
            ...currentEvidence.map((base64, index) => ({
              id: Date.now() + index,
              subidoPor: currentUser.nombre,
              tipo: 'final' as const,
              archivoUrl: base64,
              nombreArchivo: encodeGpsInFilename(`evidencia_resolucion_${index + 1}.jpg`, gpsLocation),
              fecha: now,
              coordenadas: gpsLocation
            }))
          ],
          comentarios: [
            ...(c.comentarios || []),
            { id: Date.now(), autor: currentUser.nombre, rol: currentUser.rol, texto: `✅ TRABAJO CONCLUIDO Y SALIDA REGISTRADA (${new Date(exitTime).toLocaleTimeString()}): "${desc}". En espera de validación de tienda.`, fecha: now }
          ],
          historial: [
            ...(c.historial || []),
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'concluido', usuario: currentUser.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      const updateObj: any = {
        estado: 'concluido',
        fecha_cierre: now,
        hora_salida: exitTime
      };

      supabase.from('casos').update(updateObj).eq('id', caseId).then(({ error: errCase }: any) => {
        if (errCase) console.error("Error al concluir caso en Supabase:", errCase);
        
        if (currentEvidence.length > 0) {
          const inserts = currentEvidence.map((base64, index) => ({
            caso_id: caseId,
            subido_por: currentUser.nombre,
            tipo: 'final',
            archivo_url: base64,
            nombre_archivo: encodeGpsInFilename(`evidencia_resolucion_${index + 1}.jpg`, gpsLocation),
            fecha: now
          }));
          supabase.from('evidencias').insert(inserts).then(({ error: errEv }: any) => {
            if (errEv) console.error("Error al guardar evidencia en Supabase:", errEv);
            dbOptimizer.invalidate('casos');
          });
        }

        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `Solución aplicada: ${desc}`,
          fecha: now
        }]).then(({ error: errCom }: any) => {
          if (errCom) console.error("Error al guardar comentario de solución en Supabase:", errCom);
        });
      });
    }

    const storeId = targetCase?.tiendaId || 1;
    pushNotification(
      `✅ Caso #${caseId} CONCLUIDO por técnico ${currentUser.nombre}.`,
      'estado_cambio',
      { tiendaId: storeId, casoId: caseId, estadoNuevo: 'concluido' }
    );
  };

  const handleConcludeCase = (
    e: React.FormEvent, 
    caseId: number, 
    customFiles?: string[],
    customGpsLoc?: { latitude: number; longitude: number; accuracy?: number }
  ) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!currentUser) return;

    const filesToUse = customFiles && customFiles.length > 0 ? customFiles : solveEvidenceFiles;
    setShowSolveModal(false);
    handleConcludeCaseDirect(caseId, solutionDesc, filesToUse, customGpsLoc);
    setSolutionDesc('');
    setSolveEvidenceFiles([]);

    // Si este caso era el timbrado activo, cerrar también el punch clock
    if (activePunchClock?.casoId === caseId) {
      setActivePunchClock(null);
      try {
        localStorage.removeItem(`maint_tech_punch_${currentUser.id}`);
      } catch {}
    }
  };

  // Subir / adjuntar evidencia directamente a un caso existente (con GPS)
  const handleAddEvidenceDirect = async (caseId: number) => {
    if (!addEvidencePhoto || !currentUser) return;
    setIsUploadingEvidence(true);
    const nowIso = new Date().toISOString();
    const filenameWithGps = encodeGpsInFilename(`evidencia_${Date.now()}.jpg`, addEvidenceGpsLoc);

    const newEv: Evidence = {
      id: Date.now(),
      subidoPor: currentUser.nombre,
      tipo: 'progreso_campo',
      archivoUrl: addEvidencePhoto,
      nombreArchivo: filenameWithGps,
      fecha: nowIso,
      coordenadas: addEvidenceGpsLoc ? {
        latitude: addEvidenceGpsLoc.latitude,
        longitude: addEvidenceGpsLoc.longitude,
        accuracy: addEvidenceGpsLoc.accuracy
      } : undefined
    };

    setCases(prev => prev.map(c => c.id === caseId ? {
      ...c,
      evidencias: [newEv, ...(c.evidencias || [])]
    } : c));

    dbOptimizer.updateCachedList<Case>('casos', prevList => (prevList || []).map(c => c.id === caseId ? {
      ...c,
      evidencias: [newEv, ...(c.evidencias || [])]
    } : c));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('evidencias').insert([{
          caso_id: caseId,
          subido_por: currentUser.nombre,
          tipo: 'progreso_campo',
          archivo_url: addEvidencePhoto,
          nombre_archivo: filenameWithGps,
          fecha: nowIso
        }]);
        if (error) console.error("Error al guardar evidencia en Supabase:", error);
        dbOptimizer.invalidate('casos');
      } catch (err) {
        console.error("Error subiendo evidencia a Supabase:", err);
      }
    }

    setAddEvidencePhoto(null);
    setAddEvidenceGpsLoc(null);
    setShowAddEvidenceModal(false);
    setIsUploadingEvidence(false);
    setMaintToast({
      mostrar: true,
      titulo: '📸 Evidencia Guardada',
      mensaje: 'La fotografía satelital se sincronizó con éxito en el caso.',
      tipo: 'success'
    });
  };

  // Close Case
  const handleCloseCase = (caseId: number) => {
    const now = new Date().toISOString();

    if (activePunchClock?.casoId === caseId) {
      setActivePunchClock(null);
      try {
        localStorage.removeItem(`maint_tech_punch_${currentUser?.id}`);
      } catch {}
    }
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
    const targetTech = users.find(u => u.nombre.toLowerCase().trim() === name.toLowerCase().trim() && u.rol === 'tecnico');

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const currentJornadas = getCaseJornadas(c);
        let updatedJornadas = [...currentJornadas];
        if (updatedJornadas.length > 0) {
          // Si ya había visitas, se añade la siguiente jornada (ej: Visita #2 tras la pausa)
          updatedJornadas.push({
            id: Date.now(),
            numeroVisita: updatedJornadas.length + 1,
            tecnicoNombre: name,
            horaEntrada: now,
            horaSalida: undefined,
            registradoEntradaPor: currentUser!.nombre
          });
        } else {
          updatedJornadas = [{
            id: 1,
            numeroVisita: 1,
            tecnicoNombre: name,
            horaEntrada: now,
            horaSalida: undefined,
            registradoEntradaPor: currentUser!.nombre
          }];
        }

        const isReentry = c.pausado_por_material || Boolean(c.hora_salida);
        const logText = isReentry
          ? `🟢 REINGRESO A TIENDA (Visita #${updatedJornadas.length}): ${currentUser!.nombre} registró el reingreso del técnico ${name} a las ${new Date(now).toLocaleTimeString()} para reanudar el trabajo.`
          : `⏱️ INGRESO A TIENDA: ${currentUser!.nombre} registró el ingreso presencial del técnico ${name} a las ${new Date(now).toLocaleTimeString()} e inició el caso.`;

        return {
          ...c,
          estado: 'en_proceso' as const,
          pausado_por_material: false,
          motivo_pausa_material: undefined,
          fecha_pausa_material: undefined,
          tecnicoAsignadoId: targetTech?.id || c.tecnicoAsignadoId,
          tecnico_presencial_nombre: name,
          hora_entrada: now,
          hora_salida: undefined,
          jornadas: updatedJornadas,
          comentarios: [
            ...(c.comentarios || []),
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: logText, fecha: now }
          ],
          historial: [
            ...(c.historial || []),
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'en_proceso', usuario: currentUser!.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        pausado_por_material: false,
        motivo_pausa_material: null,
        fecha_pausa_material: null,
        tecnico_asignado_id: targetTech?.id || undefined,
        tecnico_presencial_nombre: name,
        hora_entrada: now,
        hora_salida: null
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al registrar entrada en Supabase:", error);
        
        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser!.nombre,
          rol: currentUser!.rol,
          texto: `⏱️ INGRESO A TIENDA: ${currentUser!.nombre} (${currentUser!.rol === 'jefe_tienda' ? 'Jefe de Tienda' : currentUser!.rol}) registró el ingreso presencial del técnico ${name} a las ${new Date(now).toLocaleTimeString()} e inició el caso.`,
          fecha: now
        }]);
      });
    }

    pushNotification(
      `⏱️ INGRESO A TIENDA: Técnico ${name} ingresó a la tienda para el caso #${caseId} (Estado: En Proceso).`,
      'estado_cambio',
      { casoId: caseId, tiendaId: currentUser!.tiendaId, estadoNuevo: 'en_proceso' }
    );
    setSelectedPresencialTech('');
  };

  const handleLogTechExit = (caseId: number) => {
    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          hora_salida: now,
          comentarios: [
            ...(c.comentarios || []),
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

  // ==========================================
  // SINCRONIZACIÓN Y GESTIÓN DEL TIMBRADOR (TÉCNICOS)
  // ==========================================
  useEffect(() => {
    if (!currentUser || currentUser.rol !== 'tecnico') {
      setActivePunchClock(null);
      return;
    }

    // Buscar si el técnico tiene un caso activo en proceso en el que ya timbró entrada y no ha salido
    const activeCase = cases.find(c =>
      (c.tecnicoAsignadoId === currentUser.id || (c.tecnico_presencial_nombre && c.tecnico_presencial_nombre.toLowerCase().includes(currentUser.nombre.toLowerCase()))) &&
      c.estado === 'en_proceso' &&
      Boolean(c.hora_entrada) &&
      !c.hora_salida &&
      !c.pausado_por_material
    );

    if (activeCase) {
      const caseJornadas = getCaseJornadas(activeCase);
      const lastJornada = caseJornadas[caseJornadas.length - 1];
      const entryTime = (lastJornada && !lastJornada.horaSalida) ? lastJornada.horaEntrada : (activeCase.hora_entrada || new Date().toISOString());

      const punch: ActiveTechPunchClock = {
        tecnicoId: currentUser.id,
        tecnicoNombre: currentUser.nombre,
        tiendaId: activeCase.tiendaId,
        casoId: activeCase.id,
        horaIngreso: entryTime,
        numeroVisita: caseJornadas.length || 1,
        esNuevoCaso: Boolean(activeCase.es_caso_tecnico)
      };
      setActivePunchClock(punch);
      try {
        localStorage.setItem(`maint_tech_punch_${currentUser.id}`, JSON.stringify(punch));
      } catch {}
    } else {
      setActivePunchClock(null);
      try {
        localStorage.removeItem(`maint_tech_punch_${currentUser.id}`);
      } catch {}
    }
  }, [currentUser, cases]);

  // Handler para Timbrar Ingreso a Tienda (Clock In)
  const handleTechClockIn = async (data: {
    tiendaId: number;
    useExistingCase: boolean;
    existingCaseId?: number;
    newCaseData?: {
      categoria: string;
      descripcion: string;
      prioridad: number;
      fotosIniciales: string[];
    };
  }) => {
    if (!currentUser) return;
    const now = new Date();
    const nowIso = now.toISOString();

    if (data.useExistingCase && data.existingCaseId) {
      const targetCase = cases.find(c => c.id === data.existingCaseId);
      handleLogTechEntry(data.existingCaseId, currentUser.nombre);

      const targetJornadas = targetCase ? getCaseJornadas(targetCase) : [];
      const punch: ActiveTechPunchClock = {
        tecnicoId: currentUser.id,
        tecnicoNombre: currentUser.nombre,
        tiendaId: data.tiendaId,
        casoId: data.existingCaseId,
        horaIngreso: nowIso,
        numeroVisita: targetJornadas.length + 1,
        esNuevoCaso: false
      };
      setActivePunchClock(punch);
      try {
        localStorage.setItem(`maint_tech_punch_${currentUser.id}`, JSON.stringify(punch));
      } catch {}

      pushNotification(
        `⏱️ INGRESO TIMBRADO: ${currentUser.nombre} timbró su ingreso en ${stores.find(s => s.id === data.tiendaId)?.nombre || `Tienda #${data.tiendaId}`} (Caso #${data.existingCaseId}).`,
        'estado_cambio',
        { tiendaId: data.tiendaId, casoId: data.existingCaseId }
      );
      setSelectedCaseId(data.existingCaseId);
      return data.existingCaseId;
    } else if (data.newCaseData) {
      const limit = new Date(now.getTime() + 48 * 3600000).toISOString();
      const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 2001;

      const initialPhotos = data.newCaseData.fotosIniciales || [];
      const gpsLoc = (data.newCaseData as any).gpsLocation || (data as any).gpsLocation;

      const newCase: Case = {
        id: newId,
        tiendaId: data.tiendaId,
        creadoPor: currentUser.id,
        categoria: data.newCaseData.categoria,
        descripcion: data.newCaseData.descripcion,
        prioridad: data.newCaseData.prioridad,
        estado: 'en_proceso',
        tecnicoAsignadoId: currentUser.id,
        fechaCreacion: nowIso,
        fechaLimiteSla: limit,
        es_caso_tecnico: true,
        tecnico_estatus_trabajo: 'Trabajando en tienda',
        tecnico_presencial_nombre: currentUser.nombre,
        hora_entrada: nowIso,
        gps_latitud_entrada: gpsLoc?.latitude,
        gps_longitud_entrada: gpsLoc?.longitude,
        jornadas: [{
          id: Date.now(),
          numeroVisita: 1,
          tecnicoNombre: currentUser.nombre,
          horaEntrada: nowIso,
          horaSalida: undefined,
          registradoEntradaPor: currentUser.nombre,
          gpsEntrada: gpsLoc ? {
            latitude: gpsLoc.latitude,
            longitude: gpsLoc.longitude,
            accuracy: gpsLoc.accuracy
          } : undefined
        }],
        evidencias: initialPhotos.map((b64, idx) => ({
          id: Date.now() + idx,
          subidoPor: currentUser.nombre,
          tipo: 'foto_ingreso_gps',
          archivoUrl: b64,
          nombreArchivo: `evidencia_ingreso_${idx + 1}.jpg`,
          fecha: nowIso,
          coordenadas: gpsLoc ? {
            latitude: gpsLoc.latitude,
            longitude: gpsLoc.longitude,
            accuracy: gpsLoc.accuracy
          } : undefined
        })),
        comentarios: [{
          id: Date.now(),
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `⏱️ INGRESO TIMBRADO: Técnico ${currentUser.nombre} timbró su ingreso en tienda a las ${now.toLocaleTimeString()} e inició el caso para atención presencial.`,
          fecha: nowIso
        }],
        historial: [{
          id: Date.now(),
          estadoNuevo: 'en_proceso',
          usuario: currentUser.nombre,
          fecha: nowIso,
          detalle: `Timbrado de ingreso y creación de caso en tienda #${data.tiendaId}`
        }]
      };

      setCases([newCase, ...cases]);
      dbOptimizer.updateCachedList<Case>('casos', (prevList) => [newCase, ...(prevList || [])]);

      if (isSupabaseConfigured) {
        const numericTiendaId = typeof data.tiendaId === 'number'
          ? data.tiendaId
          : parseInt(String(data.tiendaId).replace(/\D/g, ''), 10) || 1;

        const prioMap: Record<string, number> = { 'baja': 1, 'media': 2, 'alta': 3, 'critica': 4 };
        const numericPrioridad = typeof data.newCaseData.prioridad === 'number'
          ? data.newCaseData.prioridad
          : (prioMap[data.newCaseData.prioridad] || 2);

        supabase.from('casos').insert([{
          id: newId,
          tienda_id: numericTiendaId,
          creado_por: currentUser.id,
          categoria: data.newCaseData.categoria,
          descripcion: data.newCaseData.descripcion,
          prioridad_nivel: numericPrioridad,
          estado: 'en_proceso',
          tecnico_asignado_id: currentUser.id,
          fecha_creacion: nowIso,
          fecha_limite_sla: limit,
          es_caso_tecnico: true,
          tecnico_estatus_trabajo: 'Trabajando en tienda',
          tecnico_presencial_nombre: currentUser.nombre,
          hora_entrada: nowIso
        }]).then(async ({ error }: any) => {
          if (error) {
            console.error("Error al insertar caso técnico en Supabase:", error);
          } else {
            // Sincronizar evidencias fotográficas con Supabase con GPS codificado
            if (initialPhotos.length > 0) {
              const rows = initialPhotos.map((b64, idx) => ({
                caso_id: newId,
                subido_por: currentUser.nombre,
                tipo: 'foto_ingreso_gps',
                archivo_url: b64,
                nombre_archivo: encodeGpsInFilename(`evidencia_ingreso_${idx + 1}.jpg`, gpsLoc),
                fecha: nowIso
              }));
              const { error: evErr } = await supabase.from('evidencias').insert(rows);
              if (evErr) console.error("Error al insertar evidencias fotográficas en Supabase:", evErr);
            }

            // Registrar comentario inicial en Supabase
            await supabase.from('comentarios').insert([{
              caso_id: newId,
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `⏱️ INGRESO TIMBRADO CON GPS: Técnico ${currentUser.nombre} timbró su ingreso en tienda a las ${now.toLocaleTimeString()} e inició el caso con validación satelital.`,
              fecha: nowIso
            }]);

            dbOptimizer.invalidate('casos');
          }
        });
      }

      const punch: ActiveTechPunchClock = {
        tecnicoId: currentUser.id,
        tecnicoNombre: currentUser.nombre,
        tiendaId: data.tiendaId,
        casoId: newId,
        horaIngreso: nowIso,
        numeroVisita: 1,
        esNuevoCaso: true
      };
      setActivePunchClock(punch);
      try {
        localStorage.setItem(`maint_tech_punch_${currentUser.id}`, JSON.stringify(punch));
      } catch {}

      pushNotification(
        `⏱️ NUEVO CASO & TIMBRADO: ${currentUser.nombre} inició "${data.newCaseData.categoria}" en ${stores.find(s => s.id === data.tiendaId)?.nombre || `Tienda #${data.tiendaId}`}.`,
        'nuevo_caso',
        { tiendaId: data.tiendaId, casoId: newId }
      );

      setSelectedCaseId(newId);
      return newId;
    }
  };

  // Handler para Timbrar Salida de Tienda (Clock Out)
  const handleTechClockOut = async (data: {
    actionType: 'conclude' | 'pause' | 'exit_only';
    solutionDesc?: string;
    solutionPhotos?: string[];
    pauseReason?: string;
  }) => {
    if (!activePunchClock || !currentUser) return;
    const caseId = activePunchClock.casoId;

    if (data.actionType === 'conclude') {
      handleConcludeCaseDirect(caseId, data.solutionDesc || 'Trabajo técnico concluido conforme en tienda.', data.solutionPhotos || []);
    } else if (data.actionType === 'pause') {
      handlePauseCaseDirect(caseId, data.pauseReason || 'Pausa por materiales o repuestos.');
    } else {
      handleLogTechExit(caseId);
    }

    setActivePunchClock(null);
    try {
      localStorage.removeItem(`maint_tech_punch_${currentUser.id}`);
    } catch {}

    pushNotification(
      `🛑 SALIDA TIMBRADA: ${currentUser.nombre} marcó su salida de la tienda (${data.actionType === 'conclude' ? 'Caso Concluido' : data.actionType === 'pause' ? 'Caso Pausado' : 'Fin de Visita'}).`,
      'estado_cambio',
      { casoId: caseId, tiendaId: activePunchClock.tiendaId }
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

  const handleApprovePreMaterials = (caseId: number) => {
    if (!currentUser) return;
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          material_anticipado_estado: 'aprobado',
          material_anticipado_aprobado_por: currentUser.nombre
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        material_anticipado_estado: 'aprobado',
        material_anticipado_aprobado_por: currentUser.nombre
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al aprobar materiales anticipados en Supabase:", error);
      });

      supabase.from('pedidos_materiales').update({
        estado: 'aprobado'
      }).eq('caso_id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al aprobar pedidos_materiales vinculados:", error);
      });
    }

    setMaterialRequests(prev => prev.map(r => r.casoId === caseId ? { ...r, estado: 'aprobado' } : r));

    pushNotification(
      `✅ MATERIALES APROBADOS: La solicitud de materiales por adelantado para el Caso #${caseId} fue APROBADA por ${currentUser.nombre}.`,
      'materiales',
      { casoId: caseId }
    );
  };

  const handleDenyPreMaterials = (caseId: number) => {
    if (!currentUser) return;
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          material_anticipado_estado: 'rechazado',
          material_anticipado_aprobado_por: currentUser.nombre
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        material_anticipado_estado: 'rechazado',
        material_anticipado_aprobado_por: currentUser.nombre
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al denegar materiales anticipados en Supabase:", error);
      });

      supabase.from('pedidos_materiales').update({
        estado: 'denegado'
      }).eq('caso_id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al denegar pedidos_materiales vinculados:", error);
      });
    }

    setMaterialRequests(prev => prev.map(r => r.casoId === caseId ? { ...r, estado: 'denegado' } : r));

    pushNotification(
      `❌ MATERIALES DENEGADOS: La solicitud de materiales para el Caso #${caseId} fue DENEGADA por ${currentUser.nombre}.`,
      'materiales',
      { casoId: caseId }
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
    if (!reopenReason.trim() || !currentUser) return;

    const isStoreUser = currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe';
    const isSupervisorOrAdmin = currentUser.rol === 'supervisor' || currentUser.rol === 'administrador';

    if (!isStoreUser && !isSupervisorOrAdmin) {
      alert('Únicamente el personal de tienda, supervisores o administradores tienen autorización para reabrir casos.');
      return;
    }

    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    if (isStoreUser && targetCase.tiendaId !== currentUser.tiendaId) {
      alert('Solo puedes reabrir casos pertenecientes a tu propia tienda.');
      return;
    }

    const newCount = (targetCase.reaperturas_count || 0) + 1;
    const now = new Date().toISOString();

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'pendiente' as const,
          fechaCierre: undefined,
          hora_entrada: undefined,
          hora_salida: undefined,
          pausado_por_material: false,
          motivo_pausa_material: undefined,
          reaperturas_count: newCount,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: `🔄 REAPERTURA DE CASO (${newCount}ª vez): "${reopenReason.trim()}". Requiere nueva atención técnica presencial.`, fecha: now }
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
        hora_entrada: null,
        hora_salida: null,
        pausado_por_material: false,
        reaperturas_count: newCount
      }).eq('id', caseId).then(({ error: errCase }: any) => {
        if (errCase) console.error("Error al reabrir caso en Supabase:", errCase);
        
        supabase.from('comentarios').insert([{
          caso_id: caseId,
          autor: currentUser!.nombre,
          rol: currentUser!.rol,
          texto: `🔄 REAPERTURA DE CASO (${newCount}ª vez): "${reopenReason.trim()}". Requiere nueva atención técnica presencial.`,
          fecha: now
        }]).then(({ error: errCom }: any) => {
          if (errCom) console.error("Error al guardar comentario de reapertura en Supabase:", errCom);
        });
      });
    }

    const storeId = targetCase.tiendaId;
    
    if (newCount >= 3) {
      pushNotification(
        `🚨 ALERTA CRÍTICA: Caso #${caseId} en ${stores.find(s => s.id === targetCase.tiendaId)?.nombre || `Tienda #${targetCase.tiendaId}`} reabierto por ${newCount}ª vez. SE REQUIERE BUSCAR OTRA ALTERNATIVA TÉCNICA URGENTE (el trabajo realizado no funcionó).`,
        'estado_cambio',
        { tiendaId: storeId, casoId: caseId, estadoNuevo: 'pendiente', prioridad: 1 }
      );
    } else {
      pushNotification(
        `🔄 Caso #${caseId} en ${stores.find(s => s.id === targetCase.tiendaId)?.nombre || `Tienda #${targetCase.tiendaId}`} reabierto por ${currentUser.nombre} (${newCount}ª vez): "${reopenReason.trim()}".`,
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
  const [admRole, setAdmRole] = useState<'administrador' | 'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico'>('jefe_tienda');
  const [admTiendaNombre, setAdmTiendaNombre] = useState('');
  const [admTiendaCiudad, setAdmTiendaCiudad] = useState('Quito');
  const [admIsNewStoreMode, setAdmIsNewStoreMode] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isSubmittingAdminUser, setIsSubmittingAdminUser] = useState(false);

  const handleAdminUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAdminUser) return;
    if (!admName || !admUsername || !admEmail) return;

    const trimmedName = admName.trim();
    const trimmedUsername = admUsername.trim();
    const trimmedEmail = admEmail.trim();

    // 1. Validar unicidad en el estado local en memoria
    if (editingUserId === null) {
      if (users.some(u => u.usuario.toLowerCase().trim() === trimmedUsername.toLowerCase())) {
        alert(`El nombre de usuario (login) "${trimmedUsername}" ya está en uso. Por favor ingresa uno diferente.`);
        return;
      }
      if (users.some(u => u.correo.toLowerCase().trim() === trimmedEmail.toLowerCase())) {
        alert(`El correo electrónico "${trimmedEmail}" ya está registrado con otro usuario.`);
        return;
      }
    } else {
      if (users.some(u => u.id !== editingUserId && u.usuario.toLowerCase().trim() === trimmedUsername.toLowerCase())) {
        alert(`El nombre de usuario (login) "${trimmedUsername}" ya pertenece a otra cuenta.`);
        return;
      }
      if (users.some(u => u.id !== editingUserId && u.correo.toLowerCase().trim() === trimmedEmail.toLowerCase())) {
        alert(`El correo electrónico "${trimmedEmail}" ya pertenece a otra cuenta.`);
        return;
      }
    }

    setIsSubmittingAdminUser(true);

    try {
      // 2. Validar unicidad directamente en la base de datos Supabase para evitar errores 409 o violaciones de clave
      if (isSupabaseConfigured) {
        try {
          const { data: dbConflicts } = await supabase
            .from('usuarios')
            .select('id, usuario, correo')
            .or(`usuario.ilike.${trimmedUsername},correo.ilike.${trimmedEmail}`);

          if (dbConflicts && dbConflicts.length > 0) {
            const conflict = dbConflicts.find(u => editingUserId === null || u.id !== editingUserId);
            if (conflict) {
              if (conflict.correo.toLowerCase().trim() === trimmedEmail.toLowerCase()) {
                alert(`El correo electrónico "${trimmedEmail}" ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.`);
                return;
              }
              if (conflict.usuario.toLowerCase().trim() === trimmedUsername.toLowerCase()) {
                alert(`El nombre de usuario (login) "${trimmedUsername}" ya existe en el sistema. Por favor elige otro.`);
                return;
              }
            }
          }
        } catch (chkErr) {
          console.warn("Aviso en pre-chequeo de usuario en Supabase:", chkErr);
        }
      }

      // 3. Resolución segura de la tienda o nuevo lugar de trabajo
      let targetTiendaId: number | undefined = undefined;
      if ((admRole === 'jefe_tienda' || admRole === 'subjefe') && admTiendaNombre.trim() !== '') {
        const cleanStoreName = admTiendaNombre.trim();
        const matchedStore = stores.find(s => s.nombre.toLowerCase().trim() === cleanStoreName.toLowerCase());

        if (matchedStore && !admIsNewStoreMode) {
          targetTiendaId = matchedStore.id;
        } else {
          // Si estamos en modo nuevo local o no se halló en memoria, verificar si ya existe en Supabase para no duplicarla
          let existingDbStoreId: number | null = null;
          if (isSupabaseConfigured) {
            try {
              const { data: existingStores } = await supabase
                .from('tiendas')
                .select('id, nombre')
                .ilike('nombre', cleanStoreName)
                .limit(1);

              if (existingStores && existingStores.length > 0) {
                existingDbStoreId = existingStores[0].id;
              }
            } catch (errStoreChk) {
              console.warn("Aviso al verificar tienda en Supabase:", errStoreChk);
            }
          }

          if (existingDbStoreId) {
            targetTiendaId = existingDbStoreId;
          } else {
            const newStoreCity = admTiendaCiudad.trim() || 'Quito';
            let newStoreId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;

            if (isSupabaseConfigured) {
              try {
                // Obtener el ID máximo de tiendas para evitar desincronización de secuencia
                const { data: maxStoreRow } = await supabase
                  .from('tiendas')
                  .select('id')
                  .order('id', { ascending: false })
                  .limit(1);

                const safeNextStoreId = Math.max(
                  (maxStoreRow && maxStoreRow[0]?.id ? maxStoreRow[0].id : 0) + 1,
                  newStoreId
                );

                const { data: createdDbStore, error: errStoreInsert } = await supabase
                  .from('tiendas')
                  .insert([{
                    id: safeNextStoreId,
                    nombre: cleanStoreName,
                    ciudad: newStoreCity,
                    direccion: 'Dirección por registrar'
                  }])
                  .select()
                  .single();

                if (createdDbStore && createdDbStore.id) {
                  newStoreId = createdDbStore.id;
                } else if (errStoreInsert) {
                  // Reintento sin ID explícito por si la base genera su propia secuencia
                  const { data: retryStore } = await supabase
                    .from('tiendas')
                    .insert([{
                      nombre: cleanStoreName,
                      ciudad: newStoreCity,
                      direccion: 'Dirección por registrar'
                    }])
                    .select()
                    .single();
                  if (retryStore && retryStore.id) {
                    newStoreId = retryStore.id;
                  }
                }
              } catch (err) {
                console.error("Error al auto-crear tienda/lugar de trabajo en Supabase:", err);
              }
            }

            const newStoreObj: Store = {
              id: newStoreId,
              nombre: cleanStoreName,
              ciudad: newStoreCity,
              direccion: 'Dirección por registrar'
            };
            setStores(prev => prev.some(s => s.id === newStoreId) ? prev : [...prev, newStoreObj]);
            targetTiendaId = newStoreId;
          }
        }
      }

      if (editingUserId !== null) {
        // 4. ACTUALIZAR USUARIO EXISTENTE
        const updatePayload: any = {
          nombre: trimmedName,
          correo: trimmedEmail,
          usuario: trimmedUsername,
          rol: admRole,
          tienda_id: targetTiendaId
        };
        if (admContrasena.trim()) {
          updatePayload.contrasena = admContrasena.trim();
          updatePayload.password_cambiado = true;
        }

        setUsers(prev => prev.map(u => u.id === editingUserId ? {
          ...u,
          nombre: trimmedName,
          correo: trimmedEmail,
          usuario: trimmedUsername,
          rol: admRole,
          contrasena: admContrasena ? admContrasena.trim() : u.contrasena,
          tiendaId: targetTiendaId
        } : u));

        if (currentUser?.id === editingUserId) {
          const updatedCurrent: User = {
            ...currentUser,
            nombre: trimmedName,
            correo: trimmedEmail,
            usuario: trimmedUsername,
            rol: admRole,
            tiendaId: targetTiendaId
          };
          setCurrentUser(updatedCurrent);
          try { localStorage.setItem('maint_user', JSON.stringify(updatedCurrent)); } catch {}
        }

        if (isSupabaseConfigured) {
          const { error } = await supabase.from('usuarios').update(updatePayload).eq('id', editingUserId);
          if (error) {
            console.error("Error al actualizar usuario en Supabase:", error);
            alert("Aviso: Hubo un problema al sincronizar con el servidor: " + error.message);
          } else if (admRole === 'tecnico') {
            await supabase.from('disponibilidad_tecnicos').update({
              tecnico_nombre: trimmedName
            }).eq('usuario_id', editingUserId);
          }
        }

        setEditingUserId(null);
        setShowAdminUserForm(false);
        alert('Usuario actualizado con éxito y sincronizado con todos los administradores.');
      } else {
        // 5. CREAR NUEVO USUARIO
        const finalPass = admContrasena.trim() || '123456';
        let realUserId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

        if (isSupabaseConfigured) {
          // Obtener el ID más alto en Supabase para evitar colisión de secuencia en "usuarios_pkey"
          let safeNextUserId = realUserId;
          try {
            const { data: maxRow } = await supabase
              .from('usuarios')
              .select('id')
              .order('id', { ascending: false })
              .limit(1);

            if (maxRow && maxRow[0]?.id) {
              safeNextUserId = Math.max(maxRow[0].id + 1, realUserId);
            }
          } catch (eSeq) {
            console.warn("No se pudo obtener max ID de usuarios:", eSeq);
          }

          const insertPayload: any = {
            id: safeNextUserId,
            nombre: trimmedName,
            correo: trimmedEmail,
            usuario: trimmedUsername,
            rol: admRole,
            contrasena: finalPass,
            tienda_id: targetTiendaId,
            estado: true,
            password_cambiado: false
          };

          let { data: createdRow, error } = await supabase
            .from('usuarios')
            .insert([insertPayload])
            .select()
            .single();

          // Si falla por colisión en la clave primaria usuarios_pkey, reintentar sin ID explícito
          if (error && error.code === '23505' && (error.message?.includes('usuarios_pkey') || error.details?.includes('id'))) {
            delete insertPayload.id;
            const retry = await supabase
              .from('usuarios')
              .insert([insertPayload])
              .select()
              .single();
            createdRow = retry.data;
            error = retry.error;
          }

          if (error) {
            console.error("Error al crear usuario en Supabase:", error);
            if (error.code === '23505') {
              if (error.message?.includes('usuarios_correo_key') || error.details?.includes('correo')) {
                alert(`El correo "${trimmedEmail}" ya está registrado en el sistema. Por favor utiliza otro.`);
              } else if (error.message?.includes('usuarios_usuario_key') || error.details?.includes('usuario')) {
                alert(`El nombre de usuario "${trimmedUsername}" ya está en uso. Por favor elige otro.`);
              } else {
                alert(`Conflicto al guardar el usuario en el servidor: ${error.details || error.message}`);
              }
            } else {
              alert("Error al guardar el usuario en el servidor: " + error.message);
            }
            return;
          }

          if (createdRow && createdRow.id) {
            realUserId = createdRow.id;
          }

          // Si es TÉCNICO, vincularlo automáticamente en la tabla disponibilidad_tecnicos
          if (admRole === 'tecnico') {
            const techDbRecord = {
              tecnico_nombre: trimmedName,
              usuario_id: realUserId,
              estatus: 'disponible'
            };
            await supabase.from('disponibilidad_tecnicos').insert([techDbRecord]);
            const newTechObj: TechAvailability = {
              id: Date.now(),
              tecnicoNombre: trimmedName,
              usuarioId: realUserId,
              estatus: 'disponible'
            };
            setTechAvailability(prev => {
              if (prev.some(t => t.usuarioId === realUserId || t.tecnicoNombre.toLowerCase().trim() === trimmedName.toLowerCase())) {
                return prev;
              }
              return [...prev, newTechObj];
            });
          }

          // Notificar en tiempo real a todos los administradores y supervisores
          const roleLabel = (
            admRole === 'tecnico' ? 'Técnico Operativo' :
            admRole === 'supervisor' ? 'Supervisor' :
            admRole === 'administrador' ? 'Administrador' : 'Tienda / Local'
          );
          await supabase.from('notificaciones').insert([{
            caso_id: null,
            mensaje: `👤 Nuevo ${roleLabel} registrado en el sistema: ${trimmedName} (@${trimmedUsername})`,
            leido: false,
            fecha: new Date().toISOString()
          }]);
        }

        const newU: User = {
          id: realUserId,
          nombre: trimmedName,
          correo: trimmedEmail,
          usuario: trimmedUsername,
          rol: admRole,
          contrasena: finalPass,
          estado: true,
          tiendaId: targetTiendaId,
          passwordCambiado: false
        };

        setUsers(prev => prev.some(u => u.id === realUserId) ? prev : [...prev, newU]);
        setShowAdminUserForm(false);
        alert(`¡Usuario "${newU.nombre}" registrado y sincronizado exitosamente con todos los administradores y técnicos!`);
      }

      setAdmName('');
      setAdmEmail('');
      setAdmUsername('');
      setAdmContrasena('');
      setAdmRole('jefe_tienda');
      setAdmTiendaNombre('');
      setAdmTiendaCiudad('Quito');
      setAdmIsNewStoreMode(true);
    } finally {
      setIsSubmittingAdminUser(false);
    }
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
      setAdmTiendaCiudad(storeObj ? storeObj.ciudad : 'Quito');
    } else {
      setAdmTiendaNombre('');
      setAdmTiendaCiudad('Quito');
    }
    setAdmIsNewStoreMode(false);
    setShowAdminUserForm(true);
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setAdmName('');
    setAdmEmail('');
    setAdmUsername('');
    setAdmContrasena('');
    setAdmRole('jefe_tienda');
    setAdmTiendaNombre('');
    setAdmTiendaCiudad('Quito');
    setAdmIsNewStoreMode(true);
    setShowAdminUserForm(false);
  };

  const handleAdminDeleteUser = async (id: number) => {
    if (id === currentUser?.id) {
      alert('No puedes eliminar tu propio usuario.');
      return;
    }
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    if (confirm(`¿Estás seguro de eliminar el usuario "${targetUser.nombre}" (@${targetUser.usuario})?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      if (targetUser.rol === 'tecnico') {
        setTechAvailability(prev => prev.filter(t => t.usuarioId !== id && t.tecnicoNombre.toLowerCase().trim() !== targetUser.nombre.toLowerCase().trim()));
      }

      if (isSupabaseConfigured) {
        if (targetUser.rol === 'tecnico') {
          supabase.from('disponibilidad_tecnicos').delete().eq('usuario_id', id).then(() => {});
        }
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) {
          console.error("Error al eliminar usuario en Supabase:", error);
          alert("Error al eliminar en Supabase: " + error.message);
        }
      }
    }
  };

  const handleAdminToggleUser = async (id: number) => {
    if (id === currentUser?.id) {
      alert('No puedes desactivar tu propio usuario.');
      return;
    }
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    const nextState = !targetUser.estado;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, estado: nextState } : u));

    if (targetUser.rol === 'tecnico') {
      const nextEstatus: 'disponible' | 'libre' = nextState ? 'disponible' : 'libre';
      setTechAvailability(prev => prev.map(t => (t.usuarioId === id || t.tecnicoNombre.toLowerCase().trim() === targetUser.nombre.toLowerCase().trim()) ? { ...t, estatus: nextEstatus } : t));
    }

    if (isSupabaseConfigured) {
      if (targetUser.rol === 'tecnico') {
        const nextEstatus: 'disponible' | 'libre' = nextState ? 'disponible' : 'libre';
        supabase.from('disponibilidad_tecnicos').update({
          estatus: nextEstatus
        }).eq('usuario_id', id).then(() => {});
      }
      const { error } = await supabase.from('usuarios').update({ estado: nextState }).eq('id', id);
      if (error) {
        console.error("Error al cambiar estado en Supabase:", error);
        alert("Error al cambiar estado en el servidor: " + error.message);
      }
    }
  };

  // STORES CRUD
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreDir, setNewStoreDir] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);

  const handleAdminStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreCity || !newStoreDir) return;

    const trimmedStoreName = newStoreName.trim();
    const trimmedCity = newStoreCity.trim();
    const trimmedDir = newStoreDir.trim();

    if (editingStoreId !== null) {
      setStores(prev => prev.map(s => s.id === editingStoreId ? {
        ...s,
        nombre: trimmedStoreName,
        ciudad: trimmedCity,
        direccion: trimmedDir
      } : s));

      if (isSupabaseConfigured) {
        await supabase.from('tiendas').update({
          nombre: trimmedStoreName,
          ciudad: trimmedCity,
          direccion: trimmedDir
        }).eq('id', editingStoreId);
      }

      setEditingStoreId(null);
      setShowAdminStoreForm(false);
      alert('Tienda actualizada con éxito y sincronizada.');
    } else {
      let realStoreId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;

      if (isSupabaseConfigured) {
        const { data: createdStore, error } = await supabase.from('tiendas').insert([{
          nombre: trimmedStoreName,
          ciudad: trimmedCity,
          direccion: trimmedDir
        }]).select().single();

        if (error) {
          console.error("Error al guardar tienda en Supabase:", error);
          alert("Error al crear tienda en Supabase: " + error.message);
          return;
        }

        if (createdStore && createdStore.id) {
          realStoreId = createdStore.id;
        }

        await supabase.from('notificaciones').insert([{
          caso_id: null,
          mensaje: `🏬 Nueva tienda agregada a la red nacional: ${trimmedStoreName} (${trimmedCity})`,
          leido: false,
          fecha: new Date().toISOString()
        }]);
      }

      const newS: Store = {
        id: realStoreId,
        nombre: trimmedStoreName,
        ciudad: trimmedCity,
        direccion: trimmedDir
      };
      setStores(prev => prev.some(s => s.id === realStoreId) ? prev : [...prev, newS]);

      setShowAdminStoreForm(false);
      alert('Tienda creada y sincronizada con éxito.');
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
    setShowAdminStoreForm(true);
  };

  const handleCancelEditStore = () => {
    setEditingStoreId(null);
    setNewStoreName('');
    setNewStoreCity('');
    setNewStoreDir('');
    setShowAdminStoreForm(false);
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

      // 2. SUPERVISOR: solo 3 eventos de sus tiendas supervisadas (Creación de Caso, Petición de Materiales, y Culminación de Caso)
      if (currentUser.rol === 'supervisor') {
        if (n.tiendaId) {
          const storeObj = stores.find(s => s.id === n.tiendaId);
          const isStoreAssigned = (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(n.tiendaId)) ||
            (storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === currentUser.nombre.toLowerCase().trim());
          if (!isStoreAssigned) return false;
        }

        // A) Creación de Caso
        if (n.tipo === 'nuevo_caso') return true;

        // B) Petición/Solicitud de Materiales
        if (n.tipo === 'materiales' || (n.mensaje && (n.mensaje.toLowerCase().includes('material') || n.mensaje.toLowerCase().includes('repuesto') || n.mensaje.toLowerCase().includes('petición')))) return true;

        // B.2) Datos de Facturación enviados a sus tiendas supervisadas
        if (n.tipo === 'facturacion') return true;

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

      // 4. JEFE O SUBJEFE DE TIENDA: Notificar de comentarios, cambios de estado, materiales y datos de facturación de SU TIENDA
      if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
        if (n.tiendaId !== currentUser.tiendaId) return false;
        if (n.tipo === 'comentario') return true;
        if (n.tipo === 'estado_cambio') return true;
        if (n.tipo === 'materiales') return true;
        if (n.tipo === 'facturacion') return true;
        return false;
      }

      return false;
    });
  };

  // Auto-cargar datos de facturación del supervisor asignado a la tienda del caso de forma estricta
  useEffect(() => {
    if (showFacturacionModal) {
      const effectiveCaseId = facturacionCasoId || selectedCaseId;
      if (effectiveCaseId && !facturacionCasoId) {
        setFacturacionCasoId(effectiveCaseId);
      }

      let targetSupervisorName = '';
      if (effectiveCaseId) {
        const targetCase = cases.find(c => c.id === effectiveCaseId);
        if (targetCase) {
          const st = stores.find(s => s.id === targetCase.tiendaId);
          if (st?.supervisorName) {
            targetSupervisorName = st.supervisorName;
          }
        }
      } else if (currentUser?.rol === 'jefe_tienda' || currentUser?.rol === 'subjefe') {
        const st = stores.find(s => s.id === currentUser.tiendaId);
        if (st?.supervisorName) {
          targetSupervisorName = st.supervisorName;
        }
      } else if (currentUser?.rol === 'supervisor') {
        targetSupervisorName = currentUser.nombre;
      }

      const { profile } = getSupervisorBillingProfile(targetSupervisorName, billingProfiles);
      if (profile && facturacionProfileMode === 'default_supervisor') {
        setFacturacionRuc(profile.ruc);
        setFacturacionRazonSocial(profile.razonSocial);
        setFacturacionDireccion(profile.direccion);
        setFacturacionEmail(profile.email);
        setFacturacionTelefono(profile.telefono);
      }
    }
  }, [showFacturacionModal, facturacionCasoId, selectedCaseId, facturacionProfileMode, billingProfiles, currentUser, cases, stores]);

  const rawSelectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedCase = rawSelectedCase ? {
    ...rawSelectedCase,
    comentarios: rawSelectedCase.comentarios || [],
    evidencias: rawSelectedCase.evidencias || [],
    historial: rawSelectedCase.historial || []
  } : undefined;
  const unreadNotifsCount = getFilteredNotifications().filter(n => !readNotifIds.includes(n.id)).length;

  return (
    <div className={`app-root ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      
      {/* 1. AUTH SCREEN */}
      {!currentUser ? (
        <div className="auth-wrapper">
          
          {/* Left panel: Logo, Slogan, and stats */}
          <div className="auth-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div className="vyron-badge" style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(108, 76, 224, 0.18)', border: '1px solid rgba(108, 76, 224, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 120 120" style={{ width: '32px', height: '32px' }} xmlns="http://www.w3.org/2000/svg">
                  <polygon points="60,8 105,32 105,88 60,112 15,88 15,32" fill="none" stroke="#6C4CE0" strokeWidth="4.5"/>
                  <circle cx="60" cy="8" r="5" fill="#19C48A"/>
                  <circle cx="105" cy="32" r="5" fill="#19C48A"/>
                  <circle cx="105" cy="88" r="5" fill="#19C48A"/>
                  <circle cx="60" cy="112" r="5" fill="#19C48A"/>
                  <circle cx="15" cy="88" r="5" fill="#19C48A"/>
                  <circle cx="15" cy="32" r="5" fill="#19C48A"/>
                  <text x="60" y="69" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', system-ui, sans-serif" fontSize="28" fontWeight="800" fill="#6C4CE0">D&amp;N</text>
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vyron-word" style={{ fontSize: '1.4rem', color: '#ffffff', letterSpacing: '-0.01em', fontWeight: 700 }}>
                  D&amp;Nax <span style={{ color: '#19C48A' }}>Studios</span>
                </span>
                <span className="vyron-tag" style={{ color: '#19C48A', fontSize: '9px', letterSpacing: '0.22em' }}>OFFICIAL ENTERPRISE</span>
              </div>
            </div>
            <div className="auth-subtitle-portal">
              Portal Enterprise
            </div>
            <h1 className="auth-title-large">
              Mante<span>Tiendas</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', maxWidth: '340px', lineHeight: 1.5, marginTop: '8px' }}>
              Sistema centralizado de gestión, seguimiento operativo y control de mantenimientos.
            </p>
          </div>

          {/* Right panel: Login form */}
          <div className="auth-right">
            <div className="auth-card">
              {savedBiometricUser && !showManualLoginForm ? (
                /* ========================================================
                   PANTALLA DEDICADA DE DESBLOQUEO BIOMÉTRICO (1-TOUCH)
                   ======================================================== */
                <div>
                  <div className="auth-header" style={{ textAlign: 'center', marginBottom: '22px' }}>
                    <div style={{
                      width: '76px',
                      height: '76px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6C4CE0 0%, #19C48A 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px auto',
                      fontSize: '2.3rem',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(108, 76, 224, 0.35)'
                    }}>
                      {biometricType.includes('Face') ? '👤' : '👆'}
                    </div>
                    <span style={{ fontSize: '0.72rem', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>
                      • Acceso Biométrico Protegido
                    </span>
                    <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '8px 0 4px 0', fontFamily: 'Outfit, sans-serif' }}>
                      ¡Hola, {savedBiometricUser.nombre.split(' ')[0]}!
                    </h2>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(108, 76, 224, 0.1)', color: '#6C4CE0', padding: '3px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700, margin: '4px 0 8px 0' }}>
                      <span>{getUserBadgeText(savedBiometricUser)}</span>
                      <span>• @{savedBiometricUser.usuario}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                      Usa tu {biometricType} para desbloquear e ingresar a tu cuenta.
                    </p>
                  </div>

                  {loginError && (
                    <div style={{ color: 'var(--color-critical)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', margin: '12px 0 16px 0', textAlign: 'center' }}>
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={isBiometricAuthenticating}
                    className="btn-biometric-auth"
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #6C4CE0 0%, #5B3BBF 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(108, 76, 224, 0.4)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      marginBottom: '16px'
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>
                      {biometricType.includes('Face') ? '👤' : '👆'}
                    </span>
                    <span>
                      {isBiometricAuthenticating ? 'Comprobando datos biométricos...' : `Desbloquear con ${biometricType}`}
                    </span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError('');
                        setShowManualLoginForm(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🔑 Ingresar con contraseña manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('maint_biometric_user');
                        localStorage.removeItem('maint_saved_user');
                        localStorage.removeItem('maint_saved_pass');
                        setSavedBiometricUser(null);
                        setLoginUser('');
                        setLoginPass('');
                        setLoginError('');
                        setShowManualLoginForm(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Iniciar con otra cuenta de usuario
                    </button>
                  </div>
                </div>
              ) : (
                /* ========================================================
                   FORMULARIO MANUAL (USUARIO Y CONTRASEÑA)
                   ======================================================== */
                <div>
                  {savedBiometricUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError('');
                        setShowManualLoginForm(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginBottom: '10px',
                        padding: 0
                      }}
                    >
                      ← Volver a desbloqueo con {biometricType}
                    </button>
                  )}

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
                        placeholder="ej. BAT1_2026" 
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

                    {(isBiometricAvailable || !!localStorage.getItem('maint_biometric_user')) && !savedBiometricUser && (
                      <div style={{ marginTop: '14px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(108, 76, 224, 0.08)', border: '1px dashed #6C4CE0', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>👆</span>
                        <span>Dispositivo compatible con {biometricType}. Al ingresar con tu usuario quedará vinculado para accesos con un solo toque.</span>
                      </div>
                    )}
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <a
                  href="/ManteTiendas.apk"
                  download="ManteTiendas.apk"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s'
                  }}
                  title="Descargar instalador APK para teléfonos Android"
                >
                  📥 Descargar App Android (APK v2.0)
                </a>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button"
                className="header-icon-btn mobile-menu-toggle"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                style={{ display: 'none' }}
                title="Menú de Navegación"
              >
                ☰
              </button>
              <div className="header-brand" onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}>
                <div className="header-brand-logo">🛠️</div>
                <div className="header-brand-text">
                  <span>Mante</span>Tiendas
                </div>
              </div>
            </div>

            <div className="header-user-section">
              {/* Quick User/Role Switcher for Localhost / Development */}
              {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
                    DEV
                  </span>
                  <select
                    className="input-box"
                    value={currentUser.id}
                    onChange={(e) => {
                      const u = users.find(x => x.id === Number(e.target.value));
                      if (u) {
                        setCurrentUser(u);
                        try { localStorage.setItem('maint_user', JSON.stringify(u)); } catch {}
                        setMaintToast({
                          mostrar: true,
                          titulo: 'Perfil Cambiado',
                          mensaje: `Ahora navegando como: ${u.nombre} (${u.rol.toUpperCase()})`,
                          tipo: 'info'
                        });
                      }
                    }}
                    style={{ fontSize: '0.74rem', padding: '4px 6px', maxWidth: '140px', borderRadius: '6px', cursor: 'pointer', height: '32px' }}
                    title="Cambio rápido de rol / usuario en entorno local"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.rol === 'supervisor' ? '👁️' : u.rol === 'tecnico' ? '👷' : u.rol === 'administrador' ? '⚡' : '🏬'} {u.nombre} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Theme Toggle Button */}
              <button 
                type="button"
                className="header-icon-btn"
                onClick={toggleTheme}
                title={isDarkMode ? "Cambiar a Tema Claro" : "Cambiar a Tema Oscuro"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>

              {/* Notification Bell Button (Opens Modal) */}
              <button 
                type="button"
                className="header-icon-btn" 
                onClick={() => setShowNotifModal(true)} 
                title="Notificaciones"
              >
                🔔 {unreadNotifsCount > 0 && <span className="notif-badge">{unreadNotifsCount}</span>}
              </button>

              {/* Clean User Profile Pill */}
              <div 
                className="user-profile-pill" 
                style={{ cursor: 'pointer' }} 
                onClick={() => setIsMobileSidebarOpen(true)}
                title={`Conectado como: ${currentUser.nombre} (${currentUser.rol})`}
              >
                <span 
                  className="user-badge-initials"
                  style={{
                    background:
                      (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? 'rgba(59, 130, 246, 0.15)' :
                      currentUser.rol === 'tecnico' ? 'rgba(16, 185, 129, 0.15)' :
                      currentUser.rol === 'supervisor' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color:
                      (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? 'var(--primary)' :
                      currentUser.rol === 'tecnico' ? '#059669' :
                      currentUser.rol === 'supervisor' ? '#4F46E5' : '#7C3AED',
                    border: `1px solid ${
                      (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? 'rgba(59, 130, 246, 0.3)' :
                      currentUser.rol === 'tecnico' ? 'rgba(16, 185, 129, 0.3)' :
                      currentUser.rol === 'supervisor' ? 'rgba(79, 70, 229, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                    }`
                  }}
                >
                  {getUserBadgeText(currentUser)}
                </span>
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
              <div className="sidebar-section-header">📊 Flujo de Mantenimiento</div>
              <ul className="sidebar-menu">
                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && casesViewMode === 'pendientes' && statusFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setCasesViewMode('pendientes'); setStatusFilter('todos'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⚡ Todos los Casos Activos</span>
                    <span className="sidebar-count-pill" style={{ background: 'var(--primary)', color: '#ffffff' }}>{activeCases.length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && casesViewMode === 'pendientes' && statusFilter === 'pendiente' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setCasesViewMode('pendientes'); setStatusFilter('pendiente'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏳ Pendientes</span>
                    <span className="sidebar-count-pill">{pendingUnassigned.length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && casesViewMode === 'pendientes' && statusFilter === 'en_proceso' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setCasesViewMode('pendientes'); setStatusFilter('en_proceso'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>🔧 En Proceso</span>
                    <span className="sidebar-count-pill">{inProgressCases.length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && casesViewMode === 'pendientes' && statusFilter === 'pausado_material' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setCasesViewMode('pendientes'); setStatusFilter('pausado_material' as any); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏸️ Casos Pausados</span>
                    <span className="sidebar-count-pill" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#D97706' }}>
                      {pausedCases.length}
                    </span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && (casesViewMode === 'concluidos' || statusFilter === 'completado') ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setCasesViewMode('concluidos'); setStatusFilter('completado'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>✅ Trabajos Concluidos / Historial</span>
                    <span className="sidebar-count-pill">{concludedCases.length}</span>
                  </div>
                </li>
              </ul>

              {/* Navigation Group 2: Módulos */}
              <div className="sidebar-section-header" style={{ marginTop: '14px' }}>⚙️ Módulos</div>
              <ul className="sidebar-menu">
                {currentUser.rol === 'tecnico' && (
                  <li>
                    <div
                      className={`sidebar-subitem ${showTechTimbradorModal ? 'active' : ''}`}
                      onClick={() => { setShowTechTimbradorModal(true); setIsMobileSidebarOpen(false); }}
                      style={{ cursor: 'pointer', borderLeft: activePunchClock ? '3px solid #10B981' : '3px solid #EF4444' }}
                    >
                      <span>⏱️ Timbrador de Asistencia</span>
                      <span 
                        className="sidebar-count-pill" 
                        style={{ 
                          background: activePunchClock ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                          color: activePunchClock ? '#059669' : '#DC2626',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          padding: '2px 8px'
                        }}
                      >
                        {activePunchClock ? 'ACTIVO' : 'PENDIENTE'}
                      </span>
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
                        {userVisibleCases.filter(c => (c.estado === 'en_proceso' || c.hora_entrada) && !c.hora_salida && c.estado !== 'concluido' && c.estado !== 'cerrado').length}
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
                      {userVisibleCases.filter(c => c.estado === 'concluido' || c.estado === 'cerrado' || Boolean(c.hora_salida)).length}
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
                      {userVisibleCases.filter(c => Boolean(c.fecha_programada) && c.estado !== 'concluido' && c.estado !== 'cerrado').length}
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

                <a
                  href="/ManteTiendas.apk"
                  download="ManteTiendas.apk"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', textDecoration: 'none', color: '#10B981', fontWeight: 600 }}
                  title="Descargar última versión de la aplicación para teléfonos Android"
                >
                  📱 Descargar App Android (APK)
                </a>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleLogout}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                >
                  🚪 Cerrar Sesión
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: '8px', padding: '8px 0 2px 0', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 120 120" style={{ width: '20px', height: '20px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                      <polygon points="60,8 105,32 105,88 60,112 15,88 15,32" fill="none" stroke="#6C4CE0" strokeWidth="4.5"/>
                      <circle cx="60" cy="8" r="5" fill="#19C48A"/>
                      <circle cx="105" cy="32" r="5" fill="#19C48A"/>
                      <circle cx="105" cy="88" r="5" fill="#19C48A"/>
                      <circle cx="60" cy="112" r="5" fill="#19C48A"/>
                      <circle cx="15" cy="88" r="5" fill="#19C48A"/>
                      <circle cx="15" cy="32" r="5" fill="#19C48A"/>
                      <text x="60" y="69" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', system-ui, sans-serif" fontSize="28" fontWeight="800" fill="#6C4CE0">D&amp;N</text>
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                      D&amp;Nax <span style={{ color: '#19C48A' }}>Studios</span>
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    Diseñado y Desarrollado por <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>D&amp;Nax Studios</span> &bull; &copy; 2026
                  </div>
                </div>
              </div>
            </aside>

            {/* CONTENT AREA */}
            <main className="main-content">
              
              {/* VIEW A: TICKET DETAILS (CLEAN NON-INVASIVE TABBED VIEW) */}
              {selectedCaseId && selectedCase ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                  
                  {/* Top Bar: Back button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCaseId(null)}>
                      ← Volver al listado
                    </button>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Caso #{getCaseDisplayCode(selectedCase)}
                    </span>
                  </div>

                  {/* Reopen Warning Banner (If applicable) */}
                  {selectedCase.reaperturas_count !== undefined && selectedCase.reaperturas_count >= 3 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 14px', borderRadius: '8px', fontSize: '0.82rem', lineHeight: 1.4 }}>
                      <strong>🚨 ATENCIÓN: Caso reabierto {selectedCase.reaperturas_count} veces.</strong> Las intervenciones previas no han resuelto el problema definitivamente. Se requiere evaluar otra alternativa técnica.
                    </div>
                  )}

                  {/* Main Header Card */}
                  <div className="case-header-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.74rem' }}>
                          CASO #{getCaseDisplayCode(selectedCase)}
                        </span>
                        {canEditOrDeleteCase(selectedCase) && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 9px', fontSize: '0.74rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleOpenEditCase(selectedCase)}
                              title="Editar este caso"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '3px 9px', fontSize: '0.74rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleOpenDeleteCase(selectedCase)}
                              title="Eliminar este caso"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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

                    <h2 className="case-header-title">{selectedCase.categoria}</h2>
                  </div>

                  {/* SEGMENTED TABS (CONTROL DE PESTAÑAS NO INVASIVO) */}
                  <div className="case-tabs-bar">
                    <button 
                      type="button"
                      className={`case-tab-btn ${caseDetailTab === 'info' ? 'active' : ''}`}
                      onClick={() => setCaseDetailTab('info')}
                    >
                      📌 Detalle
                    </button>

                    <button 
                      type="button"
                      className={`case-tab-btn ${caseDetailTab === 'asistencia' ? 'active' : ''}`}
                      onClick={() => setCaseDetailTab('asistencia')}
                    >
                      ⏱️ Asistencia & Visitas
                      {getCaseJornadas(selectedCase).length > 0 && (
                        <span className="case-tab-pill-count">{getCaseJornadas(selectedCase).length}</span>
                      )}
                    </button>

                    <button 
                      type="button"
                      className={`case-tab-btn ${caseDetailTab === 'bitacora' ? 'active' : ''}`}
                      onClick={() => setCaseDetailTab('bitacora')}
                    >
                      💬 Bitácora
                      {(selectedCase.comentarios?.length || 0) > 0 && (
                        <span className="case-tab-pill-count">{(selectedCase.comentarios?.length || 0)}</span>
                      )}
                    </button>

                    <button 
                      type="button"
                      className={`case-tab-btn ${caseDetailTab === 'evidencias' ? 'active' : ''}`}
                      onClick={() => setCaseDetailTab('evidencias')}
                    >
                      📸 Evidencias
                      {(selectedCase.evidencias?.length || 0) > 0 && (
                        <span className="case-tab-pill-count">{(selectedCase.evidencias?.length || 0)}</span>
                      )}
                    </button>

                    {(selectedCase.estado === 'en_proceso' || selectedCase.solicitud_material_anticipada || materialRequests.some(r => r.casoId === selectedCase.id)) && (
                      <button 
                        type="button"
                        className={`case-tab-btn ${caseDetailTab === 'materiales' ? 'active' : ''}`}
                        onClick={() => setCaseDetailTab('materiales')}
                      >
                        📦 Materiales
                        {materialRequests.filter(r => r.casoId === selectedCase.id).length > 0 && (
                          <span className="case-tab-pill-count">{materialRequests.filter(r => r.casoId === selectedCase.id).length}</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* TAB 1: DETALLE E INFORMACIÓN GENERAL */}
                  {caseDetailTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Ficha Técnica de 2 columnas */}
                      <div className="case-info-grid">
                        <div className="case-info-item">
                          <span className="case-info-label">🏬 Tienda / Sede</span>
                          <span className="case-info-val">{stores.find(s => s.id === selectedCase.tiendaId)?.nombre}</span>
                        </div>
                        <div className="case-info-item">
                          <span className="case-info-label">👤 Reportado Por</span>
                          <span className="case-info-val">{users.find(u => u.id === selectedCase.creadoPor)?.nombre}</span>
                        </div>
                        <div className="case-info-item">
                          <span className="case-info-label">📅 Fecha de Creación</span>
                          <span className="case-info-val">{new Date(selectedCase.fechaCreacion).toLocaleString()}</span>
                        </div>
                        {!selectedCase.es_caso_tecnico && (
                          <div className="case-info-item">
                            <span className="case-info-label">⏱️ Plazo Límite SLA</span>
                            <span className="case-info-val" style={{ color: isSlaBreached(selectedCase) && (selectedCase.estado === 'pendiente' || selectedCase.estado === 'en_proceso') ? 'var(--color-critical)' : 'inherit' }}>
                              {new Date(selectedCase.fechaLimiteSla).toLocaleString()}
                              {isSlaBreached(selectedCase) && (selectedCase.estado === 'pendiente' || selectedCase.estado === 'en_proceso') && ' (FUERA DE SLA)'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Descripción del Requerimiento */}
                      <div className="detail-card">
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                          📝 Descripción del Problema / Falla:
                        </div>
                        <div className="case-description-box">
                          {selectedCase.descripcion}
                        </div>
                      </div>

                      {/* Materiales Solicitados por Adelantado */}
                      {selectedCase.solicitud_material_anticipada && (
                        <div className="detail-card" style={{ background: 'var(--bg-surface)', borderLeft: '4px solid #f59e0b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              📦 Materiales Solicitados por Adelantado:
                            </div>
                            <span className={`material-status ${selectedCase.material_anticipado_estado || 'pendiente_aprobacion'}`}>
                              {selectedCase.material_anticipado_estado === 'aprobado' ? '✅ Aprobado' : selectedCase.material_anticipado_estado === 'rechazado' ? '❌ Rechazado' : '⏳ Pendiente'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {selectedCase.material_anticipado_items && selectedCase.material_anticipado_items.length > 0 ? (
                              selectedCase.material_anticipado_items.map((item, idx) => (
                                <div 
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    background: 'var(--bg-panel)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.82rem'
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                    • {item.nombre}
                                  </span>
                                  <span style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                                    Cant: {item.cantidad}
                                  </span>
                                </div>
                              ))
                            ) : (
                              (selectedCase.material_anticipado_nombre || '').split(' | ').map((str, idx) => (
                                <div 
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    background: 'var(--bg-panel)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.82rem'
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                    • {str}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.material_anticipado_estado !== 'aprobado' && selectedCase.material_anticipado_estado !== 'rechazado' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                              <button 
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleApprovePreMaterials(selectedCase.id)}
                                style={{ background: 'var(--color-resolved)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}
                              >
                                ✓ Aprobar Materiales
                              </button>
                              <button 
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDenyPreMaterials(selectedCase.id)}
                                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}
                              >
                                ✕ Denegar
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Asignación y Técnicos a Cargo */}
                      {(selectedCase.tecnico_presencial_nombre || selectedCase.tecnico_apoyo_nombre || selectedCase.tecnicoAsignadoId) && (
                        <div className="detail-card" style={{ background: 'var(--bg-surface)' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
                            {selectedCase.tecnico_apoyo_nombre ? '👥 Equipo de Técnicos Asignados' : '👷 Técnico a Cargo'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>• <strong>Técnico Principal:</strong> {selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre}</div>
                            {selectedCase.tecnico_apoyo_nombre && (
                              <div>• <strong>Técnico de Apoyo:</strong> {selectedCase.tecnico_apoyo_nombre}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Acciones Rápidas */}
                      <div className="detail-card">
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                          ⚡ Acciones Rápidas
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Asignación para Supervisor */}
                          {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.estado === 'pendiente' && (
                            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
                              <label className="field-label" style={{ display: 'block', marginBottom: '6px' }}>Asignar Técnico de Mantenimiento:</label>
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

                          {/* Tomar Caso por Técnico */}
                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'pendiente' && (
                            <button className="btn btn-primary" onClick={() => {
                              setTakeCaseMode('solo');
                              setTakeCaseSupportTech('');
                              setShowTakeCaseModal(true);
                            }} style={{ width: '100%', fontWeight: 700, padding: '12px' }}>
                              ⚡ Tomar Caso e Iniciar Trabajo Presencial
                            </button>
                          )}

                          {/* Confirmar Llegada de Técnico por Tienda en Caso Pendiente */}
                          {((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId) && selectedCase.estado === 'pendiente' && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => {
                                const techList = users.filter(u => u.rol === 'tecnico');
                                const preAssignedName = selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || (techList[0]?.nombre || 'Técnico');
                                handleLogTechEntry(selectedCase.id, preAssignedName);
                              }}
                              style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800 }}
                            >
                              🟢 Confirmar Llegada del Técnico e Iniciar Caso
                            </button>
                          )}

                          {/* Agendar Turno de Atención (Solo para Local, Supervisor y Administrador) */}
                          {currentUser.rol !== 'tecnico' && selectedCase.estado !== 'concluido' && selectedCase.estado !== 'cerrado' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenScheduleModal(selectedCase)}
                              style={{ width: '100%', fontWeight: 700, borderColor: '#3B82F6', color: '#3B82F6' }}
                            >
                              {selectedCase.fecha_programada ? '✏️ Re-agendar Turno / Cita' : '📅 Agendar Turno de Atención'}
                            </button>
                          )}

                          {/* ACCIONES EN PROCESO (NO PAUSADO) */}
                          {selectedCase.estado === 'en_proceso' && !selectedCase.pausado_por_material && (
                            <>
                              {currentUser.rol === 'tecnico' && (!activePunchClock || activePunchClock.casoId !== selectedCase.id) && (
                                <button 
                                  type="button"
                                  className="btn btn-secondary" 
                                  onClick={() => {
                                    handleLogTechEntry(selectedCase.id, currentUser.nombre);
                                    const currentVisits = selectedCase.jornadas?.length || 1;
                                    const punch: ActiveTechPunchClock = {
                                      tecnicoId: currentUser.id,
                                      tecnicoNombre: currentUser.nombre,
                                      tiendaId: selectedCase.tiendaId,
                                      casoId: selectedCase.id,
                                      horaIngreso: new Date().toISOString(),
                                      numeroVisita: currentVisits,
                                      esNuevoCaso: false
                                    };
                                    setActivePunchClock(punch);
                                    try {
                                      localStorage.setItem(`maint_tech_punch_${currentUser.id}`, JSON.stringify(punch));
                                    } catch {}
                                    setMaintToast({
                                      mostrar: true,
                                      titulo: '⏱️ Timbrador Activado',
                                      mensaje: `Has registrado tu ingreso presencial al Caso #${selectedCase.id}.`,
                                      tipo: 'success'
                                    });
                                  }}
                                  style={{ width: '100%', fontWeight: 800, borderColor: '#3B82F6', color: '#1D4ED8', background: 'rgba(59,130,246,0.08)', padding: '11px', marginBottom: '4px' }}
                                >
                                  ⏱️ Incorporarme / Iniciar Timbrador en este Caso
                                </button>
                              )}
                              <button 
                                className="btn btn-primary" 
                                onClick={() => setShowSolveModal(true)} 
                                style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800 }}
                              >
                                {currentUser.rol === 'tecnico'
                                  ? '✅ Concluir Trabajo & Subir Evidencias Fotográficas'
                                  : '✅ Concluir Trabajo'}
                              </button>

                              <button 
                                type="button"
                                className="btn btn-warning" 
                                onClick={() => {
                                  setPauseReasonInput('');
                                  setShowPauseMaterialModal(true);
                                }}
                                style={{ width: '100%', fontWeight: 800, background: '#d97706', color: '#ffffff' }}
                              >
                                ⏸️ Pausar Caso (Falta de Materiales / Imprevisto)
                              </button>
                            </>
                          )}

                          {/* ACCIONES EN CASO PAUSADO */}
                          {selectedCase.pausado_por_material && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#a16207' }}>
                                <strong>⏸️ Caso en Pausa:</strong> "{selectedCase.motivo_pausa_material || 'Falta de materiales'}"
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Salida de visita anterior registrada. Cuando se regrese a tienda, marca el reingreso para continuar.
                                </div>
                              </div>

                              {((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (!currentUser.tiendaId || currentUser.tiendaId === selectedCase.tiendaId)) && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleLogTechEntry(selectedCase.id, selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico')}
                                  style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px' }}
                                >
                                  🟢 Registrar Reingreso a Tienda y Reanudar Labores
                                </button>
                              )}

                              <button 
                                type="button"
                                className="btn btn-primary" 
                                onClick={() => setShowSolveModal(true)} 
                                style={{ width: '100%', background: '#059669', fontWeight: 800 }}
                              >
                                {currentUser.rol === 'tecnico'
                                  ? '✅ Concluir Trabajo & Subir Evidencias Fotográficas'
                                  : '✅ Concluir Trabajo'}
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleConfirmMaterialsArrived(selectedCase.id)}
                                style={{ width: '100%', borderColor: '#10B981', color: '#059669', fontWeight: 700 }}
                              >
                                📦 Confirmar Llegada de Materiales a Tienda
                              </button>
                            </div>
                          )}

                          {/* Validar y Cerrar por Tienda / Admin */}
                          {((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador')) && selectedCase.estado === 'concluido' && (
                            <>
                              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#047857' }}>
                                <strong>📋 Trabajo Técnico Finalizado:</strong> El técnico ha registrado su salida y subido las evidencias. El personal de la tienda debe corroborar el resultado del trabajo:
                              </div>

                              <button className="btn btn-primary" onClick={() => handleCloseCase(selectedCase.id)} style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800 }}>
                                ✅ Corroborar y Aprobar Conclusión Definitiva (Cerrar)
                              </button>
                              
                              {/* Reabrir caso concluido */}
                              {!showReopenInput ? (
                                <button className="btn btn-danger" onClick={() => setShowReopenInput(true)} style={{ width: '100%', fontWeight: 700 }}>
                                  🔄 Reabrir Caso (No quedó bien / Falla persiste)
                                </button>
                              ) : (
                                <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '4px', background: 'var(--bg-surface)' }}>
                                  <label className="field-label" style={{ color: 'var(--color-critical)', marginBottom: '5px' }}>Motivo de la Reapertura (Obligatorio):</label>
                                  <textarea 
                                    className="input-box" 
                                    style={{ minHeight: '60px', fontSize: '0.85rem' }} 
                                    placeholder="Indique detalladamente por qué el trabajo no quedó conforme o qué problema persiste..." 
                                    value={reopenReason}
                                    onChange={e => setReopenReason(e.target.value)}
                                  />
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button className="btn btn-danger btn-sm" disabled={!reopenReason.trim()} onClick={() => handleReopenCase(selectedCase.id)}>Confirmar Reapertura</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowReopenInput(false)}>Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Reabrir caso cerrado */}
                          {selectedCase.estado === 'cerrado' && (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                            <div>
                              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                🔒 Caso Cerrado y Aprobado. Si la falla vuelve a presentarse en el futuro, puedes reabrir el caso:
                              </div>

                              {!showReopenInput ? (
                                <button 
                                  className="btn btn-warning" 
                                  style={{ width: '100%', padding: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                                  onClick={() => setShowReopenInput(true)}
                                >
                                  🔄 Reabrir Caso por Incumplimiento o Falla Reincidente
                                </button>
                              ) : (
                                <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                                  <label style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#d97706', display: 'block', marginBottom: '4px' }}>
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
                                    <button className="btn btn-danger btn-sm" disabled={!reopenReason.trim()} onClick={() => handleReopenCase(selectedCase.id)}>Confirmar Reapertura</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowReopenInput(false)}>Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CONTROL DE ASISTENCIA Y JORNADAS */}
                  {caseDetailTab === 'asistencia' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="detail-card assistance-control-card" style={{ background: 'var(--bg-panel)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: '0.94rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⏱️ Control de Asistencia y Jornadas en Tienda
                          </h4>
                          {(selectedCase.gps_latitud_entrada || selectedCase.gps_latitud_salida) && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              📍 Coordenadas GPS Verificadas
                            </span>
                          )}
                        </div>

                        {(() => {
                          const isStoreUserForThisCase = (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && (!currentUser.tiendaId || currentUser.tiendaId === selectedCase.tiendaId);
                          const isTechUser = currentUser.rol === 'tecnico';
                          const canManageAttendance = isStoreUserForThisCase || isTechUser || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador';

                          // CASO 1: CASO YA CONCLUIDO O CERRADO DEFINITIVAMENTE
                          if (selectedCase.estado === 'concluido' || selectedCase.estado === 'cerrado') {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  <div style={{ fontSize: '0.86rem', color: 'var(--color-resolved)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ✅ TRABAJO TÉCNICO FINALIZADO ({getCaseJornadas(selectedCase).length} {getCaseJornadas(selectedCase).length === 1 ? 'visita realizada' : 'visitas realizadas'})
                                  </div>
                                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', marginTop: '4px' }}>
                                    👷 <strong>{selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico'}</strong>
                                  </div>
                                  {selectedCase.hora_entrada && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                      🟢 Entrada inicial: <strong>{new Date(selectedCase.hora_entrada).toLocaleTimeString()}</strong>
                                      {selectedCase.gps_latitud_entrada && selectedCase.gps_longitud_entrada && (
                                        <a 
                                          href={`https://www.google.com/maps?q=${selectedCase.gps_latitud_entrada},${selectedCase.gps_longitud_entrada}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                        >
                                          📍 GPS Entrada Maps ↗
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {selectedCase.hora_salida && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                      🔴 Salida final: <strong>{new Date(selectedCase.hora_salida).toLocaleTimeString()}</strong>
                                      {selectedCase.gps_latitud_salida && selectedCase.gps_longitud_salida && (
                                        <a 
                                          href={`https://www.google.com/maps?q=${selectedCase.gps_latitud_salida},${selectedCase.gps_longitud_salida}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                        >
                                          📍 GPS Salida Maps ↗
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '0.78rem', color: 'var(--color-resolved)', marginTop: '4px' }}>
                                    {selectedCase.estado === 'concluido' 
                                      ? '📋 Estado: Concluido con evidencias fotográficas. En espera de corroboración del local.' 
                                      : '🔒 Estado: Cerrado y validado definitivamente.'}
                                  </div>
                                </div>

                                {selectedCase.estado === 'concluido' && (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe' || currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button 
                                      type="button" 
                                      className="btn btn-primary" 
                                      onClick={() => handleCloseCase(selectedCase.id)} 
                                      style={{ flex: 1, minWidth: '160px', background: 'var(--color-resolved)', fontWeight: 800 }}
                                    >
                                      ✅ Aprobar y Cerrar Caso
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // CASO 2: EN PAUSA POR MATERIALES O IMPREVISTO
                          if (selectedCase.pausado_por_material) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.84rem', color: '#d97706', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⏸️ CASO EN PAUSA (Salida de técnico registrada)
                                  </div>
                                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                                    <strong>Motivo de la pausa:</strong> "{selectedCase.motivo_pausa_material || 'Falta de materiales o presupuesto'}"
                                  </p>
                                  {selectedCase.hora_salida && (
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                      ⏱️ Salida de visita anterior: {new Date(selectedCase.hora_salida).toLocaleTimeString()}
                                      {selectedCase.gps_latitud_salida && selectedCase.gps_longitud_salida && (
                                        <a 
                                          href={`https://www.google.com/maps?q=${selectedCase.gps_latitud_salida},${selectedCase.gps_longitud_salida}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ marginLeft: '8px', color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                        >
                                          📍 Ver GPS Maps ↗
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {canManageAttendance && (
                                  <>
                                    {isStoreUserForThisCase && (
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleLogTechEntry(selectedCase.id, selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico')}
                                        style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px', fontSize: '0.85rem' }}
                                      >
                                        🟢 Registrar Reingreso del Técnico y Reanudar Labores
                                      </button>
                                    )}

                                    <button 
                                      type="button" 
                                      className="btn btn-primary" 
                                      onClick={() => setShowSolveModal(true)} 
                                      style={{ width: '100%', background: '#059669', fontWeight: 800, padding: '10px', fontSize: '0.85rem' }}
                                    >
                                      {currentUser.rol === 'tecnico'
                                        ? '✅ Concluir Trabajo & Subir Evidencias Fotográficas'
                                        : '✅ Concluir Trabajo'}
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleConfirmMaterialsArrived(selectedCase.id)}
                                      style={{ width: '100%', borderColor: '#10B981', color: '#059669', fontWeight: 700 }}
                                    >
                                      📦 Confirmar Llegada de Materiales a Tienda
                                    </button>
                                  </>
                                )}
                              </div>
                            );
                          }

                          // CASO 3: PENDIENTE DE PRIMER INGRESO (O TRAS REAPERTURA)
                          if (!selectedCase.hora_entrada || selectedCase.estado === 'pendiente') {
                            if (!isStoreUserForThisCase) {
                              return (
                                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                                  ℹ️ <em>La confirmación física de llegada del técnico a tienda e inicio del trabajo corresponde exclusivamente al personal del local (Jefe o Subjefe de Tienda).</em>
                                </div>
                              );
                            }

                            const techList = users.filter(u => u.rol === 'tecnico');
                            const preAssignedName = selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || (techList[0]?.nombre || '');
                            const currentTechToLog = selectedPresencialTech || preAssignedName;

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                  {selectedCase.reaperturas_count && selectedCase.reaperturas_count > 0 
                                    ? '🔄 Caso reabierto. Registre el ingreso del técnico cuando se presente en tienda para atender la reapertura:'
                                    : 'Marque el ingreso cuando el técnico se presente físicamente en tienda para iniciar la atención:'}
                                </p>

                                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div>
                                    <label className="field-label" style={{ fontSize: '0.74rem', display: 'block', marginBottom: '4px' }}>
                                      Técnico que se presenta en tienda:
                                    </label>
                                    <select 
                                      className="input-box" 
                                      value={currentTechToLog} 
                                      onChange={e => setSelectedPresencialTech(e.target.value)}
                                      style={{ fontSize: '0.84rem', padding: '8px 10px', width: '100%', fontWeight: 600 }}
                                    >
                                      {techList.map(u => (
                                        <option key={u.id} value={u.nombre}>
                                          👷 {u.nombre} {u.nombre === preAssignedName ? '(Asignado)' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button 
                                    type="button"
                                    className="btn btn-primary" 
                                    onClick={() => handleLogTechEntry(selectedCase.id, currentTechToLog)}
                                    disabled={!currentTechToLog}
                                    style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px', fontSize: '0.86rem' }}
                                  >
                                    🟢 Confirmar Llegada de {currentTechToLog || 'Técnico'} e Iniciar Trabajo
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // CASO 4: TÉCNICO LABORANDO ACTIVAMENTE EN TIENDA (EN PROCESO)
                          if (!selectedCase.hora_salida) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--color-resolved)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🟢 TÉCNICO EN TIENDA LABORANDO (Visita #{getCaseJornadas(selectedCase).length})
                                  </div>
                                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '4px' }}>
                                    👷 <strong>{selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    ⏱️ Hora de ingreso: <strong style={{ color: 'var(--primary)' }}>{new Date(selectedCase.hora_entrada!).toLocaleTimeString()}</strong>
                                  </div>
                                  {selectedCase.gps_latitud_entrada && selectedCase.gps_longitud_entrada && (
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>📍 GPS Entrada ({selectedCase.gps_latitud_entrada.toFixed(4)}, {selectedCase.gps_longitud_entrada.toFixed(4)})</span>
                                      <a 
                                        href={`https://www.google.com/maps?q=${selectedCase.gps_latitud_entrada},${selectedCase.gps_longitud_entrada}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                      >
                                        Ver en Google Maps ↗
                                      </a>
                                    </div>
                                  )}
                                </div>

                                {canManageAttendance && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button 
                                      type="button" 
                                      className="btn btn-primary" 
                                      onClick={() => setShowSolveModal(true)} 
                                      style={{ flex: 1, minWidth: '150px', padding: '10px', fontWeight: 800, fontSize: '0.82rem', background: 'var(--color-resolved)' }}
                                    >
                                      {currentUser.rol === 'tecnico' ? '✅ Concluir Trabajo & Fotos' : '✅ Concluir Trabajo'}
                                    </button>

                                    <button 
                                      type="button" 
                                      className="btn btn-warning" 
                                      onClick={() => {
                                        setPauseReasonInput('');
                                        setShowPauseMaterialModal(true);
                                      }}
                                      style={{ flex: 1, minWidth: '150px', padding: '10px', fontWeight: 800, fontSize: '0.82rem', background: '#d97706', color: '#ffffff' }}
                                    >
                                      ⏸️ Pausar y Marcar Salida
                                    </button>

                                    <button 
                                      type="button" 
                                      className="btn btn-secondary" 
                                      onClick={() => handleLogTechExit(selectedCase.id)}
                                      style={{ minWidth: '130px', padding: '10px', fontWeight: 700, fontSize: '0.82rem' }}
                                    >
                                      🚪 Salida Temporal
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // CASO 5: TÉCNICO RETIRADO TEMPORALMENTE (EN PROCESO CON SALIDA)
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-muted)' }}>⏱️ Técnico fuera de tienda (Salida registrada):</div>
                                <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                                  Salida de visita #{getCaseJornadas(selectedCase).length}: <strong>{new Date(selectedCase.hora_salida).toLocaleTimeString()}</strong>
                                </div>
                                {selectedCase.gps_latitud_salida && selectedCase.gps_longitud_salida && (
                                  <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                                    <a 
                                      href={`https://www.google.com/maps?q=${selectedCase.gps_latitud_salida},${selectedCase.gps_longitud_salida}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
                                    >
                                      📍 Ubicación de Salida en Maps ↗
                                    </a>
                                  </div>
                                )}
                              </div>

                              {isStoreUserForThisCase && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleLogTechEntry(selectedCase.id, selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico')}
                                  style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px', fontSize: '0.85rem' }}
                                >
                                  🟢 Registrar Reingreso del Técnico a Tienda
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* CRONOLOGÍA DE TODAS LAS VISITAS */}
                        {getCaseJornadas(selectedCase).length > 0 && (
                          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                              📋 Historial de Visitas del Técnico en Tienda ({getCaseJornadas(selectedCase).length}):
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {getCaseJornadas(selectedCase).map((j, idx) => (
                                <div key={j.id || idx} style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                                    <span style={{ color: 'var(--primary)' }}>Visita #{j.numeroVisita || idx + 1}: {j.tecnicoNombre}</span>
                                    <span style={{ fontSize: '0.7rem', color: j.horaSalida ? 'var(--text-muted)' : 'var(--color-resolved)' }}>
                                      {j.horaSalida ? 'Finalizada' : '🟢 En curso'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      🟢 Entrada: <strong>{new Date(j.horaEntrada).toLocaleTimeString()}</strong>
                                      {j.gpsEntrada && (
                                        <a 
                                          href={`https://www.google.com/maps?q=${j.gpsEntrada.latitude},${j.gpsEntrada.longitude}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600, fontSize: '0.72rem' }}
                                        >
                                          📍 Maps ↗
                                        </a>
                                      )}
                                    </span>
                                    {j.horaSalida && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        🔴 Salida: <strong>{new Date(j.horaSalida).toLocaleTimeString()}</strong>
                                        {j.gpsSalida && (
                                          <a 
                                            href={`https://www.google.com/maps?q=${j.gpsSalida.latitude},${j.gpsSalida.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600, fontSize: '0.72rem' }}
                                          >
                                            📍 Maps ↗
                                          </a>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {j.motivoPausa && (
                                    <div style={{ marginTop: '3px', color: '#d97706', fontSize: '0.74rem' }}>
                                      ⏸️ Motivo Pausa: "{j.motivoPausa}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BITÁCORA Y COMENTARIOS */}
                  {caseDetailTab === 'bitacora' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {/* Historial y Auditoría */}
                      <div className="detail-card">
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                          📜 Auditoría y Cambios de Estado
                        </div>
                        <div className="history-timeline">
                          {(selectedCase.historial || []).map((h, i) => (
                            <div key={h.id} className="history-node">
                              <div className={`history-dot ${i === (selectedCase.historial?.length || 0) - 1 ? 'active' : ''}`}></div>
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

                      {/* Comentarios y Notas */}
                      <div className="detail-card">
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                          💬 Mensajes y Notas del Caso ({(selectedCase.comentarios?.length || 0)})
                        </div>

                        {selectedCase.estado !== 'cerrado' && (
                          <form onSubmit={(e) => handleAddComment(e, selectedCase.id)} style={{ marginBottom: '14px' }}>
                            <textarea 
                              className="input-box" 
                              placeholder="Escribe una actualización o nota sobre el caso..."
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              required
                              style={{ minHeight: '60px', fontSize: '0.85rem' }}
                            />
                            <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '6px', float: 'right' }}>
                              Enviar Comentario
                            </button>
                          </form>
                        )}
                        <div style={{ clear: 'both' }}></div>

                        <div className="comments-list" style={{ marginTop: '8px' }}>
                          {(selectedCase.comentarios?.length || 0) === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>No hay comentarios todavía.</p>
                          ) : (
                            (selectedCase.comentarios || []).map(c => (
                              <div key={c.id} className="comment-bubble">
                                <div className="comment-meta">
                                  <strong>{c.autor} ({c.rol === 'jefe_tienda' ? 'Jefe' : c.rol})</strong>
                                  <span>{new Date(c.fecha).toLocaleTimeString()}</span>
                                </div>
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: '4px 0 0 0' }}>{c.texto}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: EVIDENCIAS */}
                  {caseDetailTab === 'evidencias' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="detail-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                            📸 Fotos de Evidencia ({(selectedCase.evidencias?.length || 0)})
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {currentUser?.rol === 'tecnico' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setAddEvidencePhoto(null);
                                  setAddEvidenceGpsLoc(null);
                                  setShowAddEvidenceModal(true);
                                }}
                                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#10b981', color: '#059669' }}
                              >
                                📷 Adjuntar Foto con GPS
                              </button>
                            )}
                            {(currentUser?.rol === 'supervisor' || currentUser?.rol === 'administrador') && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                💡 Clic en cualquier foto para ver GPS y mapa
                              </span>
                            )}
                          </div>
                        </div>

                        {(selectedCase.evidencias?.length || 0) === 0 ? (
                          <div style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                            <span style={{ fontSize: '2.5rem' }}>📷</span>
                            <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}>
                              No hay fotos de evidencia adjuntadas a este caso
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, maxWidth: '380px', lineHeight: 1.4 }}>
                              {currentUser?.rol === 'tecnico'
                                ? 'Puedes capturar y adjuntar fotografías en campo con geolocalización satelital para este caso.'
                                : 'Las fotografías de evidencia serán subidas por el técnico asignado durante la atención.'}
                            </p>
                            {currentUser?.rol === 'tecnico' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  setAddEvidencePhoto(null);
                                  setAddEvidenceGpsLoc(null);
                                  setShowAddEvidenceModal(true);
                                }}
                                style={{ padding: '8px 18px', fontWeight: 800, fontSize: '0.84rem', marginTop: '4px' }}
                              >
                                📷 Tomar Foto de Evidencia Ahora
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px' }}>
                            {(selectedCase.evidencias || []).map(ev => (
                              <div 
                                key={ev.id} 
                                style={{ 
                                  border: '1px solid var(--border-color)', 
                                  borderRadius: '10px', 
                                  overflow: 'hidden', 
                                  background: 'var(--bg-surface)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setSelectedEvidenceModal(ev)}
                                title="Clic para ampliar y ver GPS"
                              >
                                <div style={{ position: 'relative', width: '100%', height: '170px', background: '#0f172a' }}>
                                  <img 
                                    src={ev.archivoUrl} 
                                    alt="evidencia" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                                  />
                                  {ev.coordenadas && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '6px',
                                      left: '6px',
                                      background: 'rgba(15, 23, 42, 0.85)',
                                      backdropFilter: 'blur(4px)',
                                      color: '#10b981',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <span>📍 GPS</span>
                                      <span>{ev.coordenadas.latitude.toFixed(3)}, {ev.coordenadas.longitude.toFixed(3)}</span>
                                    </div>
                                  )}
                                  <div style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    background: 'rgba(0,0,0,0.6)',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem'
                                  }}>
                                    🔍
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.74rem', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                    {selectedCase.es_caso_tecnico ? `👷 Reporte Técnico` : 
                                     ev.tipo === 'final' ? `✅ Solución de Caso` : `📷 Evidencia Inicial`}
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                    Por: <strong>{ev.subidoPor}</strong>
                                  </div>
                                  {ev.fecha && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                                      📅 {new Date(ev.fecha).toLocaleString()}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                    {ev.coordenadas ? (
                                      <a
                                        href={`https://www.google.com/maps?q=${ev.coordenadas.latitude},${ev.coordenadas.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1, fontSize: '0.7rem', padding: '4px 6px', textAlign: 'center', textDecoration: 'none', color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.4)' }}
                                      >
                                        🗺️ Ver en Maps ↗
                                      </a>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      onClick={() => setSelectedEvidenceModal(ev)}
                                      style={{ flex: 1, fontSize: '0.7rem', padding: '4px 6px' }}
                                    >
                                      🔍 Ampliar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: MATERIALES */}
                  {caseDetailTab === 'materiales' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="detail-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '0.94rem', color: 'var(--text-main)', margin: 0, fontWeight: 800 }}>
                            📦 Peticiones de Materiales y Repuestos
                          </h3>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}
                            onClick={() => {
                              setFacturacionCasoId(selectedCase.id);
                              const storeObj = stores.find(s => s.id === selectedCase.tiendaId);
                              const supName = (storeObj as any)?.supervisorName || (selectedCase as any)?.supervisor_nombre || '';
                              const profile = SUPERVISOR_BILLING_PROFILES[supName] || SUPERVISOR_BILLING_PROFILES['WILSON PAZMIÑO'] || SUPERVISOR_BILLING_PROFILES['MARLON MENENDEZ'];

                              setFacturacionRuc(profile.ruc);
                              setFacturacionRazonSocial(profile.razonSocial);
                              setFacturacionDireccion(profile.direccion);
                              setFacturacionEmail(profile.email);
                              setFacturacionTelefono(profile.telefono);
                              setShowFacturacionModal(true);
                            }}
                          >
                            🧾 Datos Facturación
                          </button>
                        </div>
                        
                        {/* Lista de solicitudes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          {materialRequests.filter(r => r.casoId === selectedCase.id).length === 0 ? (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                              No hay solicitudes de materiales para este caso.
                            </span>
                          ) : (
                            materialRequests.filter(r => r.casoId === selectedCase.id).map(r => (
                              <div key={r.id} className="material-request-row">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 650, color: 'var(--text-main)' }}>{r.descripcion}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    Por: {r.solicitadoPorNombre || users.find(u => u.id === (r.solicitadoPorId || r.tecnicoId))?.nombre || 'Técnico'} {r.solicitadoPorRol ? `(${r.solicitadoPorRol === 'jefe_tienda' ? 'Jefe de Tienda' : r.solicitadoPorRol === 'subjefe' ? 'Subjefe' : r.solicitadoPorRol})` : ''}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                  <span className={`material-status ${r.estado}`}>
                                    {r.estado}
                                  </span>
                                  
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

                        {/* Catálogo de Materiales para Tiendas, Técnicos y Supervisores */}
                        {((currentUser.rol === 'tecnico') || (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') || (currentUser.rol === 'supervisor' || currentUser.rol === 'administrador')) && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <label className="field-label" style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                                📦 Solicitar Repuesto o Material Adicional:
                              </label>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${materialInputMode === 'catalogo' ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => setMaterialInputMode('catalogo')}
                                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                >
                                  📋 Catálogo
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                                
                                <div style={{ position: 'relative' }}>
                                  <label className="field-label" style={{ fontSize: '0.72rem', marginBottom: '3px', display: 'block', fontWeight: 700 }}>
                                    🔍 Buscar repuesto/material:
                                  </label>
                                  <input 
                                    type="text"
                                    className="input-box"
                                    placeholder="Ej: Foco, aceite, zapata, tubo, tornillo..."
                                    value={materialSearchQuery}
                                    onChange={e => {
                                      setMaterialSearchQuery(e.target.value);
                                      setIsMaterialPickerOpen(true);
                                    }}
                                    onFocus={() => setIsMaterialPickerOpen(true)}
                                    style={{ fontSize: '0.82rem', padding: '8px 10px', minHeight: '36px' }}
                                  />

                                  {isMaterialPickerOpen && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      right: 0,
                                      zIndex: 100,
                                      backgroundColor: 'var(--bg-panel)',
                                      border: '1px solid var(--primary)',
                                      borderRadius: '8px',
                                      boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                      maxHeight: '200px',
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
                                              backgroundColor: selectedCatalogId === m.id ? 'var(--primary-subtle)' : 'transparent'
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
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                                  <div>
                                    <label className="field-label" style={{ fontSize: '0.72rem', marginBottom: '2px', display: 'block' }}>Cant.:</label>
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
                                    <label className="field-label" style={{ fontSize: '0.72rem', marginBottom: '2px', display: 'block' }}>Nota extra:</label>
                                    <input 
                                      type="text"
                                      className="input-box"
                                      placeholder="Detalle o uso..."
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
                                  placeholder="Escriba repuestos o herramientas específicas..."
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
                    </div>
                  )}

                </div>
              
) : activeTab === 'admin' && currentUser.rol === 'administrador' ? (
                <AdminTab
                  adminSectionTab={adminSectionTab}
                  setAdminSectionTab={setAdminSectionTab}
                  showAdminUserForm={showAdminUserForm}
                  setShowAdminUserForm={setShowAdminUserForm}
                  showAdminStoreForm={showAdminStoreForm}
                  setShowAdminStoreForm={setShowAdminStoreForm}
                  adminUserSearch={adminUserSearch}
                  setAdminUserSearch={setAdminUserSearch}
                  adminRoleFilter={adminRoleFilter}
                  setAdminRoleFilter={setAdminRoleFilter}
                  adminSupervisorFilter={adminSupervisorFilter}
                  setAdminSupervisorFilter={setAdminSupervisorFilter}
                  adminStoreSearch={adminStoreSearch}
                  setAdminStoreSearch={setAdminStoreSearch}
                  users={users}
                  stores={stores}
                  editingUserId={editingUserId}
                  admName={admName}
                  setAdmName={setAdmName}
                  admEmail={admEmail}
                  setAdmEmail={setAdmEmail}
                  admUsername={admUsername}
                  setAdmUsername={setAdmUsername}
                  admContrasena={admContrasena}
                  setAdmContrasena={setAdmContrasena}
                  admRole={admRole}
                  setAdmRole={setAdmRole as any}
                  admTiendaNombre={admTiendaNombre}
                  setAdmTiendaNombre={setAdmTiendaNombre}
                  admTiendaCiudad={admTiendaCiudad}
                  setAdmTiendaCiudad={setAdmTiendaCiudad}
                  admIsNewStoreMode={admIsNewStoreMode}
                  setAdmIsNewStoreMode={setAdmIsNewStoreMode}
                  isSubmittingAdminUser={isSubmittingAdminUser}
                  handleAdminUserSubmit={handleAdminUserSubmit}
                  handleStartEditUser={handleStartEditUser}
                  handleCancelEditUser={handleCancelEditUser}
                  handleAdminDeleteUser={handleAdminDeleteUser}
                  handleAdminToggleUser={handleAdminToggleUser}
                  editingStoreId={editingStoreId}
                  newStoreName={newStoreName}
                  setNewStoreName={setNewStoreName}
                  newStoreCity={newStoreCity}
                  setNewStoreCity={setNewStoreCity}
                  newStoreDir={newStoreDir}
                  setNewStoreDir={setNewStoreDir}
                  handleAdminStoreSubmit={handleAdminStoreSubmit}
                  handleStartEditStore={handleStartEditStore}
                  handleCancelEditStore={handleCancelEditStore}
                  handleAdminDeleteStore={handleAdminDeleteStore}
                />
              ) : activeTab === 'tecnicos_actividad' ? (
                <TecnicosActividadTab
                  currentUser={currentUser}
                  techActivityTechFilter={techActivityTechFilter}
                  setTechActivityTechFilter={setTechActivityTechFilter}
                  techActivityStoreFilter={techActivityStoreFilter}
                  setTechActivityStoreFilter={setTechActivityStoreFilter}
                  users={users}
                  stores={stores}
                  cases={cases}
                  setSelectedCaseId={handleSelectCase}
                  setShowNewTechCaseModal={setShowNewTechCaseModal}
                  onAttemptNewCase={handleAttemptNewCase}
                />
              ) : activeTab === 'historial_asistencias' ? (
                <HistorialAsistenciasTab
                  currentUser={currentUser}
                  cases={cases}
                  stores={stores}
                  users={users}
                  setSelectedCaseId={handleSelectCase}
                  loadSheetJS={loadSheetJS}
                />
              ) : activeTab === 'agenda_turnos' ? (
                <AgendaTurnosTab
                  shiftSchedule={shiftSchedule}
                  scheduleMonthFilter={scheduleMonthFilter}
                  setScheduleMonthFilter={setScheduleMonthFilter}
                  scheduleSearchQuery={scheduleSearchQuery}
                  setScheduleSearchQuery={setScheduleSearchQuery}
                  loadSheetJS={loadSheetJS}
                />
              ) : activeTab === 'disponibilidad' ? (
                <DisponibilidadTab
                  disponibilidadTab={disponibilidadTab}
                  setDisponibilidadTab={setDisponibilidadTab}
                  shiftSchedule={shiftSchedule}
                  techAvailability={techAvailability}
                  handleImportTechAvailability={handleImportTechAvailability}
                  loadSheetJS={loadSheetJS}
                />
              ) : (

                /* VIEW C: SIMPLIFIED CASES DASHBOARD (CARDS GRID) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* TIMBRADOR OBLIGATORIO Y CONSOLA EN TIENDA (SOLO TÉCNICOS) */}
                  {currentUser.rol === 'tecnico' && (
                    <TechTimbradorBanner
                      currentUser={currentUser}
                      activePunchClock={effectivePunchClock}
                      stores={Array.isArray(stores) ? stores : []}
                      cases={Array.isArray(cases) ? cases : []}
                      onOpenClockIn={() => setShowTechTimbradorModal(true)}
                      onOpenClockOut={() => setShowTechTimbradorModal(true)}
                      onOpenEditCase={handleOpenEditCase}
                      onOpenCaseDetail={handleSelectCase}
                    />
                  )}

                  {/* Human Welcome & Operational Summary Banner */}
                  <div className="human-welcome-banner">
                    <div className="human-welcome-content">
                      <div className="human-welcome-greeting">
                        ¡Hola, <strong>{currentUser.nombre.split(' ')[0]}</strong>! 👋
                      </div>
                      <div className="human-welcome-status">
                        {casesViewMode === 'pendientes' ? (
                          activeCases.length > 0 ? (
                            <span>Tienes <strong>{activeCases.length} caso{activeCases.length > 1 ? 's' : ''} pendiente{activeCases.length > 1 ? 's' : ''} o en curso</strong> que requieren tu atención hoy.</span>
                          ) : (
                            <span>🎉 <strong>¡Excelente trabajo!</strong> No tienes reportes pendientes en este momento. Todas las tiendas están operando sin novedades.</span>
                          )
                        ) : (
                          <span>Revisando el historial de <strong>{concludedCases.length} caso{concludedCases.length > 1 ? 's' : ''} concluido{concludedCases.length > 1 ? 's' : ''}</strong> y cerrado{concludedCases.length > 1 ? 's' : ''} con éxito.</span>
                        )}
                      </div>
                    </div>

                    <div className="human-welcome-kpis">
                      <div className="kpi-mini" style={{ background: 'rgba(30, 58, 138, 0.08)', borderColor: 'rgba(30, 58, 138, 0.25)' }}>
                        <span className="kpi-mini-num" style={{ color: 'var(--primary)' }}>{activeCases.length}</span>
                        <span className="kpi-mini-lbl">Activos</span>
                      </div>
                      <div className="kpi-mini urgent">
                        <span className="kpi-mini-num">{activeCases.filter(c => isSlaBreached(c)).length}</span>
                        <span className="kpi-mini-lbl">Urgentes SLA</span>
                      </div>
                      <div className="kpi-mini in-progress">
                        <span className="kpi-mini-num">{inProgressCases.length}</span>
                        <span className="kpi-mini-lbl">En Proceso</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Mode Segmented Tab Selector: Pendientes vs Concluidos */}
                  <div className="cases-view-selector">
                    <button
                      type="button"
                      className={`cases-view-tab ${casesViewMode === 'pendientes' ? 'active' : ''}`}
                      onClick={() => {
                        setCasesViewMode('pendientes');
                        if (statusFilter === 'completado') setStatusFilter('todos');
                      }}
                    >
                      <span className="cases-tab-icon">⚡</span>
                      <div className="cases-tab-texts">
                        <span className="cases-tab-title">Casos Pendientes y En Curso</span>
                        <span className="cases-tab-subtitle">Requieren atención operativa inmediata</span>
                      </div>
                      <span className="cases-tab-badge pending">{activeCases.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`cases-view-tab ${casesViewMode === 'concluidos' ? 'active' : ''}`}
                      onClick={() => {
                        setCasesViewMode('concluidos');
                        setStatusFilter('completado');
                      }}
                    >
                      <span className="cases-tab-icon">✅</span>
                      <div className="cases-tab-texts">
                        <span className="cases-tab-title">Historial de Concluidos</span>
                        <span className="cases-tab-subtitle">Mantenimientos finalizados y cerrados</span>
                      </div>
                      <span className="cases-tab-badge completed">{concludedCases.length}</span>
                    </button>
                  </div>

                  {/* Quick Filters for Active Cases */}
                  {casesViewMode === 'pendientes' && (
                    <div className="active-quick-filters">
                      <button
                        type="button"
                        className={`quick-chip ${statusFilter === 'todos' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('todos')}
                      >
                        <span>⚡ Todos los Pendientes</span>
                        <span className="quick-chip-badge">{activeCases.length}</span>
                      </button>

                      <button
                        type="button"
                        className={`quick-chip ${statusFilter === 'pendiente' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('pendiente')}
                      >
                        <span>⏳ Sin Asignar / Nuevos</span>
                        <span className="quick-chip-badge">{pendingUnassigned.length}</span>
                      </button>

                      <button
                        type="button"
                        className={`quick-chip ${statusFilter === 'en_proceso' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('en_proceso')}
                      >
                        <span>🔧 En Atención Técnica</span>
                        <span className="quick-chip-badge">{inProgressCases.length}</span>
                      </button>

                      <button
                        type="button"
                        className={`quick-chip ${statusFilter === 'pausado_material' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('pausado_material')}
                      >
                        <span>📦 Esperando Repuestos</span>
                        <span className="quick-chip-badge">{pausedCases.length}</span>
                      </button>
                    </div>
                  )}

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
                        <SearchableStoreSelect 
                          stores={stores}
                          value={storeFilter}
                          onChange={val => setStoreFilter(val.toString())}
                          currentUser={currentUser}
                          allOptionLabel="Todas las Tiendas"
                          allOptionValue="todos"
                        />
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
                      <div className="human-empty-state">
                        <div className="human-empty-icon">{casesViewMode === 'pendientes' ? '🎉' : '📂'}</div>
                        <div className="human-empty-title">
                          {casesViewMode === 'pendientes' ? '¡Todo al día y sin pendientes!' : 'No hay casos concluidos todavía'}
                        </div>
                        <div className="human-empty-desc">
                          {casesViewMode === 'pendientes'
                            ? 'No se encontraron solicitudes de mantenimiento pendientes en este filtro. Todos los reportes operativos han sido atendidos.'
                            : 'Los casos de mantenimiento finalizados y cerrados se archivarán aquí automáticamente.'}
                        </div>
                      </div>
                    ) : (
                      getFilteredCases().map(c => {
                        const tienda = safeStores.find(s => s && s.id === c.tiendaId);
                        const breached = isSlaBreached(c) && (c.estado === 'pendiente' || c.estado === 'en_proceso');
                        const isMyActiveCase = currentUser?.rol === 'tecnico' && techActiveCase && techActiveCase.id === c.id;
                        const isOtherBlockedCase = currentUser?.rol === 'tecnico' && techActiveCase && techActiveCase.id !== c.id;

                        return (
                          <div 
                            key={c.id} 
                            className={`ticket-card ${c.es_caso_tecnico ? '' : `priority-${c.prioridad}`} ${isMyActiveCase ? 'ticket-card-active-tech' : ''}`} 
                            onClick={() => handleSelectCase(c.id)}
                            style={{
                              border: isMyActiveCase ? '2px solid #10B981' : undefined,
                              boxShadow: isMyActiveCase ? '0 0 16px rgba(16, 185, 129, 0.25)' : undefined,
                              opacity: isOtherBlockedCase ? 0.72 : 1
                            }}
                          >
                            <div className="card-main-info">
                              <div className="card-header">
                                <strong>#{getCaseDisplayCode(c)}</strong>
                                {isMyActiveCase && (
                                  <span style={{ background: '#10B981', color: '#ffffff', fontSize: '0.66rem', fontWeight: 800, padding: '2px 7px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    ⚡ EN ATENCIÓN POR TI
                                  </span>
                                )}
                                <span>•</span>
                                <span>🏬 {tienda?.nombre} ({tienda?.ciudad})</span>
                                <span>•</span>
                                <span>📅 {getHumanDate(c.fechaCreacion)}</span>
                              </div>
                              <div className="card-title">{c.categoria}</div>
                              <div className="card-desc">{c.descripcion}</div>

                              {/* Badges de Técnico Asignado y Horas de Entrada / Salida */}
                              {(c.tecnicoAsignadoId || c.tecnico_presencial_nombre || c.hora_entrada) && (
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                                  {(c.tecnicoAsignadoId || c.tecnico_presencial_nombre) && (
                                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      👷 Técnico: {safeUsers.find(u => u && u.id === c.tecnicoAsignadoId)?.nombre || c.tecnico_presencial_nombre}
                                    </span>
                                  )}
                                  {c.hora_entrada && (
                                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-resolved)', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      ⏱️ Entrada: {new Date(c.hora_entrada).toLocaleTimeString()} {c.hora_salida ? `| Salida: ${new Date(c.hora_salida).toLocaleTimeString()}` : (c.estado === 'concluido' || c.estado === 'cerrado') ? `| Salida: ${new Date(c.fechaCierre || c.fechaCreacion).toLocaleTimeString()}` : '| 🟢 En tienda'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="card-right-info">
                              {!c.es_caso_tecnico && breached && (
                                <span className="badge" style={{ color: 'var(--color-critical)', borderColor: 'var(--color-critical)', background: 'rgba(220,38,38,0.08)', fontWeight: 800 }}>
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

                            <div className="card-action-hint">
                              <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem' }}>
                                {c.estado === 'concluido' || c.estado === 'cerrado' ? '✅ Caso Concluido' : breached ? '⚠️ Requiere atención urgente' : '🟢 En seguimiento activo'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {currentUser?.rol === 'tecnico' && c.estado === 'pendiente' && (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '3px 10px', fontSize: '0.74rem', borderRadius: '5px', fontWeight: 700, marginRight: '4px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (currentUser?.rol === 'tecnico' && techActiveCase) {
                                        const store = safeStores.find(s => s && s.id === techActiveCase.tiendaId);
                                        setBlockedActionMessage({
                                          title: "Atención Exclusiva en Caso Activo",
                                          detail: `Ya te encuentras atendiendo el Caso #${techActiveCase.id} en ${store ? store.nombre : 'tienda'}. Debes finalizar o pausar tu asistencia actual antes de tomar otro caso.`,
                                          caseId: techActiveCase.id
                                        });
                                        return;
                                      }
                                      setSelectedCaseId(c.id);
                                      setTakeCaseMode('solo');
                                      setTakeCaseSupportTech('');
                                      setShowTakeCaseModal(true);
                                    }}
                                    title="Tomar e iniciar atención presencial de este caso"
                                  >
                                    ⚡ Tomar Caso
                                  </button>
                                )}
                                {canEditOrDeleteCase(c) && (
                                  <div style={{ display: 'inline-flex', gap: '5px', marginRight: '4px' }} onClick={e => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '5px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditCase(c);
                                      }}
                                      title="Editar este caso"
                                    >
                                      ✏️ Editar
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: '5px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', borderColor: '#fca5a5' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDeleteCase(c);
                                      }}
                                      title="Eliminar este caso"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                                <span>Ver detalle ➜</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              )}

            
              {/* FOOTER OFICIAL CON IDENTIDAD D&NAX STUDIOS */}
              <footer style={{
                marginTop: '36px',
                padding: '18px 12px 14px 12px',
                textAlign: 'center',
                borderTop: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 120 120" style={{ width: '22px', height: '22px', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                    <polygon points="60,8 105,32 105,88 60,112 15,88 15,32" fill="none" stroke="#6C4CE0" strokeWidth="4.5"/>
                    <circle cx="60" cy="8" r="5" fill="#19C48A"/>
                    <circle cx="105" cy="32" r="5" fill="#19C48A"/>
                    <circle cx="105" cy="88" r="5" fill="#19C48A"/>
                    <circle cx="60" cy="112" r="5" fill="#19C48A"/>
                    <circle cx="15" cy="88" r="5" fill="#19C48A"/>
                    <circle cx="15" cy="32" r="5" fill="#19C48A"/>
                    <text x="60" y="69" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', system-ui, sans-serif" fontSize="28" fontWeight="800" fill="#6C4CE0">D&amp;N</text>
                  </svg>
                  <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                    D&amp;Nax <span style={{ color: '#19C48A' }}>Studios</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Diseñado y Creado por <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>D&amp;Nax Studios</span> &bull; &copy; 2026
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-subtle)', opacity: 0.65 }}>
                  ManteTiendas &bull; Sistema Integral de Gestión de Mantenimientos
                </div>
              </footer>
            </main>
          </div>

          {/* MOBILE BOTTOM NAVIGATION BAR (APK / PWA / CELULAR) */}
          <nav className="mobile-bottom-nav">
            <button 
              type="button"
              className={`mobile-nav-btn ${activeTab === 'dashboard' && !selectedCaseId ? 'active' : ''}`}
              onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('todos'); }}
            >
              <span className="mobile-nav-icon">📋</span>
              <span>Casos</span>
              {userVisibleCases.filter(c => c.estado === 'pendiente' || c.estado === 'en_proceso').length > 0 && (
                <span className="mobile-nav-badge">
                  {userVisibleCases.filter(c => c.estado === 'pendiente' || c.estado === 'en_proceso').length}
                </span>
              )}
            </button>

            <button 
              type="button"
              className={`mobile-nav-btn ${activeTab === 'tecnicos_actividad' ? 'active' : ''}`}
              onClick={() => { setSelectedCaseId(null); setActiveTab('tecnicos_actividad'); }}
            >
              <span className="mobile-nav-icon">⚡</span>
              <span>En Tienda</span>
            </button>

            {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') ? (
              <button 
                type="button"
                className="mobile-nav-btn"
                onClick={() => setShowNewCaseModal(true)}
                style={{ color: 'var(--primary)', fontWeight: 800 }}
              >
                <span className="mobile-nav-icon" style={{ background: 'var(--primary)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>+</span>
                <span>Crear</span>
              </button>
            ) : currentUser.rol === 'tecnico' ? (
              <button 
                type="button"
                className={`mobile-nav-btn ${showTechTimbradorModal ? 'active' : ''}`}
                onClick={() => setShowTechTimbradorModal(true)}
                style={{ color: effectivePunchClock ? '#059669' : '#DC2626', fontWeight: 800 }}
              >
                <span 
                  className="mobile-nav-icon" 
                  style={{ 
                    background: effectivePunchClock ? '#10B981' : '#EF4444', 
                    color: '#fff', 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1rem',
                    boxShadow: effectivePunchClock ? '0 0 10px rgba(16, 185, 129, 0.45)' : 'none'
                  }}
                >
                  ⏱️
                </span>
                <span>{effectivePunchClock ? 'En Turno' : 'Timbrar'}</span>
              </button>
            ) : null}

            <button 
              type="button"
              className={`mobile-nav-btn ${activeTab === 'historial_asistencias' ? 'active' : ''}`}
              onClick={() => { setSelectedCaseId(null); setActiveTab('historial_asistencias'); }}
            >
              <span className="mobile-nav-icon">✅</span>
              <span>Historial</span>
            </button>

            <button 
              type="button"
              className="mobile-nav-btn"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <span className="mobile-nav-icon">☰</span>
              <span>Menú</span>
            </button>
          </nav>
        </div>
      )}

      {/* Floating Active Case Banner for Technicians */}
      {currentUser?.rol === 'tecnico' && techActiveCase && !selectedCaseId && (
        <div className="mobile-active-case-float">
          <div className="mobile-active-case-content" onClick={() => handleSelectCase(techActiveCase.id)}>
            <div className="mobile-active-case-pulse" />
            <div className="mobile-active-case-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="mobile-active-case-label">⚡ CASO EN ATENCIÓN ACTIVA</span>
                <span className="mobile-active-case-badge">#{techActiveCase.id}</span>
              </div>
              <span className="mobile-active-case-name">
                {safeStores.find(s => s && s.id === techActiveCase.tiendaId)?.nombre || 'Tienda'}
              </span>
              <span className="mobile-active-case-hint" title="Debes concluir o poner en pausa este caso para poder cambiar de trabajo o caso">
                ⚠️ Concluye o pausa este caso para poder cambiar de trabajo o caso
              </span>
            </div>
            <button 
              type="button" 
              className="mobile-active-case-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCase(techActiveCase.id);
              }}
              title="Ir a gestionar este caso activo"
            >
              Atender ➔
            </button>
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
      <NewCaseModal
        show={showNewCaseModal}
        currentUser={currentUser}
        stores={stores}
        categories={DEFAULT_CATEGORIES}
        users={users}
        newCaseStoreId={newCaseStoreId}
        setNewCaseStoreId={setNewCaseStoreId}
        newCategoryText={newCategoryText}
        handleCategoryChange={handleCategoryChange}
        newPriority={newPriority}
        setNewPriority={setNewPriority}
        newDesc={newDesc}
        setNewDesc={setNewDesc}
        newCaseDamagePhotos={newCaseDamagePhotos}
        setNewCaseDamagePhotos={setNewCaseDamagePhotos}
        handleNewCasePhotoChange={handleNewCasePhotoChange}
        newIsScheduled={newIsScheduled}
        setNewIsScheduled={setNewIsScheduled}
        newScheduleDate={newScheduleDate}
        setNewScheduleDate={setNewScheduleDate}
        newScheduleShift={newScheduleShift}
        setNewScheduleShift={setNewScheduleShift}
        newScheduleHours={newScheduleHours}
        setNewScheduleHours={setNewScheduleHours}
        newScheduleAssignedTechId={newScheduleAssignedTechId}
        setNewScheduleAssignedTechId={setNewScheduleAssignedTechId}
        newRequestPreMaterial={newRequestPreMaterial}
        setNewRequestPreMaterial={setNewRequestPreMaterial}
        newPreMaterialName={newPreMaterialName}
        setNewPreMaterialName={setNewPreMaterialName}
        newPreMaterialQty={newPreMaterialQty}
        setNewPreMaterialQty={setNewPreMaterialQty}
        newPreMaterialItems={newPreMaterialItems}
        onAddPreMaterialItem={handleAddPreMaterialItem}
        onRemovePreMaterialItem={handleRemovePreMaterialItem}
        onUpdatePreMaterialItem={handleUpdatePreMaterialItem}
        onClose={() => setShowNewCaseModal(false)}
        onSubmit={handleCreateCase}
      />

      <SolveModal
        show={showSolveModal}
        selectedCase={selectedCase}
        currentUser={currentUser}
        solutionDesc={solutionDesc}
        setSolutionDesc={setSolutionDesc}
        solveEvidenceFiles={solveEvidenceFiles}
        handleSolveEvidenceChange={handleSolveEvidenceChange}
        setSolveEvidenceFiles={setSolveEvidenceFiles}
        onClose={() => setShowSolveModal(false)}
        onConfirm={(e, customFiles, gpsLoc) => selectedCase && handleConcludeCase(e as any, selectedCase.id, customFiles, gpsLoc)}
      />

      <FacturacionModal
        show={showFacturacionModal}
        facturacionCasoId={facturacionCasoId}
        currentUser={currentUser}
        billingProfiles={billingProfiles}
        setBillingProfiles={setBillingProfiles}
        facturacionProfileMode={facturacionProfileMode}
        setFacturacionProfileMode={setFacturacionProfileMode}
        facturacionRuc={facturacionRuc}
        setFacturacionRuc={setFacturacionRuc}
        facturacionRazonSocial={facturacionRazonSocial}
        setFacturacionRazonSocial={setFacturacionRazonSocial}
        facturacionDireccion={facturacionDireccion}
        setFacturacionDireccion={setFacturacionDireccion}
        facturacionTelefono={facturacionTelefono}
        setFacturacionTelefono={setFacturacionTelefono}
        facturacionEmail={facturacionEmail}
        setFacturacionEmail={setFacturacionEmail}
        facturacionMonto={facturacionMonto}
        setFacturacionMonto={setFacturacionMonto}
        facturacionConcepto={facturacionConcepto}
        setFacturacionConcepto={setFacturacionConcepto}
        onClose={() => setShowFacturacionModal(false)}
        onSubmit={handleSendFacturacion}
      />

      <ScheduleModal
        show={showScheduleModal}
        scheduleCaseId={scheduleCaseId}
        users={users}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        scheduleShift={scheduleShift}
        setScheduleShift={setScheduleShift}
        scheduleHours={scheduleHours}
        setScheduleHours={setScheduleHours}
        scheduleAssignedTechId={scheduleAssignedTechId}
        setScheduleAssignedTechId={setScheduleAssignedTechId}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={handleSaveSchedule}
      />

      <ChangePasswordModal
        show={showChangePasswordModal}
        currentUser={currentUser}
        isFirstLoginChange={isFirstLoginChange}
        currentPassInput={currentPassInput}
        setCurrentPassInput={setCurrentPassInput}
        newPassInput={newPassInput}
        setNewPassInput={setNewPassInput}
        confirmPassInput={confirmPassInput}
        setConfirmPassInput={setConfirmPassInput}
        showCurrentPass={showCurrentPass}
        setShowCurrentPass={setShowCurrentPass}
        showNewPass={showNewPass}
        setShowNewPass={setShowNewPass}
        showConfirmPass={showConfirmPass}
        setShowConfirmPass={setShowConfirmPass}
        changePassError={changePassError}
        changePassSuccess={changePassSuccess}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePasswordSubmit}
      />

      <PauseMaterialModal
        show={showPauseMaterialModal}
        selectedCase={selectedCase}
        currentUser={currentUser}
        pauseReasonInput={pauseReasonInput}
        setPauseReasonInput={setPauseReasonInput}
        onClose={() => setShowPauseMaterialModal(false)}
        onConfirm={handlePauseCaseForMaterial}
      />

      <TakeCaseModal
        show={showTakeCaseModal}
        selectedCase={selectedCase}
        currentUser={currentUser}
        takeCaseMode={takeCaseMode}
        setTakeCaseMode={setTakeCaseMode}
        takeCaseSupportTech={takeCaseSupportTech}
        setTakeCaseSupportTech={setTakeCaseSupportTech}
        stores={stores}
        onClose={() => setShowTakeCaseModal(false)}
        onConfirm={handleConfirmTakeCase}
      />


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


      

      <ErrorBoundary fallbackTitle="Inconveniente en Timbrador" onReset={() => setShowTechTimbradorModal(false)}>
        <TechTimbradorModal
          show={showTechTimbradorModal}
          onClose={() => setShowTechTimbradorModal(false)}
          currentUser={currentUser}
          stores={Array.isArray(stores) ? stores : []}
          categories={DEFAULT_CATEGORIES || []}
          cases={Array.isArray(cases) ? cases : []}
          activePunchClock={effectivePunchClock}
          onClockIn={handleTechClockIn}
          onClockOut={handleTechClockOut}
          onOpenEditCase={handleOpenEditCase}
          onOpenCaseDetail={handleSelectCase}
          compressImage={compressImage}
        />
      </ErrorBoundary>

      <NewTechCaseModal
        show={showNewTechCaseModal}
        currentUser={currentUser}
        stores={stores}
        categories={DEFAULT_CATEGORIES}
        techCaseStoreId={techCaseStoreId}
        setTechCaseStoreId={setTechCaseStoreId}
        techCaseCategory={techCaseCategory}
        setTechCaseCategory={setTechCaseCategory}
        techCaseDesc={techCaseDesc}
        setTechCaseDesc={setTechCaseDesc}
        techCaseGpsPhoto={techCaseGpsPhoto}
        setTechCaseGpsPhoto={setTechCaseGpsPhoto}
        techCaseGpsLocation={techCaseGpsLocation}
        setTechCaseGpsLocation={setTechCaseGpsLocation}
        onClose={() => setShowNewTechCaseModal(false)}
        onSubmit={handleCreateTechCase}
      />

      <EditCaseModal
        show={showEditCaseModal}
        caseData={editingCase}
        stores={stores}
        categories={DEFAULT_CATEGORIES}
        currentUser={currentUser}
        onClose={() => {
          setShowEditCaseModal(false);
          setEditingCase(null);
        }}
        onSave={handleSaveEditCase}
      />

      <DeleteCaseModal
        show={showDeleteCaseModal}
        caseData={deletingCase}
        stores={stores}
        onClose={() => {
          setShowDeleteCaseModal(false);
          setDeletingCase(null);
        }}
        onConfirm={handleConfirmDeleteCase}
      />

      {/* Modal: Aviso de Exclusividad Operativa para Técnicos */}
      {blockedActionMessage && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} 
          onClick={() => setBlockedActionMessage(null)}
        >
          <div 
            className="modal-sheet" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '440px', 
              width: '100%', 
              padding: '24px', 
              textAlign: 'center', 
              borderRadius: '20px',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 16px auto',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)'
            }}>
              🔒
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
              {blockedActionMessage.title}
            </h3>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.55', marginBottom: '22px' }}>
              {blockedActionMessage.detail}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(blockedActionMessage.caseId || techActiveCase) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    const targetId = blockedActionMessage.caseId || techActiveCase?.id;
                    setBlockedActionMessage(null);
                    if (targetId) handleSelectCase(targetId);
                  }}
                >
                  <span>⚡</span> Ir a Mi Caso para Concluir o Pausar (#{blockedActionMessage.caseId || techActiveCase?.id})
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px 16px', fontSize: '0.9rem' }}
                onClick={() => setBlockedActionMessage(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA TOMAR / ADJUNTAR EVIDENCIA FOTOGRÁFICA CON GPS DIRECTA (EXCLUSIVO TÉCNICOS) */}
      {showAddEvidenceModal && selectedCase && currentUser?.rol === 'tecnico' && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => {
            if (!isUploadingEvidence) setShowAddEvidenceModal(false);
          }}
        >
          <div 
            className="modal-sheet" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '520px', width: '100%', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  📷 Adjuntar Evidencia Fotográfica
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Caso #{getCaseDisplayCode(selectedCase)} • {stores.find(s => s.id === selectedCase.tiendaId)?.nombre}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddEvidenceModal(false)}
                disabled={isUploadingEvidence}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <GpsCameraCapture
              photoUrl={addEvidencePhoto}
              onPhotoCaptured={(watermarked: string, loc: GpsLocation | null) => {
                setAddEvidencePhoto(watermarked);
                setAddEvidenceGpsLoc(loc);
              }}
              onPhotoRemoved={() => {
                setAddEvidencePhoto(null);
                setAddEvidenceGpsLoc(null);
              }}
              techName={currentUser?.nombre || 'Técnico'}
              storeName={stores.find(s => s.id === selectedCase.tiendaId)?.nombre || 'En Tienda'}
              actionTitle="Registro de Evidencia en Campo"
              required={true}
              label="Fotografía del trabajo con GPS"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isUploadingEvidence}
                onClick={() => setShowAddEvidenceModal(false)}
                style={{ fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!addEvidencePhoto || isUploadingEvidence}
                onClick={() => handleAddEvidenceDirect(selectedCase.id)}
                style={{ fontSize: '0.85rem', fontWeight: 800 }}
              >
                {isUploadingEvidence ? '⏳ Guardando en la nube...' : '💾 Guardar y Sincronizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX DE EVIDENCIA CON GPS Y MAPA */}
      {selectedEvidenceModal && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setSelectedEvidenceModal(null)}
        >
          <div 
            className="modal-sheet" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '680px', 
              width: '100%', 
              padding: '20px', 
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>📸</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Evidencia Fotográfica
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Subido por: <strong>{selectedEvidenceModal.subidoPor}</strong> • {new Date(selectedEvidenceModal.fecha).toLocaleString()}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedEvidenceModal(null)} 
                className="btn btn-secondary btn-sm" 
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Imagen Grande */}
            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '55vh' }}>
              <img 
                src={selectedEvidenceModal.archivoUrl} 
                alt="Evidencia ampliada" 
                style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block' }} 
              />
            </div>

            {/* Panel de Metadatos GPS */}
            {selectedEvidenceModal.coordenadas ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: '#059669' }}>
                    <span>📍</span>
                    <span>Ubicación GPS Verificada por Satélite</span>
                  </div>
                  {selectedEvidenceModal.coordenadas.accuracy && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Precisión: ±{Math.round(selectedEvidenceModal.coordenadas.accuracy)} metros
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>Latitud: <strong>{selectedEvidenceModal.coordenadas.latitude.toFixed(6)}</strong></span>
                  <span>Longitud: <strong>{selectedEvidenceModal.coordenadas.longitude.toFixed(6)}</strong></span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps?q=${selectedEvidenceModal.coordenadas.latitude},${selectedEvidenceModal.coordenadas.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ background: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8rem' }}
                  >
                    🗺️ Abrir Coordenadas en Google Maps ↗
                  </a>
                  <a
                    href={selectedEvidenceModal.archivoUrl}
                    download={selectedEvidenceModal.nombreArchivo || `evidencia_${selectedEvidenceModal.id}.jpg`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                  >
                    💾 Descargar Foto
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Foto adjunta sin geolocalización satelital directa.</span>
                <a
                  href={selectedEvidenceModal.archivoUrl}
                  download={selectedEvidenceModal.nombreArchivo || `evidencia_${selectedEvidenceModal.id}.jpg`}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  💾 Descargar
                </a>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedEvidenceModal(null)}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
