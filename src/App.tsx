import { App as CapApp } from '@capacitor/app';
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { 
  ShiftEntry, MaterialCatalogItem, Store, User, Evidence, Case, 
  AppNotification, MaterialRequest, TechAvailability, JornadaAsistencia 
} from './types';

import { 
  DEFAULT_SHIFT_SCHEDULE, SUPERVISOR_BILLING_PROFILES, DEFAULT_TECH_AVAILABILITY, 
  DEFAULT_MATERIAL_CATALOG, DEFAULT_CATEGORIES, DEFAULT_STORES, DEFAULT_USERS 
} from './data';

import { 
  triggerNativeNotification, getUserBadgeText 
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

export default function App() {

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

  // Theme State (Predeterminado: Tema Claro Corporativo)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : false; // Default: Light Mode
  });

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'tecnicos_actividad' | 'historial_asistencias' | 'agenda_turnos' | 'disponibilidad'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [caseDetailTab, setCaseDetailTab] = useState<'info' | 'asistencia' | 'bitacora' | 'evidencias' | 'materiales'>('info');
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
  const [billingProfiles, setBillingProfiles] = useState<Record<string, SupervisorBillingData>>(() => {
    try {
      const saved = localStorage.getItem('maint_billing_profiles');
      if (saved) return { ...DEFAULT_BILLING_PROFILES, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_BILLING_PROFILES;
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
                fecha_programada: dbC.fecha_programada || undefined,
                turno_programado: dbC.turno_programado || undefined,
                horas_estimadas: dbC.horas_estimadas || undefined,
                agendado_por: dbC.agendado_por || undefined,
                solicitud_material_anticipada: dbC.solicitud_material_anticipada || false,
                material_anticipado_nombre: dbC.material_anticipado_nombre || undefined,
                material_anticipado_cantidad: dbC.material_anticipado_cantidad || 1,
                material_anticipado_estado: dbC.material_anticipado_estado || undefined,
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
          if (showNewCaseModal) {
            setShowNewCaseModal(false);
          } else if (showNewTechCaseModal) {
            setShowNewTechCaseModal(false);
          } else if (showSolveModal) {
            setShowSolveModal(false);
          } else if (showScheduleModal) {
            setShowScheduleModal(false);
          } else if (showNotifModal) {
            setShowNotifModal(false);
          } else if (selectedCaseId) {
            setSelectedCaseId(null);
          } else {
            CapApp.minimizeApp();
          }
        });

        appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive && isSupabaseConfigured) {
            supabase.from('casos').select('*').then(({ data }: any) => {
              if (data) setCases(data.map((c: any) => ({ ...c, tiendaId: c.tienda_id })));
            });
          }
        });
      }
    } catch (e) {}

    return () => {
      if (backListener && typeof backListener.then === 'function') {
        backListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (backListener && typeof backListener.remove === 'function') {
        try { backListener.remove(); } catch (e) {}
      }

      if (appStateListener && typeof appStateListener.then === 'function') {
        appStateListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (appStateListener && typeof appStateListener.remove === 'function') {
        try { appStateListener.remove(); } catch (e) {}
      }
    };
  }, [showNewCaseModal, showNewTechCaseModal, showSolveModal, showScheduleModal, showNotifModal, selectedCaseId, isSupabaseConfigured]);

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
                  // Nuevos campos
                  tecnico_presencial_nombre: modCaso.tecnico_presencial_nombre || undefined,
                  hora_entrada: modCaso.hora_entrada || undefined,
                  hora_salida: modCaso.hora_salida || undefined,
                  es_caso_tecnico: modCaso.es_caso_tecnico || false,
                  tecnico_estatus_trabajo: modCaso.tecnico_estatus_trabajo || undefined,
                  reaperturas_count: modCaso.reaperturas_count || 0,
                  fecha_programada: modCaso.fecha_programada || undefined,
                  turno_programado: modCaso.turno_programado || undefined,
                  horas_estimadas: modCaso.horas_estimadas || undefined,
                  agendado_por: modCaso.agendado_por || undefined,
                  solicitud_material_anticipada: modCaso.solicitud_material_anticipada || false,
                  material_anticipado_nombre: modCaso.material_anticipado_nombre || undefined,
                  material_anticipado_cantidad: modCaso.material_anticipado_cantidad || 1,
                  material_anticipado_estado: modCaso.material_anticipado_estado || undefined
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
    const casesInSameMonthAndStore = cases
      .filter(other => {
        if (!other.fechaCreacion || other.tiendaId !== c.tiendaId) return false;
        const oDate = new Date(other.fechaCreacion);
        return oDate.getMonth() === dateObj.getMonth() && oDate.getFullYear() === dateObj.getFullYear();
      })
      .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());
      
    const seqNumber = casesInSameMonthAndStore.findIndex(other => other.id === c.id) + 1;
    return `${month}${year}-${seqNumber || 1}`;
  };

  const isSlaBreached = (c: Case): boolean => {
    if (c.estado === 'concluido' || c.estado === 'cerrado') {
      return c.fechaCierre ? new Date(c.fechaCierre) > new Date(c.fechaLimiteSla) : false;
    }
    return new Date() > new Date(c.fechaLimiteSla);
  };

  const userVisibleCases = cases.filter(c => isCaseVisibleToUser(c, currentUser));

  const getFilteredCases = (): Case[] => {
    let list = cases.filter(c => isCaseVisibleToUser(c, currentUser));

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
        getCaseDisplayCode(c).toLowerCase().includes(q) ||
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
    const targetTech = users.find(u => u.nombre.toLowerCase().trim() === name.toLowerCase().trim() && u.rol === 'tecnico');

    setCases(cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'en_proceso' as const,
          tecnicoAsignadoId: targetTech?.id || c.tecnicoAsignadoId,
          tecnico_presencial_nombre: name,
          hora_entrada: now,
          comentarios: [
            ...c.comentarios,
            { id: Date.now(), autor: currentUser!.nombre, rol: currentUser!.rol, texto: `⏱️ INGRESO A TIENDA: ${currentUser!.nombre} (${currentUser!.rol === 'jefe_tienda' ? 'Jefe de Tienda' : currentUser!.rol}) registró el ingreso presencial del técnico ${name} a las ${new Date(now).toLocaleTimeString()} e inició el caso.`, fecha: now }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoAnterior: c.estado, estadoNuevo: 'en_proceso', usuario: currentUser!.nombre, fecha: now }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        tecnico_asignado_id: targetTech?.id || undefined,
        tecnico_presencial_nombre: name,
        hora_entrada: now
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

    if (!currentUser || (currentUser.rol !== 'jefe_tienda' && currentUser.rol !== 'subjefe')) {
      alert('Únicamente los usuarios del local/tienda tienen autorización para reabrir casos.');
      return;
    }

    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    if (targetCase.tiendaId !== currentUser.tiendaId) {
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
              <div className="sidebar-section-header">📊 Estado de Casos</div>
              <ul className="sidebar-menu">
                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('todos'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>📄 Todos los Casos</span>
                    <span className="sidebar-count-pill">{userVisibleCases.length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'pendiente' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('pendiente'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏳ Pendientes</span>
                    <span className="sidebar-count-pill">{userVisibleCases.filter(c => c.estado === 'pendiente').length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'en_proceso' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('en_proceso'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⚡ En Proceso</span>
                    <span className="sidebar-count-pill">{userVisibleCases.filter(c => c.estado === 'en_proceso' && !c.pausado_por_material).length}</span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'pausado_material' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('pausado_material' as any); setIsMobileSidebarOpen(false); }}
                  >
                    <span>⏸️ Casos Pausados</span>
                    <span className="sidebar-count-pill" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#D97706' }}>
                      {userVisibleCases.filter(c => Boolean(c.pausado_por_material) && c.estado !== 'concluido' && c.estado !== 'cerrado').length}
                    </span>
                  </div>
                </li>

                <li>
                  <div
                    className={`sidebar-subitem ${activeTab === 'dashboard' && !selectedCaseId && statusFilter === 'completado' ? 'active' : ''}`}
                    onClick={() => { setSelectedCaseId(null); setActiveTab('dashboard'); setStatusFilter('completado'); setIsMobileSidebarOpen(false); }}
                  >
                    <span>✅ Completados</span>
                    <span className="sidebar-count-pill">{userVisibleCases.filter(c => c.estado === 'concluido' || c.estado === 'cerrado').length}</span>
                  </div>
                </li>
              </ul>

              {/* Navigation Group 2: Módulos */}
              <div className="sidebar-section-header" style={{ marginTop: '14px' }}>⚙️ Módulos</div>
              <ul className="sidebar-menu">
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

                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleLogout}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}
                >
                  🚪 Cerrar Sesión
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '8px', padding: '4px 0', borderTop: '1px solid var(--border-color)', lineHeight: 1.3 }}>
                  <strong>"Daniel Luna"</strong><br />Software, Web &amp; App Designer | &copy; 2026
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
                      <span className="badge" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.74rem' }}>
                        CASO #{getCaseDisplayCode(selectedCase)}
                      </span>

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

                    {selectedCase.estado === 'en_proceso' && (
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
                            }} style={{ width: '100%', fontWeight: 700 }}>
                              🔧 Iniciar Trabajo (Tomar caso)
                            </button>
                          )}

                          {/* Agendar Turno de Atención */}
                          {selectedCase.estado !== 'concluido' && selectedCase.estado !== 'cerrado' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenScheduleModal(selectedCase)}
                              style={{ width: '100%', fontWeight: 700, borderColor: '#3B82F6', color: '#3B82F6' }}
                            >
                              {selectedCase.fecha_programada ? '✏️ Re-agendar Turno / Cita' : '📅 Agendar Turno de Atención'}
                            </button>
                          )}

                          {/* Completar Trabajo para Técnico */}
                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'en_proceso' && selectedCase.tecnicoAsignadoId === currentUser.id && (
                            <button className="btn btn-primary" onClick={() => setShowSolveModal(true)} style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800 }}>
                              ✅ Completar y Cerrar Mantenimiento
                            </button>
                          )}

                          {/* Validar y Cerrar por Tienda / Admin */}
                          {((currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId) && selectedCase.estado === 'concluido' && (
                            <>
                              <button className="btn btn-primary" onClick={() => handleCloseCase(selectedCase.id)} style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800 }}>
                                🔒 Validar Solución y Cerrar Caso
                              </button>
                              
                              {/* Reabrir caso concluido: Exclusivo para usuarios de la tienda del caso */}
                              {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId && (
                                !showReopenInput ? (
                                  <button className="btn btn-danger" onClick={() => setShowReopenInput(true)} style={{ width: '100%', fontWeight: 700 }}>
                                    🔄 Reabrir Caso (No quedó bien)
                                  </button>
                                ) : (
                                  <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', marginTop: '8px', background: 'var(--bg-surface)' }}>
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
                                )
                              )}
                            </>
                          )}

                          {/* Reabrir caso cerrado: Exclusivo para usuarios de la tienda del caso */}
                          {selectedCase.estado === 'cerrado' && (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId && (
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
                                    <button className="btn btn-danger btn-sm" onClick={() => handleReopenCase(selectedCase.id)}>Confirmar Reapertura</button>
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
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⏱️ Control de Asistencia y Jornadas en Tienda
                        </h4>

                        {(() => {
                          const isStoreUserForThisCase = (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && currentUser.tiendaId === selectedCase.tiendaId;
                          const isTechUser = currentUser.rol === 'tecnico';
                          const canManageAttendance = isStoreUserForThisCase || isTechUser;

                          // CASO A: PENDIENTE DE PRIMER INGRESO
                          if ((!selectedCase.hora_entrada || selectedCase.estado === 'pendiente') && !selectedCase.pausado_por_material) {
                            if (!canManageAttendance) {
                              return (
                                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                                  ℹ️ <em>El registro de ingreso físico y confirmación de llegada del técnico corresponde al personal de la tienda.</em>
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

                          // CASO B: EN PAUSA POR MATERIALES
                          if (selectedCase.pausado_por_material) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '12px', borderRadius: '8px' }}>
                                  <div style={{ fontSize: '0.84rem', color: '#a16207', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ⏸️ CASO EN PAUSA (Salida de técnico registrada)
                                  </div>
                                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                                    <strong>Motivo de la pausa:</strong> "{selectedCase.motivo_pausa_material || 'Falta de materiales o presupuesto'}"
                                  </p>
                                  {selectedCase.hora_salida && (
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                      ⏱️ Salida de visita anterior: {new Date(selectedCase.hora_salida).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>

                                {canManageAttendance && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => handleLogTechEntry(selectedCase.id, selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico')}
                                      style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px', fontSize: '0.85rem' }}
                                    >
                                      🟢 Registrar Segundo Ingreso del Técnico y Reanudar Labores
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

                          // CASO C: TÉCNICO LABORANDO ACTIVAMENTE
                          if (!selectedCase.hora_salida) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                  <div style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🟢 TÉCNICO EN TIENDA LABORANDO (Visita #{getCaseJornadas(selectedCase).length})
                                  </div>
                                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '4px' }}>
                                    👷 <strong>{selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    ⏱️ Hora de ingreso: <strong style={{ color: 'var(--primary)' }}>{new Date(selectedCase.hora_entrada!).toLocaleTimeString()}</strong>
                                  </div>
                                </div>

                                {canManageAttendance && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button 
                                      type="button"
                                      className="btn btn-danger" 
                                      onClick={() => handleLogTechExit(selectedCase.id)}
                                      style={{ flex: 1, minWidth: '140px', padding: '10px', fontWeight: 800, fontSize: '0.82rem' }}
                                    >
                                      🔴 Marcar Salida del Técnico
                                    </button>

                                    <button 
                                      type="button"
                                      className="btn btn-warning" 
                                      onClick={() => {
                                        setPauseReasonInput('');
                                        setShowPauseMaterialModal(true);
                                      }}
                                      style={{ flex: 1, minWidth: '140px', padding: '10px', fontWeight: 800, fontSize: '0.82rem', background: '#d97706', color: '#ffffff' }}
                                    >
                                      ⏸️ Pausar y Marcar Salida
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // CASO D: TÉCNICO RETIRADO TEMPORALMENTE
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-muted)' }}>⏱️ Técnico fuera de tienda (Salida registrada):</div>
                                <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                                  Salida de visita #{getCaseJornadas(selectedCase).length}: <strong>{new Date(selectedCase.hora_salida).toLocaleTimeString()}</strong>
                                </div>
                              </div>

                              {canManageAttendance && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => handleLogTechEntry(selectedCase.id, selectedCase.tecnico_presencial_nombre || users.find(u => u.id === selectedCase.tecnicoAsignadoId)?.nombre || 'Técnico')}
                                  style={{ width: '100%', background: 'var(--color-resolved)', fontWeight: 800, padding: '10px', fontSize: '0.85rem' }}
                                >
                                  🟢 Registrar Nuevo Ingreso del Técnico a Tienda
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
                                <div key={j.id || idx} style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                                    <span style={{ color: 'var(--primary)' }}>Visita #{j.numeroVisita || idx + 1}: {j.tecnicoNombre}</span>
                                    <span style={{ fontSize: '0.7rem', color: j.horaSalida ? 'var(--text-muted)' : 'var(--color-resolved)' }}>
                                      {j.horaSalida ? 'Finalizada' : '🟢 En curso'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                    <span>🟢 Entrada: <strong>{new Date(j.horaEntrada).toLocaleTimeString()}</strong></span>
                                    {j.horaSalida && (
                                      <span>🔴 Salida: <strong>{new Date(j.horaSalida).toLocaleTimeString()}</strong></span>
                                    )}
                                  </div>
                                  {j.motivoPausa && (
                                    <div style={{ marginTop: '3px', color: '#a16207', fontSize: '0.74rem' }}>
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
                            selectedCase.comentarios.map(c => (
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
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px' }}>
                          📸 Fotos de Evidencia ({(selectedCase.evidencias?.length || 0)})
                        </div>

                        {(selectedCase.evidencias?.length || 0) === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No hay fotos de evidencia adjuntadas a este caso.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {selectedCase.evidencias.map(ev => (
                              <div key={ev.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                                <img src={ev.archivoUrl} alt="evidencia" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                                <div style={{ fontSize: '0.72rem', padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                  {selectedCase.es_caso_tecnico ? `Subido por ${ev.subidoPor}` : 
                                   ev.tipo === 'final' ? `✅ Solución por ${ev.subidoPor}` : `📷 Inicial por ${ev.subidoPor}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: MATERIALES */}
                  {caseDetailTab === 'materiales' && selectedCase.estado === 'en_proceso' && (
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
                                    Por: {users.find(u => u.id === r.tecnicoId)?.nombre || 'Técnico'}
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

                        {/* Catálogo de Materiales para Técnico */}
                        {currentUser.rol === 'tecnico' && selectedCase.tecnicoAsignadoId === currentUser.id && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <label className="field-label" style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                                📦 Nueva Petición de Repuesto:
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
                  setAdmRole={setAdmRole}
                  admTiendaNombre={admTiendaNombre}
                  setAdmTiendaNombre={setAdmTiendaNombre}
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
                  techActivityTechFilter={techActivityTechFilter}
                  setTechActivityTechFilter={setTechActivityTechFilter}
                  techActivityStoreFilter={techActivityStoreFilter}
                  setTechActivityStoreFilter={setTechActivityStoreFilter}
                  users={users}
                  stores={stores}
                  cases={cases}
                  setSelectedCaseId={setSelectedCaseId}
                />
              ) : activeTab === 'historial_asistencias' ? (
                <HistorialAsistenciasTab
                  cases={cases}
                  stores={stores}
                  users={users}
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
                  techAvailability={techAvailability}
                  handleImportTechAvailability={handleImportTechAvailability}
                  loadSheetJS={loadSheetJS}
                />
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

            
                          {/* FOOTER DISCRETO AL FINAL DEL SCROLL */}
              <footer style={{
                marginTop: '36px',
                padding: '18px 10px 10px 10px',
                textAlign: 'center',
                borderTop: '1px solid var(--border-color)',
                color: 'var(--text-subtle)',
                fontSize: '0.74rem',
                fontWeight: 500,
                letterSpacing: '0.02em',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px'
              }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                  <strong>"Daniel Luna"</strong> Software, Web &amp; App Designer | &copy; 2026
                </div>
                <div style={{ fontSize: '0.68rem', opacity: 0.7 }}>
                  ManteTiendas &bull; Sistema de Gestión de Mantenimientos
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
                className="mobile-nav-btn"
                onClick={() => setShowNewTechCaseModal(true)}
                style={{ color: 'var(--primary)', fontWeight: 800 }}
              >
                <span className="mobile-nav-icon" style={{ background: 'var(--primary)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>+</span>
                <span>Reportar</span>
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
        onClose={() => setShowNewCaseModal(false)}
        onSubmit={handleCreateCase}
      />

      <SolveModal
        show={showSolveModal}
        selectedCase={selectedCase}
        solveEvidenceFiles={solveEvidenceFiles}
        handleSolveEvidenceChange={handleSolveEvidenceChange}
        setSolveEvidenceFiles={setSolveEvidenceFiles}
        onClose={() => setShowSolveModal(false)}
        onConfirm={(e) => selectedCase && handleConcludeCase(e as any, selectedCase.id)}
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
        onClose={() => setShowNewTechCaseModal(false)}
        onSubmit={handleCreateTechCase}
      />
    </div>
  );
}
