/**
 * D&Nax Studios - MaintTrac Database Cost & Egress Optimization Engine
 * 
 * Este módulo reduce al mínimo los gastos innecesarios a la base de datos (Supabase / PostgreSQL)
 * implementando:
 * 1. Caché L1 en memoria (ultra rápida, 0ms latency)
 * 2. Caché L2 persistente (LocalStorage con cuotas protegidas y TTL)
 * 3. Deduplicación de peticiones en vuelo (In-flight Request Coalescing): Si 2 componentes
 *    piden lo mismo al mismo tiempo, solo sale 1 consulta de red a Supabase.
 * 4. Stale-While-Revalidate (SWR): Entrega datos de inmediato sin bloquear la UI ni gastar lecturas si el TTL está vigente.
 * 5. Revalidación condicional y prevención de sondeos redundantes.
 * 6. Métricas en vivo de consultas ahorradas y ancho de banda preservado.
 */

export interface CacheOptions {
  /** Tiempo de vida de la caché en milisegundos (por defecto 5 min) */
  ttlMs?: number;
  /** Forzar revalidación inmediata contra la base de datos */
  forceRefresh?: boolean;
  /** Si debe persistir en L2 (localStorage) */
  persistL2?: boolean;
  /** Tag o categoría para invalidaciones en lote */
  tag?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tag?: string;
}

export interface DbSavingsStats {
  queriesIntercepted: number;
  queriesExecuted: number;
  bytesSavedEstimatedKb: number;
  activeCacheKeys: number;
  lastOptimization: string;
}

// TTLs predeterminados por tipo de entidad para maximizar ahorro sin perder frescura
export const DB_CACHE_PRESETS = {
  STATIC_CATALOG: 12 * 60 * 60 * 1000,    // 12 horas (Tiendas, Categorías - rara vez cambian)
  USER_PROFILES: 30 * 60 * 1000,          // 30 minutos (Usuarios, Supervisores)
  OPERATIONAL_DATA: 3 * 60 * 1000,        // 3 minutos (Casos activos, Pedidos, Asistencias)
  NOTIFICATIONS: 2 * 60 * 1000,           // 2 minutos (Notificaciones)
  BILLING_PROFILES: 60 * 60 * 1000,       // 1 hora (Datos facturación)
};

class DbOptimizationEngine {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private stats: DbSavingsStats = {
    queriesIntercepted: 0,
    queriesExecuted: 0,
    bytesSavedEstimatedKb: 0,
    activeCacheKeys: 0,
    lastOptimization: new Date().toLocaleTimeString()
  };

  constructor() {
    this.loadStatsFromStorage();
  }

  private getL2Key(key: string): string {
    return `dnax_db_cache_${key}`;
  }

  private loadStatsFromStorage() {
    try {
      const saved = localStorage.getItem('dnax_db_savings_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.stats.queriesIntercepted = parsed.queriesIntercepted || 0;
        this.stats.queriesExecuted = parsed.queriesExecuted || 0;
        this.stats.bytesSavedEstimatedKb = parsed.bytesSavedEstimatedKb || 0;
      }
    } catch {
      // Ignorar fallos de acceso a localStorage
    }
  }

  private saveStatsToStorage() {
    try {
      localStorage.setItem('dnax_db_savings_stats', JSON.stringify({
        queriesIntercepted: this.stats.queriesIntercepted,
        queriesExecuted: this.stats.queriesExecuted,
        bytesSavedEstimatedKb: this.stats.bytesSavedEstimatedKb
      }));
    } catch {}
  }

  /**
   * Obtiene datos de la caché (L1 o L2) si están vigentes
   */
  public getFromCache<T>(key: string): T | null {
    const now = Date.now();

    // 1. Verificar L1 (Memoria)
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (now < memEntry.expiresAt) {
        this.stats.queriesIntercepted++;
        this.stats.bytesSavedEstimatedKb += 2.5; // Estimado conservador de ahorro por lectura
        this.saveStatsToStorage();
        return memEntry.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. Verificar L2 (LocalStorage)
    try {
      const l2Raw = localStorage.getItem(this.getL2Key(key));
      if (l2Raw) {
        const l2Entry: CacheEntry<T> = JSON.parse(l2Raw);
        if (now < l2Entry.expiresAt) {
          // Re-hidratar L1
          this.memoryCache.set(key, l2Entry);
          this.stats.queriesIntercepted++;
          this.stats.bytesSavedEstimatedKb += 2.5;
          this.saveStatsToStorage();
          return l2Entry.data;
        } else {
          localStorage.removeItem(this.getL2Key(key));
        }
      }
    } catch {
      // Manejo transparente de cuota o parseo
    }

    return null;
  }

  /**
   * Guarda datos en caché (L1 y opcionalmente L2)
   */
  public setInCache<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttlMs ?? DB_CACHE_PRESETS.OPERATIONAL_DATA;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      tag: options?.tag
    };

