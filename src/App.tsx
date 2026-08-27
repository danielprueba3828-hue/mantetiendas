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
      } catch (e) {}\n    }\n  }, [currentUser]);

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
    } catch (e) {}\n  }, []);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [readNotifIds, setReadNotifIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('maint_read_notif_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try { localStorage.setItem('maint_read_notif_ids', JSON.stringify(readNotifIds)); } catch (e) {}\n  }, [readNotifIds]);

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
    } catch (e) {}\n    return DEFAULT_BILLING_PROFILES;
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
    } catch (e) {}\n  }, [readNotifIds]);

  useEffect(() => {
    try {
      if (currentUser && typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {}\n  }, [currentUser]);


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
    } catch (e) {}\n
    return () => {
      if (backListener && typeof backListener.then === 'function') {
        backListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (backListener && typeof backListener.remove === 'function') {
        try { backListener.remove(); } catch (e) {}\n      }

      if (appStateListener && typeof appStateListener.then === 'function') {
        appStateListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (appStateListener && typeof appStateListener.remove === 'function') {
        try { appStateListener.remove(); } catch (e) {}\n      }
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
                  } as any);\n                }).catch(() => {
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
    try { localStorage.setItem('maint_stores', JSON.stringify(stores)); } catch (e) {}\n  }, [stores]);

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
        const { data: dbDisp, error: errDisp } = await supabase
          .from('disponibilidad_tecnicos')
          .select('*');
        if (!errDisp && dbDisp && dbDisp.length > 0) {
          setTechAvailability(dbDisp.map((d: any) => ({
            id: d.id,
            tecnicoNombre: d.tecnico_nombre,
            usuarioId: d.usuario_id || undefined,
            diasLibres: d.dias_libres || undefined,
            estatus: d.estatus
          })));
        }
      } catch (err) {
        console.error('Error cargando datos de Supabase:', err);
      }
    }

    loadData();
  }, [isSupabaseConfigured]);

  const categories = DEFAULT_CATEGORIES;

  const getSlaHours = (prioridad: number) => {
    switch (prioridad) {
      case 1: return 4;
      case 2: return 12;
      case 3: return 24;
      case 4: return 48;
      default: return 24;
    }
  };

  const isSlaBreached = (c: Case) => {
    if (c.estado === 'concluido' || c.estado === 'cerrado') return false;
    return new Date() > new Date(c.fechaLimiteSla);
  };

  const getRemainingSlaHours = (c: Case) => {
    const diffMs = new Date(c.fechaLimiteSla).getTime() - new Date().getTime();
    return Math.max(0, Math.round(diffMs / 3600000));
  };

  const getFilteredCases = () => {
    if (!currentUser) return [];

    let list = [...cases];

    if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
      list = list.filter(c => c.tiendaId === currentUser.tiendaId);
    } else if (currentUser.rol === 'supervisor') {
      list = list.filter(c => {
        if (currentUser.supervisorTiendas && currentUser.supervisorTiendas.length > 0) {
          return currentUser.supervisorTiendas.includes(c.tiendaId);
        }
        const storeObj = stores.find(s => s.id === c.tiendaId);
        return storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === currentUser.nombre.toLowerCase().trim();
      });
    }

    if (statusFilter !== 'todos') {
      if (statusFilter === 'completado') {
        list = list.filter(c => c.estado === 'concluido' || c.estado === 'cerrado');
      } else if (statusFilter === 'pausado_material') {
        list = list.filter(c => c.pausado_por_material);
      } else {
        list = list.filter(c => c.estado === statusFilter && !c.pausado_por_material);
      }
    }

    if (storeFilter !== 'todos') {
      list = list.filter(c => c.tiendaId === Number(storeFilter));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.descripcion.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.id.toString().includes(q) ||
        (stores.find(s => s.id === c.tiendaId)?.nombre.toLowerCase().includes(q))
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
        tecnicoAsignadoId: newScheduleAssignedTechId ? Number(newScheduleAssignedTechId) : undefined
      } : {}),
      ...(newRequestPreMaterial ? {
        solicitud_material_anticipada: true,
        material_anticipado_nombre: newPreMaterialName.trim(),
        material_anticipado_cantidad: newPreMaterialQty,
        material_anticipado_estado: 'pendiente_aprobacion'
      } : {})
    };

    setCases(prev => [newCase, ...prev]);

    // Guardar en Supabase
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
          tecnico_asignado_id: newScheduleAssignedTechId ? Number(newScheduleAssignedTechId) : null
        } : {}),
        ...(newRequestPreMaterial ? {
          solicitud_material_anticipada: true,
          material_anticipado_nombre: newPreMaterialName.trim(),
          material_anticipado_cantidad: newPreMaterialQty,
          material_anticipado_estado: 'pendiente_aprobacion'
        } : {})
      }]).then(({ error }: any) => {
        if (error) console.error("Error al guardar caso en Supabase:", error);
      });

      // Guardar evidencias iniciales en Supabase
      if (initialEvidences.length > 0) {
        const evToInsert = initialEvidences.map(ev => ({
          caso_id: newId,
          subido_por: ev.subidoPor,
          tipo: ev.tipo,
          archivo_url: ev.archivoUrl,
          nombre_archivo: ev.nombreArchivo,
          fecha: ev.fecha
        }));
        supabase.from('evidencias').insert(evToInsert).then(({ error }: any) => {
          if (error) console.error("Error al guardar evidencias en Supabase:", error);
        });
      }
    }

    pushNotification(
      `Nuevo caso #${newId} creado para ${storeObj?.nombre || 'la tienda'} (${newCategoryText})`,
      'nuevo_caso',
      { tiendaId, prioridad: newPriority, casoId: newId, autorRol: currentUser.rol }
    );

    // Limpiar estados y cerrar modal
    setShowNewCaseModal(false);
    setNewCategoryText('');
    setNewDesc('');
    setNewPriority(3);
    setNewCaseDamagePhotos([]);
    setNewIsScheduled(false);
    setNewRequestPreMaterial(false);
    setNewPreMaterialName('');
    setNewPreMaterialQty(1);
    setNewScheduleAssignedTechId('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const uInput = loginUser.trim().toLowerCase();
    const foundUser = users.find(u => 
      (u.usuario.toLowerCase() === uInput || u.correo.toLowerCase() === uInput) && 
      (u.contrasena ? u.contrasena === loginPass : true)
    );

    if (foundUser) {
      if (!foundUser.estado) {
        setLoginError('Este usuario se encuentra inactivo. Contacte al administrador.');
        return;
      }
      setCurrentUser(foundUser);
      localStorage.setItem('maint_user', JSON.stringify(foundUser));
      if (rememberMe) {
        localStorage.setItem('maint_saved_user', loginUser);
        localStorage.setItem('maint_saved_pass', loginPass);
      } else {
        localStorage.removeItem('maint_saved_user');
        localStorage.removeItem('maint_saved_pass');
      }

      if ((foundUser.rol === 'supervisor' || foundUser.rol === 'administrador') && !foundUser.passwordCambiado) {
        setIsFirstLoginChange(true);
        setShowChangePasswordModal(true);
      }
    } else {
      setLoginError('Credenciales incorrectas. Verifique su usuario y contraseña.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('maint_user');
    setSelectedCaseId(null);
    setActiveTab('dashboard');
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!currentUser) return;

    const expectedCurrent = currentUser.contrasena || (
      currentUser.usuario === 'admin' ? 'admin123' :
      currentUser.usuario === 'supervisor1' ? 'sup123' :
      currentUser.usuario === 'supervisor2' ? 'sup456' :
      currentUser.usuario === 'tecnico1' ? 'tec123' :
      currentUser.usuario === 'tecnico2' ? 'tec456' : '123456'
    );

    if (currentPassInput !== expectedCurrent) {
      setChangePassError('La contraseña actual es incorrecta.');
      return;
    }

    if (newPassInput.length < 6) {
      setChangePassError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setChangePassError('Las contraseñas no coinciden.');
      return;
    }

    // Actualizar usuario en estado y localStorage
    const updatedUser = { ...currentUser, contrasena: newPassInput, passwordCambiado: true };
    setCurrentUser(updatedUser);
    localStorage.setItem('maint_user', JSON.stringify(updatedUser));

    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    // Actualizar en Supabase si está disponible
    if (isSupabaseConfigured) {
      supabase
        .from('usuarios')
        .update({ contrasena: newPassInput, password_cambiado: true })
        .eq('id', currentUser.id)
        .then(({ error }: any) => {
          if (error) console.error("Error al actualizar contraseña en Supabase:", error);
        });
    }

    setChangePassSuccess('¡Contraseña actualizada con éxito!');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setIsFirstLoginChange(false);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      setChangePassSuccess('');
    }, 1200);
  };

  // Facturación Methods
  const handleSaveBillingProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const supKey = currentUser.usuario.toLowerCase();
    const updated: Record<string, SupervisorBillingData> = {
      ...billingProfiles,
      [supKey]: {
        ruc: facturacionRuc,
        razonSocial: facturacionRazonSocial,
        direccion: facturacionDireccion,
        telefono: facturacionTelefono,
        email: facturacionEmail,
        conceptoPorDefecto: facturacionConcepto
      }
    };
    setBillingProfiles(updated);
    localStorage.setItem('maint_billing_profiles', JSON.stringify(updated));
    alert('✅ Datos de facturación guardados como perfil predeterminado.');
  };

  const handleGenerateInvoicePdf = (targetCase: Case) => {
    const store = stores.find(s => s.id === targetCase.tiendaId);
    const supProfile = getSupervisorBillingProfile(currentUser?.usuario || 'supervisor1');

    const rucVal = facturacionRuc || supProfile.ruc;
    const razonVal = facturacionRazonSocial || supProfile.razonSocial;
    const dirVal = facturacionDireccion || supProfile.direccion;
    const telVal = facturacionTelefono || supProfile.telefono;
    const emailVal = facturacionEmail || supProfile.email;
    const conceptoVal = facturacionConcepto || `Mantenimiento Preventivo / Correctivo en ${store?.nombre || 'Tienda'}`;
    const montoVal = facturacionMonto || '0.00';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor permita las ventanas emergentes para generar el comprobante PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Comprobante de Liquidación - Caso #${targetCase.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #1e3a8a; }
          .badge { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 14px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .card { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .card h4 { margin-top: 0; margin-bottom: 8px; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
          .table th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; color: #475569; border-bottom: 1px solid #cbd5e1; }
          .table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total-box { display: flex; justify-content: flex-end; margin-top: 20px; }
          .total-card { width: 250px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
          .total-row.grand { font-size: 18px; font-weight: 800; color: #1e3a8a; border-top: 1px solid #93c5fd; padding-top: 6px; margin-top: 6px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { margin: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="title">COMPROBANTE DE LIQUIDACIÓN</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">ORDEN DE SERVICIO / MANTENIMIENTO TÉCNICO</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">CASO #${targetCase.id}</span>
              <div style="font-size: 13px; color: #64748b; margin-top: 8px;">Fecha: ${new Date().toLocaleDateString('es-EC')}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h4>Emisor / Supervisor Responsable</h4>
              <div style="font-weight: 700; font-size: 15px;">${razonVal}</div>
              <div style="font-size: 13px; margin-top: 4px;"><strong>RUC/C.I:</strong> ${rucVal}</div>
              <div style="font-size: 13px;"><strong>Dirección:</strong> ${dirVal}</div>
              <div style="font-size: 13px;"><strong>Teléfono:</strong> ${telVal}</div>
              <div style="font-size: 13px;"><strong>Email:</strong> ${emailVal}</div>
            </div>

            <div class="card">
              <h4>Detalles del Local y Servicio</h4>
              <div style="font-weight: 700; font-size: 15px;">${store?.nombre || 'Tienda'}</div>
              <div style="font-size: 13px; margin-top: 4px;"><strong>Ciudad:</strong> ${store?.ciudad || 'N/A'}</div>
              <div style="font-size: 13px;"><strong>Dirección:</strong> ${store?.direccion || 'N/A'}</div>
              <div style="font-size: 13px;"><strong>Categoría:</strong> ${targetCase.categoria}</div>
              <div style="font-size: 13px;"><strong>Técnico:</strong> ${targetCase.tecnico_presencial_nombre || 'Asignado'}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Descripción del Trabajo Realizado</th>
                <th style="text-align: center; width: 80px;">Cant.</th>
                <th style="text-align: right; width: 120px;">Precio Unit.</th>
                <th style="text-align: right; width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${conceptoVal}</strong>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${targetCase.descripcion}</div>
                </td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">$${Number(montoVal).toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600;">$${Number(montoVal).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-card">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${Number(montoVal).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>IVA 0%:</span>
                <span>$0.00</span>
              </div>
              <div class="total-row grand">
                <span>Total a Liquidar:</span>
                <span>$${Number(montoVal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Documento digital emitido para liquidación interna y soporte operativo.</p>
            <p>"Daniel Luna" Software, Web & App Designer | © 2026</p>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 15px;">
              🖨️ Imprimir / Guardar como PDF
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Pause Material Submission
  const handlePauseMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || !pauseReasonInput.trim()) return;

    const caseId = selectedCaseId;
    const now = new Date().toISOString();
    const storeObj = stores.find(s => s.id === cases.find(c => c.id === caseId)?.tiendaId);

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          pausado_por_material: true,
          motivo_pausa_material: pauseReasonInput.trim(),
          fecha_pausa_material: now,
          tecnico_estatus_trabajo: 'Pausado por Material',
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `⏸️ CASO PAUSADO POR FALTA DE MATERIAL:\nMotivo: "${pauseReasonInput.trim()}". Se notificó al Jefe de Tienda para coordinar la llegada del repuesto.`,
              fecha: now
            }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        pausado_por_material: true,
        motivo_pausa_material: pauseReasonInput.trim(),
        fecha_pausa_material: now,
        tecnico_estatus_trabajo: 'Pausado por Material'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al pausar caso en Supabase:", error);
      });

      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: `⏸️ CASO PAUSADO POR FALTA DE MATERIAL:\nMotivo: "${pauseReasonInput.trim()}". Se notificó al Jefe de Tienda para coordinar la llegada del repuesto.`,
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar comentario de pausa en Supabase:", error);
      });
    }

    pushNotification(
      `Caso #${caseId} pausado por falta de material en ${storeObj?.nombre || 'la tienda'}`,
      'materiales',
      { tiendaId: storeObj?.id, casoId, autorRol: currentUser.rol }
    );

    setShowPauseMaterialModal(false);
    setPauseReasonInput('');
  };

  const handleMaterialesLlegaron = (caseId: number) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;
    const storeObj = stores.find(s => s.id === targetCase.tiendaId);

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          materiales_llegaron_tienda: true,
          fecha_llegada_materiales: now,
          pausado_por_material: false,
          tecnico_estatus_trabajo: 'Trabajando en tienda',
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `📦 MATERIALES CONFIRMADOS EN TIENDA: El Jefe de Tienda ha recibido los materiales requeridos. El técnico puede reanudar la atención de inmediato.`,
              fecha: now
            }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        materiales_llegaron_tienda: true,
        fecha_llegada_materiales: now,
        pausado_por_material: false,
        tecnico_estatus_trabajo: 'Trabajando en tienda'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al confirmar materiales en Supabase:", error);
      });

      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: `📦 MATERIALES CONFIRMADOS EN TIENDA: El Jefe de Tienda ha recibido los materiales requeridos. El técnico puede reanudar la atención de inmediato.`,
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar comentario de llegada de material:", error);
      });
    }

    pushNotification(
      `Materiales recibidos en tienda para el Caso #${caseId}. El técnico puede continuar su labor.`,
      'materiales',
      { tiendaId: targetCase.tiendaId, casoId, autorRol: currentUser.rol }
    );
  };

  const handleTakeCaseSubmit = (primaryTechId: number, isTeam: boolean, supportName: string) => {
    if (!currentUser || !selectedCaseId) return;

    const caseId = selectedCaseId;
    const now = new Date().toISOString();
    const primaryTechUser = users.find(u => u.id === primaryTechId);
    const techName = primaryTechUser ? primaryTechUser.nombre : currentUser.nombre;
    const targetCase = cases.find(c => c.id === caseId);
    const storeObj = stores.find(s => s.id === targetCase?.tiendaId);

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'en_proceso',
          tecnicoAsignadoId: primaryTechId,
          tecnico_presencial_nombre: techName,
          tecnico_apoyo_nombre: isTeam ? supportName : undefined,
          hora_entrada: c.hora_entrada || now,
          tecnico_estatus_trabajo: 'Trabajando en tienda',
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: isTeam 
                ? `👥 INICIO DE ATENCIÓN EN EQUIPO: Técnico principal ${techName} junto con apoyo ${supportName}. Hora de ingreso registrada.`
                : `👷‍♂️ INICIO DE ATENCIÓN INDIVIDUAL: Técnico ${techName} ha tomado el caso y se encuentra en tienda.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now, detalle: isTeam ? `Equipo: ${techName} + ${supportName}` : `Técnico: ${techName}` }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        tecnico_asignado_id: primaryTechId,
        tecnico_presencial_nombre: techName,
        tecnico_apoyo_nombre: isTeam ? supportName : null,
        hora_entrada: now,
        tecnico_estatus_trabajo: 'Trabajando en tienda'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al tomar caso en Supabase:", error);
      });

      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: isTeam 
          ? `👥 INICIO DE ATENCIÓN EN EQUIPO: Técnico principal ${techName} junto con apoyo ${supportName}. Hora de ingreso registrada.`
          : `👷‍♂️ INICIO DE ATENCIÓN INDIVIDUAL: Técnico ${techName} ha tomado el caso y se encuentra en tienda.`,
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar comentario en Supabase:", error);
      });
    }

    pushNotification(
      `Caso #${caseId} tomado por técnico ${techName}${isTeam ? ` (+ ${supportName})` : ''} en ${storeObj?.nombre || 'tienda'}`,
      'estado_cambio',
      { tiendaId: targetCase?.tiendaId, casoId, autorRol: currentUser.rol, estadoNuevo: 'en_proceso' }
    );

    setShowTakeCaseModal(false);
  };

  const handleSolveCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCaseId || solveEvidenceFiles.length === 0) {
      alert("Debes adjuntar al menos una foto de evidencia final que demuestre el trabajo concluido.");
      return;
    }

    const caseId = selectedCaseId;
    const now = new Date().toISOString();
    const targetCase = cases.find(c => c.id === caseId);
    const storeObj = stores.find(s => s.id === targetCase?.tiendaId);

    const finalEvidences: Evidence[] = solveEvidenceFiles.map((base64, index) => ({
      id: Date.now() + index,
      subidoPor: currentUser.nombre,
      tipo: 'final' as const,
      archivoUrl: base64,
      nombreArchivo: `foto_concluido_${index + 1}.jpg`,
      fecha: now
    }));

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'concluido',
          fechaCierre: now,
          hora_salida: now,
          tecnico_estatus_trabajo: 'Concluido',
          evidencias: [...c.evidencias, ...finalEvidences],
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `✅ CASO CONCLUIDO POR TÉCNICO: Se adjuntaron ${finalEvidences.length} foto(s) de evidencia final demostrando la reparación/mantenimiento completado satisfactoriamente.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoNuevo: 'concluido', usuario: currentUser.nombre, fecha: now, detalle: 'Trabajo finalizado en tienda' }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'concluido',
        fecha_cierre: now,
        hora_salida: now,
        tecnico_estatus_trabajo: 'Concluido'
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al concluir caso en Supabase:", error);
      });

      const evToInsert = finalEvidences.map(ev => ({
        caso_id: caseId,
        subido_por: ev.subidoPor,
        tipo: ev.tipo,
        archivo_url: ev.archivoUrl,
        nombre_archivo: ev.nombreArchivo,
        fecha: ev.fecha
      }));
      supabase.from('evidencias').insert(evToInsert).then(({ error }: any) => {
        if (error) console.error("Error al guardar evidencias finales en Supabase:", error);
      });

      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: `✅ CASO CONCLUIDO POR TÉCNICO: Se adjuntaron ${finalEvidences.length} foto(s) de evidencia final demostrando la reparación/mantenimiento completado satisfactoriamente.`,
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar comentario de conclusión:", error);
      });
    }

    pushNotification(
      `Caso #${caseId} ha sido concluido por ${currentUser.nombre} en ${storeObj?.nombre || 'tienda'}. Listo para revisión del Supervisor.`,
      'estado_cambio',
      { tiendaId: targetCase?.tiendaId, casoId, autorRol: currentUser.rol, estadoNuevo: 'concluido' }
    );

    setShowSolveModal(false);
    setSolveEvidenceFiles([]);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCaseId || !currentUser) return;

    const caseId = scheduleCaseId;
    const now = new Date().toISOString();
    const assignedTechUser = scheduleAssignedTechId ? users.find(u => u.id === Number(scheduleAssignedTechId)) : null;
    const targetCase = cases.find(c => c.id === caseId);
    const storeObj = stores.find(s => s.id === targetCase?.tiendaId);

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          fecha_programada: scheduleDate,
          turno_programado: scheduleShift,
          horas_estimadas: scheduleHours,
          agendado_por: currentUser.nombre,
          tecnicoAsignadoId: scheduleAssignedTechId ? Number(scheduleAssignedTechId) : c.tecnicoAsignadoId,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `📅 VISITA AGENDADA: Programada para el ${scheduleDate} (${scheduleShift}) por ${currentUser.nombre}${assignedTechUser ? `. Técnico Asignado: ${assignedTechUser.nombre}` : ''}. Horas estimadas: ${scheduleHours}h.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoNuevo: c.estado, usuario: currentUser.nombre, fecha: now, detalle: `Agendado para ${scheduleDate} (${scheduleShift})` }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        fecha_programada: scheduleDate,
        turno_programado: scheduleShift,
        horas_estimadas: scheduleHours,
        agendado_por: currentUser.nombre,
        tecnico_asignado_id: scheduleAssignedTechId ? Number(scheduleAssignedTechId) : undefined
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar agendamiento en Supabase:", error);
      });

      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: `📅 VISITA AGENDADA: Programada para el ${scheduleDate} (${scheduleShift}) por ${currentUser.nombre}${assignedTechUser ? `. Técnico Asignado: ${assignedTechUser.nombre}` : ''}. Horas estimadas: ${scheduleHours}h.`,
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al registrar comentario de agendamiento:", error);
      });
    }

    pushNotification(
      `Caso #${caseId} agendado para el ${scheduleDate} (${scheduleShift}) en ${storeObj?.nombre || 'tienda'}`,
      'estado_cambio',
      { tiendaId: targetCase?.tiendaId, casoId, autorRol: currentUser.rol }
    );

    setShowScheduleModal(false);
  };

  const handleNewTechCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !techCaseCategory.trim() || !techCaseDesc.trim() || !techCaseStoreId) {
      alert("Por favor completa todos los campos del caso de soporte técnico.");
      return;
    }

    const tiendaId = techCaseStoreId;
    const now = new Date();
    const limit = new Date(now.getTime() + 24 * 3600000).toISOString();
    const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 1001;
    const storeObj = stores.find(s => s.id === tiendaId);

    const newCase: Case = {
      id: newId,
      tiendaId,
      creadoPor: currentUser.id,
      categoria: techCaseCategory.trim(),
      descripcion: `[SOPORTE TÉCNICO IN SITU] ${techCaseDesc.trim()}`,
      prioridad: 2,
      estado: 'en_proceso',
      tecnicoAsignadoId: currentUser.id,
      tecnico_presencial_nombre: currentUser.nombre,
      hora_entrada: now.toISOString(),
      es_caso_tecnico: true,
      tecnico_estatus_trabajo: techStatus,
      fechaCreacion: now.toISOString(),
      fechaLimiteSla: limit,
      evidencias: [],
      comentarios: [
        {
          id: Date.now(),
          autor: currentUser.nombre,
          rol: currentUser.rol,
          texto: `🔧 CASO DE ASISTENCIA TÉCNICA GENERADO EN SITIO: El técnico ${currentUser.nombre} ha abierto esta atención directa en la tienda. Estatus inicial: ${techStatus}.`,
          fecha: now.toISOString()
        }
      ],
      historial: [
        { id: Date.now(), estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now.toISOString(), detalle: 'Soporte técnico presencial' }
      ]
    };

    setCases(prev => [newCase, ...prev]);

    if (isSupabaseConfigured) {
      supabase.from('casos').insert([{
        id: newId,
        tienda_id: tiendaId,
        creado_por: currentUser.id,
        categoria: techCaseCategory.trim(),
        descripcion: `[SOPORTE TÉCNICO IN SITU] ${techCaseDesc.trim()}`,
        prioridad_nivel: 2,
        estado: 'en_proceso',
        tecnico_asignado_id: currentUser.id,
        tecnico_presencial_nombre: currentUser.nombre,
        hora_entrada: now.toISOString(),
        es_caso_tecnico: true,
        tecnico_estatus_trabajo: techStatus,
        fecha_creacion: now.toISOString(),
        fecha_limite_sla: limit
      }]).then(({ error }: any) => {
        if (error) console.error("Error al crear caso técnico en Supabase:", error);
      });
    }

    pushNotification(
      `Técnico ${currentUser.nombre} inició soporte presencial en ${storeObj?.nombre || 'tienda'} (#${newId})`,
      'nuevo_caso',
      { tiendaId, prioridad: 2, casoId: newId, autorRol: currentUser.rol }
    );

    setShowNewTechCaseModal(false);
    setTechCaseCategory('');
    setTechCaseDesc('');
    setTechCaseStoreId(0);
    setTechStatus('Trabajando en tienda');
  };

  const handleUpdateTechStatus = (caseId: number, newStatus: 'Trabajando en tienda' | 'En stand by') => {
    if (!currentUser) return;
    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          tecnico_estatus_trabajo: newStatus,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `🔄 CAMBIO DE ESTATUS OPERATIVO: El técnico se encuentra ahora: "${newStatus}".`,
              fecha: now
            }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        tecnico_estatus_trabajo: newStatus
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar estatus técnico en Supabase:", error);
      });
    }
  };

  const handleReopenCase = (caseId: number) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const newCount = (targetCase.reaperturas_count || 0) + 1;

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          estado: 'en_proceso',
          reaperturas_count: newCount,
          tecnico_estatus_trabajo: 'Reabierto / En revisión',
          fechaCierre: undefined,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `⚠️ CASO REABIERTO (Reapertura #${newCount}): Supervisor ${currentUser.nombre} ha reabierto el caso para ajustes adicionales.`,
              fecha: now
            }
          ],
          historial: [
            ...c.historial,
            { id: Date.now(), estadoNuevo: 'en_proceso', usuario: currentUser.nombre, fecha: now, detalle: `Reapertura #${newCount}` }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        estado: 'en_proceso',
        reaperturas_count: newCount,
        tecnico_estatus_trabajo: 'Reabierto / En revisión',
        fecha_cierre: null
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al reabrir caso en Supabase:", error);
      });
    }

    pushNotification(
      `Caso #${caseId} ha sido REABIERTO por Supervisor ${currentUser.nombre}`,
      'estado_cambio',
      { tiendaId: targetCase.tiendaId, casoId, autorRol: currentUser.rol, estadoNuevo: 'en_proceso' }
    );
  };

  const handleAddComment = (caseId: number, text: string) => {
    if (!currentUser || !text.trim()) return;

    const now = new Date().toISOString();
    const commentObj = {
      id: Date.now(),
      autor: currentUser.nombre,
      rol: currentUser.rol,
      texto: text.trim(),
      fecha: now
    };

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          comentarios: [...c.comentarios, commentObj]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('comentarios').insert([{
        caso_id: caseId,
        autor: currentUser.nombre,
        rol: currentUser.rol,
        texto: text.trim(),
        fecha: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al guardar comentario en Supabase:", error);
      });
    }

    pushNotification(
      `${currentUser.nombre} comentó en el Caso #${caseId}: "${text.trim().substring(0, 45)}..."`,
      'comentario',
      { casoId, autorRol: currentUser.rol }
    );
  };

  const handleAddMaterial = (caseId: number) => {
    if (!currentUser) return;

    const matName = materialInputMode === 'catalogo'
      ? materialCatalog.find(m => m.id === selectedCatalogId)?.nombre || 'Material'
      : materialCustomNote.trim();

    if (!matName) {
      alert("Por favor especifica el material o repuesto a solicitar.");
      return;
    }

    const desc = `${matName} (x${materialQuantity})${materialCustomNote && materialInputMode === 'catalogo' ? ` - Nota: ${materialCustomNote.trim()}` : ''}`;
    const now = new Date().toISOString();
    const newReqId = Date.now();

    const newReq: MaterialRequest = {
      id: newReqId,
      casoId,
      tecnicoId: currentUser.id,
      descripcion: desc,
      estado: 'pendiente',
      createdAt: now
    };

    setMaterialRequests(prev => [newReq, ...prev]);

    if (isSupabaseConfigured) {
      supabase.from('pedidos_materiales').insert([{
        id: newReqId,
        caso_id: caseId,
        tecnico_id: currentUser.id,
        descripcion: desc,
        estado: 'pendiente',
        created_at: now
      }]).then(({ error }: any) => {
        if (error) console.error("Error al guardar pedido de material en Supabase:", error);
      });
    }

    handleAddComment(caseId, `📦 SOLICITUD DE MATERIAL REGISTRADA: ${desc}`);

    pushNotification(
      `Nuevo pedido de material para Caso #${caseId}: ${desc}`,
      'materiales',
      { casoId, autorRol: currentUser.rol }
    );

    setMaterialCustomNote('');
    setMaterialQuantity(1);
    setIsMaterialPickerOpen(false);
  };

  const handleApproveMaterial = (reqId: number, approve: boolean) => {
    if (!currentUser) return;
    const req = materialRequests.find(r => r.id === reqId);
    if (!req) return;

    const newState = approve ? 'aprobado' : 'denegado';
    setMaterialRequests(prev => prev.map(r => r.id === reqId ? { ...r, estado: newState } : r));

    if (isSupabaseConfigured) {
      supabase.from('pedidos_materiales').update({
        estado: newState
      }).eq('id', reqId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar material en Supabase:", error);
      });
    }

    handleAddComment(req.casoId, `📦 PEDIDO DE MATERIAL ${approve ? 'APROBADO ✅' : 'DENEGADO ❌'} por ${currentUser.nombre}: ${req.descripcion}`);

    pushNotification(
      `Pedido de material para Caso #${req.casoId} fue ${approve ? 'APROBADO' : 'DENEGADO'} por ${currentUser.nombre}`,
      'materiales',
      { casoId: req.casoId, autorRol: currentUser.rol }
    );
  };

  const handleApprovePreMaterial = (caseId: number, approve: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const newStatus = approve ? 'aprobado' : 'rechazado';

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          material_anticipado_estado: newStatus,
          material_anticipado_aprobado_por: currentUser.nombre,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `📦 SOLICITUD DE MATERIAL ANTICIPADO ${approve ? 'APROBADA ✅' : 'RECHAZADA ❌'}: "${c.material_anticipado_nombre} (x${c.material_anticipado_cantidad})" por ${currentUser.nombre}.`,
              fecha: now
            }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        material_anticipado_estado: newStatus,
        material_anticipado_aprobado_por: currentUser.nombre
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al actualizar material anticipado en Supabase:", error);
      });
    }

    pushNotification(
      `Material anticipado para Caso #${caseId} ha sido ${approve ? 'APROBADO' : 'RECHAZADO'} por ${currentUser.nombre}`,
      'materiales',
      { casoId, autorRol: currentUser.rol }
    );
  };

  const handleAssignDirectTech = (caseId: number, techId: number) => {
    if (!currentUser) return;
    const techUser = users.find(u => u.id === techId);
    if (!techUser) return;

    const now = new Date().toISOString();

    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          tecnicoAsignadoId: techId,
          tecnico_presencial_nombre: techUser.nombre,
          comentarios: [
            ...c.comentarios,
            {
              id: Date.now(),
              autor: currentUser.nombre,
              rol: currentUser.rol,
              texto: `👤 ASIGNACIÓN DIRECTA DE TÉCNICO: Supervisor ${currentUser.nombre} asignó a ${techUser.nombre} para atender este caso.`,
              fecha: now
            }
          ]
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      supabase.from('casos').update({
        tecnico_asignado_id: techId,
        tecnico_presencial_nombre: techUser.nombre
      }).eq('id', caseId).then(({ error }: any) => {
        if (error) console.error("Error al asignar técnico en Supabase:", error);
      });
    }

    pushNotification(
      `Has sido asignado al Caso #${caseId} por ${currentUser.nombre}`,
      'estado_cambio',
      { casoId, autorRol: currentUser.rol, usuarioId: techId }
    );
  };

  const handleImportTechAvailability = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    loadSheetJS().then(XLSX => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData && jsonData.length > 0) {
            const imported: TechAvailability[] = jsonData.map((row, idx) => ({
              id: Number(row.ID || row.id || Date.now() + idx),
              tecnicoNombre: String(row.Técnico || row.tecnico || row.nombre || 'Técnico'),
              diasLibres: String(row['Días Libres'] || row.diasLibres || 'Sábado / Domingo'),
              estatus: (row.Estatus || row.estatus || 'disponible') as any
            }));

            setTechAvailability(imported);
            alert(`✅ Se importaron con éxito ${imported.length} registros de disponibilidad técnica.`);
          }
        } catch (err) {
          alert('Error al leer el archivo Excel. Asegúrese de que tenga el formato adecuado.');
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Admin Tab Handlers
  const [admName, setAdmName] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admUsername, setAdmUsername] = useState('');
  const [admContrasena, setAdmContrasena] = useState('');
  const [admRole, setAdmRole] = useState<'jefe_tienda' | 'subjefe' | 'supervisor' | 'tecnico'>('jefe_tienda');
  const [admTiendaNombre, setAdmTiendaNombre] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const handleStartEditUser = (u: User) => {
    setEditingUserId(u.id);
    setAdmName(u.nombre);
    setAdmEmail(u.correo);
    setAdmUsername(u.usuario);
    setAdmContrasena(u.contrasena || '');
    setAdmRole(u.rol as any);
    const store = stores.find(s => s.id === u.tiendaId);
    setAdmTiendaNombre(store ? store.nombre : '');
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
    setShowAdminUserForm(false);
  };

  const handleAdminUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admName.trim() || !admEmail.trim() || !admUsername.trim()) return;

    let storeId: number | undefined = undefined;
    if (admRole === 'jefe_tienda' || admRole === 'subjefe') {
      const storeObj = stores.find(s => s.nombre.toLowerCase() === admTiendaNombre.toLowerCase().trim());
      if (storeObj) storeId = storeObj.id;
    }

    if (editingUserId) {
      setUsers(prev => prev.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            nombre: admName.trim(),
            correo: admEmail.trim(),
            usuario: admUsername.trim(),
            rol: admRole,
            tiendaId: storeId,
            ...(admContrasena.trim() ? { contrasena: admContrasena.trim() } : {})
          };
        }
        return u;
      }));

      if (isSupabaseConfigured) {
        supabase.from('usuarios').update({
          nombre: admName.trim(),
          correo: admEmail.trim(),
          usuario: admUsername.trim(),
          rol: admRole,
          tienda_id: storeId || null,
          ...(admContrasena.trim() ? { contrasena: admContrasena.trim() } : {})
        }).eq('id', editingUserId).then(({ error }: any) => {
          if (error) console.error("Error al actualizar usuario en Supabase:", error);
        });
      }
    } else {
      const newUId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newU: User = {
        id: newUId,
        nombre: admName.trim(),
        correo: admEmail.trim(),
        usuario: admUsername.trim(),
        contrasena: admContrasena.trim() || '123456',
        rol: admRole,
        tiendaId: storeId,
        estado: true
      };

      setUsers(prev => [...prev, newU]);

      if (isSupabaseConfigured) {
        supabase.from('usuarios').insert([{
          id: newUId,
          nombre: newU.nombre,
          correo: newU.correo,
          usuario: newU.usuario,
          contrasena: newU.contrasena,
          rol: newU.rol,
          tienda_id: storeId || null,
          estado: true
        }]).then(({ error }: any) => {
          if (error) console.error("Error al crear usuario en Supabase:", error);
        });
      }
    }

    handleCancelEditUser();
  };

  const handleAdminToggleUser = (userId: number) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const newEstado = !target.estado;

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, estado: newEstado } : u));

    if (isSupabaseConfigured) {
      supabase.from('usuarios').update({ estado: newEstado }).eq('id', userId).then(({ error }: any) => {
        if (error) console.error("Error al alternar estado de usuario en Supabase:", error);
      });
    }
  };

  const handleAdminDeleteUser = (userId: number) => {
    if (!confirm("¿Está seguro de que desea eliminar este usuario del sistema?")) return;

    setUsers(prev => prev.filter(u => u.id !== userId));

    if (isSupabaseConfigured) {
      supabase.from('usuarios').delete().eq('id', userId).then(({ error }: any) => {
        if (error) console.error("Error al eliminar usuario en Supabase:", error);
      });
    }
  };

  // Store Management Handlers
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('');
  const [newStoreDir, setNewStoreDir] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);

  const handleStartEditStore = (s: Store) => {
    setEditingStoreId(s.id);
    setNewStoreName(s.nombre);
    setNewStoreCity(s.ciudad || '');
    setNewStoreDir(s.direccion || '');
    setShowAdminStoreForm(true);
  };

  const handleCancelEditStore = () => {
    setEditingStoreId(null);
    setNewStoreName('');
    setNewStoreCity('');
    setNewStoreDir('');
    setShowAdminStoreForm(false);
  };

  const handleAdminStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreCity.trim()) return;

    if (editingStoreId) {
      setStores(prev => prev.map(s => {
        if (s.id === editingStoreId) {
          return {
            ...s,
            nombre: newStoreName.trim().toUpperCase(),
            ciudad: newStoreCity.trim(),
            direccion: newStoreDir.trim()
          };
        }
        return s;
      }));

      if (isSupabaseConfigured) {
        supabase.from('tiendas').update({
          nombre: newStoreName.trim().toUpperCase(),
          ciudad: newStoreCity.trim(),
          direccion: newStoreDir.trim()
        }).eq('id', editingStoreId).then(({ error }: any) => {
          if (error) console.error("Error al actualizar tienda en Supabase:", error);
        });
      }
    } else {
      const newSId = stores.length > 0 ? Math.max(...stores.map(s => s.id)) + 1 : 1;
      const newS: Store = {
        id: newSId,
        nombre: newStoreName.trim().toUpperCase(),
        ciudad: newStoreCity.trim(),
        direccion: newStoreDir.trim()
      };

      setStores(prev => [...prev, newS]);

      if (isSupabaseConfigured) {
        supabase.from('tiendas').insert([{
          id: newSId,
          nombre: newS.nombre,
          ciudad: newS.ciudad,
          direccion: newS.direccion
        }]).then(({ error }: any) => {
          if (error) console.error("Error al crear tienda en Supabase:", error);
        });
      }
    }

    handleCancelEditStore();
  };

  const handleAdminDeleteStore = (storeId: number) => {
    if (!confirm("¿Está seguro de que desea eliminar esta tienda del catálogo?")) return;

    setStores(prev => prev.filter(s => s.id !== storeId));

    if (isSupabaseConfigured) {
      supabase.from('tiendas').delete().eq('id', storeId).then(({ error }: any) => {
        if (error) console.error("Error al eliminar tienda en Supabase:", error);
      });
    }
  };

  const getSupervisorNotifications = () => {
    if (!currentUser) return [];

    return notifications.filter(n => {
      // 1. TÉCNICO: solo 3 eventos específicos (asistencia directa, confirmación de materiales, nuevo caso en su tienda)
      if (currentUser.rol === 'tecnico') {
        if (n.tipo === 'nuevo_caso') return true;
        if (n.usuarioId === currentUser.id) return true;
        const isMaterialMsg = n.tipo === 'materiales';
        const isStatusChange = n.tipo === 'estado_cambio' && n.estadoNuevo === 'pendiente';
        return isMaterialMsg || isStatusChange;
      }

      // 2. JEFE DE TIENDA / SUBJEFE: solo eventos de su tienda asignada
      if (currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') {
        if (n.tiendaId !== currentUser.tiendaId) return false;
        if (n.tipo === 'comentario') return true;
        if (n.tipo === 'estado_cambio') return true;
        if (n.tipo === 'materiales') return true;
        if (n.tipo === 'facturacion') return true;
        return false;
      }

      // 3. SUPERVISOR: eventos de sus tiendas supervisadas
      if (currentUser.rol === 'supervisor') {
        if (n.tiendaId) {
          const storeObj = stores.find(s => s.id === n.tiendaId);
          const isStoreAssigned = (currentUser.supervisorTiendas && currentUser.supervisorTiendas.includes(n.tiendaId)) ||
            (storeObj && storeObj.supervisorName && storeObj.supervisorName.toLowerCase().trim() === currentUser.nombre.toLowerCase().trim());
          if (!isStoreAssigned) return false;
        }
        if (n.tipo === 'nuevo_caso' || n.tipo === 'comentario' || n.tipo === 'materiales' || n.tipo === 'facturacion') return true;
        if (n.tipo === 'estado_cambio') {
          return n.estadoNuevo === 'en_proceso' || n.estadoNuevo === 'concluido' || n.estadoNuevo === 'cerrado';
        }
        return false;
      }

      // 4. ADMINISTRADOR: todos los eventos
      return true;
    });
  };

  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotifIds(allIds);
  };

  const getUnreadNotifsCount = () => {
    const filtered = getSupervisorNotifications();
    return filtered.filter(n => !readNotifIds.includes(n.id)).length;
  };

  // Pre-cargar datos de facturación cuando se abre el modal
  useEffect(() => {
    if (showFacturacionModal) {
      const effectiveCaseId = facturacionCasoId || selectedCaseId;
      const targetCase = cases.find(c => c.id === effectiveCaseId);
      const storeObj = stores.find(s => s.id === targetCase?.tiendaId);

      if (facturacionProfileMode === 'default_supervisor') {
        const supKey = currentUser?.usuario.toLowerCase() || 'supervisor1';
        const profile = billingProfiles[supKey] || DEFAULT_BILLING_PROFILES[supKey] || DEFAULT_BILLING_PROFILES.supervisor1;
        setFacturacionRuc(profile.ruc);
        setFacturacionRazonSocial(profile.razonSocial);
        setFacturacionDireccion(profile.direccion);
        setFacturacionTelefono(profile.telefono);
        setFacturacionEmail(profile.email);
        setFacturacionConcepto(profile.conceptoPorDefecto + (storeObj ? ` - ${storeObj.nombre}` : ''));
        setFacturacionMonto('150.00');
      } else {
        setFacturacionRuc('1792345678001');
        setFacturacionRazonSocial('FERRETERÍA & SUMINISTROS INDUSTRIALES S.A.');
        setFacturacionDireccion('Av. De las Américas y 10 de Agosto, Guayaquil');
        setFacturacionTelefono('042890123');
        setFacturacionEmail('ventas@suministros-ind.com');
        setFacturacionConcepto(`Materiales y repuestos de mantenimiento para ${storeObj?.nombre || 'Tienda'}`);
        setFacturacionMonto('85.50');
      }
    }
  }, [showFacturacionModal, facturacionCasoId, selectedCaseId, facturacionProfileMode, billingProfiles, currentUser, cases, stores]);

  const rawSelectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedCase = rawSelectedCase ? {
    ...rawSelectedCase,
    hora_salida: rawSelectedCase.hora_salida || ((rawSelectedCase.estado === 'concluido' || rawSelectedCase.estado === 'cerrado') ? (rawSelectedCase.fechaCierre || rawSelectedCase.fechaCreacion || new Date().toISOString()) : undefined)
  } : null;

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
              <span> y Operaciones Técnicas</span>
            </h1>
            <p className="auth-desc-p">
              Plataforma centralizada para la supervisión de casos de mantenimiento, control de asistencia en locales, logística de repuestos y liquidación de servicios.
            </p>
            
            <div className="auth-highlights">
              <div className="auth-highlight-item">
                <span className="auth-highlight-icon">⏱️</span>
                <span className="auth-highlight-text">Control estricto de SLA</span>
              </div>
              <div className="auth-highlight-item">
                <span className="auth-highlight-icon">📍</span>
                <span className="auth-highlight-text">Presencia física en tiendas</span>
              </div>
              <div className="auth-highlight-item">
                <span className="auth-highlight-icon">📦</span>
                <span className="auth-highlight-text">Gestión de repuestos y materiales</span>
              </div>
            </div>

            <div className="auth-designer-badge">
              "Daniel Luna" Software, Web & App Designer | © 2026
            </div>
          </div>

          {/* Right panel: Login form */}
          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-card-header">
                <h2>Iniciar Sesión</h2>
                <p>Ingresa tus credenciales corporativas para acceder</p>
              </div>

              {loginError && (
                <div className="auth-error-box">
                  <span>⚠️</span> {loginError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="auth-form-group">
                  <label>Nombre de Usuario o Correo Electrónico</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={loginUser}
                    onChange={e => setLoginUser(e.target.value)}
                    placeholder="Ej: admin, jperez o correo corporativo"
                  />
                </div>

                <div className="auth-form-group">
                  <label>Contraseña</label>
                  <div className="auth-pass-wrapper">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="auth-pass-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                <div className="auth-remember-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span>Recordar credenciales</span>
                  </label>

                  <button
                    type="button"
                    className="auth-theme-btn"
                    onClick={toggleTheme}
                  >
                    {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
                  </button>
                </div>

                <button type="submit" className="auth-submit-btn">
                  Acceder a la Plataforma ➔
                </button>
              </form>

              <div className="auth-footer-note">
                Sistema Corporativo • Conexión Segura SSL
              </div>
            </div>
          </div>
        </div>
      ) : (

        /* 2. MAIN APPLICATION WORKSPACE */
        <div className="app-shell">
          
          {/* TOP NAVBAR */}
          <header className="top-navbar">
            <div className="navbar-brand-section">
              <button 
                type="button" 
                className="mobile-sidebar-toggle"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              >
                ☰
              </button>
              <div className="navbar-logo-icon">⚡</div>
              <div className="navbar-brand-text">
                <span className="navbar-app-name">MAINTTRAC</span>
                <span className="navbar-app-badge">v2.6 Enterprise</span>
              </div>
            </div>

            <div className="navbar-actions-section">
              {/* Notificaciones */}
              <button
                type="button"
                className="navbar-icon-btn notif-btn"
                onClick={() => setShowNotifModal(!showNotifModal)}
                title="Notificaciones"
              >
                <span>🔔</span>
                {getUnreadNotifsCount() > 0 && (
                  <span className="notif-counter-badge">{getUnreadNotifsCount()}</span>
                )}
              </button>

              {/* Modo Oscuro / Claro */}
              <button
                type="button"
                className="navbar-icon-btn"
                onClick={toggleTheme}
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>

              {/* Perfil de Usuario */}
              <div className="user-profile-badge">
                <div className="user-avatar">
                  {currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="user-details-compact">
                  <span className="user-name-compact">{currentUser.nombre}</span>
                  <span className="user-role-compact">{getUserBadgeText(currentUser.rol)}</span>
                </div>
              </div>

              {/* Botón Salir */}
              <button
                type="button"
                className="navbar-logout-btn"
                onClick={handleLogout}
                title="Cerrar Sesión"
              >
                <span>🚪</span> Salir
              </button>
            </div>
          </header>

          {/* APP BODY: SIDEBAR + MAIN CONTENT */}
          <div className="app-body-layout">
            
            {/* SIDEBAR NAVIGATION */}
            <aside className={`sidebar-panel ${isMobileSidebarOpen ? 'open' : ''}`}>
              <div className="sidebar-section-title">MENÚ OPERATIVO</div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('dashboard'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">📊</span>
                  <span className="sidebar-label">Panel de Casos</span>
                </button>

                {/* Subfiltros de estado */}
                {activeTab === 'dashboard' && (
                  <div className="sidebar-subitems-group">
                    <button
                      type="button"
                      className={`sidebar-subitem ${statusFilter === 'todos' ? 'active' : ''}`}
                      onClick={() => { setStatusFilter('todos'); setSelectedCaseId(null); }}
                    >
                      <span>📋</span> Todos los Casos
                    </button>
                    <button
                      type="button"
                      className={`sidebar-subitem ${statusFilter === 'pendiente' ? 'active' : ''}`}
                      onClick={() => { setStatusFilter('pendiente'); setSelectedCaseId(null); }}
                    >
                      <span>⏳</span> Pendientes
                    </button>
                    <button
                      type="button"
                      className={`sidebar-subitem ${statusFilter === 'en_proceso' ? 'active' : ''}`}
                      onClick={() => { setStatusFilter('en_proceso'); setSelectedCaseId(null); }}
                    >
                      <span>⚡</span> En Proceso
                    </button>
                    <button
                      type="button"
                      className={`sidebar-subitem ${statusFilter === 'pausado_material' ? 'active' : ''}`}
                      onClick={() => { setStatusFilter('pausado_material'); setSelectedCaseId(null); }}
                    >
                      <span>⏸️</span> Pausados por Material
                    </button>
                    <button
                      type="button"
                      className={`sidebar-subitem ${statusFilter === 'completado' ? 'active' : ''}`}
                      onClick={() => { setStatusFilter('completado'); setSelectedCaseId(null); }}
                    >
                      <span>✅</span> Concluidos / Cerrados
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'tecnicos_actividad' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('tecnicos_actividad'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">⚡</span>
                  <span className="sidebar-label">Técnicos en Vivo</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'historial_asistencias' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('historial_asistencias'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">⏱️</span>
                  <span className="sidebar-label">Historial de Horas</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'agenda_turnos' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('agenda_turnos'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">📅</span>
                  <span className="sidebar-label">Cronograma Turnos</span>
                </button>

                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'disponibilidad' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('disponibilidad'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sidebar-icon">📆</span>
                  <span className="sidebar-label">Cuadrante Técnicos</span>
                </button>

                {(currentUser.rol === 'administrador' || currentUser.rol === 'supervisor') && (
                  <>
                    <div className="sidebar-section-title" style={{ marginTop: '16px' }}>GESTIÓN Y CONTROL</div>
                    <button
                      type="button"
                      className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('admin'); setSelectedCaseId(null); setIsMobileSidebarOpen(false); }}
                    >
                      <span className="sidebar-icon">⚙️</span>
                      <span className="sidebar-label">Administración</span>
                    </button>
                  </>
                )}
              </nav>

              {/* Botón de Acción Rápida */}
              <div className="sidebar-footer-action">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 700, borderRadius: '8px' }}
                  onClick={() => { setShowNewCaseModal(true); setIsMobileSidebarOpen(false); }}
                >
                  ➕ Crear Nuevo Caso
                </button>

                {currentUser.rol === 'tecnico' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px' }}
                    onClick={() => { setShowNewTechCaseModal(true); setIsMobileSidebarOpen(false); }}
                  >
                    🛠️ Asistencia en Sitio
                  </button>
                )}
              </div>

              {/* Firma en Sidebar */}
              <div className="sidebar-designer-signature">
                "Daniel Luna" Software, Web & App Designer | © 2026
              </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="main-content-scroll">
              
              {/* VISTAS MODULARES */}
              {activeTab === 'admin' && (
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
              )}

              {activeTab === 'tecnicos_actividad' && (
                <TecnicosActividadTab
                  techActivityTechFilter={techActivityTechFilter}
                  setTechActivityTechFilter={setTechActivityTechFilter}
                  techActivityStoreFilter={techActivityStoreFilter}
                  setTechActivityStoreFilter={setTechActivityStoreFilter}
                  users={users}
                  stores={stores}
                  cases={cases}
                  setSelectedCaseId={id => { setSelectedCaseId(id); setActiveTab('dashboard'); }}
                />
              )}

              {activeTab === 'historial_asistencias' && (
                <HistorialAsistenciasTab
                  cases={cases}
                  stores={stores}
                  users={users}
                  loadSheetJS={loadSheetJS}
                  setSelectedCaseId={id => { setSelectedCaseId(id); setActiveTab('dashboard'); }}
                />
              )}

              {activeTab === 'agenda_turnos' && (
                <AgendaTurnosTab
                  shiftSchedule={shiftSchedule}
                  scheduleMonthFilter={scheduleMonthFilter}
                  setScheduleMonthFilter={setScheduleMonthFilter}
                  scheduleSearchQuery={scheduleSearchQuery}
                  setScheduleSearchQuery={setScheduleSearchQuery}
                  loadSheetJS={loadSheetJS}
                />
              )}

              {activeTab === 'disponibilidad' && (
                <DisponibilidadTab
                  disponibilidadTab={disponibilidadTab}
                  setDisponibilidadTab={setDisponibilidadTab}
                  techAvailability={techAvailability}
                  handleImportTechAvailability={handleImportTechAvailability}
                  loadSheetJS={loadSheetJS}
                />
              )}

              {activeTab === 'dashboard' && (
                /* DASHBOARD VIEW (CASES LIST & DETAIL) */
                <div className="dashboard-content animate-fade">
                  
                  {selectedCaseId && selectedCase ? (
                    /* CASO SELECCIONADO (DETALLE) */
                    <div className="case-detail-container">
                      <div className="case-detail-top-nav">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedCaseId(null)}
                        >
                          ⬅ Volver a la Lista
                        </button>
                        <span className="case-detail-id-badge">CASO #{selectedCase.id}</span>
                      </div>

                      {/* Header del Caso */}
                      <div className="card case-detail-header-card">
                        <div className="case-detail-header-row">
                          <div>
                            <span className="badge badge-secondary">{selectedCase.categoria}</span>
                            <h2 style={{ margin: '8px 0 4px', fontSize: '1.3rem', fontWeight: 800 }}>
                              {stores.find(s => s.id === selectedCase.tiendaId)?.nombre || 'Tienda'}
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Creado el {new Date(selectedCase.fechaCreacion).toLocaleString()}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`badge ${selectedCase.estado === 'concluido' || selectedCase.estado === 'cerrado' ? 'badge-success' : selectedCase.pausado_por_material ? 'badge-warning' : selectedCase.estado === 'en_proceso' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                              {selectedCase.pausado_por_material ? '⏸️ PAUSADO POR MATERIAL' : selectedCase.estado.toUpperCase()}
                            </span>
                            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: isSlaBreached(selectedCase) ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                              {isSlaBreached(selectedCase) ? '🚨 SLA VENCIDO' : `⏳ SLA: ${getRemainingSlaHours(selectedCase)}h restantes`}
                            </div>
                          </div>
                        </div>

                        {/* Barra de Acciones Operativas del Caso */}
                        <div className="case-detail-actions-bar">
                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'pendiente' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => { setSelectedAssignTechId(currentUser.id); setShowTakeCaseModal(true); }}
                            >
                              🚀 Tomar Este Caso
                            </button>
                          )}

                          {currentUser.rol === 'tecnico' && selectedCase.estado === 'en_proceso' && !selectedCase.pausado_por_material && (
                            <>
                              <button
                                type="button"
                                className="btn btn-warning"
                                onClick={() => setShowPauseMaterialModal(true)}
                              >
                                ⏸️ Pausar por Falta de Material
                              </button>

                              <button
                                type="button"
                                className="btn btn-success"
                                style={{ fontWeight: 700 }}
                                onClick={() => setShowSolveModal(true)}
                              >
                                ✅ Concluir y Adjuntar Evidencia
                              </button>
                            </>
                          )}

                          {(currentUser.rol === 'jefe_tienda' || currentUser.rol === 'subjefe') && selectedCase.pausado_por_material && !selectedCase.materiales_llegaron_tienda && (
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => handleMaterialesLlegaron(selectedCase.id)}
                            >
                              📦 Confirmar Llegada de Materiales a Tienda
                            </button>
                          )}

                          {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleOpenScheduleModal(selectedCase)}
                              >
                                📅 Agendar / Reasignar Visita
                              </button>

                              {(selectedCase.estado === 'concluido' || selectedCase.estado === 'cerrado') && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => { setFacturacionCasoId(selectedCase.id); setShowFacturacionModal(true); }}
                                  >
                                    📄 Liquidación y Facturación
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleReopenCase(selectedCase.id)}
                                  >
                                    ⚠️ Reabrir Caso
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Pestañas Internas del Caso */}
                      <div className="case-detail-tabs-nav">
                        <button
                          type="button"
                          className={`case-tab-btn ${caseDetailTab === 'info' ? 'active' : ''}`}
                          onClick={() => setCaseDetailTab('info')}
                        >
                          📋 Descripción y Asignación
                        </button>
                        <button
                          type="button"
                          className={`case-tab-btn ${caseDetailTab === 'asistencia' ? 'active' : ''}`}
                          onClick={() => setCaseDetailTab('asistencia')}
                        >
                          ⏱️ Asistencia y Presencia
                        </button>
                        <button
                          type="button"
                          className={`case-tab-btn ${caseDetailTab === 'bitacora' ? 'active' : ''}`}
                          onClick={() => setCaseDetailTab('bitacora')}
                        >
                          💬 Bitácora y Comentarios ({selectedCase.comentarios.length})
                        </button>
                        <button
                          type="button"
                          className={`case-tab-btn ${caseDetailTab === 'evidencias' ? 'active' : ''}`}
                          onClick={() => setCaseDetailTab('evidencias')}
                        >
                          📷 Fotos y Evidencias ({selectedCase.evidencias.length})
                        </button>
                        <button
                          type="button"
                          className={`case-tab-btn ${caseDetailTab === 'materiales' ? 'active' : ''}`}
                          onClick={() => setCaseDetailTab('materiales')}
                        >
                          📦 Pedidos de Repuestos
                        </button>
                      </div>

                      {/* Contenido de la Pestaña Seleccionada */}
                      <div className="case-detail-tab-body">
                        {caseDetailTab === 'info' && (
                          <div className="card" style={{ padding: '16px' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Descripción de la Avería</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {selectedCase.descripcion}
                            </p>

                            {selectedCase.fecha_programada && (
                              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--primary)' }}>📅 Información de Agendamiento</h4>
                                <div style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div>Fecha: <strong>{selectedCase.fecha_programada}</strong></div>
                                  <div>Turno: <strong>{selectedCase.turno_programado || 'N/A'}</strong></div>
                                  <div>Horas Estimadas: <strong>{selectedCase.horas_estimadas || 2}h</strong></div>
                                  <div>Agendado por: <strong>{selectedCase.agendado_por || 'N/A'}</strong></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {caseDetailTab === 'asistencia' && (
                          <div className="card" style={{ padding: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Control de Presencia Física en Local</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Técnico Presencial:</span>
                                <strong style={{ fontSize: '0.9rem' }}>{selectedCase.tecnico_presencial_nombre || 'Sin registrar'}</strong>
                                {selectedCase.tecnico_apoyo_nombre && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                                    Apoyo: {selectedCase.tecnico_apoyo_nombre}
                                  </div>
                                )}
                              </div>
                              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Hora de Entrada:</span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                                  {selectedCase.hora_entrada ? new Date(selectedCase.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendiente'}
                                </strong>
                              </div>
                              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Hora de Salida:</span>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                                  {selectedCase.hora_salida ? new Date(selectedCase.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'En proceso'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {caseDetailTab === 'bitacora' && (
                          <div className="card" style={{ padding: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Historial de Seguimiento y Comentarios</h3>
                            
                            {/* Lista de Comentarios */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                              {selectedCase.comentarios.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay comentarios registrados en este caso.</p>
                              ) : (
                                selectedCase.comentarios.map(c => (
                                  <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>{c.autor} ({getUserBadgeText(c.rol)})</strong>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(c.fecha).toLocaleString()}</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{c.texto}</p>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Formulario Agregar Comentario */}
                            <form onSubmit={e => {
                              e.preventDefault();
                              const input = (e.target as any).commentText;
                              if (input.value.trim()) {
                                handleAddComment(selectedCase.id, input.value.trim());
                                input.value = '';
                              }
                            }} style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                name="commentText"
                                placeholder="Escribe una actualización o nota en la bitácora..."
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                              />
                              <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                                Enviar 💬
                              </button>
                            </form>
                          </div>
                        )}

                        {caseDetailTab === 'evidencias' && (
                          <div className="card" style={{ padding: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800 }}>Galería de Evidencias Fotográficas</h3>
                            {selectedCase.evidencias.length === 0 ? (
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No se han adjuntado fotos a este caso.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                {selectedCase.evidencias.map(ev => (
                                  <div key={ev.id} style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                                    <div style={{ height: '140px', overflow: 'hidden' }}>
                                      <img src={ev.archivoUrl} alt={ev.nombreArchivo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ padding: '8px', fontSize: '0.75rem' }}>
                                      <div style={{ fontWeight: 700 }}>{ev.tipo === 'final' ? '✅ Evidencia Final' : '📷 Evidencia Inicial'}</div>
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Por: {ev.subidoPor}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {caseDetailTab === 'materiales' && (
                          <div className="card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Pedidos de Repuestos y Materiales</h3>
                              {currentUser.rol === 'tecnico' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setIsMaterialPickerOpen(!isMaterialPickerOpen)}
                                >
                                  ➕ Solicitar Repuesto
                                </button>
                              )}
                            </div>

                            {/* Solicitud Anticipada si existe */}
                            {selectedCase.solicitud_material_anticipada && (
                              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem' }}>📦 Solicitud Anticipada al Crear:</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>{selectedCase.material_anticipado_nombre} (x{selectedCase.material_anticipado_cantidad})</p>
                                  </div>
                                  <span className={`badge ${selectedCase.material_anticipado_estado === 'aprobado' ? 'badge-success' : selectedCase.material_anticipado_estado === 'rechazado' ? 'badge-danger' : 'badge-warning'}`}>
                                    {selectedCase.material_anticipado_estado || 'Pendiente'}
                                  </span>
                                </div>
                                {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && selectedCase.material_anticipado_estado === 'pendiente_aprobacion' && (
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button type="button" className="btn btn-success btn-sm" onClick={() => handleApprovePreMaterial(selectedCase.id, true)}>Aprobar Material</button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleApprovePreMaterial(selectedCase.id, false)}>Rechazar</button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Formulario de Solicitud de Material */}
                            {isMaterialPickerOpen && (
                              <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--primary-subtle)', marginBottom: '12px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700 }}>Solicitud de Repuesto al Supervisor</h4>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                  <button type="button" className={`btn ${materialInputMode === 'catalogo' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMaterialInputMode('catalogo')}>Del Catálogo</button>
                                  <button type="button" className={`btn ${materialInputMode === 'libre' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMaterialInputMode('libre')}>Texto Libre</button>
                                </div>

                                {materialInputMode === 'catalogo' ? (
                                  <select
                                    value={selectedCatalogId}
                                    onChange={e => setSelectedCatalogId(Number(e.target.value))}
                                    className="custom-select"
                                    style={{ width: '100%', marginBottom: '8px', fontSize: '0.82rem' }}
                                  >
                                    {materialCatalog.map(m => (
                                      <option key={m.id} value={m.id}>{m.nombre} ({m.categoria})</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Nombre del material requerido..."
                                    value={materialCustomNote}
                                    onChange={e => setMaterialCustomNote(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.82rem', boxSizing: 'border-box' }}
                                  />
                                )}

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="number"
                                    min={1}
                                    value={materialQuantity}
                                    onChange={e => setMaterialQuantity(Number(e.target.value))}
                                    style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                                  />
                                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAddMaterial(selectedCase.id)}>Confirmar Pedido</button>
                                </div>
                              </div>
                            )}

                            {/* Lista de Pedidos de Materiales */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {materialRequests.filter(r => r.casoId === selectedCase.id).map(req => (
                                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                  <div>
                                    <strong style={{ fontSize: '0.82rem' }}>{req.descripcion}</strong>
                                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`badge ${req.estado === 'aprobado' ? 'badge-success' : req.estado === 'denegado' ? 'badge-danger' : 'badge-warning'}`}>
                                      {req.estado.toUpperCase()}
                                    </span>
                                    {(currentUser.rol === 'supervisor' || currentUser.rol === 'administrador') && req.estado === 'pendiente' && (
                                      <>
                                        <button type="button" className="btn btn-success btn-sm" onClick={() => handleApproveMaterial(req.id, true)}>✓</button>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleApproveMaterial(req.id, false)}>✕</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* LISTA DE CASOS */
                    <div>
                      {/* Barra de Filtros y Búsqueda */}
                      <div className="dashboard-filters-bar">
                        <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder="🔍 Buscar casos por ID, avería o local..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                          />

                          <select
                            value={storeFilter}
                            onChange={e => setStoreFilter(e.target.value)}
                            className="custom-select"
                            style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                          >
                            <option value="todos">🏬 Todas las Tiendas</option>
                            {stores.map(s => (
                              <option key={s.id} value={s.id.toString()}>{s.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontWeight: 700, fontSize: '0.82rem' }}
                            onClick={() => setShowNewCaseModal(true)}
                          >
                            ➕ Crear Caso
                          </button>
                        </div>
                      </div>

                      {/* GRID DE CASOS */}
                      <div className="cases-grid-layout">
                        {getFilteredCases().length === 0 ? (
                          <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📭</span>
                            No se encontraron casos con los filtros seleccionados.
                          </div>
                        ) : (
                          getFilteredCases().map(c => {
                            const store = stores.find(s => s.id === c.tiendaId);
                            const isBreached = isSlaBreached(c);
                            const isDone = c.estado === 'concluido' || c.estado === 'cerrado';

                            return (
                              <div
                                key={c.id}
                                className={`case-card animate-fade ${isBreached ? 'breached-sla' : ''}`}
                                onClick={() => setSelectedCaseId(c.id)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                  <span className="case-card-id">#{c.id}</span>
                                  <span className={`badge ${isDone ? 'badge-success' : c.pausado_por_material ? 'badge-warning' : c.estado === 'en_proceso' ? 'badge-primary' : 'badge-secondary'}`}>
                                    {c.pausado_por_material ? '⏸️ PAUSADO' : c.estado.toUpperCase()}
                                  </span>
                                </div>

                                <div className="case-card-store">
                                  <span>🏬</span> {store?.nombre || 'Tienda'}
                                </div>

                                <div className="case-card-cat">
                                  {c.categoria}
                                </div>

                                <p className="case-card-desc">
                                  {c.descripcion}
                                </p>

                                <div className="case-card-footer">
                                  <div style={{ fontSize: '0.72rem', color: isBreached ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {isDone ? '✅ Finalizado' : isBreached ? '🚨 SLA Vencido' : `⏳ ${getRemainingSlaHours(c)}h SLA`}
                                  </div>

                                  {c.tecnico_presencial_nombre && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                      👷‍♂️ {c.tecnico_presencial_nombre.split(' ')[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER GLOBAL DE DANIEL LUNA */}
              <footer className="global-app-footer">
                "Daniel Luna" Software, Web & App Designer | © 2026
              </footer>
            </main>
          </div>
        </div>
      )}

      {/* MODALES DEL SISTEMA */}
      <NewCaseModal
        show={showNewCaseModal}
        currentUser={currentUser}
        stores={stores}
        categories={categories}
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

      <NewTechCaseModal
        show={showNewTechCaseModal}
        stores={stores}
        categories={categories}
        techCaseStoreId={techCaseStoreId}
        setTechCaseStoreId={setTechCaseStoreId}
        techCaseCategory={techCaseCategory}
        setTechCaseCategory={setTechCaseCategory}
        techCaseDesc={techCaseDesc}
        setTechCaseDesc={setTechCaseDesc}
        techStatus={techStatus}
        setTechStatus={setTechStatus}
        onClose={() => setShowNewTechCaseModal(false)}
        onSubmit={handleNewTechCaseSubmit}
      />

      <TakeCaseModal
        show={showTakeCaseModal}
        users={users}
        currentUser={currentUser}
        takeCaseMode={takeCaseMode}
        setTakeCaseMode={setTakeCaseMode}
        takeCaseSupportTech={takeCaseSupportTech}
        setTakeCaseSupportTech={setTakeCaseSupportTech}
        selectedAssignTechId={selectedAssignTechId}
        onClose={() => setShowTakeCaseModal(false)}
        onSubmit={handleTakeCaseSubmit}
      />

      <SolveModal
        show={showSolveModal}
        solveEvidenceFiles={solveEvidenceFiles}
        setSolveEvidenceFiles={setSolveEvidenceFiles}
        handleSolveEvidenceChange={handleSolveEvidenceChange}
        onClose={() => setShowSolveModal(false)}
        onSubmit={handleSolveCaseSubmit}
      />

      <ScheduleModal
        show={showScheduleModal}
        scheduleDate={scheduleDate}
        setScheduleDate={setScheduleDate}
        scheduleShift={scheduleShift}
        setScheduleShift={setScheduleShift}
        scheduleHours={scheduleHours}
        setScheduleHours={setScheduleHours}
        scheduleAssignedTechId={scheduleAssignedTechId}
        setScheduleAssignedTechId={setScheduleAssignedTechId}
        users={users}
        onClose={() => setShowScheduleModal(false)}
        onSubmit={handleScheduleSubmit}
      />

      <PauseMaterialModal
        show={showPauseMaterialModal}
        pauseReasonInput={pauseReasonInput}
        setPauseReasonInput={setPauseReasonInput}
        onClose={() => setShowPauseMaterialModal(false)}
        onSubmit={handlePauseMaterialSubmit}
      />

      <FacturacionModal
        show={showFacturacionModal}
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
        facturacionCasoId={facturacionCasoId || selectedCaseId}
        onSaveProfile={handleSaveBillingProfile}
        onGeneratePdf={() => {
          const cId = facturacionCasoId || selectedCaseId;
          const target = cases.find(c => c.id === cId);
          if (target) handleGenerateInvoicePdf(target);
        }}
        onClose={() => setShowFacturacionModal(false)}
      />

      <ChangePasswordModal
        show={showChangePasswordModal}
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
        onClose={() => { if (!isFirstLoginChange) setShowChangePasswordModal(false); }}
        onSubmit={handleChangePasswordSubmit}
      />
    </div>
  );
}
