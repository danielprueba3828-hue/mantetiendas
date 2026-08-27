import { App as CapApp } from '@capacitor/app';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';

const lastTriggeredNotifCache = new Map<string, number>();

const triggerNativeNotification = async (title: string, body: string) => {
  // Extraer cualquier ID o texto base para deduplicar incluso si el título varía ligeramente
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
