import React from 'react';
import type { Store, User, Case } from '../types';

interface TecnicosActividadTabProps {
  techActivityTechFilter: number | 'todos';
  setTechActivityTechFilter: (val: number | 'todos') => void;
  techActivityStoreFilter: number | 'todas';
  setTechActivityStoreFilter: (val: number | 'todas') => void;
  users: User[];
  stores: Store[];
  cases: Case[];
  setSelectedCaseId: (id: number) => void;
}

export const TecnicosActividadTab: React.FC<TecnicosActividadTabProps> = ({
  techActivityTechFilter,
  setTechActivityTechFilter,
  techActivityStoreFilter,
  setTechActivityStoreFilter,
  users,
  stores,
  cases,
  setSelectedCaseId
}) => {
  return (
    <div className="view-container animate-fade">
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> Actividad de Técnicos en Tiempo Real
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Monitoreo en vivo de presencia física, estatus operativo y asignaciones en locales
          </p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select 
            value={techActivityTechFilter} 
            onChange={e => setTechActivityTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            className="custom-select"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            <option value="todos">👤 Todos los Técnicos</option>
            {users.filter(u => u.rol === 'tecnico' && u.estado).map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>

          <select 
            value={techActivityStoreFilter} 
            onChange={e => setTechActivityStoreFilter(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            className="custom-select"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            <option value="todas">🏬 Todas las Tiendas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Técnicos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {users
          .filter(u => u.rol === 'tecnico' && u.estado)
          .filter(u => techActivityTechFilter === 'todos' || u.id === techActivityTechFilter)
          .map(tech => {
            const activeCase = cases.find(c => 
              (c.tecnicoAsignadoId === tech.id || (c.tecnico_presencial_nombre && c.tecnico_presencial_nombre.toLowerCase().includes(tech.nombre.toLowerCase().split(' ')[0]))) &&
              (c.estado === 'en_proceso' || c.pausado_por_material)
            );

            if (techActivityStoreFilter !== 'todas') {
              if (!activeCase || activeCase.tiendaId !== techActivityStoreFilter) return null;
            }

            const store = activeCase ? stores.find(s => s.id === activeCase.tiendaId) : null;
            const isWorking = activeCase && activeCase.estado === 'en_proceso' && (!activeCase.tecnico_estatus_trabajo || activeCase.tecnico_estatus_trabajo === 'Trabajando en tienda');
            const isStandBy = activeCase && (activeCase.pausado_por_material || activeCase.tecnico_estatus_trabajo === 'En stand by');

            return (
              <div key={tech.id} className="card animate-fade" style={{ borderTop: `4px solid ${isWorking ? 'var(--success)' : isStandBy ? 'var(--warning)' : 'var(--text-muted)'}`, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                      {tech.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{tech.nombre}</h3>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tech.usuario} • {tech.correo}</p>
                    </div>
                  </div>
                  <span className={`badge ${isWorking ? 'badge-success' : isStandBy ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: '0.72rem', padding: '4px 8px' }}>
                    {isWorking ? '🟢 En Tienda' : isStandBy ? '🟡 Stand By / Pausado' : '⚪ Libre / Sin Asignación'}
                  </span>
                </div>

                {activeCase && store ? (
                  <div style={{ background: 'var(--bg-surface)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>CASO #{activeCase.id}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeCase.categoria}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🏬</span> {store.nombre}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {activeCase.descripcion}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Hora Entrada:</span>
                        <strong style={{ color: 'var(--success)' }}>
                          {activeCase.hora_entrada ? new Date(activeCase.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No registrada'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Estatus Trabajo:</span>
                        <strong>{activeCase.tecnico_estatus_trabajo || (activeCase.pausado_por_material ? 'Pausado Material' : 'Trabajando')}</strong>
                      </div>
                    </div>

                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '10px', fontSize: '0.75rem', fontWeight: 600 }}
                      onClick={() => setSelectedCaseId(activeCase.id)}
                    >
                      🔍 Ver Detalle del Caso
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '20px 12px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Sin casos presenciales activos en este momento.
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