    // Guardar en L1
    this.memoryCache.set(key, entry);
    this.stats.activeCacheKeys = this.memoryCache.size;
    this.stats.lastOptimization = new Date().toLocaleTimeString();

    // Guardar en L2 si corresponde (sin guardar datos excesivamente masivos)
    if (options?.persistL2 !== false) {
      try {
        const serialized = JSON.stringify(entry);
        // Si el tamaño es razonable (< 1.5MB), persistir en L2 para inicio instantáneo
        if (serialized.length < 1500000) {
          localStorage.setItem(this.getL2Key(key), serialized);
        }
      } catch (e) {
        console.warn(`[DbOptimization] L2 quota omitida para ${key}`, e);
      }
    }
  }

  /**
   * Ejecuta una consulta contra Supabase / BD con reducción de gastos inteligente:
   * - Si está en caché y vigente: retorna de inmediato sin tocar la BD.
   * - Si hay una petición en vuelo para la misma clave: reutiliza la misma promesa (Request Coalescing).
   * - Si venció o se fuerza: hace la consulta, actualiza la caché y devuelve el resultado.
   */
  public async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    if (!options?.forceRefresh) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Request Coalescing: Si ya hay una consulta en curso para esta misma clave, no lanzar otra
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key)!;
    }

    const requestPromise = (async () => {
      try {
        this.stats.queriesExecuted++;
        const result = await fetcher();
        this.setInCache(key, result, options);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Invalida una clave específica o todas las que comiencen con un prefijo
   */
  public invalidate(keyOrPrefix: string): void {
    // Limpiar L1
    for (const k of Array.from(this.memoryCache.keys())) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        this.memoryCache.delete(k);
      }
    }

    // Limpiar L2
    try {
      const prefix = this.getL2Key(keyOrPrefix);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const itemKey = localStorage.key(i);
        if (itemKey && (itemKey === prefix || itemKey.startsWith(prefix))) {
          localStorage.removeItem(itemKey);
        }
      }
    } catch {}

    this.stats.activeCacheKeys = this.memoryCache.size;
  }

  /**
   * Actualiza un elemento específico dentro de una colección en caché sin refetch a la BD
   */
  public updateCachedList<T extends { id: any }>(
    key: string,
    updater: (currentList: T[]) => T[]
  ): void {
    const current = this.getFromCache<T[]>(key);
    if (current && Array.isArray(current)) {
      const updated = updater(current);
      this.setInCache(key, updated);
    }
  }

  /**
   * Limpia toda la caché del optimizador
   */
  public clearAll(): void {
    this.memoryCache.clear();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const itemKey = localStorage.key(i);
        if (itemKey && itemKey.startsWith('dnax_db_cache_')) {
          localStorage.removeItem(itemKey);
        }
      }
    } catch {}
    this.stats.activeCacheKeys = 0;
  }

  /**
   * Métricas y estadísticas de ahorro de base de datos
   */
  public getStats(): DbSavingsStats {
    this.stats.activeCacheKeys = this.memoryCache.size;
    return { ...this.stats };
  }
}

// Instancia singleton para toda la aplicación
export const dbOptimizer = new DbOptimizationEngine();

/**
 * Hook reutilizable para páginas presentes y futuras:
 * Permite a cualquier nueva página o pestaña consumir datos de base de datos
 * con ahorro automático de gastos, SWR y revalidación sin boilerplate.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useCachedDbQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
) {
  const [data, setData] = useState<T | null>(() => dbOptimizer.getFromCache<T>(key));
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(
    async (force = true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await dbOptimizer.fetchWithCache(
          key,
          fetcherRef.current,
          { ...options, forceRefresh: force }
        );
        setData(result);
        return result;
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [key, options]
  );

  useEffect(() => {
    let isMounted = true;
    const cached = dbOptimizer.getFromCache<T>(key);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
      dbOptimizer
        .fetchWithCache(key, fetcherRef.current, options)
        .then((res) => {
          if (isMounted) {
            setData(res);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err);
            setLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [key]);

  return {
    data,
    loading,
    error,
    refresh,
    setData: (newData: T) => {
      dbOptimizer.setInCache(key, newData, options);
      setData(newData);
    }
  };
}
