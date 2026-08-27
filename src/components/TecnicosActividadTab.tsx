import React from 'react';
import type { Store, User, Case } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';

interface TecnicosActividadTabProps {
  currentUser: User | null;
  techActivityTechFilter: number | 'todos';
  setTechActivityTechFilter: (val: number | 'todos') => void;
  techActivityStoreFilter: number | 'todas';
  setTechActivityStoreFilter: (val: number | 'todas') => void;
  users: User[];
  stores: Store[];
  cases: Case[];
  setSelectedCaseId: (id: number) => void;
  setShowNewTechCaseModal?: (val: boolean) => void;
}

export const TecnicosActividadTab: React.FC<TecnicosActividadTabProps> = ({
  currentUser,
  techActivityTechFilter,
  setTechActivityTechFilter,
  techActivityStoreFilter,
  setTechActivityStoreFilter,
  users,
  stores,
  cases,
  setSelectedCaseId,
  setShowNewTechCaseModal
}) => {
  const isStoreVisible = (tiendaId: number) => {
    if (!currentUser) return false;
    if (currentUser.rol === 'administrador' || currentUser.rol === 'tecnico') return true;
    if (currentUser.rol === 'supervisor') {
      if (!currentUser.supervisorTiendas) return true;
      return currentUser.supervisorTiendas.includes(tiendaId);
    }
    return currentUser.tiendaId === tiendaId;
  };

  const activeCases = cases.filter(c => {
    if (!isStoreVisible(c.tiendaId)) return false;
    if (c.estado === 'concluido' || c.estado === 'cerrado' || c.hora_salida) return false;
    return c.es_caso_tecnico || c.tecnicoAsignadoId || c.tecnico_presencial_nombre || c.hora_entrada || c.estado === 'en_proceso';
  });

  const tiendasAtendidasCount = new Set(activeCases.map(c => c.tiendaId)).size;
  const tecnicosEnTiendaCount = activeCases.filter(c => c.hora_entrada && !c.hora_salida).length;

  const filteredCases = activeCases.filter(c => {
    if (techActivityStoreFilter !== 'todas' && c.tiendaId !== techActivityStoreFilter) return false;
    if (techActivityTechFilter !== 'todos') {
      const tech = users.find(u => u.id === techActivityTechFilter);
      const isAssigned = c.tecnicoAsignadoId === techActivityTechFilter;
      const isPresencial = tech && c.tecnico_presencial_nombre?.toLowerCase().includes(tech.nombre.toLowerCase());
      const isApoyo = tech && c.tecnico_apoyo_nombre?.toLowerCase().includes(tech.nombre.toLowerCase());
      if (!isAssigned && !isPresencial && !isApoyo) return false;
    }
    return true;
  });

  return (
    <div className="view-container animate-fade">
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            ⚡ Actividad En Tienda (Trabajos en Curso)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Supervisión en vivo de técnicos que se encuentran laborando actualmente en las tiendas.
          </p>
        </div>

        {currentUser?.rol === 'tecnico' && setShowNewTechCaseModal && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewTechCaseModal(true)}
            style={{ fontWeight: 700, borderRadius: '8px', padding: '8px 14px' }}
          >
            ➕ Reportar Trabajo
          </button>
        )}
      </div>

      {/* Metrics and Filters Summary Card */}
      <div className="detail-card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', fontWeight: 700 }}>
          <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🏬 Tiendas Atendidas: <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{tiendasAtendidasCount}</strong>
          </span>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🟢 Técnicos En Tienda: <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>{tecnicosEnTiendaCount}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚡ Actividades Activas: <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{activeCases.length}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchableStoreSelect
            stores={stores}
            value={techActivityStoreFilter}
            onChange={val => setTechActivityStoreFilter(val)}
            currentUser={currentUser}
            allOptionLabel="Todas las Tiendas"
            allOptionValue="todas"
          />

          <select
            className="custom-select"
            value={techActivityTechFilter}
            onChange={e => setTechActivityTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
          >
            <option value="todos">👷 Todos los Técnicos</option>
            {users.filter(u => u.rol === 'tecnico' && u.estado).map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Work List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredCases.length === 0 ? (
          <div className="detail-card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>🟢</span> No hay técnicos laborando en tienda en este momento.
          </div>
        ) : (
          filteredCases.map(c => {
            const store = stores.find(s => s.id === c.tiendaId);
            const tech = users.find(u => u.id === c.tecnicoAsignadoId);
            const techName = c.tecnico_presencial_nombre || tech?.nombre || 'Técnico a cargo';
            const hasSupport = !!c.tecnico_apoyo_nombre;
            const inTime = c.hora_entrada ? new Date(c.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

            return (
              <div
                key={c.id}
                className="card animate-fade"
                style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: '4px solid #3b82f6', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => setSelectedCaseId(c.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                        🏬 {store?.nombre || `Tienda #${c.tiendaId}`} ({store?.ciudad || 'Red'})
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                        #{c.id}
                      </span>
                      <span className={`badge badge-status ${c.estado}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        {c.estado === 'en_proceso' ? 'EN PROCESO' : c.estado.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 700, margin: '4px 0' }}>
                      {c.categoria} - <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{c.descripcion.substring(0, 100)}{c.descripcion.length > 100 ? '...' : ''}</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      👷 Técnico(s): <strong style={{ color: 'var(--primary)' }}>{techName}</strong> {hasSupport && `+ ${c.tecnico_apoyo_nombre}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      ⏱️ Entrada: {inTime}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      Ver Caso →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
