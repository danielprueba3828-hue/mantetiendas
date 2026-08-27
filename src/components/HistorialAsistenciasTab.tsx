import React from 'react';
import type { Store, User, Case } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';

interface HistorialAsistenciasTabProps {
  currentUser: User | null;
  cases: Case[];
  stores: Store[];
  users: User[];
  setSelectedCaseId: (id: number) => void;
  loadSheetJS: () => Promise<any>;
}

export const HistorialAsistenciasTab: React.FC<HistorialAsistenciasTabProps> = ({
  currentUser,
  cases,
  stores,
  users,
  setSelectedCaseId,
  loadSheetJS
}) => {
  const [storeFilter, setStoreFilter] = React.useState<number | 'todas'>('todas');
  const [techFilter, setTechFilter] = React.useState<number | 'todos'>('todos');

  const isStoreVisible = (tiendaId: number) => {
    if (!currentUser) return false;
    if (currentUser.rol === 'administrador' || currentUser.rol === 'tecnico') return true;
    if (currentUser.rol === 'supervisor') {
      if (!currentUser.supervisorTiendas) return true;
      return currentUser.supervisorTiendas.includes(tiendaId);
    }
    return currentUser.tiendaId === tiendaId;
  };

  const closedCases = cases.filter(c => {
    if (!isStoreVisible(c.tiendaId)) return false;
    return c.estado === 'concluido' || c.estado === 'cerrado' || c.hora_salida;
  });

  const filteredCases = closedCases.filter(c => {
    if (storeFilter !== 'todas' && c.tiendaId !== storeFilter) return false;
    if (techFilter !== 'todos') {
      const tech = users.find(u => u.id === techFilter);
      const isAssigned = c.tecnicoAsignadoId === techFilter;
      const isPresencial = tech && c.tecnico_presencial_nombre?.toLowerCase().includes(tech.nombre.toLowerCase());
      const isApoyo = tech && c.tecnico_apoyo_nombre?.toLowerCase().includes(tech.nombre.toLowerCase());
      if (!isAssigned && !isPresencial && !isApoyo) return false;
    }
    return true;
  });

  const formatTime = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const exportHistorialExcel = async () => {
    const XLSX = await loadSheetJS();
    const rows = filteredCases.map(c => {
      const store = stores.find(s => s.id === c.tiendaId);
      const tech = users.find(u => u.id === c.tecnicoAsignadoId);
      return {
        'ID Caso': c.id,
        'Tienda': store ? `${store.nombre} (${store.ciudad})` : `Tienda #${c.tiendaId}`,
        'Categoría': c.categoria,
        'Descripción': c.descripcion,
        'Técnico Principal': c.tecnico_presencial_nombre || tech?.nombre || 'Técnico',
        'Técnico Apoyo': c.tecnico_apoyo_nombre || '-',
        'Hora Entrada': formatTime(c.hora_entrada) || 'N/A',
        'Hora Salida': formatTime(c.hora_salida) || 'N/A',
        'Estado': c.estado.toUpperCase()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial_Asistencias');
    XLSX.writeFile(workbook, `Historial_Asistencias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade">
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span> Trabajos Concluidos y Salidas de Tienda
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Registro histórico completo de intervenciones finalizadas, horas de entrada, salida y evidencias.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={exportHistorialExcel}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', padding: '8px 14px' }}
        >
          <span>📥</span> Exportar Excel
        </button>
      </div>

      {/* Filter Card */}
      <div className="detail-card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          🔍 Filtrar Historial:
        </span>

        {currentUser?.rol === 'jefe_tienda' || currentUser?.rol === 'subjefe' ? (
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            🏬 {stores.find(s => s.id === currentUser.tiendaId)?.nombre || 'Mi Tienda'}
          </span>
        ) : (
          <SearchableStoreSelect
            stores={stores}
            value={storeFilter}
            onChange={val => setStoreFilter(val)}
            currentUser={currentUser}
            allOptionLabel="Todas las Tiendas"
            allOptionValue="todas"
          />
        )}

        <select
          className="custom-select"
          value={techFilter}
          onChange={e => setTechFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
        >
          <option value="todos">👷 Todos los Técnicos</option>
          {users.filter(u => u.rol === 'tecnico' && u.estado).map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
      </div>

      {/* List of Finished Cases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredCases.length === 0 ? (
          <div className="detail-card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            📋 No hay trabajos concluidos en este filtro.
          </div>
        ) : (
          filteredCases.map(c => {
            const store = stores.find(s => s.id === c.tiendaId);
            const tech = users.find(u => u.id === c.tecnicoAsignadoId);
            const techName = c.tecnico_presencial_nombre || tech?.nombre || 'Técnico a cargo';
            const inTimeStr = formatTime(c.hora_entrada) || formatTime(c.fechaCreacion) || '09:00 AM';
            const outTimeStr = formatTime(c.hora_salida) || formatTime(c.fechaCierre) || formatTime(c.fechaCreacion) || '10:15 AM';

            return (
              <div
                key={c.id}
                className="card animate-fade"
                style={{ padding: '14px 18px', cursor: 'pointer', borderLeft: '4px solid #10b981', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => setSelectedCaseId(c.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                        🏬 {store?.nombre || `Tienda #${c.tiendaId}`} ({store?.ciudad || 'Red'})
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                        #{c.id}
                      </span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                        CONCLUIDO
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 700, margin: '4px 0' }}>
                      {c.categoria} - <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{c.descripcion.substring(0, 100)}{c.descripcion.length > 100 ? '...' : ''}</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      👷 Técnico(s): <strong style={{ color: 'var(--primary)' }}>{techName}</strong> {c.tecnico_apoyo_nombre && `+ ${c.tecnico_apoyo_nombre}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem' }}>
                      <span>📥 Entrada: <strong style={{ color: 'var(--text-main)' }}>{inTimeStr}</strong></span>
                      <span>📤 Salida: <strong style={{ color: '#059669' }}>{outTimeStr}</strong></span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      Ver Caso Completo →
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
