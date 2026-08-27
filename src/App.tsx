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
