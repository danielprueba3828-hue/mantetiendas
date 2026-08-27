import type { Store, User } from './types';
import { DEFAULT_USERS } from './data';
import { LocalNotifications } from '@capacitor/local-notifications';

const lastTriggeredNotifCache = new Map<string, number>();

export const triggerNativeNotification = async (title: string, body: string) => {
  const cleanBody = (body || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const notifKey = cleanBody.substring(0, 50);
  const now = Date.now();
  if (notifKey && lastTriggeredNotifCache.has(notifKey) && now - (lastTriggeredNotifCache.get(notifKey) || 0) < 15000) {
    console.log("Notificación duplicada omitida (cache 15s):", title, body);
    return;
  }
  if (notifKey) lastTriggeredNotifCache.set(notifKey, now);
  console.log("Disparando notificacion nativa:", title, body);
  try {
    if (typeof (window as any).Capacitor !== 'undefined') {
      await LocalNotifications.createChannel({
        id: 'mainttrac_alerts',
        name: 'Alertas MaintTrac',
        description: 'Notificaciones instantaneas de casos y mantenimientos',
        importance: 5,
        visibility: 1,
        vibration: true
      }).catch(() => {});

      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

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

export const isStoreVisibleToUser = (s: Store, user: User | null): boolean => {
  if (!user) return false;
  if (user.rol === 'jefe_tienda' || user.rol === 'subjefe') {
    return s.id === user.tiendaId;
  }
  if (user.rol === 'supervisor') {
    if (user.supervisorTiendas && Array.isArray(user.supervisorTiendas) && user.supervisorTiendas.includes(s.id)) {
      return true;
    }
    if (s.supervisorName && user.nombre && s.supervisorName.toLowerCase().trim() === user.nombre.toLowerCase().trim()) {
      return true;
    }
    return false;
  }
  return true;
};

export const getUserBadgeText = (user: User | null): string => {
  if (!user) return '??';
  if (user.rol === 'administrador') return 'ADM';
  
  if (user.rol === 'jefe_tienda' || user.rol === 'subjefe') {
    const matchStoreCode = user.nombre.match(/\(([^)]+)\)/);
    if (matchStoreCode && matchStoreCode[1]) {
      return matchStoreCode[1].toUpperCase();
    }
    const matchUserCode = user.usuario.split('_')[0];
    if (matchUserCode) return matchUserCode.toUpperCase();
    return 'TIENDA';
  }

  const cleanName = user.nombre.replace(/\([^)]*\)/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

export const getSupervisorForStore = (store: Store, usersList: User[]): User | undefined => {
  if (store.supervisorName) {
    const sName = store.supervisorName.toLowerCase();
    const sup = usersList.find(u => u.rol === 'supervisor' && (u.nombre.toLowerCase().includes(sName) || sName.includes(u.nombre.toLowerCase().split(' ')[0])));
    if (sup) return sup;
  }
  const supByList = usersList.find(u => u.rol === 'supervisor' && u.supervisorTiendas && u.supervisorTiendas.includes(store.id));
  if (supByList) return supByList;

  const defaultSup = DEFAULT_USERS.find(u => u.rol === 'supervisor' && u.supervisorTiendas && u.supervisorTiendas.includes(store.id));
  return defaultSup;
};

export const getStoresForSupervisor = (supKey: string, storesList: Store[], usersList: User[]): Store[] => {
  if (supKey === 'todos') return storesList;

  const key = supKey.toLowerCase();
  const supervisorUser = usersList.find(u => u.rol === 'supervisor' && (
    u.nombre.toLowerCase().includes(key) || 
    (u.usuario && u.usuario.toLowerCase().includes(key)) ||
    key.includes(u.nombre.toLowerCase().split(' ')[0])
  ));

  return storesList.filter(s => {
    if (supervisorUser && supervisorUser.supervisorTiendas && supervisorUser.supervisorTiendas.includes(s.id)) {
      return true;
    }
    if (s.supervisorName && s.supervisorName.toLowerCase().includes(key)) {
      return true;
    }
    const defaultSup = DEFAULT_USERS.find(u => u.rol === 'supervisor' && (
      u.nombre.toLowerCase().includes(key) ||
      (u.usuario && u.usuario.toLowerCase().includes(key)) ||
      key.includes(u.nombre.toLowerCase().split(' ')[0])
    ));
    if (defaultSup && defaultSup.supervisorTiendas && defaultSup.supervisorTiendas.includes(s.id)) {
      return true;
    }
    return false;
  });
};
