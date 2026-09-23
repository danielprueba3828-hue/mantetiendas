import React, { useState, useEffect } from 'react';
import type { Store, User, Case, ActiveTechPunchClock } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';
import { EditableCategorySelect } from './EditableCategorySelect';

interface TechTimbradorModalProps {
  show: boolean;
  onClose: () => void;
  currentUser: User | null;
  stores: Store[];
  categories: { id: number; nombre: string; prioridadSugerida: number; }[];
  cases: Case[];
  activePunchClock: ActiveTechPunchClock | null;
  onClockIn: (data: {
    tiendaId: number;
    useExistingCase: boolean;
    existingCaseId?: number;
    newCaseData?: {
      categoria: string;
      descripcion: string;
      prioridad: number;
      fotosIniciales: string[];
    };
  }) => Promise<number | void>;
  onClockOut: (data: {
    actionType: 'conclude' | 'pause' | 'exit_only';
    solutionDesc?: string;
    solutionPhotos?: string[];
    pauseReason?: string;
  }) => Promise<void>;
  onOpenEditCase: (c: Case) => void;
  onOpenCaseDetail: (caseId: number) => void;
  compressImage: (file: File) => Promise<string>;
}

export const TechTimbradorModal: React.FC<TechTimbradorModalProps> = ({
  show,
  onClose,
  currentUser,
  stores,
  categories,
  cases,
  activePunchClock,
  onClockIn,
  onClockOut,
  onOpenEditCase,
  onOpenCaseDetail,
  compressImage
}) => {
  // Clock-in form states
  const [selectedStoreId, setSelectedStoreId] = useState<number>(0);
  const [newCategoria, setNewCategoria] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [newPrioridad, setNewPrioridad] = useState<number>(3);
  const [newFotos, setNewFotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clock-out form states
  const [clockOutAction, setClockOutAction] = useState<'conclude' | 'pause' | 'exit_only'>('conclude');
  const [solutionDesc, setSolutionDesc] = useState('');
  const [solutionPhotos, setSolutionPhotos] = useState<string[]>([]);
  const [pauseReason, setPauseReason] = useState('');

  // Live timer state
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [elapsedTimeStr, setElapsedTimeStr] = useState('00:00:00');

  // Live clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (activePunchClock?.horaIngreso) {
        const start = new Date(activePunchClock.horaIngreso).getTime();
        const diff = Math.max(0, now.getTime() - start);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTimeStr(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activePunchClock]);

  // Reset or initialize on open
  useEffect(() => {
    if (show) {
      if (activePunchClock) {
        setSelectedStoreId(activePunchClock.tiendaId);
      } else {
        setSelectedStoreId(0);
        setNewCategoria('');
        setNewDescripcion('');
        setNewPrioridad(3);
        setNewFotos([]);
      }
    }
  }, [show, activePunchClock]);

  if (!show) return null;

  // Active case for clocked in technician
  const currentActiveCase = activePunchClock
    ? cases.find(c => c.id === activePunchClock.casoId)
    : null;
  const currentStore = activePunchClock
    ? stores.find(s => s.id === activePunchClock.tiendaId)
    : stores.find(s => s.id === selectedStoreId);

  // Handle uploading photos for new case
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSolution = false) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const currentList = isSolution ? solutionPhotos : newFotos;
      if (currentList.length + filesArray.length > 6) {
        alert("Máximo 6 fotos permitidas.");
        return;
      }
      for (const file of filesArray) {
        try {
          const compressed = await compressImage(file);
          if (compressed) {
            if (isSolution) {
              setSolutionPhotos(prev => [...prev, compressed]);
            } else {
              setNewFotos(prev => [...prev, compressed]);
            }
          }
        } catch {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              if (isSolution) {
                setSolutionPhotos(prev => [...prev, reader.result as string]);
              } else {
                setNewFotos(prev => [...prev, reader.result as string]);
              }
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Submit Clock In
  const handleClockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      alert("Por favor selecciona la tienda donde estás laborando.");
      return;
    }

    if (!newCategoria.trim()) {
      alert("Por favor indica la categoría del trabajo a realizar.");
      return;
    }
    if (!newDescripcion.trim()) {
      alert("Por favor ingresa una breve descripción del trabajo a realizar.");
      return;
    }

    setIsProcessing(true);
    try {
      await onClockIn({
        tiendaId: selectedStoreId,
        useExistingCase: false,
        newCaseData: {
          categoria: newCategoria.trim(),
          descripcion: newDescripcion.trim(),
          prioridad: newPrioridad,
          fotosIniciales: newFotos
        }
      });
      onClose();
    } catch (err) {
      console.error("Error al timbrar ingreso:", err);
      alert("Error al registrar el timbrado. Inténtalo nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Clock Out
  const handleClockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clockOutAction === 'conclude' && !solutionDesc.trim()) {
      alert("Por favor ingresa un resumen de la solución o trabajo finalizado.");
      return;
    }
    if (clockOutAction === 'pause' && !pauseReason.trim()) {
      alert("Por favor ingresa el motivo de la pausa.");
      return;
    }

    setIsProcessing(true);
    try {
      await onClockOut({
        actionType: clockOutAction,
        solutionDesc: clockOutAction === 'conclude' ? solutionDesc.trim() : undefined,
        solutionPhotos: clockOutAction === 'conclude' ? solutionPhotos : undefined,
        pauseReason: clockOutAction === 'pause' ? pauseReason.trim() : undefined
      });
      setSolutionDesc('');
      setSolutionPhotos([]);
      setPauseReason('');
      onClose();
    } catch (err) {
      console.error("Error al timbrar salida:", err);
      alert("Error al registrar la salida. Inténtalo nuevamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div 
        className="modal-sheet animate-scale-up" 
        style={{ 
          maxWidth: '560px', 
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: activePunchClock ? '1px solid #10B981' : '1px solid var(--border-color)'
        }}
      >
        {/* MODAL HEADER */}
        <div 
          className="modal-header" 
          style={{ 
            background: activePunchClock 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 95, 70, 0.05))' 
              : 'linear-gradient(135deg, rgba(30, 58, 138, 0.08), rgba(99, 102, 241, 0.04))',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: activePunchClock ? '#10B981' : '#1e3a8a', 
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: activePunchClock ? '0 0 16px rgba(16, 185, 129, 0.45)' : 'none'
              }}
            >
              ⏱️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                  Timbrador de Asistencia
                </h3>
                {activePunchClock ? (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: '#10b981', color: '#ffffff' }}>
                    🟢 EN TURNO
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: '#EF4444', color: '#ffffff' }}>
                    ⚠️ OBLIGATORIO
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {activePunchClock 
                  ? 'Sesión técnica activa en tienda. Control de tiempo y salida.' 
                  : 'Registra tu ingreso y tienda antes de iniciar labores.'}
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ========================================================= */}
          {/* CASO A: TÉCNICO YA ESTÁ TIMBRADO EN TIENDA (ACTIVO)       */}
          {/* ========================================================= */}
          {activePunchClock ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* LIVE TIMER CARD */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
                    Trabajando en Tienda
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Visita #{activePunchClock.numeroVisita || 1}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      🏬 {currentStore?.nombre || `Tienda #${activePunchClock.tiendaId}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      📍 {currentStore?.direccion || ''} {currentStore?.ciudad ? `(${currentStore.ciudad})` : ''}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Tiempo Transcurrido
                    </div>
                    <div 
                      style={{ 
                        fontFamily: 'monospace, Courier, monospace', 
                        fontSize: '1.5rem', 
                        fontWeight: 900, 
                        color: '#059669',
                        letterSpacing: '1px'
                      }}
                    >
                      {elapsedTimeStr}
                    </div>
                  </div>
                </div>

                <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>📥 Ingreso registrado: <strong>{new Date(activePunchClock.horaIngreso).toLocaleTimeString()}</strong></span>
                  <span>👷 Técnico: <strong>{currentUser?.nombre}</strong></span>
                </div>
              </div>

              {/* ASSOCIATED CASE INFO & QUICK ACTIONS */}
              {currentActiveCase && (
                <div 
                  style={{ 
                    background: 'var(--bg-panel)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                        Caso #{currentActiveCase.id}
                      </span>
                      <span className={`badge badge-status ${currentActiveCase.estado}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        {currentActiveCase.estado.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { onClose(); onOpenEditCase(currentActiveCase); }}
                        style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Modificar categoría, descripción o prioridad"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { onClose(); onOpenCaseDetail(currentActiveCase.id); }}
                        style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}
                      >
                        👁️ Ver Detalles
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {currentActiveCase.categoria}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                      {currentActiveCase.descripcion}
                    </div>
                  </div>
                </div>
              )}

              {/* CLOCK OUT FORM */}
              <form onSubmit={handleClockOutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
                    🛑 Marcar Salida de Tienda:
                  </label>
                  
                  {/* Action Mode Segmented Switch */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setClockOutAction('conclude')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: clockOutAction === 'conclude' ? '2px solid #10B981' : '1px solid var(--border-color)',
                        background: clockOutAction === 'conclude' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                        color: clockOutAction === 'conclude' ? '#059669' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>✅</span>
                      <span>Concluir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClockOutAction('pause')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: clockOutAction === 'pause' ? '2px solid #D97706' : '1px solid var(--border-color)',
                        background: clockOutAction === 'pause' ? 'rgba(217, 119, 6, 0.12)' : 'var(--bg-surface)',
                        color: clockOutAction === 'pause' ? '#D97706' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>⏸️</span>
                      <span>Pausar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClockOutAction('exit_only')}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: clockOutAction === 'exit_only' ? '2px solid #3B82F6' : '1px solid var(--border-color)',
                        background: clockOutAction === 'exit_only' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface)',
                        color: clockOutAction === 'exit_only' ? '#2563EB' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>🚪</span>
                      <span>Fin Turno</span>
                    </button>
                  </div>

                  {/* Mode 1: Conclude Case */}
                  {clockOutAction === 'conclude' && (
                    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.76rem', color: '#047857' }}>
                        💡 El trabajo quedará concluido en tienda y el caso pasará a revisión de tienda para su cierre definitivo.
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                          Descripción de la Solución Realizada *
                        </label>
                        <textarea
                          rows={3}
                          value={solutionDesc}
                          onChange={e => setSolutionDesc(e.target.value)}
                          placeholder="Explica detalladamente las correcciones o arreglos realizados..."
                          required
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                          📸 Fotos de Evidencia del Trabajo Terminado
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={e => handlePhotoUpload(e, true)}
                          style={{ fontSize: '0.8rem' }}
                        />
                        {solutionPhotos.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {solutionPhotos.map((src, i) => (
                              <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <img src={src} alt={`Solución ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                  type="button"
                                  onClick={() => setSolutionPhotos(solutionPhotos.filter((_, idx) => idx !== i))}
                                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Pause Case */}
                  {clockOutAction === 'pause' && (
                    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'rgba(217, 119, 6, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.25)', fontSize: '0.76rem', color: '#b45309' }}>
                        ⏸️ El caso quedará pausado. Tu salida quedará registrada con la hora actual y podrás retomar la labor más tarde.
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                          Motivo de la Pausa (ej. Falta de repuesto, esperando material) *
                        </label>
                        <textarea
                          rows={3}
                          value={pauseReason}
                          onChange={e => setPauseReason(e.target.value)}
                          placeholder="Indique qué material o situación impide continuar ahora..."
                          required
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Exit Only */}
                  {clockOutAction === 'exit_only' && (
                    <div className="animate-fade" style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.78rem', color: '#1d4ed8' }}>
                      🚪 Se registrará formalmente tu salida de la tienda en el historial de asistencias a las <strong>{currentTimeStr}</strong>. El caso permanecerá en proceso para tu próxima visita.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={isProcessing}
                  >
                    Mantener Activo
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={isProcessing}
                    style={{
                      background: clockOutAction === 'conclude' ? '#059669' : clockOutAction === 'pause' ? '#d97706' : '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      padding: '10px 18px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isProcessing ? 'Procesando Salida...' : '🛑 Timbrar Salida de Tienda'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ========================================================= */
            /* CASO B: TÉCNICO NO ESTÁ TIMBRADO (MARCAJE DE INGRESO)     */
            /* ========================================================= */
            <form onSubmit={handleClockInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* CURRENT LIVE CLOCK BANNER */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08), rgba(16, 185, 129, 0.05))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Hora Oficial de Marcaje
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    🕒 {currentTimeStr}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Técnico Activo:</span>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {currentUser?.nombre}
                  </div>
                </div>
              </div>

              {/* PASO 1: SELECCIÓN DE TIENDA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-main)' }}>
                  1. ¿En qué tienda estás trabajando? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableStoreSelect
                  stores={stores}
                  value={selectedStoreId}
                  onChange={val => {
                    const id = Number(val);
                    setSelectedStoreId(id);
                  }}
                  currentUser={currentUser}
                  placeholder="Buscar y seleccionar tienda donde estás presente..."
                  allOptionLabel="-- Seleccionar Tienda --"
                  allOptionValue="0"
                />
              </div>

              {/* PASO 2: TRABAJO A REALIZAR EN TIENDA */}
              {selectedStoreId > 0 && (
                <div 
                  className="animate-fade" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    background: 'var(--bg-surface)',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚡</span>
                    <span>Al timbrar se creará este nuevo caso en estado "En Proceso" y podrás pausarlo, editarlo o cerrarlo en cualquier momento.</span>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                      Categoría del Trabajo *
                    </label>
                    <EditableCategorySelect
                      value={newCategoria}
                      onChange={setNewCategoria}
                      categories={categories}
                      placeholder="Selecciona o escribe categoría (ej. Iluminación, Cerrajería)..."
                      required
                    />
                  </div>

                  {/* Prioridad */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                      Prioridad de Atención
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      {[
                        { level: 1, label: '🚨 Urgente', color: '#ef4444' },
                        { level: 2, label: '🟠 Alta', color: '#f97316' },
                        { level: 3, label: '🟡 Media', color: '#eab308' },
                        { level: 4, label: '🟢 Baja', color: '#10b981' }
                      ].map(p => (
                        <button
                          key={p.level}
                          type="button"
                          onClick={() => setNewPrioridad(p.level)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            border: newPrioridad === p.level ? `2px solid ${p.color}` : '1px solid var(--border-color)',
                            background: newPrioridad === p.level ? 'var(--bg-panel)' : 'transparent',
                            fontSize: '0.72rem',
                            fontWeight: newPrioridad === p.level ? 800 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                      Descripción del Trabajo a Realizar o Hallazgo *
                    </label>
                    <textarea
                      rows={3}
                      value={newDescripcion}
                      onChange={e => setNewDescripcion(e.target.value)}
                      placeholder="Describe brevemente la novedad o trabajo que vas a ejecutar en tienda..."
                      required
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Evidencias Iniciales (Opcional) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                      📷 Fotos Iniciales del Problema (Opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => handlePhotoUpload(e, false)}
                      style={{ fontSize: '0.78rem' }}
                    />
                    {newFotos.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {newFotos.map((src, i) => (
                          <div key={i} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={src} alt={`Evidencia ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => setNewFotos(newFotos.filter((_, idx) => idx !== i))}
                              style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProcessing || !selectedStoreId || !newCategoria.trim() || !newDescripcion.trim()}
                  style={{
                    fontWeight: 800,
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#10B981',
                    borderColor: '#10B981',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {isProcessing ? 'Registrando Timbrado...' : '🟢 Timbrar Ingreso e Iniciar Turno'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
