import React, { useState, useEffect } from 'react';
import type { Store, User, Case, ActiveTechPunchClock } from '../types';

interface TechTimbradorBannerProps {
  currentUser: User | null;
  activePunchClock: ActiveTechPunchClock | null;
  stores: Store[];
  cases: Case[];
  onOpenClockIn: () => void;
  onOpenClockOut: () => void;
  onOpenEditCase: (c: Case) => void;
  onOpenCaseDetail: (caseId: number) => void;
}

export const TechTimbradorBanner: React.FC<TechTimbradorBannerProps> = ({
  currentUser,
  activePunchClock,
  stores,
  cases,
  onOpenClockIn,
  onOpenClockOut,
  onOpenEditCase,
  onOpenCaseDetail
}) => {
  if (currentUser?.rol !== 'tecnico') return null;

  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    if (!activePunchClock?.horaIngreso) return;

    const updateTimer = () => {
      const start = new Date(activePunchClock.horaIngreso).getTime();
      const diff = Math.max(0, Date.now() - start);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePunchClock]);

  const activeStore = activePunchClock ? stores.find(s => s.id === activePunchClock.tiendaId) : null;
  const activeCase = activePunchClock ? cases.find(c => c.id === activePunchClock.casoId) : null;

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* CASE 1: NO ACTIVE PUNCH CLOCK (MANDATORY WARNING BANNER) */}
      {!activePunchClock ? (
        <div 
          className="animate-fade"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.05))',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px', flex: 1 }}>
            <div 
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0
              }}
            >
              ⏱️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif' }}>
                  Timbrado Obligatorio de Asistencia
                </span>
                <span style={{ background: '#EF4444', color: '#ffffff', fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                  PENDIENTE
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Debes timbrar tu <strong>hora de ingreso</strong> y seleccionar en qué <strong>tienda</strong> estás laborando antes de realizar intervenciones técnicas.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={onOpenClockIn}
            style={{
              background: '#10B981',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.84rem',
              padding: '9px 18px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>⏱️</span>
            <span>Timbrar Ingreso a Tienda</span>
          </button>
        </div>
      ) : (
        /* CASE 2: ACTIVE PUNCH CLOCK CONSOLE */
        <div 
          className="animate-fade"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 95, 70, 0.04))',
            border: '1.5px solid rgba(16, 185, 129, 0.45)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
                    En Turno Activo
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    • Ingreso: {new Date(activePunchClock.horaIngreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  🏬 {activeStore?.nombre || `Tienda #${activePunchClock.tiendaId}`} {activeStore?.ciudad ? `(${activeStore.ciudad})` : ''}
                </div>
              </div>
            </div>

            {/* LIVE DIGITAL CLOCK */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tiempo en Tienda
                </span>
                <div 
                  style={{
                    fontFamily: 'monospace, Courier, monospace',
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#059669',
                    letterSpacing: '1px'
                  }}
                >
                  ⏱️ {elapsedTime}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE CASE SUMMARY + ACTIONS */}
          <div 
            style={{
              paddingTop: '10px',
              borderTop: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', flex: 1, minWidth: '220px' }}>
              {activeCase ? (
                <>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Caso #{activeCase.id}:</span>{' '}
                  <strong>{activeCase.categoria}</strong> - <span style={{ color: 'var(--text-muted)' }}>{activeCase.descripcion.substring(0, 60)}{activeCase.descripcion.length > 60 ? '...' : ''}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Labor técnica general en tienda</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeCase && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenEditCase(activeCase)}
                    style={{ fontSize: '0.74rem', padding: '6px 10px', fontWeight: 700, borderRadius: '8px' }}
                    title="Editar información del caso"
                  >
                    ✏️ Editar Caso
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenCaseDetail(activeCase.id)}
                    style={{ fontSize: '0.74rem', padding: '6px 10px', fontWeight: 700, borderRadius: '8px' }}
                  >
                    👁️ Ver Caso
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-sm"
                onClick={onOpenClockOut}
                style={{
                  background: '#EF4444',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🛑</span>
                <span>Timbrar Salida</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
